import { TextDocument, UI5JSParser } from "ui5plugin-parser";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { IError, Linter } from "../Linter";
import { AbstractClassLinter } from "./parts/AbstractClassLinter";
import { JSLinter } from "./parts/abstraction/JSLinter";
import { InterfaceLinter } from "./parts/InterfaceLinter";
import { PublicMemberLinter } from "./parts/PublicMemberLinter";
import { UnusedClassLinter } from "./parts/UnusedClassLinter";
import { UnusedMemberLinter } from "./parts/UnusedMemberLinter";
import { WrongClassNameLinter } from "./parts/WrongClassNameLinter";
import { WrongFieldMethodLinter } from "./parts/WrongFieldMethodLinter";
import { WrongFilePathLinter } from "./parts/WrongFilePathLinter";
import { WrongImportLinter } from "./parts/WrongImportLinter";
import { WrongOverrideLinter } from "./parts/WrongOverrideLinter";
import { WrongParametersLinter } from "./parts/WrongParametersLinter";

export class JSLinterErrorFactory extends Linter<UI5JSParser, CustomJSClass> {
	timePerchar = 0;
	getLintingErrors(document: TextDocument): IError[] {
		const linters: JSLinter<UI5JSParser, CustomJSClass>[] = [
			new WrongFieldMethodLinter(this._parser, this._configHandler),
			new WrongClassNameLinter(this._parser, this._configHandler),
			new WrongImportLinter(this._parser, this._configHandler),
			new WrongParametersLinter(this._parser, this._configHandler),
			new UnusedMemberLinter(this._parser, this._configHandler),
			new WrongFilePathLinter(this._parser, this._configHandler),
			new PublicMemberLinter(this._parser, this._configHandler),
			new WrongOverrideLinter(this._parser, this._configHandler),
			new AbstractClassLinter(this._parser, this._configHandler),
			new InterfaceLinter(this._parser, this._configHandler),
			new UnusedClassLinter(this._parser, this._configHandler)
		];

		const errors = linters.flatMap(linter => linter.getLintingErrors(document));

		return errors;
	}
}
