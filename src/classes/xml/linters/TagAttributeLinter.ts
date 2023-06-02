import { ParserPool, TextDocument } from "ui5plugin-parser";
import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import { ITag } from "ui5plugin-parser/dist/classes/parsing/util/xml/XMLParser";
import { RangeAdapter } from "../../..";
import { Severity, XMLLinters } from "../../Linter";
import { IXMLError, XMLLinter } from "./abstraction/XMLLinter";
import EventPatternValidator from "./pattern/EventPatternValidator";
import IdPatternValidator from "./pattern/IdPatternValidator";

interface IAttributeValidation {
	valid: boolean;
	message?: string;
	severity: Severity;
}

function isNumeric(value: string) {
	return /^-{0,1}\d+$/.test(value);
}
export class TagAttributeLinter extends XMLLinter {
	protected className = XMLLinters.TagAttributeLinter;
	protected _getErrors(document: TextDocument): IXMLError[] {
		let errors: IXMLError[] = [];

		const XMLFile = this._parser.textDocumentTransformer.toXMLFile(document);
		if (!XMLFile) {
			return errors;
		}

		const tags = this._parser.xmlParser.getAllTags(XMLFile);
		errors = tags.reduce((tagErrors: IXMLError[], tag, index) => {
			const previousTag: ITag | undefined = tags[index - 1];
			const tagAttributes = this._parser.xmlParser.getAttributesOfTheTag(tag);
			if (!tagAttributes || (previousTag && this._isTagIgnored(previousTag))) {
				return tagErrors;
			}

			const tagPrefix = this._parser.xmlParser.getTagPrefix(tag.text);
			const className = this._parser.xmlParser.getClassNameFromTag(tag.text);
			const libraryPath =
				className && this._parser.xmlParser.getLibraryPathFromTagPrefix(XMLFile, tagPrefix, tag.positionEnd);

			if (!className || !libraryPath) {
				return tagErrors;
			}

			const classOfTheTag = [libraryPath, className].join(".");
			const attributeErrors = tagAttributes.reduce(
				(errors: IXMLError[], tagAttribute) =>
					this._getTagAttributeErrors(errors, tagAttribute, {
						XMLFile,
						tags,
						tagAttributes,
						tag,
						document,
						classOfTheTag,
						previousTag
					}),
				[]
			);

			tagErrors.push(...attributeErrors);

			return tagErrors;
		}, []);

		return errors;
	}

	private _isTagIgnored(previousTag: ITag): boolean {
		return /<!-- ?@ui5ignore ?-->/.test(previousTag.text);
	}

	private _getTagAttributeErrors(
		errors: IXMLError[],
		tagAttribute: string,
		{
			classOfTheTag,
			tagAttributes,
			document,
			tags,
			tag,
			XMLFile,
			previousTag
		}: {
			classOfTheTag: string;
			tagAttributes: string[];
			document: TextDocument;
			tags: ITag[];
			tag: ITag;
			XMLFile: IXMLFile;
			previousTag: ITag | undefined;
		}
	) {
		//check tag attributes
		const attributeValidation = this._validateTagAttribute(
			classOfTheTag,
			tagAttribute,
			tagAttributes,
			document,
			tags,
			tag,
			previousTag
		);
		if (attributeValidation.valid) {
			return errors;
		}

		const indexOfTagBegining = tag.text.indexOf(tagAttribute);
		const positionBegin = tag.positionBegin + indexOfTagBegining;
		const positionEnd = positionBegin + tagAttribute.length;
		const range = RangeAdapter.offsetsRange(document.getText(), positionBegin, positionEnd);

		if (!range || !this._parser.xmlParser.getIfPositionIsNotInComments(XMLFile, tag.positionBegin)) {
			return errors;
		}

		errors.push({
			code: "UI5plugin",
			message: attributeValidation.message || "Invalid attribute",
			source: this.className,
			severity: attributeValidation.severity,
			attribute: tagAttribute,
			range: range,
			className: XMLFile.name || "",
			fsPath: XMLFile.fsPath
		});

		return errors;
	}
	private _validateTagAttribute(
		className: string,
		attribute: string,
		attributes: string[],
		document: TextDocument,
		tags: ITag[],
		tag: ITag,
		previousTag: ITag | undefined
	): IAttributeValidation {
		let attributeValidation: IAttributeValidation = {
			valid: false,
			severity: this._configHandler.getSeverity(this.className)
		};

		const UIClass = this._parser.classFactory.getUIClass(className);
		const { attributeName, attributeValue } = this._parser.xmlParser.getAttributeNameAndValue(attribute);

		const isExclusion =
			attributeName.startsWith("xmlns") || this._isAttributeNameAlwaysValid(className, attributeName);
		const isAttributeNameDuplicated = this._getIfAttributeNameIsDuplicated(attribute, attributes);
		const attributeNameValid =
			!isAttributeNameDuplicated && (isExclusion || this._validateAttributeName(className, attribute));
		const attributeValueValidData = this._validateAttributeValue(
			className,
			attribute,
			document,
			tags,
			tag,
			previousTag
		);
		attributeValidation.valid = attributeNameValid && attributeValueValidData.isValueValid;

		if (!attributeNameValid && UIClass.parentClassNameDotNotation) {
			attributeValidation = this._validateTagAttribute(
				UIClass.parentClassNameDotNotation,
				attribute,
				attributes,
				document,
				tags,
				tag,
				previousTag
			);
		} else if (!attributeValidation.valid) {
			let message = "";
			if (isAttributeNameDuplicated) {
				message = `Duplicated attribute ${attributeName}`;
			} else if (!attributeNameValid) {
				message = `Invalid attribute name (${attributeName})`;
			} else if (!attributeValueValidData.isValueValid) {
				message = attributeValueValidData.message || `Invalid attribute value (${attributeValue})`;
				attributeValidation.severity = attributeValueValidData.severity;
			}
			attributeValidation.message = message;
		}

		return attributeValidation;
	}

