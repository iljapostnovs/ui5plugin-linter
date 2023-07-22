import { TextDocument } from "ui5plugin-parser";
import { IUIAggregation } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractBaseClass";
import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import { ITag } from "ui5plugin-parser/dist/classes/parsing/util/xml/XMLParser";
import { RangeAdapter } from "../../..";
import { DiagnosticTag, XMLLinters } from "../../Linter";
import { IXMLError, XMLLinter } from "./abstraction/XMLLinter";

export class TagLinter extends XMLLinter {
	protected className = XMLLinters.TagLinter;
	protected _getErrors(document: TextDocument): IXMLError[] {
		const errors: IXMLError[] = [];
		const XMLFile = this._parser.textDocumentTransformer.toXMLFile(document);
		if (XMLFile) {
			const tags = this._parser.xmlParser.getAllTags(XMLFile);
			tags.forEach((tag, index) => {
				const previousTag = tags[index - 1];
				if (!previousTag || previousTag.text !== "<!-- @ui5ignore -->") {
					errors.push(...this._getClassNameErrors(tag, XMLFile));
				}
			});
		}

		return errors;
	}

	private _getClassNameErrors(tag: ITag, XMLFile: IXMLFile) {
		const documentText = XMLFile.content;
		const errors: IXMLError[] = [];
		const tagClass = this._parser.xmlParser.getFullClassNameFromTag(tag, XMLFile);
		const documentClassName = this._parser.fileReader.getClassNameFromPath(XMLFile.fsPath) || "";
		if (!tagClass) {
			const range = RangeAdapter.offsetsRange(documentText, tag.positionBegin, tag.positionEnd + 1);

			if (range && this._parser.xmlParser.getIfPositionIsNotInComments(XMLFile, tag.positionBegin)) {
				const prefix = this._parser.xmlParser.getTagPrefix(tag.text);
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
				this._lintClass(tagClass, documentText, tag, XMLFile, errors, documentClassName);
			} else {
				this._lintAggregation(tag, XMLFile, tagName, tagPrefixLibrary, documentText, errors, documentClassName);
			}
		}

		return errors;
	}

	private _lintAggregation(
		tag: ITag,
		XMLFile: IXMLFile,
		tagName: string | undefined,
		tagPrefixLibrary: string,
		documentText: string,
		errors: IXMLError[],
		documentClassName: string
	) {
		let position = tag.positionBegin;
		if (tag.text.startsWith("</")) {
			position = tag.positionEnd;
		}
		const parentTag = this._parser.xmlParser.getParentTagAtPosition(XMLFile, position - 1);
		if (parentTag.text && tagName) {
			const parentTagPrefix = this._parser.xmlParser.getTagPrefix(parentTag.text);
			const tagClass = this._parser.xmlParser.getFullClassNameFromTag(parentTag, XMLFile);
			if (tagClass) {
				let errorText: string | undefined;
				const parentTagPrefixLibrary = this._parser.xmlParser.getLibraryPathFromTagPrefix(
					XMLFile,
					parentTagPrefix,
					parentTag.positionBegin
				);
				const aggregation = this._findAggregation(tagClass, tagName);
				if (!aggregation) {
					errorText = `"${tagName}" aggregation doesn't exist in "${tagClass}"`;
				} else if (parentTagPrefixLibrary !== tagPrefixLibrary) {
					errorText = `Library "${parentTagPrefixLibrary}" of class "${tagClass}" doesn't match with aggregation tag library "${tagPrefixLibrary}"`;
				}

				if (errorText) {
					const range = RangeAdapter.offsetsRange(documentText, tag.positionBegin, tag.positionEnd + 1);
					if (range && this._parser.xmlParser.getIfPositionIsNotInComments(XMLFile, tag.positionBegin)) {
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

	private _lintClass(
		tagClass: string,
		documentText: string,
		tag: ITag,
		XMLFile: IXMLFile,
		errors: IXMLError[],
		documentClassName: string
	) {
		const UIClass = this._parser.classFactory.getUIClass(tagClass);
		if (!UIClass.classExists && !this._isClassException(tagClass)) {
			this._lintIfClassExists(documentText, tag, XMLFile, errors, tagClass, documentClassName);
		} else if (UIClass.classExists && UIClass.deprecated && !this._isClassException(tagClass)) {
			this._lintIfClassIsDeprecated(documentText, tag, XMLFile, errors, tagClass, documentClassName);
		}
	}

	private _lintIfClassIsDeprecated(
		documentText: string,
		tag: ITag,
		XMLFile: IXMLFile,
		errors: IXMLError[],
		tagClass: string,
		documentClassName: string
	) {
		const range = RangeAdapter.offsetsRange(documentText, tag.positionBegin, tag.positionEnd + 1);
		if (range && this._parser.xmlParser.getIfPositionIsNotInComments(XMLFile, tag.positionBegin)) {
			errors.push({
				code: "UI5plugin",
				message: `"${tagClass}" class is deprecated`,
				source: this.className,
				severity: this._configHandler.getSeverity(this.className),
				range: range,
				className: documentClassName,
				fsPath: XMLFile.fsPath,
				tags: [DiagnosticTag.Deprecated]
			});
		}
	}

	private _lintIfClassExists(
		documentText: string,
		tag: ITag,
		XMLFile: IXMLFile,
		errors: IXMLError[],
		tagClass: string,
		documentClassName: string
	) {
		const range = RangeAdapter.offsetsRange(documentText, tag.positionBegin, tag.positionEnd + 1);
		if (range && this._parser.xmlParser.getIfPositionIsNotInComments(XMLFile, tag.positionBegin)) {
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
