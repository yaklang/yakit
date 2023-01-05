import {monaco} from "react-monaco-editor";
import {yaklangCompletionHandlerProvider} from "./yakCompletionSchema";
import {languages} from "monaco-editor";
import CodeAction = languages.CodeAction;
import CodeActionList = languages.CodeActionList;

export const YaklangMonacoSpec = "yak";

export const YAK_FORMATTER_COMMAND_ID = "yak-formatter";

monaco.languages.register({
    id: YaklangMonacoSpec,
    extensions: [".yak"],
    aliases: ['Yak'],
});
monaco.languages.setLanguageConfiguration(YaklangMonacoSpec, {
    autoClosingPairs: [
        {"open": "{{", "close": "}}"},
        {"open": "{", "close": "}", "notIn": ["string"]},
        {"open": "[", "close": "]"},
        {"open": "(", "close": ")"},
        {"open": "'", "close": "'", "notIn": ["string", "comment"]},
        {"open": "\"", "close": "\"", "notIn": ["string"]},
        {"open": "`", "close": "`", "notIn": ["string", "comment"]},
        {"open": "/**", "close": " */", "notIn": ["string"]}
    ],
    "comments": {
        "lineComment": "//",
        "blockComment": ["/*", "*/"]
    },
    "autoCloseBefore": ";:.,=}])>` \n\t",

    brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"]
    ],
    wordPattern: new RegExp("(-?\\d*\\.\\d\\w*)|([^\\`\\~\\!\\@\\#\\%\\^\\&\\*\\(\\)\\-\\=\\+\\[\\{\\]\\}\\\\\\|\\;\\:\\'\\\"\\,\\.\\<\\>\\/\\?\\s]+)"),
    indentationRules: {
        "increaseIndentPattern": new RegExp("^((?!.*?\\/\\*).*\\*\/)?\\s*[\\}\\]].*$"),
        "decreaseIndentPattern": new RegExp("^((?!\\/\\/).)*(\\{[^}\"'`]*|\\([^)\"'`]*|\\[[^\\]\"'`]*)$"),
    }
})
monaco.languages.setMonarchTokensProvider(YaklangMonacoSpec, {
    brackets: [
        {"open": "{{", "close": "}}", token: "double-braces"},
        {"open": "{", "close": "}", token: "braces"},
        {"open": "[", "close": "]", token: "brackets"},
        {"open": "(", "close": ")", token: "parentheses"},
        // {"open": "'", "close": "'", token: "single-quote"},
        // {"open": "\"", "close": "\"", token: "quote"},
        // {"open": "`", "close": "`", token: "backticks"},
        {"open": "/**", "close": " */", token: "comment"}
    ],
    defaultToken: "",
    tokenPostfix: ".yak",
    keywords: [
        "break", "case", "continue", "default", "defer", "else",
        "for", "go", "if", "range", "return", "select", "switch",
        "chan", "func", "fn", "def", "var", "nil", "undefined",
        "map", "class", "include", "type", "bool", "true", "false",
        "string", "try", "catch", "finally",
    ],
    operators: [
        '+',
        '-',
        '*',
        '/',
        '%',
        '&',
        '|',
        '^',
        '<<',
        '>>',
        '&^',
        '+=',
        '-=',
        '*=',
        '/=',
        '%=',
        '&=',
        '|=',
        '^=',
        '<<=',
        '>>=',
        '&^=',
        '&&',
        '||',
        '<-',
        '++',
        '--',
        '==',
        '<',
        '>',
        '=',
        '!',
        '!=',
        '<=',
        '>=',
        ':=',
        '...',
        '(',
        ')',
        '',
        ']',
        '{',
        '}',
        ',',
        ';',
        '.',
        ':'
    ],
    digits: /\d+(_+\d+)*/,
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    tokenizer: {
        root: [
            // identifiers and keywords
            [
                /[a-zA-Z_]\w*/,
                {
                    cases: {
                        '@keywords': {token: 'keyword.$0'},
                        '@default': 'identifier'
                    }
                }
            ],

            // whitespace
            {include: '@whitespace'},

            // [[ attributes ]].
            [/\[\[.*\]\]/, 'annotation'],

            // Preprocessor directive
            [/^\s*#\w+/, 'keyword'],

            // delimiters and operators
            [/[{}()\[\]]/, '@brackets'],
            // [/[<>](?!@symbols)/, '@brackets'],
            [
                /@symbols/,
                {
                    cases: {
                        '@operators': 'delimiter',
                        '@default': ''
                    }
                }
            ],

            // numbers
            [/\d*\d+[eE]([\-+]?\d+)?/, 'number.float'],
            [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
            [/0[xX][0-9a-fA-F']*[0-9a-fA-F]/, 'number.hex'],
            [/0[0-7']*[0-7]/, 'number.octal'],
            [/0[bB][0-1']*[0-1]/, 'number.binary'],
            [/\d[\d']*/, 'number'],
            [/\d/, 'number'],

            // delimiter: after number because of .\d floats
            [/[;,.]/, 'delimiter'],

            // strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
            [/"/, 'string', '@string'],
            [/`/, 'string', '@rawstring'],

            // characters
            [/'[^\\']'/, 'string'],
            [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
            [/'/, 'string.invalid']
        ],
        whitespace: [
            [/[ \t\r\n]+/, ''],
            [/\/\*\*(?!\/)/, 'comment.doc', '@doccomment'],
            [/\/\*/, 'comment', '@comment'],
            [/\/\/.*$/, 'comment'],
            [/#.*$/, 'comment']
        ],

        comment: [
            [/[^\/*]+/, 'comment'],
            // [/\/\*/, 'comment', '@push' ],    // nested comment not allowed :-(
            // [/\/\*/,    'comment.invalid' ],    // this breaks block comments in the shape of /* //*/
            [/\*\//, 'comment', '@pop'],
            [/[\/*]/, 'comment'],
            [/#/, "comment"],
        ],
        //Identical copy of comment above, except for the addition of .doc
        doccomment: [
            [/[^\/*]+/, 'comment.doc'],
            // [/\/\*/, 'comment.doc', '@push' ],    // nested comment not allowed :-(
            [/\/\*/, 'comment.doc.invalid'],
            [/\*\//, 'comment.doc', '@pop'],
            [/[\/*]/, 'comment.doc']
        ],

        string: [
            [/[^\\"]+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/"/, 'string', '@pop']
        ],

        rawstring: [
            [/[^\`]/, 'string'],
            [/`/, 'string', '@pop']
        ]
    }
})

monaco.languages.registerCompletionItemProvider(YaklangMonacoSpec, {
    provideCompletionItems: (editor, position, context, token) => {
        try {
            const data = yaklangCompletionHandlerProvider(editor, position, context, token as any);
            if (data.suggestions) {
                return {suggestions: data.suggestions}
            }
            return {suggestions: []}
        } catch (e) {
            return {suggestions: []}
        }
    },
    triggerCharacters: ["."]
});

// monaco.languages.registerCodeActionProvider(YaklangMonacoSpec, {
//     provideCodeActions: (model, range, context, token) => {
//         console.info("code action: RANGE - ", range)
//         console.info("code action: CONTEXT - ", context)
//         return {
//             actions: [{title: "Hello World!"}],
//             dispose: () => {
//                 console.info("dispose called")
//             }
//         } as CodeActionList;
//     }
// })

// monaco.languages.registerCodeLensProvider(YaklangMonacoSpec, {
//     provideCodeLenses: (model, token) => {
//         return {
//             lenses: [
//                 {
//                     range: {
//                         startLineNumber: 1,
//                         startColumn: 1,
//                         endLineNumber: 2,
//                         endColumn: 1,
//                     },
//                     id: "代码格式化",
//                     command: {
//                         title: "Yak 代码格式化",
//                         id: YAK_FORMATTER_COMMAND_ID,
//                     }
//                 }
//             ],
//             dispose(): void {
//             }
//         }
//     }
// })