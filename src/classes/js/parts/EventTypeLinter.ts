import { AnyCustomTSClass, TextDocument, UI5TSParser } from "ui5plugin-parser";
import { AbstractBaseClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractBaseClass";
import { CustomTSClass, ICustomClassTSMethod } from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSClass";
import { IXMLFile } from "ui5plugin-parser/dist/classes/parsing/util/filereader/IFileReader";
import { RangeAdapter } from "ui5plugin-parser/dist/classes/parsing/util/range/adapters/RangeAdapter";
import { IError, JSLinters } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";

export class EventTypeLinter extends JSLinter<UI5TSParser, AnyCustomTSClass> {
	protected className = JSLinters.EventTypeLinter;
	protected _getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		const UIClass = this._parser.textDocumentTransformer.toCustomUIClass(document);
		if (!(UIClass instanceof CustomTSClass)) {
			return errors;
		}

		const eventHandlers = UIClass.methods
			.filter(method => method.isEventHandler)
			.filter(method => method?.node?.getParameters().length);
		const viewsAndFragments = this._parser.classFactory.getViewsAndFragmentsOfControlHierarchically(
			UIClass,
			[],
			true,
			true,
			true
		);
		const XMLFiles: IXMLFile[] = [...viewsAndFragments.views, ...viewsAndFragments.fragments];
		XMLFiles.forEach(XMLFile => {
			const documentErrors = this._getEventTypeErrorsFromXMLDocument(XMLFile, eventHandlers, UIClass);
			errors.push(...documentErrors);
		});

		return errors;
	}

	private _getEventTypeErrorsFromXMLDocument(
		XMLFile: IXMLFile,
		eventHandlers: ICustomClassTSMethod[],
		UIClass: CustomTSClass
	) {
		return eventHandlers.reduce((errors: IError[], eventHandler) => {
			const eventHandlerXMLData = this._getEventHandlerData(XMLFile, eventHandler.name);
			if (!eventHandlerXMLData) {
				return errors;
			}
			const expectedEventType = this._generateEvent(
				eventHandlerXMLData.eventName,
				eventHandlerXMLData.eventOwner
			);
			const actualEventType = eventHandler.node?.getParameters().at(0)?.getTypeNode()?.getText();
			const eventTypeNode = eventHandler.node?.getParameters().at(0)?.getTypeNode();
			const typeRange =
				eventTypeNode &&
				RangeAdapter.offsetsRange(UIClass.classText, eventTypeNode.getStart(), eventTypeNode.getEnd());

			if (!actualEventType || expectedEventType === actualEventType || !eventTypeNode || !typeRange) {
				return errors;
			}

			errors.push({
				acornNode: UIClass.node,
				code: "UI5Plugin",
				className: UIClass.className,
				source: this.className,
				message: `Invalid event parameter type. Expected "${expectedEventType}", but got "${actualEventType}"`,
				range: typeRange,
				severity: this._configHandler.getSeverity(this.className),
				fsPath: UIClass.fsPath
			});

			return errors;
		}, []);
	}

	private _generateEvent(eventName: string, owner: string) {
		const ownerName = owner.split(".").pop() ?? "";
		const eventNameUpper = eventName[0].toUpperCase() + eventName.substring(1, eventName.length);
		const tsEventParameters = `${ownerName}$${eventNameUpper}Event`;

		return tsEventParameters;
	}

	private _getEventHandlerData(XMLFile: IXMLFile, eventHandlerName: string) {
		const regex = new RegExp(`".?${eventHandlerName}"`);
		const eventHandlerPosition = regex.exec(XMLFile.content)?.index;
		if (!eventHandlerPosition) {
			return;
		}

		const tag = this._parser.xmlParser.getTagInPosition(XMLFile, eventHandlerPosition);
		const attributes = this._parser.xmlParser.getAttributesOfTheTag(tag);
		const eventHandlerAttribute = attributes?.find(attribute => {
			const { attributeValue } = this._parser.xmlParser.getAttributeNameAndValue(attribute);
			return this._parser.xmlParser.getEventHandlerNameFromAttributeValue(attributeValue) === eventHandlerName;
		});
		const attributeData =
			eventHandlerAttribute && this._parser.xmlParser.getAttributeNameAndValue(eventHandlerAttribute);

		const tagText = tag.text;
		const tagPrefix = this._parser.xmlParser.getTagPrefix(tagText);
		const classNameOfTheTag = this._parser.xmlParser.getClassNameFromTag(tagText);
		const libraryPath = this._parser.xmlParser.getLibraryPathFromTagPrefix(
			XMLFile,
			tagPrefix,
			eventHandlerPosition
		);
		const classOfTheTag = [libraryPath, classNameOfTheTag].join(".");
		const eventOwner = attributeData && this._getEventData(classOfTheTag, attributeData.attributeName)?.owner;

		if (!attributeData || !eventOwner) {
			return;
		}

		const eventHandlerData = {
			className: classOfTheTag,
			eventName: attributeData.attributeName,
			eventHandlerName,
			eventOwner
		};

		return eventHandlerData;
	}

	private _getEventData(className: string, eventName: string) {
		const UIClasses = this._getClassAndParents(className);
		const eventDataSet = UIClasses.flatMap(UIClass =>
			UIClass.events.map(UIEvent => ({ event: UIEvent, owner: UIClass.className }))
		);
		const eventData = eventDataSet.find(event => event.event.name === eventName);

		return eventData;
	}

	private _getClassAndParents(className: string): AbstractBaseClass[] {
		const UIClasses: AbstractBaseClass[] = [];
		const UIClass = this._parser.classFactory.getUIClass(className);
		if (UIClass) {
			UIClasses.push(UIClass);
		}
		if (UIClass?.parentClassNameDotNotation) {
			const parents = this._getClassAndParents(UIClass.parentClassNameDotNotation);
			UIClasses.push(...parents);
		}

		return UIClasses;
	}
}
