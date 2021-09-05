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
import { IError, Linter } from "../../Linter";

export class JSLinterFactory extends Linter {
	timePerchar = 0;
	async getLintingErrors(document: TextDocument): Promise<IError[]> {
		const linters: JSLinter[] = [
			new WrongFieldMethodLinter(),
			new WrongClassNameLinter(),
			new WrongImportLinter(),
			new WrongParametersLinter(),
			new UnusedMemberLinter(),
			new WrongFilePathLinter(),
			new PublicMemberLinter(),
			new WrongOverrideLinter(),
			new AbstractClassLinter(),
			new InterfaceLinter()
		];

		let errors: IError[] = [];
		try {
			errors = (linters.map(linter => linter.getErrors(document))).flat();
		} catch (error) {
			console.error(error);
		}

		return errors;
	}
}