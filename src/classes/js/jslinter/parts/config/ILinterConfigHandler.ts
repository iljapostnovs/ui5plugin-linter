import { JSLinters, Severity, XMLLinters } from "../../../../Linter";

export interface JSLinterException {
	className: string;
	memberName: string;
	applyToChildren?: boolean
}

export interface ILinterConfigHandler {
	getJSLinterExceptions(): JSLinterException[];
	getSeverity(linter: JSLinters | XMLLinters): Severity;
	checkIfMemberIsException(className: string, memberName: string): boolean;
	getLinterUsage(linter: JSLinters): boolean;
}

interface IUI5LinterEntryFields {
	severity?: {
		[key in JSLinters | XMLLinters]: Severity
	},
	usage?: {
		[key in JSLinters | XMLLinters]: boolean
	},
	JSLinterExceptions?: JSLinterException[],
}

export interface IUI5LinterEntry {
	ui5linter?: IUI5LinterEntryFields
}

export interface IUI5PackageConfigEntry {
	ui5?: IUI5LinterEntry
}