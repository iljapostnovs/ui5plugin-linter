import { TextDocument } from "ui5plugin-parser";
import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import { ITag } from "ui5plugin-parser/dist/classes/parsing/util/xml/XMLParser";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";

export class XMLFormatter {
	private readonly _bShouldXmlFormatterTagEndByNewline: boolean = true;
	private readonly _bShouldXmlFormatterTagSpaceBeforeSelfClose: boolean = true;
	private readonly _parser: IUI5Parser;
	private readonly _indentation: string;
	constructor(
		parser: IUI5Parser,
		options?: {
			shouldXmlFormatterTagEndByNewline?: boolean;
			shouldXmlFormatterTagSpaceBeforeSelfClose?: boolean;
			indentation?: string;
		}
	) {
		this._parser = parser;
		this._bShouldXmlFormatterTagEndByNewline = options?.shouldXmlFormatterTagEndByNewline ?? true;
		this._bShouldXmlFormatterTagSpaceBeforeSelfClose = options?.shouldXmlFormatterTagSpaceBeforeSelfClose ?? true;
		this._indentation = options?.indentation ?? "\t";
	}

	formatDocument(document: TextDocument) {
		const XMLFile = this._parser.textDocumentTransformer.toXMLFile(document, true);
		const allTags = XMLFile && this._getAllTags(XMLFile);
		if (!XMLFile || !allTags || allTags.length === 0) {
			return;
		}

		const documentNewline = document.getText().match(/\r?\n/)?.[0] ?? "\n";
		const documentNewlineEnding =
			document
				.getText()
				.slice(-2)
				.match(/\r?\n$/)?.[0] ?? "";

		let indentationLevel = 0;
		const formattedTags = allTags
			.map(currentTag => {
				const isComment = currentTag.text.startsWith("<!--");
				const isDocTypeTag = currentTag.text.startsWith("<!");
				if (isComment || isDocTypeTag) {
					const indentation = this._getIndentation(indentationLevel);
					return `${indentation}${currentTag.text}`;
				} else {
					let formattedTag;
					({ formattedTag, indentationLevel } = this._formatNonCommentTag(currentTag, indentationLevel));
					return formattedTag;
				}
			})
			.reduce(this._removeUnnecessaryTags.bind(this), []);

		return formattedTags.join(documentNewline) + documentNewlineEnding;
	}

	private _removeUnnecessaryTags(accumulator: string[], currentTag: string): string[] {
		//<Button></Button> -> <Button/>
		const lastTagInAccumulator = accumulator[accumulator.length - 1];
		const lastTagIsAnOpener =
			lastTagInAccumulator &&
			!lastTagInAccumulator.trim().startsWith("</") &&
			!lastTagInAccumulator.trim().endsWith("/>");
		if (lastTagIsAnOpener) {
			const lastTagName = this._parser.xmlParser.getClassNameFromTag(lastTagInAccumulator.trim());
			const currentTagName = this._parser.xmlParser.getClassNameFromTag(currentTag.trim());
			const bothTagsAreSameClass = lastTagName && currentTagName && lastTagName === currentTagName;
			const previousTagIsAClass = lastTagName && lastTagName[0] === lastTagName[0].toUpperCase();
			const currentTagIsClosure = currentTag.trim().startsWith("</");
			const lastTagIsNotSelfClosed = !lastTagInAccumulator.trim().endsWith("/>");
			const nextTagClosesCurrentOne =
				previousTagIsAClass && bothTagsAreSameClass && currentTagIsClosure && lastTagIsNotSelfClosed;

			if (nextTagClosesCurrentOne) {
				accumulator[accumulator.length - 1] = `${lastTagInAccumulator.substring(
					0,
					lastTagInAccumulator.length - 1
				)}/>`;
			} else {
				accumulator.push(currentTag);
			}
		} else {
			accumulator.push(currentTag);
		}

		return accumulator;
	}

