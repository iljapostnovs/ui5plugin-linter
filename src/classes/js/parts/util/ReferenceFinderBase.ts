import { AbstractUI5Parser, XMLParser } from "ui5plugin-parser";
import {
	AbstractCustomClass,
	ICustomMember
} from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import { IXMLFile } from "ui5plugin-parser/dist/classes/utils/FileReader";
import { RangeAdapter } from "../../../adapters/RangeAdapter";
import { IRange } from "../../../Linter";
export interface ILocation {
	filePath: string;
	range: IRange;
}
export interface IReferenceCodeLensCacheable {
	[className: string]: {
		[methodName: string]: ILocation[];
	};
}

export default abstract class ReferenceFinderBase<
	MemberType extends ICustomMember,
	ParserType extends AbstractUI5Parser<CustomClass>,
	CustomClass extends AbstractCustomClass
> {
	protected readonly _parser: ParserType;
	constructor(parser: ParserType) {
		this._parser = parser;
	}
	abstract getReferenceLocations(member: MemberType): ILocation[];

	protected abstract _addLocationsFromUIClass(
		member: MemberType,
		UIClass: CustomClass,
		locations: ILocation[]
	): void;

	protected _addLocationsFromXMLDocument(
		XMLDoc: IXMLFile,
		member: MemberType,
		locations: ILocation[]
	) {
		const cache = XMLDoc.getCache<IReferenceCodeLensCacheable>("referenceCodeLensCache") || {};
		if (cache[member.owner]?.[`_${member.name}`]) {
			locations.push(...cache[member.owner][`_${member.name}`]);
		} else {
			const tagsAndAttributes = XMLParser.getXMLFunctionCallTagsAndAttributes(XMLDoc, member.name, member.owner);

			const currentLocations: ILocation[] = [];
			tagsAndAttributes.forEach(tagAndAttribute => {
				tagAndAttribute.attributes.forEach(attribute => {
					const positionBegin =
						tagAndAttribute.tag.positionBegin +
						tagAndAttribute.tag.text.indexOf(attribute) +
						this._gerIndexOfAttributeValue(attribute, member.name);
					const positionEnd = positionBegin + member.name.length;
					const range = RangeAdapter.offsetsRange(XMLDoc.content, positionBegin, positionEnd);
					if (range) {
						currentLocations.push({ filePath: XMLDoc.fsPath, range: range });
					}
				});
			});
			if (currentLocations.length > 0) {
				locations.push(...currentLocations);
			}
			if (!cache[member.owner]) {
				cache[member.owner] = {};
			}
			cache[member.owner][`_${member.name}`] = currentLocations;
			XMLDoc.setCache("referenceCodeLensCache", cache);
		}
	}

	private _gerIndexOfAttributeValue(attribute: string, memberName: string) {
		const rMember = new RegExp(`(\\.|'|")${memberName}`);
		const startsWithSomething = rMember.test(attribute);
		if (startsWithSomething) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			return rMember.exec(attribute)!.index + 1;
		} else {
			return attribute.indexOf(memberName);
		}
	}
}
