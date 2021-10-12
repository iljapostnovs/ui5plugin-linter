
import { TextDocument } from "ui5plugin-parser";
import { ICustomMember } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { TextDocumentTransformer } from "ui5plugin-parser/dist/classes/utils/TextDocumentTransformer";
import { JSLinters, IError } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";
export class InterfaceLinter extends JSLinter {
	protected className = JSLinters.InterfaceLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const UIClass = TextDocumentTransformer.toCustomUIClass(document);
		if (UIClass?.interfaces && UIClass.interfaces.length > 0) {
			const interfaceMembers: ICustomMember[] = UIClass.interfaces.flatMap(theInterface => [
				...this._parser.classFactory.getClassMethods(theInterface, false),
				...this._parser.classFactory.getClassFields(theInterface, false)
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