import { UI5Parser, TextDocument } from "ui5plugin-parser";
import * as chalk from "chalk";
import { Severity } from "./classes/Linter";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";

(async function() {
	const parser = UI5Parser.getInstance();
	await parser.initialize();
	const JSLinter = new (await import("./classes/js/jslinter/JSLinterFactory")).JSLinterFactory();

	const customClasses = parser.classFactory.getAllCustomUIClasses();
	const errorPromises = customClasses.map(customClass => {
		const textDocument = new TextDocument(customClass.classText, customClass.classFSPath || "");
		return JSLinter.getLintingErrors(textDocument);
	});
	const lintingErrors = (await Promise.all(errorPromises)).flat();
	lintingErrors.forEach(lintingError => lintingError.severity = lintingError.severity ?? Severity.Warning);


	const errors = lintingErrors.filter(error => error.severity === Severity.Error);
	const warnings = lintingErrors.filter(error => error.severity === Severity.Warning);
	const informationMessages = lintingErrors.filter(error => error.severity === Severity.Information);
	const hints = lintingErrors.filter(error => error.severity === Severity.Hint);

	if (hints.length > 0) {
		hints.forEach(hint => {
			const UIClass = <CustomUIClass>parser.classFactory.getUIClass(hint.className);
			const fsPath = UIClass.classFSPath;
			const filePosition = `${fsPath}:${hint.range.start.line}:${hint.range.start.column + 1}`;
			const errorText = hint.message;
			console.log(`${chalk.grey.underline.bold(filePosition)} ${chalk.grey.bold(errorText)} (${hint.source})`);
		});
		console.log(chalk.bold.underline.grey(`\nHints: ${hints.length}\n`));
	}

	if (informationMessages.length > 0) {
		informationMessages.forEach(information => {
			const UIClass = <CustomUIClass>parser.classFactory.getUIClass(information.className);
			const fsPath = UIClass.classFSPath;
			const filePosition = `${fsPath}:${information.range.start.line}:${information.range.start.column + 1}`;
			const errorText = information.message;
			console.log(`${chalk.blue.underline.bold(filePosition)} ${chalk.blue.bold(errorText)} (${information.source})`);
		});
		console.log(chalk.bold.underline.blue(`\nInformation: ${informationMessages.length}\n`));
	}

	if (warnings.length > 0) {
		warnings.forEach(warning => {
			const UIClass = <CustomUIClass>parser.classFactory.getUIClass(warning.className);
			const fsPath = UIClass.classFSPath;
			const filePosition = `${fsPath}:${warning.range.start.line}:${warning.range.start.column + 1}`;
			const errorText = warning.message;
			console.warn(`${chalk.rgb(255, 136, 0).underline.bold(filePosition)} ${chalk.rgb(255, 136, 0).bold(errorText)} (${warning.source})`);
		});
		console.log(chalk.bold.underline.rgb(255, 136, 0)(`\nWarnings: ${warnings.length}\n`));
	}

	if (errors.length > 0) {
		errors.forEach(error => {
			const UIClass = <CustomUIClass>parser.classFactory.getUIClass(error.className);
			const fsPath = UIClass.classFSPath;
			const filePosition = `${fsPath}:${error.range.start.line}:${error.range.start.column + 1}`;
			const errorText = error.message;
			console.error(`${chalk.redBright.underline.bold(filePosition)} ${chalk.redBright.bold(errorText)} (${error.source})`);
		});
		console.log(chalk.bold.underline.redBright(`\nErrors: ${errors.length}\n`));
	}

	if (errors.length > 0) {
		process.exit(1);
	} else {
		process.exit(0);
	}
})()