import {
	AbstractUI5Parser,
	ReferenceFinder,
	TextDocument,
	TSReferenceFinder,
	UI5JSParser,
	UI5TSParser
} from "ui5plugin-parser";
import {
	AbstractCustomClass,
	ICustomClassField,
	ICustomClassMethod
} from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { RangeAdapter } from "ui5plugin-parser/dist/classes/parsing/util/range/adapters/RangeAdapter";
import { DiagnosticTag, IError, JSLinters } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";

export class UnusedMemberLinter<
	Parser extends AbstractUI5Parser<CustomClass>,
	CustomClass extends AbstractCustomClass
> extends JSLinter<Parser, CustomClass> {
	protected className = JSLinters.UnusedMemberLinter;
	protected _getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		// console.time("Unused Member Linter");
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof AbstractCustomClass) {
				const methodsAndFields: (ICustomClassField | ICustomClassMethod)[] = [
					...UIClass.methods,
					...UIClass.fields
				];
				methodsAndFields.forEach(methodOrField => {
					const methodIsUsed = this._checkIfMemberIsUsed(UIClass, methodOrField);
					if (!methodIsUsed && methodOrField.loc) {
						const range = RangeAdapter.acornLocationToRange(methodOrField.loc);
						errors.push({
							source: this.className,
							acornNode: methodOrField.node,
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

	private _checkIfMemberIsUsed(UIClass: AbstractCustomClass, member: ICustomClassField | ICustomClassMethod) {
		let memberIsUsed =
			member.ui5ignored ||
			member.mentionedInTheXMLDocument ||
			this._parser.classFactory.isMethodOverriden(UIClass.className, member.name) ||
			this._checkIfMethodIsException(UIClass.className, member.name);

		if (!memberIsUsed) {
			const referenceFinder =
				UIClass instanceof CustomJSClass
					? new ReferenceFinder(this._parser as unknown as UI5JSParser)
					: new TSReferenceFinder(this._parser as unknown as UI5TSParser);
			const references = referenceFinder.getReferenceLocations(member);
			memberIsUsed = references.length > 0;
		}

		return memberIsUsed;
	}

	private _checkIfMethodIsException(className: string, methodName: string) {
		return (
			this._configHandler.checkIfMemberIsException(className, methodName) ||
			this._checkIfThisIsStandardMethodFromPropertyEventAggregationAssociation(className, methodName)
		);
	}

	private _checkIfThisIsStandardMethodFromPropertyEventAggregationAssociation(className: string, methodName: string) {
		const startsWith = [
			"set",
			"get",
			"add",
			"remove",
			"removeAll",
			"insert",
			"indexOf",
			"destroy",
			"bind",
			"unbind"
		];

		const isStandartMethod = !!startsWith.find(standartMethodStartsWith => {
			let isStandartMethod = false;
			if (methodName.startsWith(standartMethodStartsWith)) {
				const memberNameCapital = methodName.replace(standartMethodStartsWith, "");
				if (memberNameCapital) {
					const memberName = `${memberNameCapital[0].toLowerCase()}${memberNameCapital.substring(
						1,
						memberNameCapital.length
					)}`;
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
