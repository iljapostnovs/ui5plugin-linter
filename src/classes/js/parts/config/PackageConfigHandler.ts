import { UI5Parser } from "ui5plugin-parser";
import { IUI5PackageConfigEntry, ILinterConfigHandler, JSLinterException } from "./ILinterConfigHandler";
import { join } from "path";
import { JSLinters, Severity, XMLLinters } from "../../../Linter";
const packagePath = join(process.cwd(), "/package.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodePackage: IUI5PackageConfigEntry = require(packagePath);

export class PackageConfigHandler implements ILinterConfigHandler {
	protected readonly _parser: UI5Parser;
	constructor(parser: UI5Parser) {
		this._parser = parser;
	}
	private _cache: { [key: string]: boolean } = {};

	getSeverity(linter: JSLinters | XMLLinters) {
		return nodePackage?.ui5?.ui5linter?.severity?.[linter] ?? Severity.Error;
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

		const userExceptions: JSLinterException[] = nodePackage?.ui5?.ui5linter?.JSLinterExceptions || [];
		return defaultExceptions.concat(userExceptions);
	}

	getLinterUsage(linter: JSLinters | XMLLinters) {
		return nodePackage?.ui5?.ui5linter?.usage?.[linter] ?? true;
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