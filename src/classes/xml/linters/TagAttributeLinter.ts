import { TextDocument, XMLParser } from "ui5plugin-parser";
import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import { RangeAdapter } from "../../..";
import { Severity, XMLLinters } from "../../Linter";
import { IXMLError, XMLLinter } from "./abstraction/XMLLinter";

interface IAttributeValidation {
	valid: boolean;
	message?: string;
	severity: Severity
}

function isNumeric(value: string) {
	return /^-{0,1}\d+$/.test(value);
}
export class TagAttributeLinter extends XMLLinter {
	protected className = XMLLinters.TagAttributeLinter;
	protected _getErrors(document: TextDocument): IXMLError[] {
		const errors: IXMLError[] = [];
		const documentText = document.getText();

		//check tags
		// console.time("Tag attribute linter");

		const XMLFile = TextDocumentTransformer.toXMLFile(document);
		const documentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (XMLFile) {
			const tags = XMLParser.getAllTags(XMLFile);
			tags.forEach((tag, index) => {
				const previousTag = tags[index - 1];
				const tagAttributes = XMLParser.getAttributesOfTheTag(tag);
				if (tagAttributes && previousTag?.text !== "<!-- @ui5ignore -->") {
					const tagPrefix = XMLParser.getTagPrefix(tag.text);
					const className = XMLParser.getClassNameFromTag(tag.text);

					if (className) {
						const libraryPath = XMLParser.getLibraryPathFromTagPrefix(XMLFile, tagPrefix, tag.positionEnd);
						if (libraryPath) {
							//check if tag class exists
							const classOfTheTag = [libraryPath, className].join(".");
							tagAttributes.forEach(tagAttribute => {
								//check tag attributes
								const attributeValidation = this._validateTagAttribute(classOfTheTag, tagAttribute, tagAttributes, document);
								if (!attributeValidation.valid) {
									const indexOfTagBegining = tag.text.indexOf(tagAttribute);
									const positionBegin = tag.positionBegin + indexOfTagBegining;
									const positionEnd = positionBegin + tagAttribute.length - 1;
									const range = RangeAdapter.offsetsRange(documentText, positionBegin, positionEnd);
									if (range && XMLParser.getIfPositionIsNotInComments(XMLFile, tag.positionBegin)) {
										errors.push({
											code: "UI5plugin",
											message: attributeValidation.message || "Invalid attribute",
											source: this.className,
											severity: this._configHandler.getSeverity(this.className),
											attribute: tagAttribute,
											range: range,
											className: documentClassName || "",
											fsPath: XMLFile.fsPath
										});
									}
								}
							});
						}
					}
				}
			});
		}
		return errors;
	}
	private _validateTagAttribute(className: string, attribute: string, attributes: string[], document: TextDocument): IAttributeValidation {
		let attributeValidation: IAttributeValidation = {
			valid: false,
			severity: this._configHandler.getSeverity(this.className)
		};

		const UIClass = this._parser.classFactory.getUIClass(className);
		const { attributeName, attributeValue } = XMLParser.getAttributeNameAndValue(attribute);

		const isExclusion = attributeName.startsWith("xmlns") || this._isAttributeAlwaysValid(className, attributeName);
		const isAttributeNameDuplicated = this._getIfAttributeNameIsDuplicated(attribute, attributes);
		const attributeNameValid = !isAttributeNameDuplicated && (isExclusion || this._validateAttributeName(className, attribute));
		const attributeValueValidData = this._validateAttributeValue(className, attribute, document);
		attributeValidation.valid = attributeNameValid && attributeValueValidData.isValueValid;

		if (!attributeNameValid && UIClass.parentClassNameDotNotation) {
			attributeValidation = this._validateTagAttribute(UIClass.parentClassNameDotNotation, attribute, attributes, document);
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

	private _getIfAttributeNameIsDuplicated(attribute: string, attributes: string[]) {
		const attributeNames = attributes.map(attribute => XMLParser.getAttributeNameAndValue(attribute).attributeName);
		const nameOfTheCurrentAttribute = XMLParser.getAttributeNameAndValue(attribute).attributeName;
		const isDuplicated = attributeNames.filter(attributeName => attributeName === nameOfTheCurrentAttribute).length > 1;

		return isDuplicated;
	}

	private _validateAttributeValue(className: string, attribute: string, document: TextDocument) {
		let isValueValid = true;
		let message;
		const	severity = this._configHandler.getSeverity(this.className);
		const { attributeName, attributeValue } = XMLParser.getAttributeNameAndValue(attribute);
		const UIClass = this._parser.classFactory.getUIClass(className);
		const property = UIClass.properties.find(property => property.name === attributeName);
		const event = UIClass.events.find(event => event.name === attributeName);

		let responsibleControlName;
		if (event) {
			responsibleControlName = this._parser.fileReader.getResponsibleClassForXMLDocument(document);
		}
		const isAttributeBinded = attributeValue.startsWith("{") && attributeValue.endsWith("}");

		if (isAttributeBinded || property?.type === "string") {
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
			const eventName = XMLParser.getEventHandlerNameFromAttributeValue(attributeValue);
			isValueValid = !!XMLParser.getMethodsOfTheControl(responsibleControlName).find(method => method.name === eventName);
			if (!isValueValid) {
				const manifest = this._parser.fileReader.getManifestForClass(eventName);
				if (manifest) {
					const parts = eventName.split(".");
					const formattedEventName = parts.pop();
					const className = parts.join(".");
					isValueValid = !!XMLParser.getMethodsOfTheControl(className).find(method => method.name === formattedEventName);
				}
			}
			message = `Event handler "${eventName}" not found in "${responsibleControlName}".`
		}

		if (isValueValid && property?.defaultValue && attributeValue === property.defaultValue) {
			isValueValid = false;
			message = `Value "${attributeValue}" is unnecessary, it is the sames as default value of "${property.name}" property`;
		}

		return { isValueValid, message, severity };
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

	private _isAttributeAlwaysValid(className: string, attribute: string) {
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