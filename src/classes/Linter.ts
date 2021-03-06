import { TextDocument, UI5Parser } from "ui5plugin-parser";
import { ILinterConfigHandler } from "..";
import { PackageLinterConfigHandler } from "./config/PackageLinterConfigHandler";

export abstract class Linter {
	protected readonly _parser: UI5Parser;
	protected _configHandler: ILinterConfigHandler;
	constructor(parser: UI5Parser, configHandler?: ILinterConfigHandler) {
		this._parser = parser;
		this._configHandler = configHandler || new PackageLinterConfigHandler(parser);
	}

	abstract getLintingErrors(document: TextDocument): IError[];
}

export enum PropertiesLinters {
	UnusedTranslationsLinter = "UnusedTranslationsLinter"
}
export enum XMLLinters {
	TagAttributeLinter = "TagAttributeLinter",
	TagLinter = "TagLinter",
	UnusedNamespaceLinter = "UnusedNamespaceLinter",
	WrongFilePathLinter = "WrongFilePathLinter"
}
export enum JSLinters {
	AbstractClassLinter = "AbstractClassLinter",
	InterfaceLinter = "InterfaceLinter",
	PublicMemberLinter = "PublicMemberLinter",
	UnusedMemberLinter = "UnusedMemberLinter",
	WrongClassNameLinter = "WrongClassNameLinter",
	WrongFieldMethodLinter = "WrongFieldMethodLinter",
	WrongFilePathLinter = "WrongFilePathLinter",
	WrongImportLinter = "WrongImportLinter",
	WrongOverrideLinter = "WrongOverrideLinter",
	WrongParametersLinter = "WrongParametersLinter",
	UnusedClassLinter = "UnusedClassLinter"
}
export enum CustomDiagnosticType {
	NonExistentMethod = 1,
	NonExistentField = 2
}

export enum Severity {
	Warning = "Warning",
	Error = "Error",
	Information = "Information",
	Hint = "Hint"
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
	acornNode?: any;
	type?: CustomDiagnosticType;
	fieldName?: string;
	methodName?: string;
	sourceClassName?: string;
	source: string;
	tags?: DiagnosticTag[];
	severity: Severity;
	range: IRange;
	className: string;
	fsPath: string;
}