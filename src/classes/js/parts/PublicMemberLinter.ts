import { JSLinter } from "./abstraction/JSLinter";
import { TextDocument } from "ui5plugin-parser";
import { CustomUIClass, ICustomClassUIField, ICustomClassUIMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { RangeAdapter } from "../../adapters/RangeAdapter";
import { JSLinters, IError } from "../../Linter";
export class PublicMemberLinter extends JSLinter {
	protected className = JSLinters.PublicMemberLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass) {
				const allUIClassesMap = this._parser.classFactory.getAllExistentUIClasses();
				const allUIClasses = Object.keys(allUIClassesMap).map(key => allUIClassesMap[key]);
				const customUIClasses = allUIClasses.filter(UIClass => UIClass instanceof CustomUIClass) as CustomUIClass[];
				const publicMethods = UIClass.methods.filter(method => method.visibility === "public");
				const publicFields = UIClass.fields.filter(field => field.visibility === "public");
				publicMethods.forEach(method => {
					const isException = this._checkIfMemberIsException(UIClass.className, method.name);
					if (!isException) {
						const methodIsUsed = this._checkIfMemberIsUsedElsewhere(customUIClasses, UIClass, method.name, method);
						if (!methodIsUsed && method.position) {
							errors.push({
								source: this.className,
								acornNode: method.acornNode,
								code: "UI5Plugin",
								className: UIClass.className,
								message: `Method "${method.name}" is possibly private, no references found in other classes`,
								range: RangeAdapter.acornLocationToRange(method.memberPropertyNode.loc),
								severity: this._configHandler.getSeverity(this.className),
								fsPath: document.fileName
							});
						}
					}
				});

				publicFields.forEach(field => {
					const isException = this._checkIfMemberIsException(UIClass.className, field.name);
					if (!isException) {
						const fieldIsUsed = this._checkIfMemberIsUsedElsewhere(customUIClasses, UIClass, field.name, field);
						if (!fieldIsUsed && field.memberPropertyNode) {
							const range = RangeAdapter.acornLocationToRange(field.memberPropertyNode.loc);
							errors.push({
								source: this.className,
								acornNode: field.acornNode,
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

	private _checkIfMemberIsUsedElsewhere(customUIClasses: CustomUIClass[], UIClass: CustomUIClass, memberName: string, fieldOrMethod: ICustomClassUIField | ICustomClassUIMethod) {
		let isMethodUsedElsewhere = false;

		if (fieldOrMethod.ui5ignored) {
			isMethodUsedElsewhere = true;
		} else {
			const isMethodOverriden = this._parser.classFactory.isMethodOverriden(UIClass.className, memberName);
			if (!isMethodOverriden) {
				const isMethodUsedInOtherClasses = fieldOrMethod.mentionedInTheXMLDocument || this._isMemberUsedInOtherClasses(customUIClasses, UIClass, memberName);
				if (isMethodUsedInOtherClasses) {
					isMethodUsedElsewhere = true;
				}
			} else {
				isMethodUsedElsewhere = true;
			}
		}

		return isMethodUsedElsewhere;
	}

	private _isMemberUsedInOtherClasses(customUIClasses: CustomUIClass[], UIClass: CustomUIClass, memberName: string) {
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(this._parser.syntaxAnalyser);
		const isMemberUsedInOtherClasses = !!customUIClasses.find(customUIClass => {
			return customUIClass.className !== UIClass.className && !!customUIClass.methods.find(customMethod => {
				let isMemberUsedInOtherClasses = false;
				if (customMethod.acornNode) {
					const content = this._parser.syntaxAnalyser.expandAllContent(customMethod.acornNode);
					const memberExpressions = content.filter((node: any) => {
						return node.type === "MemberExpression" && node.property?.name === memberName;
					});

					if (memberExpressions.length > 0) {
						isMemberUsedInOtherClasses = !!memberExpressions.find((memberExpression: any) => {
							const calleeClassName = strategy.acornGetClassName(customUIClass.className, memberExpression.end, true);

							return calleeClassName && (
								this._parser.classFactory.isClassAChildOfClassB(calleeClassName, UIClass.className) ||
								this._parser.classFactory.isClassAChildOfClassB(UIClass.className, calleeClassName)
							);
						});
					}
				}
				return isMemberUsedInOtherClasses;
			});
		});

		return isMemberUsedInOtherClasses;
	}

	private _checkIfMemberIsException(className: string, memberName: string) {
		return this._configHandler.checkIfMemberIsException(className, memberName) ||
			this._checkIfThisIsStandardMethodFromPropertyEventAggregationAssociation(className, memberName);
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