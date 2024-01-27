import { TextDocument, UI5JSParser } from "ui5plugin-parser";
import {
	AbstractBaseClass,
	IUIField,
	IUIMethod
} from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractBaseClass";
import {
	CustomJSClass,
	ICustomClassJSField,
	ICustomClassJSMethod
} from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { RangeAdapter } from "ui5plugin-parser/dist/classes/parsing/util/range/adapters/RangeAdapter";
import { IError, JSLinters } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";
export class WrongOverrideLinter extends JSLinter<UI5JSParser, CustomJSClass> {
	protected className = JSLinters.WrongOverrideLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomJSClass) {
				const fieldsAndMethods = [...UIClass.fields, ...UIClass.methods];
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

	private _getIfMemberIsWronglyOverriden(
		UIClass: CustomJSClass,
		UIMember: ICustomClassJSMethod | ICustomClassJSField
	) {
		let error: IError | undefined;
		const parentMember = this._getMemberFromParent(UIClass, UIMember);
		if (parentMember?.visibility === "private" && UIMember.loc) {
			const range = RangeAdapter.acornLocationToRange(UIMember.loc);
			error = {
				message: `You can't override "${UIMember.name}" because it is a private member of class "${parentMember.owner}"`,
				code: "UI5Plugin",
				source: this.className,
				range: range,
				className: UIClass.className,
				acornNode: UIMember.node,
				methodName: UIMember.name,
				sourceClassName: UIClass.className,
				severity: this._configHandler.getSeverity(this.className),
				fsPath: UIClass.fsPath || ""
			};
		} else if (parentMember?.deprecated && UIMember.loc) {
			const range = RangeAdapter.acornLocationToRange(UIMember.loc);
			error = {
				message: `Member "${UIMember.name}" is deprecated`,
				code: "UI5Plugin",
				source: this.className,
				range: range,
				className: UIClass.className,
				acornNode: UIMember.node,
				methodName: UIMember.name,
				sourceClassName: UIClass.className,
				severity: this._configHandler.getSeverity(this.className),
				fsPath: UIClass.fsPath || ""
			};
		}

		return error;
	}

	private _getMemberFromParent(
		UIClass: AbstractBaseClass,
		UIMember: ICustomClassJSMethod | ICustomClassJSField
	): IUIField | IUIMethod | undefined {
		let parentMember: IUIField | IUIMethod | undefined;
		if (UIClass.parentClassNameDotNotation) {
			const UIClassParent = this._parser.classFactory.getUIClass(UIClass.parentClassNameDotNotation);
			const fieldsAndMethods = [...UIClassParent.fields, ...UIClassParent.methods];
			parentMember = fieldsAndMethods.find(parentMember => parentMember.name === UIMember.name);
			if (!parentMember && UIClassParent.parentClassNameDotNotation) {
				parentMember = this._getMemberFromParent(UIClassParent, UIMember);
			}
		}

		return parentMember;
	}
}
