/* eslint-disable @typescript-eslint/indent */
import { MethodDeclaration } from "ts-morph";
import * as ts from "typescript";
import { UI5TSParser } from "ui5plugin-parser";
import {
	CustomTSClass,
	ICustomClassTSConstructor,
	ICustomClassTSField,
	ICustomClassTSMethod
} from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomTSClass";
import { RangeAdapter } from "../../../adapters/RangeAdapter";
import * as path from "path";
import { IRange } from "../../../Linter";
import ReferenceFinderBase, { ILocation, IReferenceCodeLensCacheable } from "./ReferenceFinderBase";

export class TSReferenceFinder extends ReferenceFinderBase<
	ICustomClassTSField | ICustomClassTSMethod | ICustomClassTSConstructor,
	UI5TSParser,
	CustomTSClass
> {
	public getReferenceLocations(member: ICustomClassTSField | ICustomClassTSMethod | ICustomClassTSConstructor) {
		const locations: ILocation[] = [];

		const UIClass = this._parser.classFactory.getUIClass(member.owner);
		if (UIClass instanceof CustomTSClass) {
			this._addLocationsFromUIClass(member, UIClass, locations);

			if (member.name !== "constructor") {
				const viewsAndFragments = this._parser.classFactory.getViewsAndFragmentsOfControlHierarchically(
					UIClass,
					[],
					true,
					true,
					true
				);
				const viewAndFragmentArray = [...viewsAndFragments.fragments, ...viewsAndFragments.views];
				viewAndFragmentArray.forEach(XMLDoc => {
					this._addLocationsFromXMLDocument(XMLDoc, member, locations);
				});
			}
		}

		return locations;
	}

	protected _addLocationsFromUIClass(
		member: ICustomClassTSField | ICustomClassTSMethod | ICustomClassTSConstructor,
		UIClass: CustomTSClass,
		locations: ILocation[]
	) {
		const cache = UIClass.getCache<IReferenceCodeLensCacheable>("referenceCodeLensCache") || {};
		if (cache[member.owner]?.[`_${member.name}`]) {
			locations.push(...cache[member.owner][`_${member.name}`]);
			return;
		}

		const references = member.node?.findReferences().flatMap(reference => reference.getReferences());
		const currentLocations: ILocation[] =
			references
				?.filter(reference => {
					const notAReferenceToItself =
						path.resolve(reference.getSourceFile().getFilePath()) !== UIClass.fsPath ||
						(!member.node?.isKind(ts.SyntaxKind.Constructor) &&
							reference.getNode().getStart() !==
								(<MethodDeclaration>member.node).getNameNode().getStart()) ||
						(member.node?.isKind(ts.SyntaxKind.Constructor) &&
							reference.getNode().getStart() !== member.node.getStart());
					return notAReferenceToItself;
				})
				.map(reference => {
					const range = RangeAdapter.offsetsRange(
						reference.getSourceFile().getFullText(),
						reference.getTextSpan().getStart(),
						reference.getTextSpan().getEnd()
					);
					let referenceData: [IRange, string] | undefined;
					if (range) {
						referenceData = [range, path.resolve(reference.getSourceFile().getFilePath())];
					}
					return referenceData;
				})
				.filter(rangeData => !!rangeData)
				.map(rangeData => {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					return { filePath: rangeData![1] || "", range: rangeData![0] };
				}) ?? [];

		if (!cache[member.owner]) {
			cache[member.owner] = {};
		}
		cache[member.owner][`_${member.name}`] = currentLocations;
		UIClass.setCache("referenceCodeLensCache", cache);
		locations.push(...currentLocations);
	}
}