	private _formatNonCommentTag(currentTag: ITag, indentationLevel: number) {
		const tagName = this._getTagName(currentTag.text);
		const tagAttributes = this._getTagAttributes(currentTag.text).map(tag => tag.toString());
		let endSubstraction = 1;
		if (currentTag.text.endsWith("/>")) {
			endSubstraction = 2;
		}
		const tagEnd = currentTag.text.substring(currentTag.text.length - endSubstraction, currentTag.text.length);

		let beginAddition = 1;
		if (currentTag.text.startsWith("</")) {
			beginAddition = 2;
		}
		const tagBegin = currentTag.text.substring(0, beginAddition);

		indentationLevel = this._modifyIndentationLevel(currentTag, indentationLevel, true);
		let indentation = this._getIndentation(indentationLevel);

		let formattedTag = `${indentation}${tagBegin}${tagName}\n`;

		if (tagAttributes.length === 1) {
			formattedTag = formattedTag.trimEnd();
		}
		formattedTag += tagAttributes.reduce((accumulator, tagAttribute) => {
			const tagData = this._parser.xmlParser.getAttributeNameAndValue(tagAttribute);
			const attributeValueIndentation =
				tagAttributes.length === 1 ? indentation : indentation + this._indentation;
			const formattedAttributeValue = this._formatAttributeValue(
				tagData.attributeValue,
				attributeValueIndentation
			);
			accumulator += `${indentation}${this._indentation}${tagData.attributeName}=${formattedAttributeValue}\n`;
			if (tagAttributes.length === 1) {
				accumulator = ` ${accumulator.trimStart()}`;
			}
			return accumulator;
		}, "");

		if (tagAttributes.length <= 1 || !this._bShouldXmlFormatterTagEndByNewline) {
			formattedTag = formattedTag.trimEnd();
			indentation = "";

			if (tagEnd === "/>" && this._bShouldXmlFormatterTagSpaceBeforeSelfClose) {
				indentation += " ";
			}
		}

		formattedTag += `${indentation}${tagEnd}`;

		indentationLevel = this._modifyIndentationLevel(currentTag, indentationLevel, false);
		return { formattedTag, indentationLevel };
	}

	private _formatAttributeValue(attributeValue: string, indentation: string) {
		let formattedValue = "";
		if (!attributeValue.startsWith("\\")) {
			let i = 0;
			while (i < attributeValue.length) {
				const currentChar = attributeValue[i];
				if (this._charIsInString(i, attributeValue)) {
					formattedValue += currentChar;
				} else if (currentChar === "(") {
					const nextChar = attributeValue[i + 1];
					if (nextChar !== "{") {
						indentation += this._indentation;
					}
					const nextLine = nextChar === "(" ? `\n${indentation}${this._indentation}` : "";
					formattedValue += `${currentChar}${nextLine}`;
				} else if (currentChar === ")") {
					const lastFormattedValueChar = formattedValue[formattedValue.length - 1];
					indentation = indentation.substring(0, indentation.length - 1);
					const nextChar = attributeValue[i + 1];
					const nextLine = !["\n", "\r", " ", undefined].includes(nextChar)
						? `\n${indentation}${this._indentation}`
						: "";
					formattedValue =
						lastFormattedValueChar === `${this._indentation}`
							? formattedValue.substring(0, formattedValue.length - 1)
							: formattedValue;
					formattedValue += `${currentChar}${nextLine}`;
				} else if (currentChar === "{") {
					const positionEnd = this._getPositionOfObjectEnd(attributeValue, i);
					const currentBindingValue = attributeValue.substring(i, positionEnd);
					try {
						const evaluatedValue = eval(`(${currentBindingValue})`);
						if (typeof evaluatedValue === "object") {
							const necessaryIndentation =
								this._getCurvyBracketsCount(attributeValue, i + 1) === 1
									? indentation
									: indentation + this._indentation;
							const formattedBinding = this._formatAttributeObject(evaluatedValue, necessaryIndentation);
							formattedValue += formattedBinding;
						}
						i = positionEnd - 1;
					} catch (error) {
						formattedValue += currentChar;
					}
				} else if (currentChar === "\n") {
					const positionEnd = this._getPositionOfIndentationEnd(attributeValue, i);
					const necessaryIndentation =
						attributeValue[positionEnd] === "}" ? indentation : indentation + this._indentation;
					formattedValue += "\n" + necessaryIndentation;
					i = positionEnd - 1;
				} else {
					formattedValue += currentChar;
				}

				i++;
			}
			formattedValue = `"${formattedValue}"`;
		} else {
			if (attributeValue.includes("'")) {
				formattedValue = `"${attributeValue}"`;
			} else {
				formattedValue = `'${attributeValue}'`;
			}
		}

		return formattedValue;
	}
	private _charIsInString(index: number, attributeValue: string) {
		let i = 0;
		let quotesQuantity = 0;
		while (i < index) {
			if (attributeValue[i] === "'") quotesQuantity++;
			i++;
		}

		return quotesQuantity % 2 === 1;
	}

