import { TextDocument } from "ui5plugin-parser";

export abstract class Linter {
	abstract getLintingErrors(document: TextDocument): Promise<IError[]>;
}
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