import { TextDocument, UI5JSParser } from "ui5plugin-parser";
import { ICustomMember } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { IError, JSLinters } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";
export class AbstractClassLinter extends JSLinter<UI5JSParser, CustomJSClass> {
	protected className = JSLinters.AbstractClassLinter;
	protected _getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const UIClass = this._parser.textDocumentTransformer.toCustomUIClass(document);
		if (UIClass?.parentClassNameDotNotation) {
			const parent = this._parser.classFactory.getParent(UIClass);
			if (parent?.abstract && parent instanceof CustomJSClass) {
				const undefinedMembers: ICustomMember[] = [];
				const members = [...UIClass.methods, ...UIClass.fields];
				const parentMembers = [...parent.methods, ...parent.fields];
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
							start: { line: 1, column: 0 },
							end: { line: 1, column: 0 }
						},
						severity: this._configHandler.getSeverity(this.className),
						fsPath: document.fileName
					});
				});
			}
		}

		return errors;
	}
}
