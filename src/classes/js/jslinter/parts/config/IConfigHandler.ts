export interface JSLinterException {
	className: string;
	memberName: string;
	applyToChildren?: boolean
}

export interface IConfigHandler {
	getJSLinterExceptions(): JSLinterException[];
}