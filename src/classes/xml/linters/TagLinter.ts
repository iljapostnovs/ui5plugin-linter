import { TextDocument, XMLParser } from "ui5plugin-parser";
import { IUIAggregation } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { IXMLFile } from "ui5plugin-parser/dist/classes/utils/FileReader";
import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import { ITag } from "ui5plugin-parser/dist/classes/utils/XMLParser";
import { RangeAdapter } from "../../..";
import { XMLLinters } from "../../Linter";
import { IXMLError, XMLLinter } from "./abstraction/XMLLinter";

export class TagLinter extends XMLLinter {
	protected className = XMLLinters.TagLinter;
	_getErrors(document: TextDocument): IXMLError[] {
		const errors: IXMLError[] = [];
		const XMLFile = TextDocumentTransformer.toXMLFile(document);
		if (XMLFile) {
			const tags = XMLParser.getAllTags(XMLFile);
			tags.forEach(tag => {
				errors.push(...this._getClassNameErrors(tag, XMLFile));
			});
		}

		// console.time("Tag linter");
		// console.timeEnd("Tag linter");

		return errors;
	}

	private _getClassNameErrors(tag: ITag, XMLFile: IXMLFile) {
		const documentText = XMLFile.content;
		const errors: IXMLError[] = [];
		const tagClass = XMLParser.getFullClassNameFromTag(tag, XMLFile);
		const documentClassName = this._parser.fileReader.getClassNameFromPath(XMLFile.fsPath) || "";
		if (!tagClass) {
			const range = RangeAdapter.offsetsRange(documentText, tag.positionBegin, tag.positionEnd);

			if (range) {
				const prefix = XMLParser.getTagPrefix(tag.text);
				errors.push({
					code: "UI5plugin",
					message: `"${prefix}" prefix is not defined`,
					source: this.className,
					severity: this._configHandler.getSeverity(this.className),
					range: range,
					className: documentClassName,
					fsPath: XMLFile.fsPath
				});
			}
		} else {
			const tagParts = tagClass.split(".");
			const tagName = tagParts.pop();
			const tagPrefixLibrary = tagParts.join(".");
			const isAggregation = tagName && tagName[0] ? tagName[0].toLowerCase() === tagName[0] : false;

			if (!isAggregation) {
				const UIClass = this._parser.classFactory.getUIClass(tagClass);
				if (!UIClass.classExists && !this._isClassException(tagClass)) {
					const range = RangeAdapter.offsetsRange(documentText, tag.positionBegin, tag.positionEnd);
					if (range && XMLParser.getIfPositionIsNotInComments(XMLFile, tag.positionBegin)) {
						errors.push({
							code: "UI5plugin",
							message: `"${tagClass}" class doesn't exist`,
							source: this.className,
							severity: this._configHandler.getSeverity(this.className),
							range: range,
							className: documentClassName,
							fsPath: XMLFile.fsPath
						});
					}
				}
			} else {
				let position = tag.positionBegin;
				if (tag.text.startsWith("</")) {
					position = tag.positionEnd;
				}
				const parentTag = XMLParser.getParentTagAtPosition(XMLFile, position - 1);
				if (parentTag.text && tagName) {
					const parentTagPrefix = XMLParser.getTagPrefix(parentTag.text);
					const tagClass = XMLParser.getFullClassNameFromTag(parentTag, XMLFile);
					if (tagClass) {
						let errorText: string | undefined;
						const parentTagPrefixLibrary = XMLParser.getLibraryPathFromTagPrefix(XMLFile, parentTagPrefix, parentTag.positionBegin);
						const aggregation = this._findAggregation(tagClass, tagName);
						if (!aggregation) {
							errorText = `"${tagName}" aggregation doesn't exist in "${tagClass}"`;
						} else if (parentTagPrefixLibrary !== tagPrefixLibrary) {
							errorText = `Library "${parentTagPrefixLibrary}" of class "${tagClass}" doesn't match with aggregation tag library "${tagPrefixLibrary}"`;
						}

						if (errorText) {
							const range = RangeAdapter.offsetsRange(documentText, tag.positionBegin, tag.positionEnd);
							if (range && XMLParser.getIfPositionIsNotInComments(XMLFile, tag.positionBegin)) {
								errors.push({
									code: "UI5plugin",
									message: errorText,
									source: this.className,
									range: range,
									severity: this._configHandler.getSeverity(this.className),
									className: documentClassName,
									fsPath: XMLFile.fsPath
								});
							}
						}
					}
				}
			}
		}

		return errors;
	}

	private _findAggregation(className: string, aggregationName: string): IUIAggregation | undefined {
		const UIClass = this._parser.classFactory.getUIClass(className);
		let aggregation = UIClass.aggregations.find(aggregation => aggregation.name === aggregationName);
		if (!aggregation && UIClass.parentClassNameDotNotation) {
			aggregation = this._findAggregation(UIClass.parentClassNameDotNotation, aggregationName);
		}

		return aggregation;
	}

	private _isClassException(className: string) {
		const exceptions = ["sap.ui.core.FragmentDefinition"];

		return exceptions.includes(className);
	}
}