	private _getCurvyBracketsCount(attributeValue: string, positionAt: number) {
		let curvedBracketsCount = 0;
		let i = 0;
		while (i < attributeValue.length && i < positionAt) {
			if (attributeValue[i] === "{") {
				curvedBracketsCount++;
			} else if (attributeValue[i] === "}") {
				curvedBracketsCount--;
			}
			i++;
		}
		return curvedBracketsCount;
	}

	private _getPositionOfObjectEnd(attributeValue: string, i: number) {
		let curvedBracketsCount = 1;
		i++;
		while (i < attributeValue.length && curvedBracketsCount !== 0) {
			if (attributeValue[i] === "{") {
				curvedBracketsCount++;
			} else if (attributeValue[i] === "}") {
				curvedBracketsCount--;
			}
			i++;
		}
		return i;
	}

	private _getPositionOfIndentationEnd(attributeValue: string, i: number) {
		i++;
		while (i < attributeValue.length && /\s/.test(attributeValue[i])) {
			i++;
		}
		return i;
	}

	private _formatAttributeObject(anyObject: any, indentation: string) {
		let formattedAttribute = "{\n";

		const keys = Object.keys(anyObject);
		keys.forEach(key => {
			const value = anyObject[key];
			formattedAttribute += `${indentation}${this._indentation}${key}: `;
			formattedAttribute += this._formatAttributeValuePart(value, indentation);
			const isLastKey = keys.indexOf(key) === keys.length - 1;
			if (!isLastKey) {
				formattedAttribute += ",";
			}
			formattedAttribute += "\n";
		});

		formattedAttribute += `${indentation}}`;

		return formattedAttribute;
	}

	private _formatAttributeValuePart(value: any, indentation: string) {
		let formattedAttribute = "";
		if (Array.isArray(value)) {
			const arrayString =
				"[" +
				value.map(innerValue => `${this._formatAttributeValuePart(innerValue, indentation)}`).join(", ") +
				"]";

			if (arrayString.length > 80 && !value.every(innerValue => typeof innerValue === "object")) {
				formattedAttribute +=
					`[\n${indentation}${this._indentation.repeat(2)}` +
					value
						.map(innerValue => this._formatAttributeValuePart(innerValue, indentation + this._indentation))
						.join(`,\n${indentation}${this._indentation.repeat(2)}`) +
					`\n${indentation}${this._indentation}]`;
			} else {
				formattedAttribute = arrayString;
			}
		} else if (typeof value === "object") {
			formattedAttribute += `${this._formatAttributeObject(value, indentation + this._indentation)}`;
		} else if (typeof value === "string") {
			formattedAttribute += `'${value.replace(/\\/g, "\\\\")}'`;
		} else if (typeof value === "function") {
			throw new Error("Parsing error");
		} else {
			formattedAttribute += `${value}`;
		}
		return formattedAttribute;
	}

	private _modifyIndentationLevel(currentTag: ITag, indentationLevel: number, beforeTagGeneration: boolean) {
		if (beforeTagGeneration && currentTag.text.startsWith("</")) {
			indentationLevel--;
		} else if (
			!beforeTagGeneration &&
			currentTag.text.startsWith("<") &&
			!currentTag.text.endsWith("/>") &&
			!currentTag.text.startsWith("</")
		) {
			indentationLevel++;
		}

		return indentationLevel;
	}

