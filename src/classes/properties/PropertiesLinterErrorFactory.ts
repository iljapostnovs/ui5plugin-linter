import { TextDocument } from "ui5plugin-parser";
import { IError, Linter } from "../Linter";
import { UnusedTranslationsLinter } from "./parts/UnusedTranslationsLinter";

export class PropertiesLinterErrorFactory extends Linter {
	getLintingErrors(document: TextDocument) {
		const linters: Linter[] = [
			new UnusedTranslationsLinter(this._parser, this._configHandler)
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