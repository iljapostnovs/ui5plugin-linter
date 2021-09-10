import { TextDocument } from "ui5plugin-parser";
import { IError, Linter, PropertiesLinters } from "../../../Linter";

export abstract class PropertiesLinter extends Linter {
	protected abstract className: PropertiesLinters;
	timePerChar = 0;
	protected abstract _getErrors(document: TextDocument): IError[];
	getLintingErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];
		const timeStart = new Date().getTime();

		if (this._configHandler.getLinterUsage(this.className)) {
			errors.push(...this._getErrors(document));
			if (errors instanceof Promise) {
				errors.then(() => {
					this._logTime(timeStart, document);
				});
			} else {
				this._logTime(timeStart, document);
			}
		}

		return errors;
	}

	private _logTime(timeStart: number, document: TextDocument) {
		const timeEnd = new Date().getTime();

		const timeSpent = timeEnd - timeStart;
		this.timePerChar = timeSpent / document.getText().length;
		// console.log(`Time spent by ${this.className}: ${timeSpent}`);
	}
}