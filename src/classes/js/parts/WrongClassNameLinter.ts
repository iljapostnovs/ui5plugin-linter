import { JSLinter } from "./abstraction/JSLinter";
import { AbstractUI5Parser, TextDocument } from "ui5plugin-parser";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { RangeAdapter } from "../../adapters/RangeAdapter";
import { JSLinters, IError } from "../../Linter";
import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomTSClass";
import * as path from "path";

export class WrongClassNameLinter<
	Parser extends AbstractUI5Parser<CustomClass>,
	CustomClass extends AbstractCustomClass
> extends JSLinter<Parser, CustomClass> {
	protected className = JSLinters.WrongClassNameLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass && UIClass.getUIDefineAcornBody()) {
				if (UIClass.acornReturnedClassExtendBody) {
					const classNameFromFile =
						UIClass.acornReturnedClassExtendBody &&
						UIClass.acornReturnedClassExtendBody.arguments &&
						UIClass.acornReturnedClassExtendBody.arguments[0]?.value;
					if (classNameFromFile && className !== classNameFromFile) {
						const range = RangeAdapter.acornLocationToRange(
							UIClass.acornReturnedClassExtendBody?.arguments[0].loc
						);
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
			} else if (UIClass instanceof CustomTSClass) {
				const nameNode = UIClass.node.getNameNode();
				const className = nameNode?.getText();
				const fileName = document.fileName.replace(".ts", "").replace(".controller", "").split(path.sep).pop();
				if (nameNode && className && fileName && fileName !== className) {
					const positionStart = UIClass.node.getSourceFile().getLineAndColumnAtPos(nameNode.getStart() - 1);
					const positionEnd = UIClass.node.getSourceFile().getLineAndColumnAtPos(nameNode.getEnd() - 1);
					const range = RangeAdapter.acornLocationToRange({ start: positionStart, end: positionEnd });
					errors.push({
						source: this.className,
						className: UIClass.className,
						acornNode: UIClass.node,
						code: "UI5Plugin",
						message: `Invalid class name. Expected: "${fileName}", actual: "${className}"`,
						range: range,
						severity: this._configHandler.getSeverity(this.className),
						fsPath: document.fileName
					});
				}
			}
		}

		return errors;
	}
}
