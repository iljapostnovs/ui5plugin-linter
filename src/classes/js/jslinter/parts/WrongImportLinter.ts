import { TextDocument, UI5Parser } from "ui5plugin-parser";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { RangeAdapter } from "../../../adapters/RangeAdapter";
import { IError, JSLinters } from "../../../Linter";
import { JSLinter } from "./abstraction/JSLinter";
import { PackageConfigHandler } from "./config/PackageConfigHandler";
export class WrongImportLinter extends JSLinter {
	protected className = JSLinters.WrongImportLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		if (new PackageConfigHandler().getLinterUsage(this.className)) {
			const className = UI5Parser.getInstance().fileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UI5Parser.getInstance().classFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass && UIClass.UIDefine) {
					UIClass.UIDefine.forEach(UIDefine => {
						const UIDefineClass = UI5Parser.getInstance().classFactory.getUIClass(UIDefine.classNameDotNotation);
						if (!UIDefineClass.classExists) {
							//TODO: check location generation
							const range = RangeAdapter.offsetsToVSCodeRange(UIClass.classText, UIDefine.start + 1, UIDefine.start + 1 + UIDefine.path.length);
							if (range) {
								errors.push({
									acornNode: UIDefine.acornNode,
									code: "UI5Plugin",
									className: UIClass.className,
									source: this.className,
									message: `Class "${UIDefine.classNameDotNotation}" doesn't exist`,
									range: range,
									severity: new PackageConfigHandler().getSeverity(this.className)
								});
							}
						}
					});
				}
			}
		}
		return errors;
	}
}