import { TextDocument } from "ui5plugin-parser";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { RangeAdapter } from "../../adapters/RangeAdapter";
import * as fs from "fs";
import { JSLinters, IError } from "../../Linter";
import { JSLinter } from "./abstraction/JSLinter";

export class WrongFilePathLinter extends JSLinter {
	protected className = JSLinters.WrongFilePathLinter;
	_getErrors(document: TextDocument): IError[] {
		const errors: IError[] = [];

		if (this._configHandler.getLinterUsage(this.className)) {
			const className = this._parser.fileReader.getClassNameFromPath(document.fileName);
			if (className) {
				const UIClass = this._parser.classFactory.getUIClass(className);
				if (UIClass instanceof CustomUIClass && UIClass.classText) {
					const manifest = this._parser.fileReader.getManifestForClass(UIClass.className);
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
											source: this.className,
											message: `Class "${sClassName}" doesn't exist`,
											range: range,
											severity: this._configHandler.getSeverity(this.className)
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
		const UIClass = this._parser.classFactory.getUIClass(className);
		if (UIClass && UIClass instanceof CustomUIClass) {
			isPathValid = UIClass.classExists;
		}

		if (!isPathValid) {
			const sFileFSPath = this._parser.fileReader.convertClassNameToFSPath(className, false, false, true);
			const aAllViews = this._parser.fileReader.getAllViews();
			const oView = aAllViews.find(oView => oView.fsPath === sFileFSPath);
			isPathValid = !!oView;
		}

		if (!isPathValid) {
			const sFileFSPath = this._parser.fileReader.convertClassNameToFSPath(className, false, true, false);
			const aAllFragments = this._parser.fileReader.getAllFragments();
			const oFragment = aAllFragments.find(oFragment => oFragment.fsPath === sFileFSPath);
			isPathValid = !!oFragment;
		}

		if (!isPathValid) {
			if (className.endsWith(".")) {
				className = className.substring(0, className.length - 1);
			}
			const sFileFSPath = this._parser.fileReader.convertClassNameToFSPath(className)?.replace(".js", ".properties");
			if (sFileFSPath) {
				isPathValid = fs.existsSync(sFileFSPath);
			}
		}

		if (!isPathValid) {
			if (className.endsWith(".")) {
				className = className.substring(0, className.length - 1);
			}
			const sFileFSPath = this._parser.fileReader.convertClassNameToFSPath(className)?.replace(".js", "");
			if (sFileFSPath) {
				isPathValid = fs.existsSync(sFileFSPath);
			}
		}

		return isPathValid;
	}
}