import * as path from "path";
import { AbstractUI5Parser, TextDocument } from "ui5plugin-parser";
import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSClass";
import { RangeAdapter } from "ui5plugin-parser/dist/classes/parsing/util/range/adapters/RangeAdapter";
import { IError, JSLinters } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";

export class WrongClassNameLinter<
	Parser extends AbstractUI5Parser<CustomClass>,
	CustomClass extends AbstractCustomClass
> extends JSLinter<Parser, CustomClass> {
	protected className = JSLinters.WrongClassNameLinter;
	protected _getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomJSClass && UIClass.getUIDefineAcornBody()) {
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
