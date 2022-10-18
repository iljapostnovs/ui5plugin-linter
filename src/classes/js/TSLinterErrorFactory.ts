import { JSLinter } from "./parts/abstraction/JSLinter";
import { UnusedMemberLinter } from "./parts/UnusedMemberLinter";
import { WrongFilePathLinter } from "./parts/WrongFilePathLinter";
import { TextDocument, UI5TSParser } from "ui5plugin-parser";
import { IError, Linter } from "../Linter";
import { UnusedClassLinter } from "./parts/UnusedClassLinter";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomTSClass";

export class TSLinterErrorFactory extends Linter<UI5TSParser, CustomTSClass> {
	timePerchar = 0;
	getLintingErrors(document: TextDocument): IError[] {
		const linters: JSLinter<UI5TSParser, CustomTSClass>[] = [
			new UnusedMemberLinter(this._parser, this._configHandler),
			new WrongFilePathLinter(this._parser, this._configHandler),
			new UnusedClassLinter(this._parser, this._configHandler)
		];

		const errors = linters.flatMap(linter => linter.getLintingErrors(document));

		return errors;
	}
}