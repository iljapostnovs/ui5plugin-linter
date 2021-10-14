import { TextDocument } from "ui5plugin-parser";
import { CustomUIClass, UI5Ignoreable } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/UI5Classes/JSParser/strategies/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { RangeAdapter } from "../../adapters/RangeAdapter";
import { JSLinters, IError, CustomDiagnosticType, DiagnosticTag } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";
import { IFieldsAndMethods } from "ui5plugin-parser/dist/classes/UI5Classes/interfaces/IUIClassFactory";
import { IMember } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractUIClass";
export class WrongFieldMethodLinter extends JSLinter {
	protected className = JSLinters.WrongFieldMethodLinter;
	public static timePerChar = 0;
	_getErrors(document: TextDocument): IError[] {
		return this._getLintingErrors(document);
	}
	private _getLintingErrors(document: TextDocument): IError[] {
		let errors: IError[] = [];

		const currentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (currentClassName) {
			const UIClass = <CustomUIClass>this._parser.classFactory.getUIClass(currentClassName);
			const acornMethods = UIClass.acornMethodsAndFields.filter(fieldOrMethod => fieldOrMethod.value.type === "FunctionExpression").map((node: any) => node.value.body);

			acornMethods.forEach((method: any) => {
				if (method.body) {
					method.body.forEach((node: any) => {
						const validationErrors = this._getErrorsForExpression(node, UIClass, document);
						errors = errors.concat(validationErrors);
					});
				}
			});

		}

		return errors;
	}

	private _getErrorsForExpression(node: any, UIClass: CustomUIClass, document: TextDocument, errors: IError[] = [], droppedNodes: any[] = [], errorNodes: any[] = []) {
		if (droppedNodes.includes(node)) {
			return [];
		}

		const currentClassName = UIClass.className;

		if (node.type === "MemberExpression") {
			const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(this._parser.syntaxAnalyser);
			const nodeStack = strategy.getStackOfNodesForPosition(currentClassName, node.end);
			if (nodeStack.length > 0) {
				const nodes = [];
				while (nodeStack.length > 0) {
					let nextNode = nodeStack.shift();
					nodes.push(nextNode);
					nextNode = nodeStack[0];
					if (nextNode?.type === "CallExpression") {
						nextNode = nodeStack.shift();
						nodes.push(nextNode);
					}
					const className = this._parser.syntaxAnalyser.findClassNameForStack(nodes.concat([]), currentClassName, currentClassName, true);
					const isException = this._checkIfClassNameIsException(className);
					if (!className || isException || nextNode?.type === "Identifier" && nextNode?.name === "sap") {
						droppedNodes.push(...nodeStack);
						break;
					}

					const classNames = className.split("|");
					nextNode = nodeStack[0];
					if (!nextNode) {
						nextNode = node;
					}
					const nextNodeName = nextNode.property?.name;
					const nodeText = UIClass.classText.substring(nextNode.start, nextNode.end);
					if (!nodeText.endsWith("]") && !errorNodes.includes(nextNode)) {
						const isMethodException = this._configHandler.checkIfMemberIsException(className, nextNodeName);

						if (nextNodeName && !isMethodException) {
							const singleFieldsAndMethods = this._getFieldsAndMethods(classNames, strategy, nextNode, nextNodeName);

							if (!singleFieldsAndMethods) {
								const shouldBreak = this._fillNonExistantMethodError(className, nextNodeName, nextNode, errorNodes, errors, UIClass, document);
								if (shouldBreak) {
									break;
								}
							} else {
								const shouldBreak = this._fillAccessLevelModifierErrors(singleFieldsAndMethods, nextNodeName, document, nextNode, errorNodes, errors, UIClass, className);
								if (shouldBreak) {
									break;
								} else {
									const allMembers: IMember[] = [...singleFieldsAndMethods.fields, ...singleFieldsAndMethods.methods];
									const member = allMembers.find(member => member.name === nextNodeName);
									if (member?.deprecated) {
										const range = RangeAdapter.acornLocationToRange(nextNode.property.loc);
										errorNodes.push(nextNode);
										errors.push({
											message: `"${nextNodeName}" is deprecated`,
											code: "UI5Plugin",
											source: this.className,
											range: range,
											acornNode: nextNode,
											className: UIClass.className,
											tags: [DiagnosticTag.Deprecated],
											methodName: nextNodeName,
											sourceClassName: className,
											severity: this._configHandler.getSeverity(this.className),
											fsPath: document.fileName
										});
									}
								}
							}
						}
					} else if (nodeText.endsWith("]")) {
						droppedNodes.push(nextNode);
						if (nextNode.property) {
							droppedNodes.push(nextNode.property);
						}
						break;
					}
				}
			}
		}

		const innerNodes = this._parser.syntaxAnalyser.getContent(node);
		if (innerNodes) {
			innerNodes.forEach((node: any) => this._getErrorsForExpression(node, UIClass, document, errors, droppedNodes, errorNodes));
		}

		return errors;
	}

