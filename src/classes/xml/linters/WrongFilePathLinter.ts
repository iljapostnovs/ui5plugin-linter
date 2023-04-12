import * as fs from "fs";
import { ParserPool, TextDocument } from "ui5plugin-parser";
import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { EmptyJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/EmptyJSClass";
import { RangeAdapter } from "../../..";
import { XMLLinters } from "../../Linter";
import { IXMLError, XMLLinter } from "./abstraction/XMLLinter";
export class WrongFilePathLinter extends XMLLinter {
	protected className = XMLLinters.WrongFilePathLinter;
	protected _getErrors(document: TextDocument): IXMLError[] {
		const errors: IXMLError[] = [];
		const documentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName) || "";

		const XMLFile = this._parser.textDocumentTransformer.toXMLFile(document);
		if (XMLFile) {
			const manifest = ParserPool.getManifestForClass(XMLFile.name);
			if (manifest) {
				const rClassNamesRegex = new RegExp(`${manifest.componentName.replace(/\./, "\\.")}\\..*?(?="|')`, "g");
				if (rClassNamesRegex) {
					let result = rClassNamesRegex.exec(XMLFile.content);
					while (result) {
						const sClassName = result[0];
						const isClassNameValid = this._validateClassName(sClassName);
						if (!isClassNameValid) {
							const range = RangeAdapter.offsetsRange(
								XMLFile.content,
								result.index,
								result.index + sClassName.length
							);
							if (range) {
								errors.push({
									code: "UI5Plugin",
									source: this.className,
									message: `View or fragment "${sClassName}" doesn't exist`,
									range: range,
									severity: this._configHandler.getSeverity(this.className),
									className: documentClassName,
									fsPath: XMLFile.fsPath
								});
							}
						}

						result = rClassNamesRegex.exec(XMLFile.content);
					}
				}
			}
		}
		return errors;
	}

	private _validateClassName(className: string) {
		let isPathValid = !!this._parser.fileReader.getXMLFile(className);

		if (!isPathValid) {
			let UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof AbstractCustomClass || UIClass instanceof EmptyJSClass) {
				if (UIClass instanceof AbstractCustomClass) {
					isPathValid = UIClass.classExists;
				}

				if (!isPathValid) {
					const parts = className.split(".");
					if (parts.length >= 2) {
						const memberName = parts.pop();
						const className = parts.join(".");
						UIClass = this._parser.classFactory.getUIClass(className);
						if (UIClass.classExists) {
							isPathValid =
								!!UIClass.methods.find(method => method.name === memberName) ||
								!!UIClass.fields.find(field => field.name === memberName);
						}
					}
				}
			}
		}

		if (!isPathValid) {
			if (className.endsWith(".")) {
				className = className.substring(0, className.length - 1);
			}
			const sFileFSPath = this._parser.fileReader
				.convertClassNameToFSPath(className)
				?.replace(".js", "")
				.replace(".ts", "");
			if (sFileFSPath) {
				isPathValid = fs.existsSync(sFileFSPath);
			}
		}

		return isPathValid;
	}
}
