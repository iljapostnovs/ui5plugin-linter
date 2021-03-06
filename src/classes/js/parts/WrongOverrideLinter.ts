import { TextDocument } from "ui5plugin-parser";
import { CustomUIClass, ICustomClassUIField, ICustomClassUIMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { AbstractUIClass, IUIField, IUIMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { RangeAdapter } from "../../adapters/RangeAdapter";
import { JSLinters, IError } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";
export class WrongOverrideLinter extends JSLinter {
	protected className = JSLinters.WrongOverrideLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass) {
				const fieldsAndMethods = [
					...UIClass.fields,
					...UIClass.methods
				];
				fieldsAndMethods.forEach(fieldOrMethod => {
					const error = this._getIfMemberIsWronglyOverriden(UIClass, fieldOrMethod);
					if (error) {
						errors.push(error);
					}
				});
			}
		}

		return errors;
	}

	private _getIfMemberIsWronglyOverriden(UIClass: CustomUIClass, UIMember: ICustomClassUIMethod | ICustomClassUIField) {
		let error: IError | undefined;
		const parentMember = this._getMemberFromParent(UIClass, UIMember);
		if (parentMember && parentMember.visibility === "private" && UIMember.memberPropertyNode) {
			const range = RangeAdapter.acornLocationToRange(UIMember.memberPropertyNode.loc);
			error = {
				message: `You can't override "${UIMember.name}" because it is a private member of class "${parentMember.owner}"`,
				code: "UI5Plugin",
				source: this.className,
				range: range,
				className: UIClass.className,
				acornNode: UIMember.acornNode,
				methodName: UIMember.name,
				sourceClassName: UIClass.className,
				severity: this._configHandler.getSeverity(this.className),
				fsPath: UIClass.classFSPath || ""
			};
		}

		return error;
	}

	private _getMemberFromParent(UIClass: AbstractUIClass, UIMember: IUIMethod | ICustomClassUIField): IUIMethod | IUIField | undefined {
		let parentMember: IUIMethod | IUIField | undefined;
		if (UIClass.parentClassNameDotNotation) {
			const UIClassParent = this._parser.classFactory.getUIClass(UIClass.parentClassNameDotNotation);
			const fieldsAndMethods = [
				...UIClassParent.fields,
				...UIClassParent.methods
			];
			parentMember = fieldsAndMethods.find(parentMember => parentMember.name === UIMember.name);
			if (!parentMember && UIClassParent.parentClassNameDotNotation) {
				parentMember = this._getMemberFromParent(UIClassParent, UIMember);
			}
		}

		return parentMember;
	}
}