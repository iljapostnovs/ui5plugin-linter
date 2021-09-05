import { JSLinter } from "./abstraction/JSLinter";
import { PackageConfigHandler } from "./config/PackageConfigHandler";
import { TextDocument, UI5Parser } from "ui5plugin-parser";
import { CustomUIClass, ICustomClassUIField, ICustomClassUIMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { RangeAdapter } from "../../../adapters/RangeAdapter";
import { JSLinters, IError } from "../../../Linter";
export class PublicMemberLinter extends JSLinter {
	protected className = JSLinters.PublicMemberLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		if (new PackageConfigHandler().getLinterUsage(this.className)) {
			const className = UI5Parser.getInstance().fileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UI5Parser.getInstance().classFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass) {
					const allUIClassesMap = UI5Parser.getInstance().classFactory.getAllExistentUIClasses();
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
									source: "Public member linter",
									acornNode: method.acornNode,
									code: "UI5Plugin",
									className: UIClass.className,
									message: `Method "${method.name}" is possibly private, no references found in other classes`,
									range: RangeAdapter.acornLocationToVSCodeRange(method.memberPropertyNode.loc),
									severity: new PackageConfigHandler().getSeverity(this.className)
								});
							}
						}
					});

					publicFields.forEach(field => {
						const isException = this._checkIfMemberIsException(UIClass.className, field.name);
						if (!isException) {
							const fieldIsUsed = this._checkIfMemberIsUsedElsewhere(customUIClasses, UIClass, field.name, field);
							if (!fieldIsUsed && field.memberPropertyNode) {
								const range = RangeAdapter.acornLocationToVSCodeRange(field.memberPropertyNode.loc);
								errors.push({
									source: "Public member linter",
									acornNode: field.acornNode,
									code: "UI5Plugin",
									className: UIClass.className,
									message: `Field "${field.name}" is possibly private, no references found in other classes`,
									range: range,
									severity: new PackageConfigHandler().getSeverity(this.className)
								});
							}
						}
					});
				}
			}
		}

		return errors;
	}

	private _checkIfMemberIsUsedElsewhere(customUIClasses: CustomUIClass[], UIClass: CustomUIClass, memberName: string, fieldOrMethod: ICustomClassUIField | ICustomClassUIMethod) {
		let isMethodUsedElsewhere = false;

		if (fieldOrMethod.ui5ignored) {
			isMethodUsedElsewhere = true;
		} else {
			const isMethodOverriden = UI5Parser.getInstance().classFactory.isMethodOverriden(UIClass.className, memberName);
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
		const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(UI5Parser.getInstance().syntaxAnalyser);
		const isMemberUsedInOtherClasses = !!customUIClasses.find(customUIClass => {
			return customUIClass.className !== UIClass.className && !!customUIClass.methods.find(customMethod => {
				let isMemberUsedInOtherClasses = false;
				if (customMethod.acornNode) {
					const content = UI5Parser.getInstance().syntaxAnalyser.expandAllContent(customMethod.acornNode);
					const memberExpressions = content.filter((node: any) => {
						return node.type === "MemberExpression" && node.property?.name === memberName;
					});

					if (memberExpressions.length > 0) {
						isMemberUsedInOtherClasses = !!memberExpressions.find((memberExpression: any) => {
							const calleeClassName = strategy.acornGetClassName(customUIClass.className, memberExpression.end, true);

							return calleeClassName && (
								UI5Parser.getInstance().classFactory.isClassAChildOfClassB(calleeClassName, UIClass.className) ||
								UI5Parser.getInstance().classFactory.isClassAChildOfClassB(UIClass.className, calleeClassName)
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
		return new PackageConfigHandler().checkIfMemberIsException(className, memberName) ||
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
					const events = UI5Parser.getInstance().classFactory.getClassEvents(className);
					isStandartMethod = !!events.find(event => event.name === memberName);
					if (!isStandartMethod) {
						const properties = UI5Parser.getInstance().classFactory.getClassProperties(className);
						isStandartMethod = !!properties.find(property => property.name === memberName);
					}
					if (!isStandartMethod) {
						const aggregations = UI5Parser.getInstance().classFactory.getClassAggregations(className);
						isStandartMethod = !!aggregations.find(aggregation => aggregation.name === memberName);
					}
					if (!isStandartMethod) {
						const associations = UI5Parser.getInstance().classFactory.getClassAssociations(className);
						isStandartMethod = !!associations.find(association => association.name === memberName);
					}
				}
			}

			return isStandartMethod;
		});

		return isStandartMethod;
	}
}