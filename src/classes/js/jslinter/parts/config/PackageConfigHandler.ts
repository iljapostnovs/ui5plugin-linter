import { UI5Parser } from "ui5plugin-parser";
import { IConfigHandler, JSLinterException } from "./IConfigHandler";
import { join } from "path";
import { JSLinters } from "../../../../Linter";
const packagePath = join(process.cwd(), "/package.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodePackage = require(packagePath);

export class PackageConfigHandler implements IConfigHandler {
	private _cache: { [key: string]: boolean } = {}
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

		const userExceptions: JSLinterException[] = nodePackage?.ui5?.ui5parser?.JSLinterExceptions || [];
		return defaultExceptions.concat(userExceptions);
	}

	getLinterUsage(linter: JSLinters) {
		return nodePackage?.ui5?.ui5parser?.[`use${linter}`] ?? true;
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
					isException = UI5Parser.getInstance().classFactory.isClassAChildOfClassB(className, classException.className);
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