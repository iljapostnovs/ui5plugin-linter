
import { TextDocument, UI5Parser } from "ui5plugin-parser";
import { ICustomMember } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import { JSLinters, IError, Severity } from "../../../Linter";
import { JSLinter } from "./abstraction/JSLinter";
export class InterfaceLinter extends JSLinter {
	protected className = JSLinters.InterfaceLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const UIClass = TextDocumentTransformer.toCustomUIClass(document);
		if (UIClass?.interfaces && UIClass.interfaces.length > 0) {
			const interfaceMembers: ICustomMember[] = UIClass.interfaces.flatMap(theInterface => [
				...UI5Parser.getInstance().classFactory.getClassMethods(theInterface, false),
				...UI5Parser.getInstance().classFactory.getClassFields(theInterface, false)
			]);
			const undefinedMembers: ICustomMember[] = [];
			const members = [
				...UIClass.methods,
				...UIClass.fields
			];
			interfaceMembers.forEach(interfaceMember => {
				const memberDefined = !!members.find(member => member.name === interfaceMember.name);
				if (!memberDefined) {
					undefinedMembers.push(interfaceMember);
				}
			});
			undefinedMembers.forEach(member => {
				errors.push({
					source: "Interface linter",
					acornNode: null,
					className: UIClass.className,
					code: "UI5Plugin",
					message: `Interface "${member.owner}" requires "${member.name}" member implementation`,
					range: {
						start: { line: 0, column: 0 },
						end: { line: 0, column: 0 }
					},
					severity: Severity.Error
				});
			});

		}

		return errors;
	}
}