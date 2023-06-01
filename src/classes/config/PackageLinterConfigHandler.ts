import * as fs from "fs";
import { join } from "path";
import { ParserPool, TextDocument, toNative } from "ui5plugin-parser";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { JSLinters, PropertiesLinters, Severity, XMLLinters } from "../Linter";
import { ILinterConfigHandler, JSLinterException } from "./ILinterConfigHandler";
export class PackageLinterConfigHandler implements ILinterConfigHandler {
	static readonly packageCache: { [key: string]: IUI5PackageConfigEntry } = {};
	private static _globalPackage?: IUI5PackageConfigEntry;
	static setGlobalConfigPath(fsPath: string) {
		this._globalPackage = JSON.parse(fs.readFileSync(fsPath, "utf8")) || {};
	}
	protected readonly _package: IUI5PackageConfigEntry;
	protected readonly _parser: IUI5Parser;
	constructor(parser: IUI5Parser, packagePath = join(process.cwd(), "/package.json")) {
		this._parser = parser;
		packagePath = toNative(packagePath);
		try {
			if (PackageLinterConfigHandler.packageCache[packagePath]) {
				this._package = PackageLinterConfigHandler.packageCache[packagePath];
			} else {
				this._package = JSON.parse(fs.readFileSync(packagePath, "utf8"));
				PackageLinterConfigHandler.packageCache[packagePath] = this._package;
			}
		} catch (error) {
			this._package = {};
		}
	}

	getIfLintingShouldBeSkipped(document: TextDocument): boolean {
		let shouldBeSkipped = false;

		const componentsToInclude =
			this._package.ui5?.ui5linter?.componentsToInclude ??
			PackageLinterConfigHandler._globalPackage?.ui5?.ui5linter?.componentsToInclude;
		const componentsToExclude =
			this._package.ui5?.ui5linter?.componentsToExclude ??
			PackageLinterConfigHandler._globalPackage?.ui5?.ui5linter?.componentsToExclude;
		const jsClassesToExclude =
			this._package.ui5?.ui5linter?.jsClassExceptions ??
			PackageLinterConfigHandler._globalPackage?.ui5?.ui5linter?.jsClassExceptions;
		const xmlClassesToExclude =
			this._package.ui5?.ui5linter?.xmlClassExceptions ??
			PackageLinterConfigHandler._globalPackage?.ui5?.ui5linter?.xmlClassExceptions;

		if (componentsToInclude || componentsToExclude || jsClassesToExclude || xmlClassesToExclude) {
			const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
			if (className) {
				if (componentsToInclude || componentsToExclude) {
					const manifest = ParserPool.getManifestForClass(className);

					if (manifest?.componentName) {
						if (componentsToInclude) {
							shouldBeSkipped = !componentsToInclude.includes(manifest.componentName);
						} else if (componentsToExclude) {
							shouldBeSkipped = componentsToExclude.includes(manifest.componentName);
						}
					}
				}

				if (
					!shouldBeSkipped &&
					jsClassesToExclude &&
					(document.fileName.endsWith(".js") || document.fileName.endsWith(".ts"))
				) {
					shouldBeSkipped = jsClassesToExclude.includes(className);
				}
				if (!shouldBeSkipped && xmlClassesToExclude && document.fileName.endsWith(".xml")) {
					shouldBeSkipped = xmlClassesToExclude.includes(className);
				}
			}
		}

		return shouldBeSkipped;
	}

	private _cache: { [key: string]: boolean } = {};

	getSeverity(linter: JSLinters | XMLLinters | PropertiesLinters) {
		return (
			this._package.ui5?.ui5linter?.severity?.[linter] ??
			PackageLinterConfigHandler._globalPackage?.ui5?.ui5linter?.severity?.[linter] ??
			this._getDefaultSeverityFor(linter)
		);
	}
	private _getDefaultSeverityFor(linter: JSLinters | XMLLinters | PropertiesLinters): Severity {
		const defaultSeverity: { [key in JSLinters | XMLLinters | PropertiesLinters]: Severity } = {
			WrongParametersLinter: Severity.Error,
			WrongOverrideLinter: Severity.Error,
			WrongImportLinter: Severity.Warning,
			WrongFilePathLinter: Severity.Warning,
			WrongFieldMethodLinter: Severity.Warning,
			WrongClassNameLinter: Severity.Warning,
			UnusedTranslationsLinter: Severity.Information,
			UnusedNamespaceLinter: Severity.Error,
			UnusedMemberLinter: Severity.Information,
			TagLinter: Severity.Error,
			TagAttributeLinter: Severity.Error,
			PublicMemberLinter: Severity.Information,
			InterfaceLinter: Severity.Error,
			AbstractClassLinter: Severity.Error,
			UnusedClassLinter: Severity.Error,
			WrongNamespaceLinter: Severity.Warning,
			DuplicateTranslationLinter: Severity.Error
		};

		return defaultSeverity[linter];
	}

