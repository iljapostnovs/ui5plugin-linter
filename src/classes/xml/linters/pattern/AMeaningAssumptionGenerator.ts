import { ParserPool, TextDocument } from "ui5plugin-parser";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { ILinterConfigHandler } from "../../../config/ILinterConfigHandler";
import { PascalCase } from "./transform/PascalCase";

export default abstract class AMeaningAssumptionGenerator {
	protected readonly _pattern: string;
	protected readonly _document: TextDocument;
	protected readonly _parser: IUI5Parser;
	protected readonly _configHandler: ILinterConfigHandler;
	constructor(pattern: string, document: TextDocument, parser: IUI5Parser, configHandler: ILinterConfigHandler) {
		this._pattern = pattern;
		this._document = document;
		this._parser = parser;
		this._configHandler = configHandler;
	}

	protected _generateMeaningAssumption(tagAttributes: string[]) {
		const validForSearchAttributes = this._configHandler.getAttributesToCheck();
		const bindingAttribute = tagAttributes?.find(attribute => {
			const { attributeName } = this._parser.xmlParser.getAttributeNameAndValue(attribute);

			return validForSearchAttributes.includes(attributeName);
		});
		const { attributeValue: binding } = bindingAttribute
			? this._parser.xmlParser.getAttributeNameAndValue(bindingAttribute)
			: { attributeValue: undefined };

		const meaningAssumption = binding && this._getMeaningAssumptionFrom(binding);

		return meaningAssumption;
	}

	protected _getMeaningAssumptionFrom(attributeValue: string) {
		let isBinding = attributeValue.startsWith("{") && attributeValue.endsWith("}");
		if (isBinding) {
			if (!(attributeValue.match(/\{/g)?.length === 1 && attributeValue.match(/\}/g)?.length === 1)) {
				try {
					eval(`(${attributeValue})`);
				} catch (oError) {
					isBinding = false;
				}
			}
		}
		// /MyPath
		// MyPath
		// MyModel>MyPath
		// MyModel>/MyPath
		// MyModel>/MY_PATH
		// MyModel>/MyPath/AnotherPath
		// MyModel>/MyPath/AnotherPath/results
		// i18n>text

		let path = attributeValue;
		if (isBinding) {
			try {
				const theObject = eval(`(${attributeValue})`);
				path = theObject?.path ?? "";
			} catch (error) {
				path = attributeValue.substring(1, attributeValue.length - 1);
			}
		}

		if (isBinding) {
			const pathWithoutModel = path.split(">").pop();
			const model = path.split(">").shift();
			if (model === "i18n" && pathWithoutModel) {
				const i18nText = this._getI18nTextById(pathWithoutModel);
				const i18nPascalCase = i18nText && new PascalCase().transform(i18nText);

				return i18nPascalCase;
			} else {
				const pathWithoutResults = pathWithoutModel?.replace(/\/results$/, "");
				const pathLastPart = pathWithoutResults?.split("/").pop();
				const lastPartWithoutUnderscoreParts = pathLastPart?.split("_");
				const lastPartPascalCase = lastPartWithoutUnderscoreParts
					?.map(part => {
						const partLower = this._isUpperCase(part) ? part?.toLowerCase() : part;
						const pascalCase = this._toFirstCharUpper(partLower);

						return pascalCase;
					})
					.join("")
					.replace(/[^a-zA-Z| ]/g, "");

				return lastPartPascalCase;
			}
		} else if (!attributeValue.startsWith("{") && !attributeValue.endsWith("}")) {
			return new PascalCase().transform(path);
		}
	}
	private _getI18nTextById(i18nId: string) {
		const className = this._parser.fileReader.getClassNameFromPath(this._document.fileName);
		const manifest = className && ParserPool.getManifestForClass(className);
		const componentName = manifest && manifest.componentName;
		const translations = componentName && this._parser.resourceModelData.resourceModels[componentName];
		if (translations) {
			return translations.find(translation => translation.id === i18nId)?.description;
		}
	}

	protected _isUpperCase(anyString?: string) {
		return anyString?.split("").every(char => char.toUpperCase() === char);
	}

	protected _toFirstCharLower(anyString?: string) {
		if (!anyString) {
			return "";
		} else if (anyString.length === 1) {
			return anyString[0].toLowerCase();
		} else {
			return anyString[0].toLowerCase() + anyString.substring(1, anyString.length);
		}
	}

	protected _toFirstCharUpper(anyString?: string) {
		if (!anyString) {
			return "";
		} else if (anyString.length === 1) {
			return anyString[0].toUpperCase();
		} else {
			return anyString[0].toUpperCase() + anyString.substring(1, anyString.length);
		}
	}
}
