import { AnyCustomTSClass, TextDocument, UI5TSParser } from "ui5plugin-parser";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomTSClass";
import { RangeAdapter } from "../../adapters/RangeAdapter";
import { IError, JSLinters } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";
export class WrongNamespaceLinter extends JSLinter<UI5TSParser, AnyCustomTSClass> {
	protected className = JSLinters.WrongNamespaceLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomTSClass) {
				const jsDocWithNamespaceTag = UIClass.node
					.getJsDocs()
					.find(JSDoc => JSDoc.getTags().find(tag => tag.getTagName() === "namespace"));
				const namespaceJSDoc = jsDocWithNamespaceTag?.getTags().find(tag => tag.getTagName() === "namespace");
				if (namespaceJSDoc) {
					const actualNamespace = namespaceJSDoc.getComment();
					const classNameParts = UIClass.className.split(".");
					classNameParts.pop();
					const expectedNamespace = classNameParts.join(".");

					if (typeof actualNamespace === "string" && actualNamespace !== expectedNamespace) {
						const range = RangeAdapter.offsetsRange(
							document.getText(),
							namespaceJSDoc.getStart(),
							namespaceJSDoc.getEnd()
						);
						if (range) {
							errors.push({
								acornNode: UIClass.node,
								code: "UI5Plugin",
								className: UIClass.className,
								source: this.className,
								message: `Invalid namespace. Expected "${expectedNamespace}", but got "${actualNamespace}"`,
								range: range,
								severity: this._configHandler.getSeverity(this.className),
								fsPath: document.fileName
							});
						}
					}
				} else {
					const classNameParts = UIClass.className.split(".");
					classNameParts.pop();
					const expectedNamespace = classNameParts.join(".");
					const range = RangeAdapter.offsetsRange(
						document.getText(),
						UIClass.node.getStart(),
						UIClass.node.getEnd()
					);
					if (range) {
						errors.push({
							acornNode: UIClass.node,
							code: "UI5Plugin",
							className: UIClass.className,
							source: this.className,
							message: `Expected namespace JSDoc: "${expectedNamespace}"`,
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
