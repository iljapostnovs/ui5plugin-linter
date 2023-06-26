import { TextDocument } from "ui5plugin-parser";
import { JSLinters, PropertiesLinters, Severity, XMLLinters } from "../Linter";

export interface JSLinterException {
	className: string;
	memberName: string;
	applyToChildren?: boolean;
}

export interface ILinterConfigHandler {
	getJSLinterExceptions(): JSLinterException[];
	getPropertiesLinterExceptions(): string[];
	getSeverity(linter: JSLinters | XMLLinters | PropertiesLinters): Severity;
	checkIfMemberIsException(className: string, memberName: string): boolean;
	getLinterUsage(linter: JSLinters | XMLLinters | PropertiesLinters): boolean;
	getIfLintingShouldBeSkipped(document: TextDocument): boolean;
	getIdNamingPattern(): string;
	getEventNamingPattern(): string;
	getAttributesToCheck(): string[];
	packagePath: string;
	configPath?: string;
}
