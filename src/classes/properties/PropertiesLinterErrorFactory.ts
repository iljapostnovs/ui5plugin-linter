import { TextDocument } from "ui5plugin-parser";
import { IError, Linter } from "../Linter";
import { UnusedTranslationsLinter } from "./parts/UnusedTranslationsLinter";
import { DuplicateTranslationLinter } from "./parts/DuplicateTranslationLinter";

export class PropertiesLinterErrorFactory extends Linter<any, any> {
	getLintingErrors(document: TextDocument) {
		const linters: Linter<any, any>[] = [
			new UnusedTranslationsLinter(this._parser, this._configHandler),
			new DuplicateTranslationLinter(this._parser, this._configHandler)
		];

		let errors: IError[] = [];
		try {
			for (const linter of linters) {
				errors = errors.concat(linter.getLintingErrors(document));
			}
		} catch (error) {
			console.error(error);
		}

		// copy(JSON.stringify(errors.map(error => ({text: error.message}))))
		return errors;
	}
}