import { JSLinter } from "./abstraction/JSLinter";
import { TextDocument } from "ui5plugin-parser";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { RangeAdapter } from "../../../adapters/RangeAdapter";
import { JSLinters, IError } from "../../../Linter";

export class WrongClassNameLinter extends JSLinter {
	protected className = JSLinters.WrongClassNameLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		if (this._configHandler.getLinterUsage(this.className)) {
			const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = this._parser.classFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass && UIClass.getUIDefineAcornBody()) {
					if (UIClass.acornReturnedClassExtendBody) {
						const classNameFromFile = UIClass.acornReturnedClassExtendBody && UIClass.acornReturnedClassExtendBody.arguments && UIClass.acornReturnedClassExtendBody.arguments[0]?.value;
						if (classNameFromFile && className !== classNameFromFile) {
							const range = RangeAdapter.acornLocationToVSCodeRange(UIClass.acornReturnedClassExtendBody?.arguments[0].loc);
							errors.push({
								source: this.className,
								className: UIClass.className,
								acornNode: UIClass.acornReturnedClassExtendBody.arguments[0],
								code: "UI5Plugin",
								message: `Invalid class name. Expected: "${className}", actual: "${classNameFromFile}"`,
								range: range,
								severity: this._configHandler.getSeverity(this.className)
							});
						}
					}
				}
			}
		}

		return errors;
	}
}