# Project Guidelines

## Code Style

All generated code must follow the rules defined in [`.editorconfig`](../.editorconfig) and [`.prettierrc.js`](../.prettierrc.js).

Key rules to apply when writing code:

- **Indent**: 2 spaces, never tabs
- **Max line length**: 120 characters
- **Quotes**: single quotes in JS/TS (`'value'`), double quotes in JSX attributes (`className="foo"`)
- **Semicolons**: none — do not add `;` at the end of statements
- **Trailing commas**: always add trailing commas in arrays, objects, function parameters, and destructuring
- **Bracket spacing**: always add spaces inside object braces — `{ key: value }`, not `{key: value}`
- **Arrow functions**: always wrap single parameters in parentheses — `(x) => x`, not `x => x`
- **JSX closing bracket**: put `>` on a new line, not at the end of the last attribute line
- **Line endings**: LF only
- **File ending**: always insert a newline at end of file
- **Trailing whitespace**: never leave trailing spaces on a line