	private _fillNonExistantMethodError(className: string, nextNodeName: any, nextNode: any, errorNodes: any[], errors: IError[], UIClass: CustomUIClass, document: TextDocument) {
		let shouldBreak = false;
		if (className.includes("__map__")) {
			className = "map";
		}
		const isMethodException = this._configHandler.checkIfMemberIsException(className, nextNodeName);
		if (!isMethodException) {
			const range = RangeAdapter.acornLocationToRange(nextNode.property.loc);
			errorNodes.push(nextNode);
			errors.push({
				message: `"${nextNodeName}" does not exist in "${className}"`,
				code: "UI5Plugin",
				source: this.className,
				range: range,
				acornNode: nextNode,
				className: UIClass.className,
				type: CustomDiagnosticType.NonExistentMethod,
				methodName: nextNodeName,
				sourceClassName: className,
				severity: this._configHandler.getSeverity(this.className),
				fsPath: document.fileName
			});
			shouldBreak = true;
		}

		return shouldBreak;
	}

	private _fillAccessLevelModifierErrors(singleFieldsAndMethods: IFieldsAndMethods, nextNodeName: any, document: TextDocument, nextNode: any, errorNodes: any[], errors: IError[], UIClass: CustomUIClass, className: string) {
		let shouldBreak = false;
		const member = singleFieldsAndMethods.fields.find(field => field.name === nextNodeName) || singleFieldsAndMethods.methods.find(method => method.name === nextNodeName);
		const isIgnored = !!(<UI5Ignoreable>member)?.ui5ignored;
		if (!isIgnored) {
			let sErrorMessage = "";
			if (member?.visibility === "protected") {
				const currentDocumentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName);
				if (currentDocumentClassName && !this._parser.classFactory.isClassAChildOfClassB(currentDocumentClassName, singleFieldsAndMethods.className)) {
					sErrorMessage = `"${nextNodeName}" is a protected member of class "${member.owner}"`;
				}
			} else if (member?.visibility === "private") {
				const currentDocumentClassName = this._parser.fileReader.getClassNameFromPath(document.fileName);
				if (currentDocumentClassName && member.owner !== currentDocumentClassName) {
					sErrorMessage = `"${nextNodeName}" is a private member of class "${member.owner}"`;
				}
			}

			if (sErrorMessage) {
				const range = RangeAdapter.acornLocationToRange(nextNode.property.loc);
				errorNodes.push(nextNode);
				errors.push({
					message: sErrorMessage,
					code: "UI5Plugin",
					source: this.className,
					range: range,
					acornNode: nextNode,
					methodName: nextNodeName,
					className: UIClass.className,
					sourceClassName: className,
					severity: this._configHandler.getSeverity(this.className),
					fsPath: document.fileName
				});
				shouldBreak = true;
			}
		}
		return shouldBreak;
	}

	private _getFieldsAndMethods(classNames: string[], strategy: FieldsAndMethodForPositionBeforeCurrentStrategy, nextNode: any, nextNodeName: any) {
		const fieldsAndMethods = classNames.map(className => strategy.destructueFieldsAndMethodsAccordingToMapParams(className));
		const singleFieldsAndMethods = fieldsAndMethods.find(fieldsAndMethods => {
			if (nextNode && fieldsAndMethods && nextNodeName) {
				const method = fieldsAndMethods.methods.find(method => method.name === nextNodeName);
				const field = fieldsAndMethods.fields.find(field => field.name === nextNodeName);

				return method || field;
			}

			return false;
		});
		return singleFieldsAndMethods;
	}

	private _checkIfClassNameIsException(className = "") {
		let isException = false;
		const exceptions = ["void", "any", "array"];
		if (className.split(".").length === 1) {
			isException = true;
		} else if (exceptions.includes(className)) {
			isException = true;
		}

		return isException;
	}
}