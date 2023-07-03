import { ITag } from "ui5plugin-parser/dist/classes/parsing/util/xml/XMLParser";
import APatternValidator from "./APatternValidator";

export default class IdPatternValidator extends APatternValidator<ITag> {
	validateValue(actualId: string, tag: ITag): void {
		const expectedIdRegExp = this._assembleExpectedValueRegExp(tag);

		if (!expectedIdRegExp.test(actualId)) {
			const message = `"${actualId}" should match pattern: "${expectedIdRegExp}"`;
			throw new Error(message);
		}
	}

	private _assembleExpectedValueRegExp(tag: ITag) {
		const controlName = this._parser.xmlParser.getClassNameFromTag(tag.text);

		const meaningAssumption = this._generateMeaningAssumption(tag.attributes ?? []);
		const expectedIdWithReplacedVars = this._pattern
			.replace(/\{ControlName\}/g, controlName ?? "")
			.replace(/\{controlName\}/g, this._toFirstCharLower(controlName) ?? "")
			.replace(/\{MeaningAssumption\}/g, meaningAssumption ?? "")
			.replace(/\{meaningAssumption\}/g, this._toFirstCharLower(meaningAssumption) ?? "");

		const expectedId =
			expectedIdWithReplacedVars[0].toLowerCase() +
			expectedIdWithReplacedVars.substring(1, expectedIdWithReplacedVars.length);

		return new RegExp(expectedId);
	}
}
