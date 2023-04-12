import { TextDocument } from "ui5plugin-parser";
import { RangeAdapter } from "../../..";
import { DiagnosticTag, XMLLinters } from "../../Linter";
import { IXMLError, XMLLinter } from "./abstraction/XMLLinter";

export class UnusedNamespaceLinter extends XMLLinter {
	protected className: XMLLinters = XMLLinters.UnusedNamespaceLinter;
	protected _getErrors(document: TextDocument): IXMLError[] {
		const errors: IXMLError[] = [];

		const documentText = document.getText();
		const documentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName);

		const aPrefixes = documentText.match(/(?<=xmlns:).*?(?==)/g);
		aPrefixes?.forEach(prefix => {
			const aPrefixes = new RegExp(`(<|\\s)${prefix.trim()}:`, "g").exec(documentText);
			if (!aPrefixes || aPrefixes.length === 0) {
				const positionBegin = documentText.indexOf(`xmlns:${prefix}=`);
				const positionEnd = positionBegin + "xmlns:".length + prefix.length;
				const range = RangeAdapter.offsetsRange(documentText, positionBegin, positionEnd);
				if (range) {
					errors.push({
						code: "UI5plugin",
						message: "Unused namespace",
						source: this.className,
						tags: [DiagnosticTag.Unnecessary],
						severity: this._configHandler.getSeverity(this.className),
						range: range,
						className: documentClassName || "",
						fsPath: document.fileName
					});
				}
			}
		});

		return errors;
	}
}
