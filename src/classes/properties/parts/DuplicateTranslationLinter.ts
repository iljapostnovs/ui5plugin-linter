import { ParserPool, TextDocument } from "ui5plugin-parser";
import { IInternalizationText } from "ui5plugin-parser/dist/classes/parsing/util/i18n/ResourceModelData";
import { RangeAdapter } from "../../..";
import { IError, PropertiesLinters } from "../../Linter";
import { PropertiesLinter } from "./abstraction/PropertiesLinter";

export class DuplicateTranslationLinter extends PropertiesLinter {
	protected className = PropertiesLinters.DuplicateTranslationLinter;
	protected _getErrors(document: TextDocument): IError[] | IError[] {
		const errors: IError[] = [];
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const manifest = ParserPool.getManifestForClass(className);
			const componentName = manifest?.componentName;
			if (componentName && this._parser.resourceModelData.resourceModels[componentName]) {
				const translations = this._parser.resourceModelData.resourceModels[componentName];
				translations.forEach(translation => {
					errors.push(...this._getTranslationErrors(translation, translations, document));
				});
			}
		}
		return errors;
	}
	private _getTranslationErrors(
		translation: IInternalizationText,
		translations: IInternalizationText[],
		document: TextDocument
	) {
		const errors: IError[] = [];
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		const translationId = translation.id;
		if (this._getIfTranslationIsDuplicated(translationId, translations)) {
			const range = RangeAdapter.offsetsRange(
				document.getText(),
				translation.positionBegin,
				translation.positionEnd - 1
			);
			if (range) {
				errors.push({
					code: "UI5plugin",
					message: `Translation "${translationId}" is duplicated`,
					source: this.className,
					severity: this._configHandler.getSeverity(this.className),
					range: {
						start: range.start,
						end: { column: range.end.column + 1, line: range.end.line }
					},
					className: className || "",
					fsPath: document.fileName
				});
			}
		}

		return errors;
	}
	private _getIfTranslationIsDuplicated(translationId: string, translations: IInternalizationText[]) {
		return !!translations.find(translation => translation.id === translationId)?.hasKeyCollisions;
	}
}