	private _isAttributeIgnored(previousTag: ITag | undefined, attributeName: string): boolean {
		return !!previousTag?.text
			.match(/(?<=<!-- ?@ui5ignore ?)(([a-zA-Z]|\d|,| )*?)(?= ?-->)/)?.[0]
			.split(",")
			.some(part => part.trim() === attributeName);
	}

	private _getIfAttributeNameIsDuplicated(attribute: string, attributes: string[]) {
		const attributeNames = attributes.map(
			attribute => this._parser.xmlParser.getAttributeNameAndValue(attribute).attributeName
		);
		const nameOfTheCurrentAttribute = this._parser.xmlParser.getAttributeNameAndValue(attribute).attributeName;
		const isDuplicated =
			attributeNames.filter(attributeName => attributeName === nameOfTheCurrentAttribute).length > 1;

		return isDuplicated;
	}

	private _validateAttributeValue(
		className: string,
		attribute: string,
		document: TextDocument,
		tags: ITag[],
		tag: ITag,
		previousTag: ITag | undefined
	) {
		let isValueValid = true;

		let message: string | undefined;
		let severity = this._configHandler.getSeverity(this.className);
		const shouldIdStyleBeChecked = !!this._configHandler.getIdNamingPattern();
		const { attributeName, attributeValue } = this._parser.xmlParser.getAttributeNameAndValue(attribute);

		if (this._isAttributeIgnored(previousTag, attributeName)) {
			const isValueValid = true;
			const severity = Severity.Information;
			const message = "";
			return { isValueValid, severity, message };
		}

		const UIClass = this._parser.classFactory.getUIClass(className);
		const property = UIClass.properties.find(property => property.name === attributeName);
		const event = UIClass.events.find(event => event.name === attributeName);

		let responsibleControlName;
		if (event) {
			responsibleControlName = this._parser.fileReader.getResponsibleClassForXMLDocument(document);
		}
		const isAttributeBinded = attributeValue.startsWith("{") && attributeValue.endsWith("}");

		if (attributeValue.startsWith("cmd:")) {
			isValueValid = this._checkIfCommandIsMentionedInManifest(attributeValue, document);
			if (!isValueValid) {
				message = `Command "${attributeValue}" is not found in manifest`;
			}
		} else if (attributeName === "id" && shouldIdStyleBeChecked) {
			const id = attributeValue;
			const pattern = this._configHandler.getIdNamingPattern();
			const patternValidator = new IdPatternValidator(pattern, document, this._parser, this._configHandler);

			try {
				patternValidator.validateValue(id, tag);
				isValueValid = true;
			} catch (error: any) {
				isValueValid = false;
				if (error instanceof Error) {
					message = error.message;
				}
			}
		} else if (isAttributeBinded || property?.type === "string") {
			isValueValid = true;
		} else if (property?.type === "sap.ui.core.URI") {
			isValueValid = true;
		} else if (property && property.typeValues.length > 0) {
			isValueValid = !!property.typeValues.find(typeValue => typeValue.text === attributeValue);
		} else if (property?.type === "boolean") {
			isValueValid = ["true", "false"].indexOf(attributeValue) > -1;
		} else if (property?.type === "int") {
			isValueValid = isNumeric(attributeValue);
		} else if (event && responsibleControlName) {
			const eventName = this._parser.xmlParser.getEventHandlerNameFromAttributeValue(attributeValue);
			const pattern = this._configHandler.getEventNamingPattern();
			const patternValidator = new EventPatternValidator(pattern, document, this._parser, this._configHandler);

			try {
				isValueValid = !!this._parser.xmlParser
					.getMethodsOfTheControl(responsibleControlName)
					.find(method => method.name === eventName);
				if (!isValueValid) {
					const manifest = ParserPool.getManifestForClass(eventName);
					if (manifest) {
						const parts = eventName.split(".");
						const formattedEventName = parts.pop();
						const className = parts.join(".");
						isValueValid = !!this._parser.xmlParser
							.getMethodsOfTheControl(className)
							.find(method => method.name === formattedEventName);
					} else if (eventName.split(".").length === 2) {
						({ isValueValid, message } = this._validateAttributeValueInCaseOfInTagRequire(
							eventName,
							tags,
							isValueValid,
							message
						));
					}
				} else {
					patternValidator.validateValue(eventName, [event, tag]);
				}
				message = message || `Event handler "${eventName}" not found in "${responsibleControlName}".`;
			} catch (error: any) {
				isValueValid = false;
				if (error instanceof Error) {
					message = error.message;
				}
			}
		}

		if (isValueValid && property?.defaultValue && attributeValue === property.defaultValue) {
			isValueValid = false;
			severity = Severity.Information;
			message = `Value "${attributeValue}" is unnecessary, it is the sames as default value of "${property.name}" property`;
		}

		return { isValueValid, message, severity };
	}

