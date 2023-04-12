import { TextDocument, UI5JSParser } from "ui5plugin-parser";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { RangeAdapter } from "ui5plugin-parser/dist/classes/parsing/util/range/adapters/RangeAdapter";
import { DiagnosticTag, IError, JSLinters } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";
export class WrongImportLinter extends JSLinter<UI5JSParser, CustomJSClass> {
	protected className = JSLinters.WrongImportLinter;
	protected _getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomJSClass && UIClass.UIDefine) {
				UIClass.UIDefine.forEach(UIDefine => {
					const importedClass = this._parser.classFactory.getUIClass(UIDefine.classNameDotNotation);
					if (!importedClass.classExists) {
						//TODO: check location generation
						const range = RangeAdapter.offsetsRange(
							UIClass.classText,
							UIDefine.start + 1,
							UIDefine.start + 1 + UIDefine.path.length
						);
						if (range) {
							errors.push({
								acornNode: UIDefine.node,
								code: "UI5Plugin",
								className: UIClass.className,
								source: this.className,
								message: `Class "${UIDefine.classNameDotNotation}" doesn't exist`,
								range: range,
								severity: this._configHandler.getSeverity(this.className),
								fsPath: document.fileName
							});
						}
					} else if (importedClass.deprecated) {
						const range = RangeAdapter.offsetsRange(
							UIClass.classText,
							UIDefine.start + 1,
							UIDefine.start + 1 + UIDefine.path.length
						);
						if (range) {
							errors.push({
								acornNode: UIDefine.node,
								code: "UI5Plugin",
								className: UIClass.className,
								source: this.className,
								message: `Class "${UIDefine.classNameDotNotation}" is deprecated`,
								range: range,
								severity: this._configHandler.getSeverity(this.className),
								fsPath: document.fileName,
								tags: [DiagnosticTag.Deprecated]
							});
						}
					}
				});
			}
		}
		return errors;
	}
}
