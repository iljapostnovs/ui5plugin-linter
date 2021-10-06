import { TextDocument } from "ui5plugin-parser";
import { JSLinters, PropertiesLinters, Severity, XMLLinters } from "../Linter";

export interface JSLinterException {
	className: string
	memberName: string
	applyToChildren?: boolean
}

export interface ILinterConfigHandler {
	getJSLinterExceptions(): JSLinterException[]
	getSeverity(linter: JSLinters | XMLLinters | PropertiesLinters): Severity
	checkIfMemberIsException(className: string, memberName: string): boolean
	getLinterUsage(linter: JSLinters | XMLLinters | PropertiesLinters): boolean
	getIfLintingShouldBeSkipped(document: TextDocument): boolean
}

export interface IUI5LinterEntryFields {
	severity?: {
		[key in JSLinters | XMLLinters | PropertiesLinters]: Severity
	},
	usage?: {
		[key in JSLinters | XMLLinters | PropertiesLinters]: boolean
	},
	jsLinterExceptions?: JSLinterException[]
	jsClassExceptions?: string[]
	xmlClassExceptions?: string[]
	componentsToInclude?: string[]
	componentsToExclude?: string[]
}

export interface IUI5LinterEntry {
	ui5linter?: IUI5LinterEntryFields
}

export interface IUI5PackageConfigEntry {
	ui5?: IUI5LinterEntry
}