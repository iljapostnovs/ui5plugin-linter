import { JSLinter } from "./parts/abstraction/JSLinter";
import { UnusedMemberLinter } from "./parts/UnusedMemberLinter";
import { WrongFilePathLinter } from "./parts/WrongFilePathLinter";
import { AnyCustomTSClass, TextDocument, UI5TSParser } from "ui5plugin-parser";
import { IError, Linter } from "../Linter";
import { UnusedClassLinter } from "./parts/UnusedClassLinter";
import { WrongClassNameLinter } from "./parts/WrongClassNameLinter";
import { WrongNamespaceLinter } from "./parts/WrongNamespaceLinter";
import { PublicMemberLinter } from "./parts/PublicMemberLinter";

export class TSLinterErrorFactory extends Linter<UI5TSParser, AnyCustomTSClass> {
	timePerchar = 0;
	getLintingErrors(document: TextDocument): IError[] {
		const linters: JSLinter<UI5TSParser, AnyCustomTSClass>[] = [
			new UnusedMemberLinter(this._parser, this._configHandler),
			new WrongFilePathLinter(this._parser, this._configHandler),
			new UnusedClassLinter(this._parser, this._configHandler),
			new WrongClassNameLinter(this._parser, this._configHandler),
			new WrongNamespaceLinter(this._parser, this._configHandler),
			new PublicMemberLinter(this._parser, this._configHandler)
		];

		const errors = linters.flatMap(linter => linter.getLintingErrors(document));

		return errors;
	}
}