import { TextDocument, UI5JSParser } from "ui5plugin-parser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "ui5plugin-parser/dist/classes/parsing/jsparser/typesearch/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { IUIMethod } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractBaseClass";
import { CustomJSClass, ICustomClassJSMethod } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { RangeAdapter } from "ui5plugin-parser/dist/classes/parsing/util/range/adapters/RangeAdapter";
import { IError, JSLinters } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";
export class WrongParametersLinter extends JSLinter<UI5JSParser, CustomJSClass> {
	protected className = JSLinters.WrongParametersLinter;
	public static timePerChar = 0;
	protected _getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		// console.time("WrongParameterLinter");
		const start = new Date().getTime();
		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof CustomJSClass && UIClass.acornClassBody) {
				UIClass.acornClassBody.properties?.forEach((node: any) => {
					const content = this._parser.syntaxAnalyser.expandAllContent(node.value);
					const calls = content.filter(node => node.type === "CallExpression");
					calls.forEach(call => {
						const params = call.arguments;
						const methodName = call.callee?.property?.name;
						const endPosition = call.callee?.property?.end;
						if (methodName && endPosition) {
							const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
								this._parser.syntaxAnalyser,
								this._parser
							);
							const classNameOfTheMethodCallee = strategy.acornGetClassName(className, endPosition);
							if (classNameOfTheMethodCallee) {
								const fieldsAndMethods =
									strategy.destructureFieldsAndMethodsAccordingToMapParams(
										classNameOfTheMethodCallee
									);
								if (fieldsAndMethods) {
									const method = fieldsAndMethods.methods.find(method => method.name === methodName);
									if (method && !(<ICustomClassJSMethod>method).ui5ignored) {
										const isException = this._configHandler.checkIfMemberIsException(
											fieldsAndMethods.className,
											method.name
										);
										if (!isException) {
											this._lintParamQuantity(
												method,
												params,
												call,
												errors,
												UIClass,
												methodName,
												document
											);
											params.forEach((param: any, i: number) => {
												this._lintParamType(method, i, param, UIClass, errors, document);
											});
										}
									}
								}
							}
						}
					});
				});
			}
		}

		const end = new Date().getTime();
		WrongParametersLinter.timePerChar = (end - start) / document.getText().length;
		// console.timeEnd("WrongParameterLinter");
		return errors;
	}

	private _lintParamQuantity(
		method: IUIMethod,
		params: any,
		call: any,
		errors: IError[],
		UIClass: CustomJSClass,
		methodName: any,
		document: TextDocument
	) {
		const methodParams = method.params;
		const mandatoryMethodParams = methodParams.filter(param => !param.isOptional && param.type !== "boolean");
		if (params.length < mandatoryMethodParams.length || params.length > methodParams.length) {
			const range = RangeAdapter.acornLocationToRange(call.callee.property.loc);
			errors.push({
				acornNode: call,
				className: UIClass.className,
				code: "UI5Plugin",
				source: this.className,
				message: `Method "${methodName}" has ${methodParams.length} (${mandatoryMethodParams.length} mandatory) param(s), but you provided ${params.length}`,
				range: range,
				severity: this._configHandler.getSeverity(this.className),
				fsPath: document.fileName
			});
		}
	}

	private _lintParamType(
		method: IUIMethod,
		i: number,
		param: any,
		UIClass: CustomJSClass,
		errors: IError[],
		document: TextDocument
	) {
		const paramFromMethod = method.params[i];
		if (
			paramFromMethod &&
			paramFromMethod.type !== "any" &&
			paramFromMethod.type !== "void" &&
			paramFromMethod.type
		) {
			const classNameOfTheParam = this._parser.syntaxAnalyser.getClassNameFromSingleAcornNode(param, UIClass);

			if (classNameOfTheParam && classNameOfTheParam !== paramFromMethod.type) {
				const { expectedClass, actualClass } = this._swapClassNames(paramFromMethod.type, classNameOfTheParam);
				const paramFromMethodTypes = expectedClass.split("|");
				const classNamesOfTheParam = actualClass.split("|");
				let typeMismatch = !this._getIfClassNameIntersects(paramFromMethodTypes, classNamesOfTheParam);
				if (typeMismatch) {
					typeMismatch = !paramFromMethodTypes.find(className => {
						return !!classNamesOfTheParam.find(classNameOfTheParam => {
							return !this._getIfClassesDiffers(className, classNameOfTheParam);
						});
					});
				}
				if (typeMismatch) {
					const [className1, className2] = [
						paramFromMethod.type.includes("__map__") ? "map" : paramFromMethod.type,
						classNameOfTheParam.includes("__map__") ? "map" : classNameOfTheParam
					];
					const range = RangeAdapter.acornLocationToRange(param.loc);
					errors.push({
						acornNode: param,
						code: "UI5Plugin",
						className: UIClass.className,
						source: this.className,
						message: `"${paramFromMethod.name}" param is of type "${className1}", but provided "${className2}"`,
						range: range,
						severity: this._configHandler.getSeverity(this.className),
						fsPath: document.fileName
					});
				}
			}
		}
	}

	private _getIfClassNameIntersects(classNames1: string[], classNames2: string[]) {
		return !!classNames1.find(className1 => {
			return !!classNames2.find(className2 => className1 === className2);
		});
	}

	private _getIfClassesDiffers(expectedClass: string, actualClass: string): boolean {
		let classesDiffers = true;

		({ expectedClass, actualClass } = this._swapClassNames(expectedClass, actualClass));

		if (this._checkIfClassesAreEqual(expectedClass, actualClass, "map", "object")) {
			classesDiffers = false;
		} else if (expectedClass.toLowerCase() === "any" || actualClass.toLowerCase() === "any") {
			classesDiffers = false;
		} else if (expectedClass.toLowerCase() === actualClass.toLowerCase()) {
			classesDiffers = false;
		} else if (
			expectedClass.toLowerCase() === "object" &&
			this._parser.classFactory.isClassAChildOfClassB(actualClass, "sap.ui.base.Object")
		) {
			classesDiffers = false;
		} else if (
			actualClass.toLowerCase() === "object" &&
			this._parser.classFactory.isClassAChildOfClassB(expectedClass, "sap.ui.base.Object")
		) {
			classesDiffers = false;
		} else if (this._checkIfClassesAreEqual(expectedClass, actualClass, "string", "sap.ui.core.csssize")) {
			classesDiffers = false;
		} else if (this._parser.nodeDAO.findNode(expectedClass)?.getKind() === "enum" && actualClass === "string") {
			classesDiffers = false;
		} else if (this._parser.nodeDAO.findNode(expectedClass)?.getKind() === "typedef") {
			classesDiffers = this._getIfClassesDiffers("map", actualClass);
		} else {
			classesDiffers = !this._parser.classFactory.isClassAChildOfClassB(actualClass, expectedClass);
		}

		return classesDiffers;
	}

	private _swapClassNames(expectedClass: string, actualClass: string) {
		expectedClass = this._swapClassName(expectedClass);
		actualClass = this._swapClassName(actualClass);

		if (expectedClass.startsWith("Promise<") && actualClass.startsWith("Promise<")) {
			expectedClass = this._parser.syntaxAnalyser.getResultOfPromise(expectedClass);
			actualClass = this._parser.syntaxAnalyser.getResultOfPromise(actualClass);
		}

		if (
			expectedClass.endsWith("[]") &&
			actualClass.endsWith("[]") &&
			expectedClass.indexOf("|") === -1 &&
			actualClass.indexOf("|") === -1
		) {
			expectedClass = expectedClass.substring(0, expectedClass.length - 2);
			actualClass = actualClass.substring(0, actualClass.length - 2);
		}

		return { expectedClass, actualClass };
	}

	private _checkIfClassesAreEqual(class1: string, class2: string, substitute1: string, substitute2: string) {
		return (
			(class1.toLowerCase() === substitute1 && class2.toLowerCase() === substitute2) ||
			(class1.toLowerCase() === substitute2 && class2.toLowerCase() === substitute1)
		);
	}

	private _swapClassName(className: string) {
		const numbers = ["number", "float", "int", "integer"];
		if (className.toLowerCase() === "array") {
			className = "any[]";
		}
		if (className.includes("__map__") || className.includes("__mapparam__")) {
			if (className.endsWith("[]")) {
				className = "map[]";
			} else {
				className = "map";
			}
		}
		if (className === "void" || !className) {
			className = "any";
		}
		if (className === "Promise") {
			className = "Promise<any>";
		}
		if (numbers.includes(className.toLowerCase())) {
			className = "number";
		}

		return className;
	}
}
