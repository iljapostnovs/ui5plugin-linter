#!/usr/bin/env node
const TextDocument = require("ui5plugin-parser").TextDocument;
const WorkspaceFolder = require("ui5plugin-parser").WorkspaceFolder;
const UI5TSParser = require("ui5plugin-parser").UI5TSParser;
const ParserFactory = require("ui5plugin-parser").ParserFactory;
const ParserPool = require("ui5plugin-parser").ParserPool;
const chalk = require("chalk");
const Severity = require("../dist/classes/Linter").Severity;
const path = require("path");

(async function() {
	const currentWorkspaceFolderFsPath = process.cwd();
	const workspaceFolders = [new WorkspaceFolder(currentWorkspaceFolderFsPath)];

	const shouldClearCache = process.argv.includes("--rmcache");

	const parsers = await ParserFactory.createInstances(workspaceFolders, undefined, shouldClearCache);
	const parsersToLint = parsers.filter(parser => path.resolve(parser.workspaceFolder.fsPath).startsWith(currentWorkspaceFolderFsPath));
	if (parsersToLint.length === 0) {
		console.log("No projects identified for linting");
		return;
	}

	const JSLinterErrorFactory = require("../dist/classes/js/JSLinterErrorFactory").JSLinterErrorFactory;
	const TSLinterErrorFactory = require("../dist/classes/js/TSLinterErrorFactory").TSLinterErrorFactory;
	const XMLLinterErrorFactory = require("../dist/classes/xml/XMLLinterErrorFactory").XMLLinterErrorFactory;
	const PropertiesLinterErrorFactory = require("../dist/classes/properties/PropertiesLinterErrorFactory").PropertiesLinterErrorFactory;

	const allLintingErrors = [];
	const ui5Versions = parsers.map(parser => parser.configHandler.getUI5Version());
	const uniqueUi5Versions = [...new Set(ui5Versions)];
	console.log(`UI5 Versions: ${uniqueUi5Versions.join(", ")}`);
	console.log("Projects:");
	parsers.forEach(parser => {
		console.log(parser.workspaceFolder.fsPath);
	});
	parsersToLint.forEach(parser => {
		const isTypescriptProject = parser instanceof UI5TSParser;
		const CustomClassLinter = isTypescriptProject ? new TSLinterErrorFactory(parser) : new JSLinterErrorFactory(parser);
		const XMLLinter = new XMLLinterErrorFactory(parser);
		const propertiesLinter = new PropertiesLinterErrorFactory(parser);
		const XMLFiles = [
			...parser.fileReader.getAllViews(),
			...parser.fileReader.getAllFragments()
		];

		const propertiesFiles = parser.fileReader.getResourceModelFiles();
		const propertiesTextDocuments = propertiesFiles.map(propertyFile => {
			const manifest = ParserPool.getManifestForClass(propertyFile.componentName + ".");
			return new TextDocument(propertyFile.content, parser.fileReader.getResourceModelUriForManifest(manifest));
		});

		const customClasses = parser.classFactory.getAllCustomUIClasses();
		const lintingErrors = customClasses.flatMap(customClass => {
			const textDocument = new TextDocument(customClass.classText, customClass.fsPath ?? "");
			return CustomClassLinter.getLintingErrors(textDocument);
		}).concat(XMLFiles.flatMap(XMLFile => {
			const textDocument = new TextDocument(XMLFile.content ?? "", XMLFile.fsPath ?? "");
			return XMLLinter.getLintingErrors(textDocument);
		})).concat(propertiesTextDocuments.flatMap(textDocument => {
			return propertiesLinter.getLintingErrors(textDocument);
		}));
		lintingErrors.forEach(lintingError => lintingError.severity = lintingError.severity ?? Severity.Warning);
		allLintingErrors.push(...lintingErrors);
	});

	const errors = allLintingErrors.filter(error => error.severity === Severity.Error);
	const warnings = allLintingErrors.filter(error => error.severity === Severity.Warning);
	const informationMessages = allLintingErrors.filter(error => error.severity === Severity.Information);
	const hints = allLintingErrors.filter(error => error.severity === Severity.Hint);

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

	const allMessages = [
		...hints,
		...informationMessages,
		...warnings,
		...errors
	];
	if (allMessages.length === 0) {
		console.log(chalk.bold.underline.greenBright("No errors detected"));
	}

	const initializationMessages = ParserFactory.getInitializationMessages();
	const messages = initializationMessages.map(message => message.message);
	if (messages.length > 0) {
		console.warn(chalk.rgb(255, 136, 0).underline.bold("Initialization warnings:"));
		messages.forEach(message => {
			console.warn(chalk.rgb(255, 136, 0).bold(message));
		});
	}

	if (errors.length > 0) {
		process.exit(1);
	} else {
		process.exit(0);
	}
})()