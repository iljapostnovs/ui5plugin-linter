import { TextDocument } from "ui5plugin-parser";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { RangeAdapter } from "../../adapters/RangeAdapter";
import { IError, JSLinters } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";
export class WrongImportLinter extends JSLinter {
	protected className = JSLinters.WrongImportLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		if (this._configHandler.getLinterUsage(this.className)) {
			const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = this._parser.classFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass && UIClass.UIDefine) {
					UIClass.UIDefine.forEach(UIDefine => {
						const UIDefineClass = this._parser.classFactory.getUIClass(UIDefine.classNameDotNotation);
						if (!UIDefineClass.classExists) {
							//TODO: check location generation
							const range = RangeAdapter.offsetsRange(UIClass.classText, UIDefine.start + 1, UIDefine.start + 1 + UIDefine.path.length);
							if (range) {
								errors.push({
									acornNode: UIDefine.acornNode,
									code: "UI5Plugin",
									className: UIClass.className,
									source: this.className,
									message: `Class "${UIDefine.classNameDotNotation}" doesn't exist`,
									range: range,
									severity: this._configHandler.getSeverity(this.className),
									fsPath: document.fileName
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