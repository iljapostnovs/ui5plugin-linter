import { TextDocument, UI5Parser } from "ui5plugin-parser";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { RangeAdapter } from "../../../adapters/RangeAdapter";
import * as fs from "fs";
import { PackageConfigHandler } from "./config/PackageConfigHandler";
import { JSLinters, IError } from "../../../Linter";
import { JSLinter } from "./abstraction/JSLinter";

export class WrongFilePathLinter extends JSLinter {
	protected className = JSLinters.WrongFilePathLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		if (new PackageConfigHandler().getLinterUsage(this.className)) {
			const className = UI5Parser.getInstance().fileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = UI5Parser.getInstance().classFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass && UIClass.classText) {
					const manifest = UI5Parser.getInstance().fileReader.getManifestForClass(UIClass.className);
					if (manifest) {
						const rClassNamesRegex = new RegExp(`${manifest.componentName.replace(/\./, "\\.")}\\..*?(?="|'|}|]|>|\\|)`, "g");
						if (rClassNamesRegex) {
							let result = rClassNamesRegex.exec(UIClass.classText);
							while (result) {
								const sClassName = result[0];
								const isClassNameValid = this._validateClassName(sClassName);
								if (!isClassNameValid) {
									const positionBegin = result.index;
									const positionEnd = positionBegin + sClassName.length;
									const range = RangeAdapter.offsetsToVSCodeRange(UIClass.classText, positionBegin, positionEnd);
									if (range) {
										errors.push({
											acornNode: UIClass.acornClassBody,
											code: "UI5Plugin",
											className: UIClass.className,
											source: "Wrong File Path Linter",
											message: `Class "${sClassName}" doesn't exist`,
											range: range
										});
									}
								}

								result = rClassNamesRegex.exec(UIClass.classText);
							}
						}
					}
				}
			}
		}
		return errors;
	}

	private _validateClassName(className: string) {
		let isPathValid = false;
		const UIClass = UI5Parser.getInstance().classFactory.getUIClass(className);
		if (UIClass && UIClass instanceof CustomUIClass) {
			isPathValid = UIClass.classExists;
		}

		if (!isPathValid) {
			const sFileFSPath = UI5Parser.getInstance().fileReader.convertClassNameToFSPath(className, false, false, true);
			const aAllViews = UI5Parser.getInstance().fileReader.getAllViews();
			const oView = aAllViews.find(oView => oView.fsPath === sFileFSPath);
			isPathValid = !!oView;
		}

		if (!isPathValid) {
			const sFileFSPath = UI5Parser.getInstance().fileReader.convertClassNameToFSPath(className, false, true, false);
			const aAllFragments = UI5Parser.getInstance().fileReader.getAllFragments();
			const oFragment = aAllFragments.find(oFragment => oFragment.fsPath === sFileFSPath);
			isPathValid = !!oFragment;
		}

		if (!isPathValid) {
			if (className.endsWith(".")) {
				className = className.substring(0, className.length - 1);
			}
			const sFileFSPath = UI5Parser.getInstance().fileReader.convertClassNameToFSPath(className)?.replace(".js", ".properties");
			if (sFileFSPath) {
				isPathValid = fs.existsSync(sFileFSPath);
			}
		}

		if (!isPathValid) {
			if (className.endsWith(".")) {
				className = className.substring(0, className.length - 1);
			}
			const sFileFSPath = UI5Parser.getInstance().fileReader.convertClassNameToFSPath(className)?.replace(".js", "");
			if (sFileFSPath) {
				isPathValid = fs.existsSync(sFileFSPath);
			}
		}

		return isPathValid;
	}
}