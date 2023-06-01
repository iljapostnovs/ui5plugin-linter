# UI5 Class Linter

Command Line Linter for UI5 based projects.

Any support is highly appreciated!<br/>
[<img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86" height="30"/>](https://github.com/sponsors/iljapostnovs)
[<img src="https://newbie.zeromesh.net/donate.7.6.svg" height="30"/>](https://donate.cafe/iljapostnovs)

# Summary

-   [How to use](#how-to-use)
-   [Configuration](#config)
-   [Configuration example](#configuration-example)
-   [Default configuration](#default-linter-config)
-   [Linter exceptions](#linter-exceptions)
    -   [Member errors in TS/JS](#member-errors)
    -   [View and fragment errors](#view-and-fragment-errors)
    -   [i18n errors](#i18n-errors)
    -   [Other ways](#other-ways)
-   [ID and Event Handler patterns in views and fragments](#id-and-event-handler-patterns-in-views-and-fragments)

---

# How to use

Execute in command line:

```bash
npm install ui5plugin-linter -g
```

After installing the package globally the linter will be available:

```bash
ui5linter
```

Linter also can be used from local `node_modules`:

```bash
npm install ui5plugin-linter --save-dev
npx ui5linter
```

---

# TS vs JS

## Initialization

If `tsconfig.json` is found in the CWD and any `.ts` files are found in the workspace, parser considers that it's TS project. <br/>
`tsconfig.json` should be located in CWD.

## Folder exclusions

For convenience purposes `UI5TSParser` ignores`src-gen` folders, because they contain transpiled JS/XML files, which can make the parser to think that source files are there.

> **Important!** If build folder name is different, is should be added to `excludeFolderPatterns` in your `package.json`.

---

# Config

## Linter config

UI5 Linter searches for `package.json` in your CWD (Current Working Directory) and locates the config there.

See [configuration example](#configuration-example) below.

> **Cache** <br/>
> ui5plugin-parser preloads the library metadata and stores it in cache. If `libsToLoad` were changed, it is necessary to clear cache. It is possible by adding `--rmcache` flag to ui5linter: <br/>
>
> ```cmd
> ui5linter --rmcache
> ```

---

## Configuration example

```jsonc
{
	"ui5": {
		"ui5parser": {
			"ui5version": "1.84.30",
			"dataSource": "https://sapui5.hana.ondemand.com/",
			"rejectUnauthorized": true,
			"libsToLoad": ["sap.uxap", "sap.viz"],
			//Handy to add additional workspace paths if e.g. library is outside of CWD
			"additionalWorkspaces": ["../MyLibrary"]
		},
		"ui5linter": {
			"severity": {
				"WrongParametersLinter": "Error",
				"WrongOverrideLinter": "Warning",
				"WrongImportLinter": "Information",
				"WrongFilePathLinter": "Hint"
			},
			"usage": {
				"WrongParametersLinter": true,
				"WrongOverrideLinter": false
			},
			"jsLinterExceptions": [
				{
					"className": "com.test.MyCustomClass",
					/*method or field name*/
					"memberName": "myCustomMethod",
					/*all classes which extends com.test.MyCustomClass will
        inherit this exception as well*/
					"applyToChildren": true
				}
			],
			/*classes to exclude from linting*/
			"jsClassExceptions": ["com.test.MyCustomClass1", "com.test.MyCustomClass2"],
			/*views and fragments to exclude from linting*/
			"xmlClassExceptions": ["com.test.view.Master", "com.test.fragment.MyToolbar"],
			/*array of i18n translation ids to be ignored by UnusedTranslationsLinter*/
			"propertiesLinterExceptions": ["MyView.MyButtonText", "MY_TRANSLATION_ID"],
			"componentsToInclude": ["com.test"],
			/*it makes sense to use only componentsToInclude or componentsToExclude, but not both at once.
      "componentsToExclude" comes in handy when you want to exclude e.g. libraries.
      "componentsToInclude" comes handy when you have many different components which project depends
      on, but it is necessary to lint only one*/
			"componentsToExclude": ["com.custom.library"]
		}
	}
}
```

---

## Default linter config

Default config is as follows:

```json
{
	"ui5": {
		"ui5linter": {
			"severity": {
				"WrongParametersLinter": "Error",
				"WrongOverrideLinter": "Error",
				"WrongImportLinter": "Warning",
				"WrongFilePathLinter": "Warning",
				"WrongFieldMethodLinter": "Warning",
				"WrongClassNameLinter": "Warning",
				"UnusedTranslationsLinter": "Information",
				"UnusedNamespaceLinter": "Error",
				"UnusedMemberLinter": "Information",
				"TagLinter": "Error",
				"TagAttributeLinter": "Error",
				"PublicMemberLinter": "Information",
				"InterfaceLinter": "Error",
				"AbstractClassLinter": "Error",
				"UnusedClassLinter": "Error",
				"WrongNamespaceLinter": "Warning",
				"DuplicateTranslationLinter": "Error"
			},
			"usage": {
				"WrongParametersLinter": true,
				"WrongOverrideLinter": true,
				"WrongImportLinter": true,
				"WrongFilePathLinter": true,
				"WrongFieldMethodLinter": true,
				"WrongClassNameLinter": true,
				"UnusedTranslationsLinter": true,
				"UnusedNamespaceLinter": true,
				"UnusedMemberLinter": true,
				"TagLinter": true,
				"TagAttributeLinter": true,
				"PublicMemberLinter": true,
				"InterfaceLinter": true,
				"AbstractClassLinter": true,
				"UnusedClassLinter": true,
				"WrongNamespaceLinter": true,
				"DuplicateTranslationLinter": true
			},
			"jsLinterExceptions": [
				{
					"className": "sap.ui.core.Element",
					"memberName": "getDomRef",
					"applyToChildren": true
				},
				{
					"className": "sap.ui.model.json.JSONModel",
					"memberName": "iSizeLimit",
					"applyToChildren": true
				},
				{
					"className": "sap.ui.model.Binding",
					"memberName": "*"
				},
				{
					"className": "sap.ui.model.Model",
					"memberName": "*"
				},
				{
					"className": "sap.ui.core.Element",
					"memberName": "*"
				},
				{
					"className": "sap.ui.base.ManagedObject",
					"memberName": "*"
				},
				{
					"className": "sap.ui.core.Control",
					"memberName": "*"
				},
				{
					"className": "sap.ui.xmlfragment",
					"memberName": "*"
				},
				{
					"className": "*",
					"memberName": "byId"
				},
				{
					"className": "*",
					"memberName": "prototype"
				},
				{
					"className": "*",
					"memberName": "call"
				},
				{
					"className": "*",
					"memberName": "apply"
				},
				{
					"className": "*",
					"memberName": "bind"
				},
				{
					"className": "*",
					"memberName": "constructor"
				},
				{
					"className": "*",
					"memberName": "init"
				},
				{
					"className": "*",
					"memberName": "exit"
				},
				{
					"className": "map",
					"memberName": "*"
				}
			],
			"jsClassExceptions": [],
			"xmlClassExceptions": [],
			"propertiesLinterExceptions": [],
			"componentsToInclude": [],
			"componentsToExclude": [],
			"idNamingPattern": "^id{BindingPath}.*{ControlName}$",
			"eventNamingPattern": "^on{BindingPath}{ControlName}.*?{EventName}$",
			"attributesToCheck": ["content", "items", "value", "text", "number"]
		}
	}
}
```

It is possible to override properties in your `package.json`. See [Configuration example](#configuration-example)

> In case of `jsLinterExceptions` the exceptions which will be found in `package.json` of CWD will be added to the default exceptions, in the rest of the cases properties will be overwritten

---

## Parser config

It is possible to add config for [ui5plugin-parser](https://www.npmjs.com/package/ui5plugin-parser) as well.

> Check [ui5plugin-parser](https://www.npmjs.com/package/ui5plugin-parser) -> `Config default values` as a reference for parser properties</br>
> See [Configuration example](#configuration-example)

---

## Linter exceptions

There are multiple ways to configure linter exceptions.

### JS/TS

#### Member errors

To ignore class member errors, there are two ways to do it.
Lets assume that there is a line, which gives incorrect amount of arguments error

```javascript
this._myMethod("123", 643, true); //Method "_myMethod" has 2 (2 mandatory) param(s), but you provided 2
```

In order to ignore this error, there are two ways to do it:

1. Add `@ui5ignore` to method declaration JSDoc

```javascript
/**
 * @ui5ignore
 */
_myMethod(sFirstParam, iSecondParam) {}
```

2. Add method to `jsLinterExceptions` in `package.json`:

```json
{
	"ui5": {
		"ui5linter": {
			"jsLinterExceptions": [
				{
					"className": "com.test.MyClass",
					"memberName": "_myMethod",
					"applyToChildren": true
				}
			]
		}
	}
}
```

### View and fragment errors

To ignore attribute and tag errors, `<-- @ui5ignore -->` can be used. It will ignore all errors of next tag and its attributes.

```XML
<!-- @ui5ignore -->
<RandomText
	randomProperty="123"
/>
```

To ignore specific attribute, `<-- @ui5ignore ${attributeName1}, ${attributeName2} -->` can be used. It will ignore all attribute errors

```XML
<!-- @ui5ignore randomProperty, secondRandomProperty -->
<Text
	randomProperty="123"
	secondRandomProperty="123"
	text="Valid property"
/>
```

### i18n errors

To ignore translation errors, `# @ui5ignore` comment right above the translation can be used

```properties
# @ui5ignore
MY_TITLE = Title
```

### Other ways

#### Exclude whole class

To exclude whole class from linting, add class name to `package.json`. In case of JS Classes, use `jsClassExceptions`. In case of view and fragments, use `xmlClassExceptions`

```json
{
	"ui5": {
		"ui5linter": {
			"jsClassExceptions": ["com.test.MyClass"]
		}
	}
}
```

#### Exclude i18n translations

To exclude translation from linting in `18n.properties` file, add class name to `package.json`

```json
{
	"ui5": {
		"ui5linter": {
			"propertiesLinterExceptions": ["MY_TRANSLATION_ID"]
		}
	}
}
```

#### Exclude other apps or libs

Lets assume that there is a library included in the project, and there is no need to lint it.
To exclude whole app or lib from linting, add app/lib id to `package.json`. There are two preference entries that can be used: `componentsToInclude` and `componentsToExclude`.

```json
{
	"ui5": {
		"ui5linter": {
			"componentsToInclude": ["com.test.my.app"],
			"componentsToExclude": ["com.test.my.lib"]
		}
	}
}
```

---

## ID and Event Handler patterns in views and fragments

In order to keep the same style for naming the `id` and any `event handler` in views and fragments, three configuration entries are available: `idNamingPattern`, `eventNamingPattern`, `attributesToCheck`. Every `id` and `event handler` generates individual `RegExp`, and the value is checked against it.

> **Hint!** To disable naming style checking, just set `idNamingPattern` or/and `eventNamingPattern` as empty string in `package.json`

### Variables

In order to generate individual `RegExp`, there are variables available which will be applied at runtime. All variables are available in `camelCase` and `PascalCase`.

Example of `eventNamingPattern`: `^on{BindingPath}{ControlName}.*?{EventName}$`.
Variables: `BindingPath`, `ControlName`, `EventName`.

```xml
<Input
	value="{ODataModel>Currency}"
	change=""
>
<!-- Pattern for 'change': ^onCurrencyInput.*?Change$ -->
```

#### ControlName variable

Variable is replaced with the name of the tag. Available for both `id` and `event handler` patterns.

```xml
<Text/>
<!-- ControlName => Text -->
<!-- controlName => text -->
<f:GridList/>
<!-- ControlName => GridList -->
<!-- controlName => gridList -->
```

#### EventName variable

Variable is replaced with the name of the event handler. Available for `event handler` patterns only.

```xml
<Button press="onButtonPress"/>
<!-- EventName => Press -->
<!-- eventName => press -->
<f:GridList borderReached="onGridListBorderReached"/>
<!-- EventName => BorderReached -->
<!-- eventName => borderReached -->
```

#### BindingPath variable

Variable is replaced with guessed value taken from attribute. Available for both `id` and `event handler` patterns. This is the most tricky variable.

It is calculated as follows:

1. Get value of `attributesToCheck` configuration
2. Find first attribute from the control which exists in `attributesToCheck` array.
3. Parse binding info
4. Use binding text as a source for `BindingPath`
    1. Find binding path. If binding path is an object, parse it and take the text from `path` field, otherwise crop `{` and `}`
    2. Split string by `>`, left part is model name, right part is `binding path`
        1. If model name is `i18n`, find the translation in `i18n.properties`, transform value to PascalCase and return the value
        2. Else, remove `/results` from `binding path`, split the result by `_`, transform to PascalCase and return the value

| Attribute value           | BindingPath value                                      |
| ------------------------- | ------------------------------------------------------ |
| {/OrderItems}             | OrderItems                                             |
| {OrderId}                 | OrderId                                                |
| {/OrderItems/results}     | OrderItems                                             |
| {ODataModel>/ORDER_ITEMS} | OrderItems                                             |
| {MyModel>/Orders}         | Orders                                                 |
| {i18n>APP_TITLE}          | OrderApp (if text in `i18n.properties` is "Order App") |

> **Hint!** > `BindingPath` is pure heuristics and of course will not work for all the cases. If it works most of the time well, but there are some exceptions, it is possible to ignore specific tag attribute errors. Check [View and fragment errors](#view-and-fragment-errors) section.

Example.

```xml
<List
	id="idOrderItemsList"
	items="{ODataModel>/OrderItems}"
	press="onOrderItemsListPress"
/>
<!--
	ControlName => List
	controlName => list
	EventName => Press
	eventName => press
	BindingPath => OrderItems
	bindingPath => orderItems
 -->
```

### attributesToCheck configuration

This configuration is a list of attributes, where `BindingPath` will be guessed from.
For instance, if `attributesToCheck` is set to `"attributesToCheck": ["items"]`, the value will be guessed only from `items` attribute, e.g. in `sap.m.List`:

```xml
<List
	id="idOrdersList"
	items="{/Orders}"
/>
```

---

## package.json interface

The technical interface of possible entries:

```ts
interface IUI5PackageConfigEntry {
	ui5?: IUI5LinterEntry;
}
interface IUI5LinterEntry {
	ui5linter?: IUI5LinterEntryFields;
}
interface IUI5LinterEntryFields {
	severity?: {
		[key in JSLinters | XMLLinters | PropertiesLinters]: Severity;
	};
	usage?: {
		[key in JSLinters | XMLLinters | PropertiesLinters]: boolean;
	};
	jsLinterExceptions?: JSLinterException[];
	jsClassExceptions?: string[];
	xmlClassExceptions?: string[];
	propertiesLinterExceptions?: string[];
	componentsToInclude?: string[];
	componentsToExclude?: string[];
	idNamingPattern?: string;
	eventNamingPattern?: string;
	attributesToCheck?: string[];
}
```

Enumerations:

```ts
enum PropertiesLinters {
	UnusedTranslationsLinter = "UnusedTranslationsLinter",
	DuplicateTranslationLinter = "DuplicateTranslationLinter"
}
enum XMLLinters {
	TagAttributeLinter = "TagAttributeLinter",
	TagLinter = "TagLinter",
	UnusedNamespaceLinter = "UnusedNamespaceLinter",
	WrongFilePathLinter = "WrongFilePathLinter"
}
enum JSLinters {
	AbstractClassLinter = "AbstractClassLinter",
	InterfaceLinter = "InterfaceLinter",
	PublicMemberLinter = "PublicMemberLinter",
	UnusedMemberLinter = "UnusedMemberLinter",
	WrongClassNameLinter = "WrongClassNameLinter",
	WrongFieldMethodLinter = "WrongFieldMethodLinter",
	WrongFilePathLinter = "WrongFilePathLinter",
	WrongImportLinter = "WrongImportLinter",
	WrongOverrideLinter = "WrongOverrideLinter",
	WrongParametersLinter = "WrongParametersLinter",
	UnusedClassLinter = "UnusedClassLinter",
	WrongNamespaceLinter = "WrongNamespaceLinter"
}
enum Severity {
	Warning = "Warning",
	Error = "Error",
	Information = "Information",
	Hint = "Hint"
}
```
