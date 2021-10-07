import { TextDocument } from "ui5plugin-parser";
import { IError, Linter, XMLLinters } from "../../../Linter";
export interface IXMLError extends IError {
	attribute?: string;
}

export abstract class XMLLinter extends Linter {
	protected abstract className: XMLLinters;
	timePerChar = 0;
	protected abstract _getErrors(document: TextDocument): IError[];
	getLintingErrors(document: TextDocument): IXMLError[] {
		const errors: IError[] = [];
		const timeStart = new Date().getTime();

		if (this._configHandler.getLinterUsage(this.className) && !this._configHandler.getIfLintingShouldBeSkipped(document)) {
			try {
				errors.push(...this._getErrors(document));
				this._logTime(timeStart, document);
			} catch (error: any) {
				console.error(error);
				console.error(`Failed to lint ${document.fileName}, error: ${error.message}`);
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