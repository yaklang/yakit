import {monaco} from "react-monaco-editor";

const TsLanguage = {
    defaultToken: "invalid",
    tokenPostfix: ".ts",
    keywords: ["abstract", "as", "break", "case", "catch", "class", "continue", "const", "constructor", "debugger", "declare", "default", "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for", "from", "function", "get", "if", "implements", "import", "in", "infer", "instanceof", "interface", "is", "keyof", "let", "module", "namespace", "never", "new", "null", "package", "private", "protected", "public", "readonly", "require", "global", "return", "set", "static", "super", "switch", "symbol", "this", "throw", "true", "try", "type", "typeof", "unique", "var", "void", "while", "with", "yield", "async", "await", "of"],
    typeKeywords: ["any", "boolean", "number", "object", "string", "undefined"],
    operators: ["<=", ">=", "==", "!=", "===", "!==", "=>", "+", "-", "**", "*", "/", "%", "++", "--", "<<", "</", ">>", ">>>", "&", "|", "^", "!", "~", "&&", "||", "??", "?", ":", "=", "+=", "-=", "*=", "**=", "/=", "%=", "<<=", ">>=", ">>>=", "&=", "|=", "^=", "@"],
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    digits: /\d+(_+\d+)*/,
    octaldigits: /[0-7]+(_+[0-7]+)*/,
    binarydigits: /[0-1]+(_+[0-1]+)*/,
    hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
    regexpctl: /[(){}\[\]\$\^|\-*+?\.]/,
    regexpesc: /\\(?:[bBdDfnrstvwWn0\\\/]|@regexpctl|c[A-Z]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})/,
    tokenizer: {
        root: [
            [/[{}]/, "delimiter.bracket"], {
                include: "common"
            }
        ],
        common: [
            [/[a-z_$][\w$]*/, {
                cases: {
                    "@typeKeywords": "keyword",
                    "@keywords": "keyword",
                    "@default": "identifier"
                }
            }],
            [/[A-Z][\w\$]*/, "type.identifier"], {
                include: "@whitespace"
            },
            [/\/(?=([^\\\/]|\\.)+\/([gimsuy]*)(\s*)(\.|;|,|\)|\]|\}|$))/, {
                token: "regexp",
                bracket: "@open",
                next: "@regexp"
            }],
            [/[()\[\]]/, "@brackets"],
            [/[<>](?!@symbols)/, "@brackets"],
            [/!(?=([^=]|$))/, "delimiter"],
            [/@symbols/, {
                cases: {
                    "@operators": "delimiter",
                    "@default": ""
                }
            }],
            [/(@digits)[eE]([\-+]?(@digits))?/, "number.float"],
            [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, "number.float"],
            [/0[xX](@hexdigits)n?/, "number.hex"],
            [/0[oO]?(@octaldigits)n?/, "number.octal"],
            [/0[bB](@binarydigits)n?/, "number.binary"],
            [/(@digits)n?/, "number"],
            [/[;,.]/, "delimiter"],
            [/"([^"\\]|\\.)*$/, "string.invalid"],
            [/'([^'\\]|\\.)*$/, "string.invalid"],
            [/"/, "string", "@string_double"],
            [/'/, "string", "@string_single"],
            [/`/, "string", "@string_backtick"]
        ],
        whitespace: [
            [/[ \t\r\n]+/, ""],
            [/\/\*\*(?!\/)/, "comment.doc", "@jsdoc"],
            [/\/\*/, "comment", "@comment"],
            [/\/\/.*$/, "comment"]
        ],
        comment: [
            [/[^\/*]+/, "comment"],
            [/\*\//, "comment", "@pop"],
            [/[\/*]/, "comment"]
        ],
        jsdoc: [
            [/[^\/*]+/, "comment.doc"],
            [/\*\//, "comment.doc", "@pop"],
            [/[\/*]/, "comment.doc"]
        ],
        regexp: [
            [/(\{)(\d+(?:,\d*)?)(\})/, ["regexp.escape.control", "regexp.escape.control", "regexp.escape.control"]],
            [/(\[)(\^?)(?=(?:[^\]\\\/]|\\.)+)/, ["regexp.escape.control", {
                token: "regexp.escape.control",
                next: "@regexrange"
            }]],
            [/(\()(\?:|\?=|\?!)/, ["regexp.escape.control", "regexp.escape.control"]],
            [/[()]/, "regexp.escape.control"],
            [/@regexpctl/, "regexp.escape.control"],
            [/[^\\\/]/, "regexp"],
            [/@regexpesc/, "regexp.escape"],
            [/\\\./, "regexp.invalid"],
            [/(\/)([gimsuy]*)/, [{
                token: "regexp",
                bracket: "@close",
                next: "@pop"
            }, "keyword.other"]]
        ],
        regexrange: [
            [/-/, "regexp.escape.control"],
            [/\^/, "regexp.invalid"],
            [/@regexpesc/, "regexp.escape"],
            [/[^\]]/, "regexp"],
            [/\]/, {
                token: "regexp.escape.control",
                next: "@pop",
                bracket: "@close"
            }]
        ],
        string_double: [
            [/[^\\"]+/, "string"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, "string", "@pop"]
        ],
        string_single: [
            [/[^\\']+/, "string"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/'/, "string", "@pop"]
        ],
        string_backtick: [
            [/\$\{/, {
                token: "delimiter.bracket",
                next: "@bracketCounting"
            }],
            [/[^\\`$]+/, "string"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/`/, "string", "@pop"]
        ],
        bracketCounting: [
            [/\{/, "delimiter.bracket", "@bracketCounting"],
            [/\}/, "delimiter.bracket", "@pop"], {
                include: "common"
            }
        ]
    }
}

const JavaScriptLanguage = {
    defaultToken: "invalid",
    tokenPostfix: ".js",
    keywords: ["break", "case", "catch", "class", "continue", "const", "constructor", "debugger", "default", "delete", "do", "else", "export", "extends", "false", "finally", "for", "from", "function", "get", "if", "import", "in", "instanceof", "let", "new", "null", "return", "set", "super", "switch", "symbol", "this", "throw", "true", "try", "typeof", "undefined", "var", "void", "while", "with", "yield", "async", "await", "of"],
    typeKeywords: [],
    operators: TsLanguage.operators,
    symbols: TsLanguage.symbols,
    escapes: TsLanguage.escapes,
    digits: TsLanguage.digits,
    octaldigits: TsLanguage.octaldigits,
    binarydigits: TsLanguage.binarydigits,
    hexdigits: TsLanguage.hexdigits,
    regexpctl: TsLanguage.regexpctl,
    regexpesc: TsLanguage.regexpesc,
    tokenizer: TsLanguage.tokenizer
};

monaco.languages.register({id: "javascript"})
monaco.languages.register({id: "js"})
monaco.languages.setMonarchTokensProvider("js", JavaScriptLanguage as any)
monaco.languages.setMonarchTokensProvider("javascript", JavaScriptLanguage as any)
