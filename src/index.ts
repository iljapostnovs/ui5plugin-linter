import { UI5Parser, TextDocument } from "ui5plugin-parser";
import * as chalk from "chalk";
import { Severity } from "./classes/js/jslinter/parts/abstraction/JSLinter";

(async function() {
	const parser = UI5Parser.getInstance();
	await parser.initialize();
	const JSLinter = (await import("./classes/js/jslinter/JSLinter")).JSLinter;

	const customClasses = parser.classFactory.getAllCustomUIClasses();
	const errorPromises = customClasses.map(customClass => {
		const textDocument = new TextDocument(customClass.classText, customClass.classFSPath || "");
		return JSLinter.getLintingErrors(textDocument);
	});
	const errors = (await Promise.all(errorPromises)).flat();
	errors.forEach(error => {
		const errorText = `${error.className}: ${error.range.start.line}:${error.range.start.column} ${error.message}`;
		switch (error.severity) {
			case Severity.Error:
				console.error(chalk.red.bold(errorText));
				break;

			case Severity.Warning:
				console.warn(chalk.yellow(errorText));
				break;

			case Severity.Information:
				console.log(chalk.blue(errorText));
				break;

			default:
				console.log(chalk.grey(errorText));
				break;
		}
	});

	console.log(chalk.bold.red(`Total errors: ${errors.length}`));
	if (errors.find(error => error.severity === Severity.Error)) {
		process.exit(1);
	} else {
		process.exit(0);
	}
})()