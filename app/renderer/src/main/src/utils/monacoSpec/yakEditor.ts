import {monaco} from "react-monaco-editor";
import {yaklangCompletionHandlerProvider} from "./yakCompletionSchema";

export const YaklangMonacoSpec = "yak";

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
        "string",
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
    // @ts-ignore
    provideCompletionItems: yaklangCompletionHandlerProvider,
    triggerCharacters: ["."],
})