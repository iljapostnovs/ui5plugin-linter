import { JSLinters, Severity, XMLLinters } from "../../../../Linter";

export interface JSLinterException {
	className: string;
	memberName: string;
	applyToChildren?: boolean
}

export interface IConfigHandler {
	getJSLinterExceptions(): JSLinterException[];
	getSeverity(linter: JSLinters | XMLLinters): Severity;
}