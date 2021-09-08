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
import { TextDocument } from "ui5plugin-parser";
import { IError, Linter } from "../Linter";

export class JSLinterErrorFactory extends Linter {
	timePerchar = 0;
	getLintingErrors(document: TextDocument): IError[] {
		const linters: JSLinter[] = [
			new WrongFieldMethodLinter(this._parser, this._configHandler),
			new WrongClassNameLinter(this._parser, this._configHandler),
			new WrongImportLinter(this._parser, this._configHandler),
			new WrongParametersLinter(this._parser, this._configHandler),
			new UnusedMemberLinter(this._parser, this._configHandler),
			new WrongFilePathLinter(this._parser, this._configHandler),
			new PublicMemberLinter(this._parser, this._configHandler),
			new WrongOverrideLinter(this._parser, this._configHandler),
			new AbstractClassLinter(this._parser, this._configHandler),
			new InterfaceLinter(this._parser, this._configHandler)
		];

		const errors = (linters.map(linter => linter.getLintingErrors(document))).flat();

		return errors;
	}
}