	private _getIndentation(indentationLevel: number) {
		const indentationChar = this._indentation;
		let indentation = "";

		for (let i = 0; i < indentationLevel; i++) {
			indentation += indentationChar;
		}

		return indentation;
	}

	private _getTagName(tag: string) {
		let i = 1; //first char is "<", that's why we start with second char
		while (!tag[i].match(/(\s|>|\n)/) && i < tag.length) {
			i++;
		}
		tag = tag.substring(1, i);
		if (tag.startsWith("/")) {
			tag = tag.substring(1, tag.length);
		}
		if (tag.endsWith("/")) {
			tag = tag.substring(0, tag.length - 1);
		}

		return tag;
	}

	private _getTagAttributes(tag: string) {
		const tagAttributes =
			tag.match(/((?<=\s)(\w|:|\.)*(\s?)=(\s?)"(\s|.)*?")|((?<=\s)(\w|:|\.)*(\s?)=(\s?)'(\s|.)*?')/g) || [];

		return tagAttributes;
	}

	private _getAllTags(document: IXMLFile) {
		let i = 0;
		const tags: ITag[] = [];
		const allStringsAreClosed = this._getIfAllStringsAreClosed(document);

		if (allStringsAreClosed) {
			while (i < document.content.length) {
				const possiblyDocType = document.content.substring(i, i + 9).toLowerCase();
				const isDocType = possiblyDocType === "<!doctype";
				const thisIsTagEnd =
					document.content[i] === ">" &&
					!this._parser.xmlParser.getIfPositionIsInString(document, i) &&
					(this._parser.xmlParser.getIfPositionIsNotInComments(document, i) ||
						document.content.substring(i - 2, i + 1) === "-->");
				if (thisIsTagEnd) {
					const indexOfTagBegining = this._getTagBeginingIndex(document, i);
					tags.push({
						text: document.content.substring(indexOfTagBegining, i + 1),
						positionBegin: indexOfTagBegining,
						positionEnd: i
					});
				} else if (isDocType) {
					const doctypeTag = this._processDocType(document, i);
					tags.push(doctypeTag);
					i += doctypeTag.text.length;
				}
				i++;
			}
		}

		return tags;
	}
	private _processDocType(document: IXMLFile, i: number): ITag {
		const doctypeBeginIndex = i;
		let doctypeEndIndex = i;

		let tagOpeningCount = 0;
		let tagClosingCount = 0;
		while (doctypeEndIndex === doctypeBeginIndex && i < document.content.length) {
			if (
				!this._parser.xmlParser.getIfPositionIsInString(document, i) &&
				this._parser.xmlParser.getIfPositionIsNotInComments(document, i)
			) {
				if (document.content[i] === "<") {
					tagOpeningCount++;
				} else if (document.content[i] === ">") {
					tagClosingCount++;
				}
				if (tagOpeningCount === tagClosingCount) {
					doctypeEndIndex = i + 1;
				}
			}
			i++;
		}

		return {
			text: document.content.substring(doctypeBeginIndex, doctypeEndIndex),
			positionBegin: doctypeBeginIndex,
			positionEnd: doctypeEndIndex
		};
	}

	private _getIfAllStringsAreClosed(document: IXMLFile) {
		return this._parser.xmlParser.getStringPositionMapping(document).areAllStringsClosed;
	}

	private _getTagBeginingIndex(document: IXMLFile, position: number) {
		let i = position;
		let shouldStop = i < 0;
		let isThisTagBegining =
			document.content[i] === "<" &&
			(this._parser.xmlParser.getIfPositionIsNotInComments(document, i) ||
				document.content.substring(i, i + 4) === "<!--");
		shouldStop ||= isThisTagBegining;

		while (!shouldStop) {
			i--;

			shouldStop = i < 0;
			isThisTagBegining =
				document.content[i] === "<" &&
				(this._parser.xmlParser.getIfPositionIsNotInComments(document, i) ||
					document.content.substring(i, i + 4) === "<!--");
			shouldStop ||= isThisTagBegining;
		}

		return i;
	}
}
