import { TextDocument } from "ui5plugin-parser";
import { ICustomMember } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import { JSLinters, IError } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";
export class AbstractClassLinter extends JSLinter {
	protected className = JSLinters.AbstractClassLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const UIClass = TextDocumentTransformer.toCustomUIClass(document);
		if (UIClass?.parentClassNameDotNotation) {
			const parent = this._parser.classFactory.getParent(UIClass);
			if (parent?.abstract) {
				const undefinedMembers: ICustomMember[] = [];
				const members = [
					...UIClass.methods,
					...UIClass.fields
				];
				const parentMembers = [
					...parent.methods,
					...parent.fields
				];
				const abstractMembers = parentMembers.filter(member => member.abstract);
				abstractMembers.forEach(abstractMember => {
					const memberDefined = !!members.find(member => member.name === abstractMember.name);
					if (!memberDefined) {
						undefinedMembers.push(abstractMember);
					}
				});
				undefinedMembers.forEach(member => {
					errors.push({
						source: this.className,
						acornNode: null,
						className: UIClass.className,
						code: "UI5Plugin",
						message: `Abstract class "${member.owner}" requires "${member.name}" member implementation`,
						range: {
							start: { line: 0, column: 0 },
							end: { line: 0, column: 0 }
						},
						severity: this._configHandler.getSeverity(this.className)
					});
				});
			}
		}

		return errors;
	}
}