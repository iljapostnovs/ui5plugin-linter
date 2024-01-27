import {
	AbstractUI5Parser,
	ParserPool,
	ReferenceFinder,
	TSReferenceFinder,
	TextDocument,
	UI5JSParser,
	UI5TSParser
} from "ui5plugin-parser";
import {
	AbstractCustomClass,
	ICustomClassField,
	ICustomClassMethod
} from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import { RangeAdapter } from "ui5plugin-parser/dist/classes/parsing/util/range/adapters/RangeAdapter";
import { IError, JSLinters } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";

export class UnusedClassLinter<
	Parser extends AbstractUI5Parser<CustomClass>,
	CustomClass extends AbstractCustomClass
> extends JSLinter<Parser, CustomClass> {
	protected className = JSLinters.UnusedClassLinter;
	protected _getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const UIClass = this._parser.classFactory.getUIClass(className);
			if (UIClass instanceof AbstractCustomClass) {
				const classIsUsed = this._checkIfClassIsUsed(UIClass);
				if (!classIsUsed) {
					const range = RangeAdapter.acornPositionsToRange({ column: 0, line: 1 }, { column: 0, line: 1 });
					errors.push({
						source: this.className,
						code: "UI5Plugin",
						className: UIClass.className,
						message: `No references found for "${className}" class`,
						range: range,
						severity: this._configHandler.getSeverity(this.className),
						fsPath: document.fileName
					});
				}
			}
		}

		return errors;
	}

	private _checkIfClassIsUsed(UIClass: AbstractCustomClass) {
		const isException = this._checkClassForLintingExceptions(UIClass);
		const allCustomJSClasses = ParserPool.getAllCustomUIClasses();

		return (
			isException ||
			allCustomJSClasses.some(CustomJSClass => {
				return (
					this._checkIfClassIsImportedInUIDefine(CustomJSClass, UIClass) ||
					this._checkIfClassIsUsedAsInterface(CustomJSClass, UIClass)
				);
			}) ||
			this._checkIfClassMembersHasAnyReferencesOutside(UIClass) ||
			this._checkIfClassMentionedInManifest(UIClass) ||
			this._checkIfClassIsViewsController(UIClass) ||
			this._checkIfClassIsUsedInView(UIClass)
		);
	}

	private _checkIfClassMembersHasAnyReferencesOutside(UIClass: AbstractCustomClass): boolean {
		const members: (ICustomClassMethod | ICustomClassField)[] = [...UIClass.methods, ...UIClass.fields];
		return members.some(
			member =>
				this._getReferenceLocations(member).filter(location => location.filePath !== UIClass.fsPath).length > 0
		);
	}

	private _getReferenceLocations(member: ICustomClassMethod | ICustomClassField) {
		if (this._parser instanceof UI5JSParser) {
			const referenceFinder = new ReferenceFinder(this._parser);
			return referenceFinder.getReferenceLocations(member);
		}
		if (this._parser instanceof UI5TSParser) {
			const referenceFinder = new TSReferenceFinder(this._parser);
			return referenceFinder.getReferenceLocations(member);
		} else {
			return [];
		}
	}

	private _checkClassForLintingExceptions(UIClass: AbstractCustomClass) {
		return (
			UIClass.fsPath?.toLowerCase().endsWith("component.js") ||
			UIClass.fsPath?.toLowerCase().endsWith("component.ts") ||
			false
		);
	}

	private _checkIfClassIsUsedInView(UIClass: AbstractCustomClass) {
		const isControlOrElement =
			this._parser.classFactory.isClassAChildOfClassB(UIClass.className, "sap.ui.core.Control") ||
			this._parser.classFactory.isClassAChildOfClassB(UIClass.className, "sap.ui.core.Element");

		if (!isControlOrElement) {
			return false;
		}

		const views: IXMLFile[] = ParserPool.getAllViews();
		const fragments: IXMLFile[] = ParserPool.getAllFragments();
		const XMLFiles: IXMLFile[] = views.concat(fragments);
		const classNameLastPart = UIClass.className.split(".").pop();
		return (
			classNameLastPart &&
			XMLFiles.some(XMLFile => {
				if (XMLFile.content.indexOf(classNameLastPart) === -1) {
					return false;
				}

				const tags = this._parser.xmlParser.getAllTags(XMLFile);
				return tags.some(tag => {
					const className = this._parser.xmlParser.getFullClassNameFromTag(tag, XMLFile);
					return className === UIClass.className;
				});
			})
		);
	}

	private _checkIfClassIsUsedAsInterface(CustomJSClass: AbstractCustomClass, UIClass: AbstractCustomClass): unknown {
		return CustomJSClass.interfaces.some(interfaceName => {
			return interfaceName === UIClass.className;
		});
	}

	private _checkIfClassIsImportedInUIDefine(
		CustomJSClass: AbstractCustomClass,
		UIClass: AbstractCustomClass
	): unknown {
		return CustomJSClass.UIDefine.some(UIDefine => {
			return UIDefine.classNameDotNotation === UIClass.className;
		});
	}

	private _checkIfClassIsViewsController(UIClass: AbstractCustomClass) {
		if (UIClass.fsPath?.endsWith(".controller.js") || UIClass.fsPath?.endsWith(".controller.ts")) {
			return ParserPool.getAllViews().some(view => {
				return view.controllerName === UIClass.className;
			});
		} else {
			return false;
		}
	}

	private _checkIfClassMentionedInManifest(UIClass: AbstractCustomClass): unknown {
		const manifest = ParserPool.getManifestForClass(UIClass.className);
		let isMentionedInManifest = false;

		try {
			isMentionedInManifest = JSON.stringify(manifest?.content).indexOf(UIClass.className) > -1;
		} catch (error) {
			isMentionedInManifest = false;
		}

		return isMentionedInManifest;
	}
}
