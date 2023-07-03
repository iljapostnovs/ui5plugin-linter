import { IUIEvent } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/AbstractJSClass";
import { ITag } from "ui5plugin-parser/dist/classes/parsing/util/xml/XMLParser";
import APatternValidator from "./APatternValidator";

export default class EventPatternValidator extends APatternValidator<[IUIEvent, ITag]> {
	validateValue(actualEventName: string, data: [IUIEvent, ITag]): void {
		const expectedEventRegExp = this._assembleExpectedValueRegExp(data);

		if (!expectedEventRegExp.test(actualEventName)) {
			const message = `"${actualEventName}" should match pattern: "${expectedEventRegExp}"`;
			throw new Error(message);
		}
	}

	private _assembleExpectedValueRegExp(data: [IUIEvent, ITag]) {
		const [event, tag] = data;
		const eventNameUpperCamel = event.name
			? event.name[0].toUpperCase() + event.name.substring(1, event.name.length)
			: "";
		const controlName = this._parser.xmlParser.getClassNameFromTag(tag.text);
		const meaningAssumption = this._generateMeaningAssumption(tag.attributes ?? []);

		const expectedIdWithReplacedVars = this._pattern
			.replace(/\{ControlName\}/g, controlName ?? "")
			.replace(/\{controlName\}/g, this._toFirstCharLower(controlName) ?? "")
			.replace(/\{EventName\}/g, eventNameUpperCamel ?? "")
			.replace(/\{eventName\}/g, this._toFirstCharLower(eventNameUpperCamel) ?? "")
			.replace(/\{MeaningAssumption\}/g, meaningAssumption ?? "")
			.replace(/\{meaningAssumption\}/g, this._toFirstCharLower(meaningAssumption) ?? "");

		const expectedId =
			expectedIdWithReplacedVars[0].toLowerCase() +
			expectedIdWithReplacedVars.substring(1, expectedIdWithReplacedVars.length);

		return new RegExp(expectedId);
	}
}
