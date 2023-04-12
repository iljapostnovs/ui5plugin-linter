import { TextDocument, UI5JSParser } from "ui5plugin-parser";
import {
	ICustomClassField,
	ICustomClassMethod,
	ICustomMember
} from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { IError, JSLinters } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";
export class InterfaceLinter extends JSLinter<UI5JSParser, CustomJSClass> {
	protected className = JSLinters.InterfaceLinter;
	protected _getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const UIClass = this._parser.textDocumentTransformer.toCustomUIClass(document);
		if (UIClass?.interfaces && UIClass.interfaces.length > 0) {
			const interfaceMembers: ICustomMember[] = UIClass.interfaces.flatMap(theInterface => [
				...(this._parser.classFactory.getClassMethods(theInterface, false) as ICustomClassMethod[]),
				...(this._parser.classFactory.getClassFields(theInterface, false) as ICustomClassField[])
			]);
			const undefinedMembers: ICustomMember[] = [];
			const members = [...UIClass.methods, ...UIClass.fields];
			interfaceMembers.forEach(interfaceMember => {
				const memberDefined = !!members.find(member => member.name === interfaceMember.name);
				if (!memberDefined) {
					undefinedMembers.push(interfaceMember);
				}
			});
			undefinedMembers.forEach(member => {
				errors.push({
					source: this.className,
					acornNode: null,
					className: UIClass.className,
					code: "UI5Plugin",
					message: `Interface "${member.owner}" requires "${member.name}" member implementation`,
					range: {
						start: { line: 1, column: 0 },
						end: { line: 1, column: 0 }
					},
					severity: this._configHandler.getSeverity(this.className),
					fsPath: document.fileName
				});
			});
		}

		return errors;
	}
}
