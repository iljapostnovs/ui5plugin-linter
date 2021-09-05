import { JSLinter } from "./abstraction/JSLinter";
import { TextDocument, UI5Parser } from "ui5plugin-parser";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { RangeAdapter } from "../../../adapters/RangeAdapter";
import { PackageConfigHandler } from "./config/PackageConfigHandler";
import { JSLinters, IError } from "../../../Linter";

export class WrongClassNameLinter extends JSLinter {
	protected className = JSLinters.WrongClassNameLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		if (new PackageConfigHandler().getLinterUsage(this.className)) {
			const className = UI5Parser.getInstance().fileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UI5Parser.getInstance().classFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass && UIClass.getUIDefineAcornBody()) {
					if (UIClass.acornReturnedClassExtendBody) {
						const classNameFromFile = UIClass.acornReturnedClassExtendBody && UIClass.acornReturnedClassExtendBody.arguments && UIClass.acornReturnedClassExtendBody.arguments[0]?.value;
						if (classNameFromFile && className !== classNameFromFile) {
							const range = RangeAdapter.acornLocationToVSCodeRange(UIClass.acornReturnedClassExtendBody?.arguments[0].loc);
							errors.push({
								source: "Class Name Linter",
								className: UIClass.className,
								acornNode: UIClass.acornReturnedClassExtendBody.arguments[0],
								code: "UI5Plugin",
								message: `Invalid class name. Expected: "${className}", actual: "${classNameFromFile}"`,
								range: range,
								severity: new PackageConfigHandler().getSeverity(this.className)
							});
						}
					}
				}
			}
		}

		return errors;
	}
}