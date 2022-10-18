import { JSLinter } from "./abstraction/JSLinter";
import { TextDocument, UI5Parser } from "ui5plugin-parser";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { RangeAdapter } from "../../adapters/RangeAdapter";
import { JSLinters, IError } from "../../Linter";

export class WrongClassNameLinter extends JSLinter<UI5Parser, CustomUIClass> {
	protected className = JSLinters.WrongClassNameLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass && UIClass.getUIDefineAcornBody()) {
				if (UIClass.acornReturnedClassExtendBody) {
					const classNameFromFile = UIClass.acornReturnedClassExtendBody && UIClass.acornReturnedClassExtendBody.arguments && UIClass.acornReturnedClassExtendBody.arguments[0]?.value;
					if (classNameFromFile && className !== classNameFromFile) {
						const range = RangeAdapter.acornLocationToRange(UIClass.acornReturnedClassExtendBody?.arguments[0].loc);
						errors.push({
							source: this.className,
							className: UIClass.className,
							acornNode: UIClass.acornReturnedClassExtendBody.arguments[0],
							code: "UI5Plugin",
							message: `Invalid class name. Expected: "${className}", actual: "${classNameFromFile}"`,
							range: range,
							severity: this._configHandler.getSeverity(this.className),
							fsPath: document.fileName
						});
					}
				}

			}
		}

		return errors;
	}
}