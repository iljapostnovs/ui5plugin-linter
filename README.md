# UI5 Class Linter
Command Line Linter for UI5 based projects.

---
## How to use
Run ```npm install ui5plugin-linter -g``` in your command line and ```ui5linter``` in corresponding working directory of the project which needs to be linted

---
## Config
### Linter config
UI5 Linter searches for ```package.json``` in your CWD (Current Working Directory) and locates the config there.
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
        "AbstractClassLinter": "Error"
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
        "AbstractClassLinter": true
      },
      "jsLinterExceptions": [{
        "className": "sap.ui.core.Element",
        "memberName": "getDomRef",
        "applyToChildren": true
      },{
        "className": "sap.ui.model.json.JSONModel",
        "memberName": "iSizeLimit",
        "applyToChildren": true
      },{
        "className": "sap.ui.model.Binding",
        "memberName": "*"
      },{
        "className": "sap.ui.model.Model",
        "memberName": "*"
      },{
        "className": "sap.ui.core.Element",
        "memberName": "*"
      },{
        "className": "sap.ui.base.ManagedObject",
        "memberName": "*"
      },{
        "className": "sap.ui.core.Control",
        "memberName": "*"
      },{
        "className": "sap.ui.xmlfragment",
        "memberName": "*"
      },{
        "className": "*",
        "memberName": "byId"
      },{
        "className": "*",
        "memberName": "prototype"
      },{
        "className": "*",
        "memberName": "call"
      },{
        "className": "*",
        "memberName": "apply"
      },{
        "className": "*",
        "memberName": "bind"
      },{
        "className": "*",
        "memberName": "constructor"
      },{
        "className": "*",
        "memberName": "init"
      },{
        "className": "*",
        "memberName": "exit"
      },{
        "className": "map",
        "memberName": "*"
      }],
      "jsClassExceptions": [],
      "xmlClassExceptions": [],
      "componentsToInclude": [],
      "componentsToExclude": []
    }
  }
}
```
It is possible to override properties in your ```package.json```. See [Configuration example](#configuration-example)
> In case of ```jsLinterExceptions``` the exceptions which will be found in ```package.json``` of CWD will be added to the default exceptions, in the rest of the cases properties will be overwritten

### Parser config
It is possible to add config for [ui5plugin-parser](https://www.npmjs.com/package/ui5plugin-parser) in the same ```package.json``` which will be used by the parser of the linter.
> Check [ui5plugin-parser](https://www.npmjs.com/package/ui5plugin-parser) -> ```Config default values``` as a reference for parser properties
> See [Configuration example](#configuration-example)
---
## Configuration example
```jsonc
{
  "ui5": {
    "ui5parser": {
      "ui5version": "1.84.19",
      "dataSource": "https://sapui5.hana.ondemand.com/",
      "rejectUnauthorized": true,
      "libsToLoad": [
        "sap.uxap",
        "sap.viz"
      ]
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
      "jsLinterExceptions": [{
        "className": "com.test.MyCustomClass",
        /*method or field name*/
        "memberName": "myCustomMethod",
        /*all classes which extends com.test.MyCustomClass will
        inherit this exception as well*/
        "applyToChildren": true
      }],
      /*classes to exclude from linting*/
      "jsClassExceptions": ["com.test.MyCustomClass1", "com.test.MyCustomClass2"],
      /*views and fragments to exclude from linting*/
      "xmlClassExceptions": ["com.test.view.Master", "com.test.fragment.MyToolbar"],
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
## package.json interface
The technical interface of possible entries:
```ts
interface IUI5PackageConfigEntry {
  ui5?: IUI5LinterEntry
}
interface IUI5LinterEntry {
  ui5linter?: IUI5LinterEntryFields
}
interface IUI5LinterEntryFields {
  severity?: {
    [key in JSLinters | XMLLinters | PropertiesLinters]: Severity
  },
  usage?: {
    [key in JSLinters | XMLLinters | PropertiesLinters]: boolean
  },
  jsLinterExceptions?: JSLinterException[]
  jsClassExceptions?: string[]
  xmlClassExceptions?: string[]
  componentsToInclude?: string[]
  componentsToExclude?: string[]
}
```
Enumerations:
```ts
enum PropertiesLinters {
  UnusedTranslationsLinter = "UnusedTranslationsLinter"
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
  WrongParametersLinter = "WrongParametersLinter"
}
enum Severity {
  Warning = "Warning",
  Error = "Error",
  Information = "Information",
  Hint = "Hint"
}
```