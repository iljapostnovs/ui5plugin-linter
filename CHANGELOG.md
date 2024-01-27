## 1.15.0 (27-01-2024)

-   `WrongOverrideLinter` now checks if member is deprecated
-   Fix: `UnusedClassLinter` doesn't show error if any member is used outside the class

## 1.14.5 (25-01-2024)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.7.7

## 1.14.4 (25-01-2024)

-   Fix `@ui5ignore` for tag attribute names
-   Fix properties linters to work with all properties files
-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.7.6

## 1.14.3 (23-11-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.7.4

## 1.14.2 (23-11-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.7.3

## 1.14.1 (23-11-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.7.2
-   Fix for XHTML tags

## 1.14.0 (11-11-2023)

-   Feature: Now it is possible to specify `space` quantity [Readme](README.md#indentation)

## 1.13.0 (09-11-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.7.0
-   Feature: Variable declarations are now being searched above class declaration as well

## 1.12.0 (09-11-2023)

-   Feature: Implement indentation feature [#138](https://github.com/iljapostnovs/ui5plugin-linter/issues/138)
-   Fix [#136](https://github.com/iljapostnovs/ui5plugin-linter/issues/136)

## 1.11.1 (16-10-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.6.4

## 1.11.0 (10-10-2023)

-   Feature: Make XML Formatter preserve newlines

## 1.10.0 (08-10-2023)

-   Feature: `--tagSpaceBeforeSelfClose` option added to XML Formatter

## 1.9.1 (07-10-2023)

-   Fix: 'AMeaningAssumptionGenerator' bugfix
-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.6.3

## 1.9.0 (07-10-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.6.2
-   Feature: XML Formatter moved to this repo. [Readme](README.md#xml-formatter)

## 1.8.3 (13-08-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.6.1

## 1.8.2 (22-07-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.6.0

## 1.8.1 (03-07-2023)

-   Nothing new, technical refactoring

## 1.8.0 (01-07-2023)

-   Feature: `TagAttributeDefaultValueLinter` configuration entry added, closes [#122](https://github.com/iljapostnovs/ui5plugin-linter/issues/122). [Readme](README.md#tagattributedefaultvaluelinter)
-   Feature: `EventTypeLinter` added. [Readme](README.md#eventtypelinter-ts-only-11151)

## 1.7.6 (27-06-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.5.6
-   Fix: Add `configPath` to `IParserConfigHandler`

## 1.7.5 (23-06-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.5.5
-   Fix: Fix config finding going into recursive

## 1.7.4 (19-06-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.5.4

## 1.7.3 (14-06-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.5.3
-   Fix: Migrate to fixed version of `rc-config-loader`

## 1.7.2 (13-06-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.5.2
-   Fix: Migrate to `cosmiconfig`

## 1.7.1 (12-06-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.5.1
-   Fix: Bugfix for `package.json` config

## 1.7.0 (12-06-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.5.0
-   Feature: Support for [rc](https://github.com/azu/rc-config-loader) files introduced

## 1.6.4 (06-06-2023)

-   Fix: Bugfix for empty id pattern

## 1.6.3 (03-06-2023)

-   Fix: Change priority of linting id and event handler style, now they are first priority
-   Feature: Add `@ui5ignore-patterns` support for XML

## 1.6.2 (03-06-2023)

-   Fix: Rename `BindingPath` variable to `MeaningAssumption`

## 1.6.1 (02-06-2023)

-   Fix: Bugfix for `AggregationName` distinguishing

## 1.6.0 (01-06-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.4.5
-   Feature: XML attribute linter enhanced with `id` and `event handler` naming style check
-   `ui5ignore` in XML files now supports attribute ignoring

## 1.5.2 (16-05-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.4.3

## 1.5.1 (16-05-2023)

-   Fix `propertiesLinterExceptions` handling

## 1.5.0 (16-05-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.4.2
-   `propertiesLinterExceptions` added to `ui5linter` configuration
-   `@ui5ignore` is now supported in `i18n.properties`

## 1.4.2 (16-05-2023)

-   Bugfix for linter not taking into account `jsClassesToExclude` for TS projects

## 1.4.1 (09-05-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.4.1

## 1.4.0 (09-05-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.4.0

## 1.3.0 (07-05-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.3.0

## 1.2.3 (07-05-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.2.3

## 1.2.2 (07-05-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.2.2

## 1.2.1 (07-05-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.2.1

## 1.2.0 (07-05-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.2.0

## 1.1.1 (06-05-2023)

-   [UI5 Parser](https://github.com/iljapostnovs/ui5plugin-parser) updated to v1.1.1

## 1.1.0 (01-05-2023)

-   UI5 Parser updated to v1.1.0
-   `Duplicate Translation Linter` added to properties linters
-   Global config handler added

## 1.0.0 (13-04-2023)

-   UI5 Parser updated to v1.0.0
-   `additionalWorkspaces` config entry moved to parser

## 0.8.12 (04-02-2023)

-   Update parser

## 0.8.11 (04-02-2023)

-   Update parser

## 0.8.10 (01-02-2023)

-   Update parser

## 0.8.9 (26-01-2023)

-   Update parser

## 0.8.8 (26-01-2023)

-   Update parser

## 0.8.7 (25-01-2023)

-   Update parser

## 0.8.6 (28-11-2022)

-   Update packages

## 0.8.5 (06-11-2022)

-   Update parser

## 0.8.4 (06-11-2022)

-   Update parser

## 0.8.3 (06-11-2022)

-   Refactoring and minor bugfixes

## 0.8.2 (29-10-2022)

-   Fix unused translations linter

## 0.8.1 (29-10-2022)

-   Update parser

## 0.8.0 (26-10-2022)

-   Update parser, adapt linters to work with CustomTSObject

## 0.7.7 (25-10-2022)

-   Update parser

## 0.7.6 (25-10-2022)

-   Update parser, add public member linter for TS

## 0.7.5 (25-10-2022)

-   Fix reference finder

## 0.7.4 (25-10-2022)

-   Fix WrongFilePathLinter

## 0.7.3 (24-10-2022)

-   Update UI5 parser

## 0.7.2 (20-10-2022)

-   Add TS support for wrong class name linter, add Wrong namespace linter

## 0.7.1 (19-10-2022)

-   Update ui5 parser

## 0.7.0 (18-10-2022)

-   Update ui5 parser, add typescript support

## 0.6.8 (02-05-2022)

-   Update ui5 parser

## 0.6.7 (23-04-2022)

-   Bugfixes

## 0.6.6 (23-04-2022)

-   Add cmd: linting

## 0.6.5 (13-04-2022)

-   Dependency update

## 0.6.4 (24-02-2022)

-   Minor bugfixes

## 0.6.3 (21-02-2022)

-   Bugfix for multiple types

## 0.6.2 (19-02-2022)

-   Make Component.js exception case insensitive

## 0.6.1 (19-02-2022)

-   Add Component.js as exception to unused class linter

## 0.6.0 (19-02-2022)

-   Add unused class linter

## 0.5.24 (12-01-2022)

-   Rollback chalk

## 0.5.23 (12-01-2022)

-   Update dependencies

## 0.5.22 (29-11-2021)

-   Update ui5parser

## 0.5.21 (29-11-2021)

-   Update ui5parser

## 0.5.20 (28-11-2021)

-   Update ui5 parser and add support for XML linting of inline require in xml

## 0.5.19 (05-11-2021)

-   Update ui5 parser

## 0.5.18 (05-11-2021)

-   Update ui5 parser

## 0.5.17 (17-10-2021)

-   Bugfixes for wrong file path linter

## 0.5.16 (15-10-2021)

-   Make deprecation linter honor exceptions

## 0.5.15 (15-10-2021)

-   Introduce additionalWorkspacePaths property for configuration

## 0.5.14 (14-10-2021)

-   Update parser

## 0.5.13 (14-10-2021)

-   Add UI5 version to console output
-   Add deprecation errors for class members

## 0.5.12 (14-10-2021)

-   Bugfix for reference linter

## 0.5.11 (14-10-2021)

-   Update parser

## 0.5.10 (12-10-2021)

-   Update parser

## 0.5.9 (12-10-2021)

-   Position bugfix for Interface linter and abstract class linter

## 0.5.8 (12-10-2021)

-   Add --rmcache command

## 0.5.7 (11-10-2021)

-   Add @ui5ignore support for tag linter

## 0.5.6 (11-10-2021)

-   Fix tag namespace linter for commented text in XML

## 0.5.5 (11-10-2021)

-   Cache bugfixes

## 0.5.4 (11-10-2021)

-   Remove dynamic require for package.json reading

## 0.5.3 (10-10-2021)

-   Update parser

## 0.5.2 (08-10-2021)

-   XML Linter position bugfixes

## 0.5.1 (08-10-2021)

-   Bugfixes

## 0.5.0 (07-10-2021)

-   Initial release
