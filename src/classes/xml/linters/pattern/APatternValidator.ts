import { ParserPool, TextDocument } from "ui5plugin-parser";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { ILinterConfigHandler } from "../../../config/ILinterConfigHandler";
import { PascalCase } from "./transform/PascalCase";

export default abstract class APatternValidator<AdditionalData> {
	protected readonly _pattern: string;
	protected readonly _parser: IUI5Parser;
	protected readonly _configHandler: ILinterConfigHandler;
	protected readonly _document: TextDocument;
	constructor(pattern: string, document: TextDocument, parser: IUI5Parser, configHandler: ILinterConfigHandler) {
		this._pattern = pattern;
		this._configHandler = configHandler;
		this._parser = parser;
		this._document = document;
	}

	abstract validateValue(value: string, additionalData: AdditionalData): void;

	protected _getBindingPathFrom(attributeValue: string) {
		const isObject = attributeValue.startsWith("{") && attributeValue.endsWith("}");
		// /MyPath
		// MyPath
		// MyModel>MyPath
		// MyModel>/MyPath
		// MyModel>/MY_PATH
		// MyModel>/MyPath/AnotherPath
		// MyModel>/MyPath/AnotherPath/results
		// i18n>text

		let path = attributeValue;
		if (isObject) {
			try {
				const theObject = eval(`(${attributeValue})`);
				path = theObject?.path ?? "";
			} catch (error) {
				path = attributeValue.substring(1, attributeValue.length - 1);
			}
		}

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
					const partLower = this._isUpperCase(part) ? part.toLowerCase() : part;
					const pascalCase = this._toFirstCharUpper(partLower);

					return pascalCase;
				})
				.join("");

			return lastPartPascalCase;
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

	protected _isUpperCase(anyString: string) {
		return anyString.split("").every(char => char.toUpperCase() === char);
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
