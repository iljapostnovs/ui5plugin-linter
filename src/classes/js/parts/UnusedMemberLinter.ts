import { JSLinter } from "./abstraction/JSLinter";
import { TextDocument } from "ui5plugin-parser";
import { CustomUIClass, ICustomClassUIField, ICustomClassUIMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { RangeAdapter } from "../../adapters/RangeAdapter";
import { JSLinters, IError, DiagnosticTag } from "../../Linter";

export class UnusedMemberLinter extends JSLinter {
	protected className = JSLinters.UnusedMemberLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		// console.time("Unused Member Linter");
		if (this._configHandler.getLinterUsage(this.className)) {
			const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = this._parser.classFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass) {
					const customUIClasses = this._parser.classFactory.getAllCustomUIClasses();
					const methodsAndFields: (ICustomClassUIField | ICustomClassUIMethod)[] = [
						...UIClass.methods,
						...UIClass.fields
					];
					methodsAndFields.forEach((methodOrField: any) => {
						const methodIsUsed = this._checkIfMemberIsUsed(customUIClasses, UIClass, methodOrField);
						if (!methodIsUsed && methodOrField.memberPropertyNode) {
							const range = RangeAdapter.acornLocationToVSCodeRange(methodOrField.memberPropertyNode.loc);
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
		}
		// console.timeEnd("Unused Method Linter");

		return errors;
	}

	private _checkIfMemberIsUsed(customUIClasses: CustomUIClass[], UIClass: CustomUIClass, member: ICustomClassUIMethod | ICustomClassUIField) {
		let memberIsUsed = false;

		if (member.ui5ignored) {
			memberIsUsed = true;
		} else {
			const isException = this._checkIfMethodIsException(UIClass.className, member.name);
			const isMemberOverriden = this._parser.classFactory.isMethodOverriden(UIClass.className, member.name);

			if (member.mentionedInTheXMLDocument || isMemberOverriden) {
				memberIsUsed = true;
			} else if (!isException) {
				const classOfTheMethod = UIClass.className;

				customUIClasses.find(customUIClass => {
					return !!customUIClass.methods.find(methodFromClass => {
						if (methodFromClass.acornNode) {
							const allContent = this._parser.syntaxAnalyser.expandAllContent(methodFromClass.acornNode);
							const memberExpressions = allContent.filter((node: any) => node.type === "MemberExpression");
							const assignmentExpression = allContent.filter((node: any) => node.type === "AssignmentExpression");
							memberExpressions.find((memberExpression: any) => {
								const propertyName = memberExpression.callee?.property?.name || memberExpression?.property?.name;
								const currentMethodIsCalled = propertyName === member.name;
								if (currentMethodIsCalled) {
									const position = memberExpression.callee?.property?.start || memberExpression?.property?.start;
									const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(this._parser.syntaxAnalyser);
									const classNameOfTheCallee = strategy.acornGetClassName(customUIClass.className, position, true);
									if (
										classNameOfTheCallee &&
										(
											classNameOfTheCallee === classOfTheMethod ||
											this._parser.classFactory.isClassAChildOfClassB(classOfTheMethod, classNameOfTheCallee) ||
											this._parser.classFactory.isClassAChildOfClassB(classNameOfTheCallee, classOfTheMethod)
										) &&
										!assignmentExpression.find((expression: any) => expression.left === memberExpression)

									) {
										memberIsUsed = true;
									}
								}

								return memberIsUsed;
							});
						}

						return memberIsUsed;
					});
				});
			} else {
				memberIsUsed = true;
			}
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