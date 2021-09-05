import { TextDocument } from "ui5plugin-parser";
import { JSLinters, IError } from "../../../../Linter";

export abstract class JSLinter {
	protected abstract className: JSLinters;
	timePerChar = 0;
	protected abstract _getErrors(document: TextDocument): IError[];
	getErrors(document: TextDocument): IError[] {
		const timeStart = new Date().getTime();
		const errors = this._getErrors(document);
		if (errors instanceof Promise) {
			errors.then(() => {
				this._logTime(timeStart, document);
			});
		} else {
			this._logTime(timeStart, document);
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