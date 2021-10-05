import { JSLinter } from "./abstraction/JSLinter";
import { TextDocument } from "ui5plugin-parser";
import { CustomUIClass, ICustomClassUIField, ICustomClassUIMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { RangeAdapter } from "../../adapters/RangeAdapter";
import { JSLinters, IError, DiagnosticTag } from "../../Linter";
import { ReferenceFinder } from "./util/ReferenceFinder";

export class UnusedMemberLinter extends JSLinter {
	protected className = JSLinters.UnusedMemberLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		// console.time("Unused Member Linter");
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass) {
				const methodsAndFields: (ICustomClassUIField | ICustomClassUIMethod)[] = [
					...UIClass.methods,
					...UIClass.fields
				];
				methodsAndFields.forEach((methodOrField: any) => {
					const methodIsUsed = this._checkIfMemberIsUsed(UIClass, methodOrField);
					if (!methodIsUsed && methodOrField.memberPropertyNode) {
						const range = RangeAdapter.acornLocationToRange(methodOrField.memberPropertyNode.loc);
						errors.push({
							source: this.className,
							acornNode: methodOrField.acornNode,
							code: "UI5Plugin",
							className: UIClass.className,
							message: `No references found for "${methodOrField.name}" class member`,
							range: range,
							tags: [DiagnosticTag.Unnecessary],
							severity: this._configHandler.getSeverity(this.className),
							fsPath: document.fileName
						});
					}
				});

			}
		}
		// console.timeEnd("Unused Method Linter");

		return errors;
	}

	private _checkIfMemberIsUsed(UIClass: CustomUIClass, member: ICustomClassUIMethod | ICustomClassUIField) {
		let memberIsUsed =
			member.ui5ignored ||
			member.mentionedInTheXMLDocument ||
			this._parser.classFactory.isMethodOverriden(UIClass.className, member.name) ||
			this._checkIfMethodIsException(UIClass.className, member.name);

		if (!memberIsUsed) {
			const referenceCodeLens = new ReferenceFinder(this._parser);
			const references = referenceCodeLens.getReferenceLocations(member);
			memberIsUsed = references.length > 0;
		}

		return memberIsUsed;
	}

	private _checkIfMethodIsException(className: string, methodName: string) {
		return this._configHandler.checkIfMemberIsException(className, methodName) ||
			this._checkIfThisIsStandardMethodFromPropertyEventAggregationAssociation(className, methodName);
	}

	private _checkIfThisIsStandardMethodFromPropertyEventAggregationAssociation(className: string, methodName: string) {
		const startsWith = ["set", "get", "add", "remove", "removeAll", "insert", "indexOf", "destroy", "bind", "unbind"];

		const isStandartMethod = !!startsWith.find(standartMethodStartsWith => {
			let isStandartMethod = false;
			if (methodName.startsWith(standartMethodStartsWith)) {
				const memberNameCapital = methodName.replace(standartMethodStartsWith, "");
				if (memberNameCapital) {
					const memberName = `${memberNameCapital[0].toLowerCase()}${memberNameCapital.substring(1, memberNameCapital.length)}`
					const events = this._parser.classFactory.getClassEvents(className);
					isStandartMethod = !!events.find(event => event.name === memberName);
					if (!isStandartMethod) {
						const properties = this._parser.classFactory.getClassProperties(className);
						isStandartMethod = !!properties.find(property => property.name === memberName);
					}
					if (!isStandartMethod) {
						const aggregations = this._parser.classFactory.getClassAggregations(className);
						isStandartMethod = !!aggregations.find(aggregation => aggregation.name === memberName);
					}
					if (!isStandartMethod) {
						const associations = this._parser.classFactory.getClassAssociations(className);
						isStandartMethod = !!associations.find(association => association.name === memberName);
					}
				}
			}

			return isStandartMethod;
		});

		return isStandartMethod;
	}
}