#!/usr/bin/env node
const UI5Parser = require("ui5plugin-parser").UI5Parser;
const TextDocument = require("ui5plugin-parser").TextDocument;
const WorkspaceFolder = require("ui5plugin-parser").WorkspaceFolder;
const chalk = require("chalk");
const Severity = require("../dist/classes/Linter").Severity;

(async function() {
	const parser = UI5Parser.getInstance();
	if (process.argv.includes("--rmcache")) {
		parser.clearCache();
	}

	const workspaceFolders = [new WorkspaceFolder(process.cwd())];
	const PackageLinterConfigHandler = require("../dist/classes/config/PackageLinterConfigHandler").PackageLinterConfigHandler;
	const additionalWorkspacePaths = PackageLinterConfigHandler.getPackageAdditionalWorkspacePaths();
	if (additionalWorkspacePaths) {
		const path = require("path");
		const resolvedPaths = additionalWorkspacePaths.map(additionalComponent => new WorkspaceFolder(path.resolve(additionalComponent)));
		workspaceFolders.push(...resolvedPaths);
	}
	await parser.initialize(workspaceFolders);
	const JSLinterErrorFactory = require("../dist/classes/js/JSLinterErrorFactory").JSLinterErrorFactory;
	const XMLLinterErrorFactory = require("../dist/classes/xml/XMLLinterErrorFactory").XMLLinterErrorFactory;
	const PropertiesLinterErrorFactory = require("../dist/classes/properties/PropertiesLinterErrorFactory").PropertiesLinterErrorFactory;
	const JSLinter = new JSLinterErrorFactory(parser);
	const XMLLinter = new XMLLinterErrorFactory(parser);
	const propertiesLinter = new PropertiesLinterErrorFactory(parser);
	const XMLFiles = [
		...parser.fileReader.getAllViews(),
		...parser.fileReader.getAllFragments()
	];
	const propertiesFiles = parser.fileReader.getResourceModelFiles();
	const propertiesTextDocuments = propertiesFiles.map(propertyFile => {
		const manifest = parser.fileReader.getManifestForClass(propertyFile.componentName + ".");
		return new TextDocument(propertyFile.content, parser.fileReader.getResourceModelUriForManifest(manifest));
	});

	const customClasses = parser.classFactory.getAllCustomUIClasses();
	const lintingErrors = customClasses.flatMap(customClass => {
		const textDocument = new TextDocument(customClass.classText, customClass.classFSPath || "");
		return JSLinter.getLintingErrors(textDocument);
	}).concat(XMLFiles.flatMap(XMLFile => {
		const textDocument = new TextDocument(XMLFile.content || "", XMLFile.fsPath || "");
		return XMLLinter.getLintingErrors(textDocument);
	})).concat(propertiesTextDocuments.flatMap(textDocument => {
		return propertiesLinter.getLintingErrors(textDocument);
	}));
	lintingErrors.forEach(lintingError => lintingError.severity = lintingError.severity ?? Severity.Warning);

	const errors = lintingErrors.filter(error => error.severity === Severity.Error);
	const warnings = lintingErrors.filter(error => error.severity === Severity.Warning);
	const informationMessages = lintingErrors.filter(error => error.severity === Severity.Information);
	const hints = lintingErrors.filter(error => error.severity === Severity.Hint);

	if (hints.length > 0) {
		hints.forEach(hint => {
			const filePosition = `${hint.fsPath}:${hint.range.start.line}:${hint.range.start.column + 1}`;
			const errorText = hint.message;
			console.log(`${chalk.grey.underline.bold(filePosition)} ${chalk.grey.bold(errorText)} (${hint.source})`);
		});
		console.log(chalk.bold.underline.grey(`\nHints: ${hints.length}\n`));
	}

	if (informationMessages.length > 0) {
		informationMessages.forEach(information => {
			const filePosition = `${information.fsPath}:${information.range.start.line}:${information.range.start.column + 1}`;
			const errorText = information.message;
			console.log(`${chalk.blue.underline.bold(filePosition)} ${chalk.blue.bold(errorText)} (${information.source})`);
		});
		console.log(chalk.bold.underline.blue(`\nInformation: ${informationMessages.length}\n`));
	}

	if (warnings.length > 0) {
		warnings.forEach(warning => {
			const filePosition = `${warning.fsPath}:${warning.range.start.line}:${warning.range.start.column + 1}`;
			const errorText = warning.message;
			console.warn(`${chalk.rgb(255, 136, 0).underline.bold(filePosition)} ${chalk.rgb(255, 136, 0).bold(errorText)} (${warning.source})`);
		});
		console.log(chalk.bold.underline.rgb(255, 136, 0)(`\nWarnings: ${warnings.length}\n`));
	}

	if (errors.length > 0) {
		errors.forEach(error => {
			const filePosition = `${error.fsPath}:${error.range.start.line}:${error.range.start.column + 1}`;
			const errorText = error.message;
			console.error(`${chalk.redBright.underline.bold(filePosition)} ${chalk.redBright.bold(errorText)} (${error.source})`);
		});
		console.log(chalk.bold.underline.redBright(`\nErrors: ${errors.length}\n`));
	}

	console.log(`UI5 Version: ${parser.configHandler.getUI5Version()}`);

	if (errors.length > 0) {
		process.exit(1);
	} else {
		process.exit(0);
	}
})()