	private _checkIfCommandIsMentionedInManifest(attributeValue: string, document: TextDocument): boolean {
		let isCommandMentionedInManifest = false;
		const documentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName);
		const manifest = documentClassName && ParserPool.getManifestForClass(documentClassName);

		if (manifest) {
			const commandName = attributeValue.replace("cmd:", "");
			isCommandMentionedInManifest = !!manifest.content["sap.ui5"]?.commands?.[commandName];
		} else {
			//Let's skip linting if manifest wasn't found
			isCommandMentionedInManifest = true;
		}

		return isCommandMentionedInManifest;
	}

	private _validateAttributeValueInCaseOfInTagRequire(
		eventName: string,
		tags: ITag[],
		isValueValid: boolean,
		message: any
	) {
		const eventNameParts = eventName.split(".");
		const className = eventNameParts.shift();
		const methodName = eventNameParts.shift();

		if (className && methodName) {
			const attributesWithRequire = this._parser.xmlParser.getAllAttributesWithRequire(tags);
			const classPath = this._parser.xmlParser.getClassPathFromRequire(attributesWithRequire, className);
			if (classPath) {
				const className = classPath.replace(/\//g, ".");
				isValueValid = !!this._parser.xmlParser
					.getMethodsOfTheControl(className)
					.find(method => method.name === methodName);
				message = `Method "${methodName}" not found in "${className}"`;
			}
		}
		return { isValueValid, message };
	}

	private _validateAttributeName(className: string, attribute: string) {
		const indexOfEqualSign = attribute.indexOf("=");
		const attributeName = attribute.substring(0, indexOfEqualSign).trim();
		const UIClass = this._parser.classFactory.getUIClass(className);

		const property = UIClass.properties.find(property => property.name === attributeName);
		const event = UIClass.events.find(event => event.name === attributeName);
		const aggregation = UIClass.aggregations.find(aggregation => aggregation.name === attributeName);
		const association = UIClass.associations.find(association => association.name === attributeName);

		const somethingInClassWasFound = !!(property || event || aggregation || association);

		return somethingInClassWasFound;
	}

	private _isAttributeNameAlwaysValid(className: string, attribute: string) {
		const exclusions: any = {
			"*": ["id", "class", "binding"],
			"sap.ui.core.mvc.View": ["controllerName"],
			"sap.ui.core.mvc.XMLView": ["async"],
			"sap.ui.core.Fragment": ["fragmentName"],
			"sap.ui.core.ExtensionPoint": ["name"]
		};

		const isClassExclusion = exclusions[className] && exclusions[className].indexOf(attribute) > -1;
		const isAlwaysExclusion = exclusions["*"].indexOf(attribute) > -1;
		const perhapsItIsCustomData = attribute.indexOf(":") > -1;

		return isClassExclusion || isAlwaysExclusion || perhapsItIsCustomData;
	}
}
