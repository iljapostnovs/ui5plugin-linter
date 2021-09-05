import { TextDocument } from "ui5plugin-parser";

export enum JSLinters {
	AbstractClassLinter,
	InterfaceLinter,
	PublicMemberLinter,
	UnusedMemberLinter,
	WrongClassNameLinter,
	WrongFieldMethodLinter,
	WrongFilePathLinter,
	WrongImportLinter,
	WrongOverrideLinter,
	WrongParametersLinter
}
export enum CustomDiagnosticType {
	NonExistentMethod = 1,
	NonExistentField = 2
}

export enum Severity {
	Warning = 1,
	Error = 2,
	Information = 3,
	Hint = 4
}
export enum DiagnosticTag {
	Unnecessary = 1,
	Deprecated = 2
}

export interface IPosition {
	line: number,
	column: number
}

export interface IRange {
	start: IPosition,
	end: IPosition
}

export interface IError {
	code: string;
	message: string;
	acornNode: any;
	type?: CustomDiagnosticType;
	fieldName?: string;
	methodName?: string;
	sourceClassName?: string;
	source: string;
	isController?: boolean;
	tags?: DiagnosticTag[];
	severity?: Severity;
	range: IRange;
	className: string;
}
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