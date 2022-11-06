import { JSLinter } from "./abstraction/JSLinter";
import { AbstractUI5Parser, TextDocument, UI5Parser, UI5TSParser } from "ui5plugin-parser";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { RangeAdapter } from "../../adapters/RangeAdapter";
import { JSLinters, IError } from "../../Linter";
import { ReferenceFinder } from "./util/ReferenceFinder";
import {
	AbstractCustomClass,
	ICustomClassField,
	ICustomClassMethod
} from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import { TSReferenceFinder } from "./util/TSReferenceFinder";

export class PublicMemberLinter<
	Parser extends AbstractUI5Parser<CustomClass>,
	CustomClass extends AbstractCustomClass
> extends JSLinter<Parser, CustomClass> {
	protected className = JSLinters.PublicMemberLinter;
	protected _getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof AbstractCustomClass) {
				const publicMethods = UIClass.methods.filter(method => method.visibility === "public");
				const publicFields = UIClass.fields.filter(field => field.visibility === "public");
				publicMethods.forEach(method => {
					const isException = this._checkIfMemberIsException(UIClass.className, method.name);
					if (!isException) {
						const methodIsUsed = this._checkIfMemberIsUsedElsewhere(UIClass, method);
						if (!methodIsUsed && method.position && method.loc) {
							errors.push({
								source: this.className,
								acornNode: method.node,
								code: "UI5Plugin",
								className: UIClass.className,
								message: `Method "${method.name}" is possibly private, no references found in other classes`,
								range: RangeAdapter.acornLocationToRange(method.loc),
								severity: this._configHandler.getSeverity(this.className),
								fsPath: document.fileName
							});
						}
					}
				});

				publicFields.forEach(field => {
					const isException = this._checkIfMemberIsException(UIClass.className, field.name);
					if (!isException) {
						const fieldIsUsed = this._checkIfMemberIsUsedElsewhere(UIClass, field);
						if (!fieldIsUsed && field.loc) {
							const range = RangeAdapter.acornLocationToRange(field.loc);
							errors.push({
								source: this.className,
								acornNode: field.node,
								code: "UI5Plugin",
								className: UIClass.className,
								message: `Field "${field.name}" is possibly private, no references found in other classes`,
								range: range,
								severity: this._configHandler.getSeverity(this.className),
								fsPath: document.fileName
							});
						}
					}
				});
			}
		}

		return errors;
	}

	private _checkIfMemberIsUsedElsewhere(
		UIClass: AbstractCustomClass,
		member: ICustomClassField | ICustomClassMethod
	) {
		let memberIsUsed =
			member.ui5ignored ||
			member.mentionedInTheXMLDocument ||
			this._parser.classFactory.isMethodOverriden(UIClass.className, member.name) ||
			this._checkIfMemberIsException(UIClass.className, member.name);

		if (!memberIsUsed) {
			const referenceFinder =
				UIClass instanceof CustomUIClass
					? new ReferenceFinder(this._parser as unknown as UI5Parser)
					: new TSReferenceFinder(this._parser as unknown as UI5TSParser);
			const references = referenceFinder.getReferenceLocations(member).filter(reference => {
				return reference.filePath !== UIClass.fsPath;
			});
			memberIsUsed = references.length > 0;
		}

		return memberIsUsed;
	}

	private _checkIfMemberIsException(className: string, memberName: string) {
		return (
			this._configHandler.checkIfMemberIsException(className, memberName) ||
			this._checkIfThisIsStandardMethodFromPropertyEventAggregationAssociation(className, memberName)
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
