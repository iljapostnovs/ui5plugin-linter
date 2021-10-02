import { TextDocument, UI5Parser } from "ui5plugin-parser";
import { IUI5PackageConfigEntry, ILinterConfigHandler, JSLinterException } from "./ILinterConfigHandler";
import { join } from "path";
import { JSLinters, PropertiesLinters, Severity, XMLLinters } from "../../../Linter";
export class PackageConfigHandler implements ILinterConfigHandler {
	protected readonly _package: IUI5PackageConfigEntry;
	protected readonly _parser: UI5Parser;
	constructor(parser: UI5Parser, packagePath = join(process.cwd(), "/package.json")) {
		this._parser = parser;
		try {
			this._package = require(packagePath);
		} catch (error) {
			this._package = {};
		}
	}

	getIfLintingShouldBeSkipped(document: TextDocument): boolean {
		let shouldBeSkipped = false;
		const componentsToIgnore = this._package.ui5?.ui5linter?.componentsToIgnore;
		if (componentsToIgnore) {
			const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const manifest = this._parser.fileReader.getManifestForClass(className);
				if (manifest?.componentName) {
					shouldBeSkipped = componentsToIgnore.includes(manifest.componentName);
				}
			}
		}

		return shouldBeSkipped;
	}

	private _cache: { [key: string]: boolean } = {};

	getSeverity(linter: JSLinters | XMLLinters | PropertiesLinters) {
		return this._package?.ui5?.ui5linter?.severity?.[linter] ?? Severity.Error;
	}

	getJSLinterExceptions(): JSLinterException[] {
		const defaultExceptions: JSLinterException[] = [
			{
				"className": "sap.ui.core.Element",
				"memberName": "getDomRef",
				"applyToChildren": true
			},
			{
				"className": "sap.ui.model.json.JSONModel",
				"memberName": "iSizeLimit",
				"applyToChildren": true
			},
			{
				"className": "sap.ui.model.Binding",
				"memberName": "*"
			},
			{
				"className": "sap.ui.model.Model",
				"memberName": "*"
			},
			{
				"className": "sap.ui.core.Element",
				"memberName": "*"
			},
			{
				"className": "sap.ui.base.ManagedObject",
				"memberName": "*"
			},
			{
				"className": "sap.ui.core.Control",
				"memberName": "*"
			},
			{
				"className": "sap.ui.xmlfragment",
				"memberName": "*"
			},
			{
				"className": "*",
				"memberName": "byId"
			},
			{
				"className": "*",
				"memberName": "prototype"
			},
			{
				"className": "*",
				"memberName": "call"
			},
			{
				"className": "*",
				"memberName": "apply"
			},
			{
				"className": "*",
				"memberName": "bind"
			},
			{
				"className": "*",
				"memberName": "constructor"
			},
			{
				"className": "*",
				"memberName": "init"
			},
			{
				"className": "*",
				"memberName": "exit"
			},
			{
				"className": "map",
				"memberName": "*"
			}
		];

		const userExceptions: JSLinterException[] = this._package?.ui5?.ui5linter?.JSLinterExceptions || [];
		return defaultExceptions.concat(userExceptions);
	}

	getLinterUsage(linter: JSLinters | XMLLinters | PropertiesLinters) {
		return this._package?.ui5?.ui5linter?.usage?.[linter] ?? true;
	}

	checkIfMemberIsException(className = "", memberName = "") {
		const cacheKey = [className, memberName].join(",");

		if (!this._cache[cacheKey]) {
			const hardcodedExceptions = ["metadata", "renderer", "onAfterRendering", "customMetadata"];
			const classExceptions = this.getJSLinterExceptions();
			const isException = hardcodedExceptions.includes(memberName) || !!classExceptions.find(classException => {
				let isException = (classException.className === className || classException.className === "*") &&
					(classException.memberName === memberName || classException.memberName === "*");

				if (!isException && classException.applyToChildren && (classException.memberName === memberName || classException.memberName === "*")) {
					isException = this._parser.classFactory.isClassAChildOfClassB(className, classException.className);
				}

				if (!isException) {
					isException = this._checkIfMemberIsEventHandler(memberName);
				}

				return isException;
			});

			this._cache[cacheKey] = isException;
		}

		return this._cache[cacheKey];
	}

	private _checkIfMemberIsEventHandler(memberName: string) {
		if (memberName.length <= 3) {
			return false;
		}

		const chars = memberName.split("");
		const firstChars = chars.splice(0, 2).join("");
		const memberNameStartsWithOn = firstChars === "on";
		const restCharsAreLowerCase = chars.every(char => char.toLowerCase() === char);

		const isDomEventHandler = memberNameStartsWithOn && restCharsAreLowerCase;

		return isDomEventHandler;
	}
}