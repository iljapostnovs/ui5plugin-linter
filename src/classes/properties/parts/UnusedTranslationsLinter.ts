import { ParserPool, TextDocument } from "ui5plugin-parser";
import { IInternalizationText } from "ui5plugin-parser/dist/classes/parsing/util/i18n/ResourceModelData";
import { RangeAdapter } from "../../..";
import { DiagnosticTag, IError, PropertiesLinters } from "../../Linter";
import { PropertiesLinter } from "./abstraction/PropertiesLinter";

export class UnusedTranslationsLinter extends PropertiesLinter {
	protected className = PropertiesLinters.UnusedTranslationsLinter;
	protected _getErrors(document: TextDocument): IError[] | IError[] {
		const errors: IError[] = [];
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			this._parser.resourceModelData.updateCache(document);
			const manifest = ParserPool.getManifestForClass(className);
			const componentName = manifest?.componentName;
			if (componentName && this._parser.resourceModelData.resourceModels[componentName]) {
				const translations = this._parser.resourceModelData.resourceModels[componentName];
				translations.forEach(translation => {
					errors.push(...this._getTranslationErrors(translation, document));
				});
			}
		}
		return errors;
	}
	private _getTranslationErrors(translation: IInternalizationText, document: TextDocument) {
		const errors: IError[] = [];
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		const translationId = translation.id;
		if (!this._getIfTranslationIsUsed(translationId)) {
			const range = RangeAdapter.offsetsRange(
				document.getText(),
				translation.positionBegin,
				translation.positionEnd - 1
			);
			if (range) {
				errors.push({
					code: "UI5plugin",
					message: `Translation "${translationId}" is never used`,
					source: this.className,
					severity: this._configHandler.getSeverity(this.className),
					tags: [DiagnosticTag.Unnecessary],
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
	private _getIfTranslationIsUsed(translationId: string) {
		const UIClasses = ParserPool.getAllCustomUIClasses();
		let isUsed = !!UIClasses.find(UIClass => this._checkIfUsed(UIClass.classText, translationId));
		isUsed = isUsed || !!ParserPool.getAllViews().find(view => this._checkIfUsed(view.content, translationId));
		isUsed =
			isUsed ||
			!!ParserPool.getAllFragments().find(fragment => this._checkIfUsed(fragment.content, translationId));
		isUsed =
			isUsed ||
			!!ParserPool.getAllManifests().find(manifest =>
				this._checkIfUsed(JSON.stringify(manifest.content), `{{${translationId}}}`)
			);

		return isUsed;
	}
	private _checkIfUsed(content: string, translationId: string): boolean {
		const escapedTranslationId = escapeRegExp(translationId);
		const regExp = new RegExp(`(>|"|')${escapedTranslationId}(}|"|')`);

		return regExp.test(content);
	}
}

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
