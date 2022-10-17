import { TextDocument } from "ui5plugin-parser";
import { AbstractCustomClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import { AbstractUI5Parser } from "ui5plugin-parser/dist/IUI5Parser";
import { JSLinters, IError, Linter } from "../../../Linter";

export abstract class JSLinter<Parser extends AbstractUI5Parser<CustomClass>, CustomClass extends AbstractCustomClass> extends Linter<Parser, CustomClass> {
	protected abstract className: JSLinters;
	timePerChar = 0;
	protected abstract _getErrors(document: TextDocument): IError[];
	getLintingErrors(document: TextDocument): IError[] {
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