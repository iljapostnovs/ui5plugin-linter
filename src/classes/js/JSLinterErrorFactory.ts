import { JSLinter } from "./parts/abstraction/JSLinter";
import { WrongFieldMethodLinter } from "./parts/WrongFieldMethodLinter";
import { WrongClassNameLinter } from "./parts/WrongClassNameLinter";
import { WrongImportLinter } from "./parts/WrongImportLinter";
import { WrongParametersLinter } from "./parts/WrongParametersLinter";
import { UnusedMemberLinter } from "./parts/UnusedMemberLinter";
import { WrongFilePathLinter } from "./parts/WrongFilePathLinter";
import { PublicMemberLinter } from "./parts/PublicMemberLinter";
import { WrongOverrideLinter } from "./parts/WrongOverrideLinter";
import { AbstractClassLinter } from "./parts/AbstractClassLinter";
import { InterfaceLinter } from "./parts/InterfaceLinter";
import { TextDocument, UI5Parser } from "ui5plugin-parser";
import { IError, Linter } from "../Linter";
import { UnusedClassLinter } from "./parts/UnusedClassLinter";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";

export class JSLinterErrorFactory extends Linter<UI5Parser, CustomUIClass> {
	timePerchar = 0;
	getLintingErrors(document: TextDocument): IError[] {
		const linters: JSLinter<UI5Parser, CustomUIClass>[] = [
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