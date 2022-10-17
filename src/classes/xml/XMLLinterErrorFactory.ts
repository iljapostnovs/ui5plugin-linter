import { TextDocument } from "ui5plugin-parser";
import { Linter } from "../Linter";
import { XMLLinter } from "./linters/abstraction/XMLLinter";
import { TagAttributeLinter } from "./linters/TagAttributeLinter";
import { TagLinter } from "./linters/TagLinter";
import { UnusedNamespaceLinter } from "./linters/UnusedNamespaceLinter";
import { WrongFilePathLinter } from "./linters/WrongFilePathLinter";

export class XMLLinterErrorFactory extends Linter<any, any> {
	timePerchar = 0;
	getLintingErrors(document: TextDocument) {
		const linters: XMLLinter[] = [
			new TagAttributeLinter(this._parser, this._configHandler),
			new TagLinter(this._parser, this._configHandler),
			new UnusedNamespaceLinter(this._parser, this._configHandler),
			new WrongFilePathLinter(this._parser, this._configHandler)
		];

		const errors = linters.flatMap(linter => linter.getLintingErrors(document));

		return errors;
	}
}