	getJSLinterExceptions(): JSLinterException[] {
		const defaultExceptions: JSLinterException[] = [
			{
				className: "sap.ui.core.Element",
				memberName: "getDomRef",
				applyToChildren: true
			},
			{
				className: "sap.ui.model.json.JSONModel",
				memberName: "iSizeLimit",
				applyToChildren: true
			},
			{
				className: "sap.ui.model.Binding",
				memberName: "*"
			},
			{
				className: "sap.ui.model.Model",
				memberName: "*"
			},
			{
				className: "sap.ui.core.Element",
				memberName: "*"
			},
			{
				className: "sap.ui.base.ManagedObject",
				memberName: "*"
			},
			{
				className: "sap.ui.core.Control",
				memberName: "*"
			},
			{
				className: "sap.ui.xmlfragment",
				memberName: "*"
			},
			{
				className: "*",
				memberName: "byId"
			},
			{
				className: "*",
				memberName: "prototype"
			},
			{
				className: "*",
				memberName: "call"
			},
			{
				className: "*",
				memberName: "apply"
			},
			{
				className: "*",
				memberName: "bind"
			},
			{
				className: "*",
				memberName: "constructor"
			},
			{
				className: "*",
				memberName: "init"
			},
			{
				className: "*",
				memberName: "exit"
			},
			{
				className: "map",
				memberName: "*"
			}
		];

		const userExceptions: JSLinterException[] =
			this._package.ui5?.ui5linter?.jsLinterExceptions ??
			PackageLinterConfigHandler._globalPackage?.ui5?.ui5linter?.jsLinterExceptions ??
			[];
		return defaultExceptions.concat(userExceptions);
	}

	getIdNamingPattern(): string {
		return (
			this._package.ui5?.ui5linter?.idNamingPattern ??
			PackageLinterConfigHandler._globalPackage?.ui5?.ui5linter?.idNamingPattern ??
			"^id{BindingPath}.*?{ControlName}$"
		);
	}

	getEventNamingPattern(): string {
		return (
			this._package.ui5?.ui5linter?.eventNamingPattern ??
			PackageLinterConfigHandler._globalPackage?.ui5?.ui5linter?.eventNamingPattern ??
			"^on{BindingPath}{ControlName}.*?{EventName}$"
		);
	}

	getAttributesToCheck(): string[] {
		return (
			this._package.ui5?.ui5linter?.attributesToCheck ??
			PackageLinterConfigHandler._globalPackage?.ui5?.ui5linter?.attributesToCheck ?? [
				"content",
				"items",
				"value",
				"text",
				"number"
			]
		);
	}

	getLinterUsage(linter: JSLinters | XMLLinters | PropertiesLinters) {
		return (
			this._package.ui5?.ui5linter?.usage?.[linter] ??
			PackageLinterConfigHandler._globalPackage?.ui5?.ui5linter?.usage?.[linter] ??
			true
		);
	}

	getPropertiesLinterExceptions(): string[] {
		return (
			this._package.ui5?.ui5linter?.propertiesLinterExceptions ??
			PackageLinterConfigHandler._globalPackage?.ui5?.ui5linter?.propertiesLinterExceptions ??
			[]
		);
	}

	checkIfMemberIsException(className = "", memberName = "") {
		const cacheKey = [className, memberName].join(",");

		if (!this._cache[cacheKey]) {
			const hardcodedExceptions = ["metadata", "renderer", "onAfterRendering", "customMetadata"];
			const classExceptions = this.getJSLinterExceptions();
			const isException =
				hardcodedExceptions.includes(memberName) ||
				!!classExceptions.find(classException => {
					let isException =
						(classException.className === className || classException.className === "*") &&
						(classException.memberName === memberName || classException.memberName === "*");

					if (
						!isException &&
						classException.applyToChildren &&
						(classException.memberName === memberName || classException.memberName === "*")
					) {
						isException = this._parser.classFactory.isClassAChildOfClassB(
							className,
							classException.className
						);
					}

					if (!isException) {
						isException = this._checkIfMemberIsEventHandler(memberName);
					}

					return isException;
				});

			this._cache[cacheKey] = isException;
		}

		return this._cache[cacheKey];
	}

	private _checkIfMemberIsEventHandler(memberName: string) {
		if (memberName.length <= 3) {
			return false;
		}

		const chars = memberName.split("");
		const firstChars = chars.splice(0, 2).join("");
		const memberNameStartsWithOn = firstChars === "on";
		const restCharsAreLowerCase = chars.every(char => char.toLowerCase() === char);

		const isDomEventHandler = memberNameStartsWithOn && restCharsAreLowerCase;

		return isDomEventHandler;
	}
}

export interface IUI5LinterEntryFields {
	severity?: {
		[key in JSLinters | XMLLinters | PropertiesLinters]: Severity;
	};
	usage?: {
		[key in JSLinters | XMLLinters | PropertiesLinters]: boolean;
	};
	jsLinterExceptions?: JSLinterException[];
	jsClassExceptions?: string[];
	xmlClassExceptions?: string[];
	propertiesLinterExceptions?: string[];
	componentsToInclude?: string[];
	componentsToExclude?: string[];
	idNamingPattern?: string;
	eventNamingPattern?: string;
	attributesToCheck?: string[];
}

export interface IUI5LinterEntry {
	ui5linter?: IUI5LinterEntryFields;
}

export interface IUI5PackageConfigEntry {
	ui5?: IUI5LinterEntry;
}
