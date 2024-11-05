import { monaco } from "react-monaco-editor";
import { getWordWithPointAtPosition } from "./yakCompletionSchema";
import { RegexpInput } from "@/pages/mitm/MITMRule/MITMRuleFromModal";
import Operation from "antd/lib/transfer/operation";
import { newSyntaxflowCompletionHandlerProvider } from "./syntaxflowLanguage";

export const SyntaxFlowMonacoSpec = "syntaxflow";
monaco.languages.register({
    id: SyntaxFlowMonacoSpec,
    extensions: [".sf"],
    aliases: ['syntaxflow', 'SyntaxFlow'],
});


export const setUpSyntaxFlowMonaco = () => {
    monaco.languages.setMonarchTokensProvider(SyntaxFlowMonacoSpec, syntaxFlowLanguage as any)
    monaco.languages.setLanguageConfiguration(SyntaxFlowMonacoSpec,

        {
            autoClosingPairs: [
                { "open": "{", "close": "}", "notIn": ["string"] },
                { "open": "[", "close": "]" },
                { "open": "(", "close": ")" },
                { "open": "'", "close": "'", "notIn": ["string", "comment"] },
                { "open": "\"", "close": "\"", "notIn": ["string"] },
                { "open": "`", "close": "`", "notIn": ["string", "comment"] },
                { "open": "/**", "close": " */", "notIn": ["string"] }
            ],
            "comments": {
                "lineComment": "//",
            },
            "autoCloseBefore": ";:.,=}])>` \n\t",

            brackets: [
                ["{", "}"],
                ["<", ">"],
                ["[", "]"],
                ["(", ")"]
            ],
        })
}


export const syntaxFlowLanguage = {
    defaultToken: '',
    tokenPostfix: '.syntaxflow',

    keywords: [
        'as',
        'alert', 'for',
        'check', 'else', 'then',
        'desc', 'title', 'risk', 'level',
        'have', 'any',
        'call', 'const', 'constant', 'dict',
        'float', 'func', 'function', 'have', 'if', 'in', 'int', 'list', 'note',
        'param', 'phi', 'ret', 'return', 'str', 'type', 'version_in', 'opcode',
        'not', 'formal_param', 'formalparam', 'true', 'false', 'bool',

    ],

    // operators: [
    //     // Multi-character operators sorted by length for correct matching
    //     '==>', '-->', '}->', '#->', '#>', '#{', '-{', '=>', '==', '...', '%%', '..',
    //     '<=', '>=', '>>', '=~', '!~', '&&', '||', '!=', '${', '<<<', '?{', '->',
    //     // Single-character operators
    //     '>', '<', '=', '+', '&', '?', '#', '$', ':', '%', '!', '*', '-', '`', ';', '.', ',',
    // ],
    // operators :'/==>|-->/',

    brackets: [
        { open: '{', close: '}', token: 'delimiter.curly' },
        { open: '[', close: ']', token: 'delimiter.square' },
        { open: '(', close: ')', token: 'delimiter.parenthesis' },
    ],

    // 定义符号和正则表达式
    symbols: /[=>!~?:&|+\-*\/\^%]+/,

    // 定义转义字符
    escapes: /\\(?:[abfnrtv\\"'`])/,
    docIdentifierName: /[a-zA-Z_\u0080-\ufffe][a-zA-Z0-9_\u0080-\ufffe]*/,

    tokenizer: {
        root: [
            // 行注释
            [/\/\/.*$/, 'comment'],

            // 多行注释（如果有）
            // [/\/\*.*\*\//, 'comment'],
            // HereDoc
            [/<<<\s*(['"]?)(@docIdentifierName)(\1)/, { token: 'string.heredoc.delimiter', next: '@heredoc.$2' }],

            // native-call
            [/[<]/, { token: 'support.function', next: '@native_call' }],

            // 空白字符
            [/[ \t\r\n]+/, ''],


            // 字符串字面量
            [/"([^"\\]|\\.)*$/, 'string.invalid'],  // 非封闭的字符串
            [/'([^'\\]|\\.)*$/, 'string.invalid'],  // 非封闭的字符串
            [/"([^"\\]|\\.)*"/, 'string.quoted.single.js'],
            [/'([^'\\]|\\.)*'/, 'string.quoted.single.js'],
            [/`([^`\\]|\\.)*`/, 'string.quoted.double.js'],

            // 正则表达式字面量
            [/\/(\\\/|[^\/\n])*\//, 'regexp'],

            // 数字字面量
            [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
            [/\b0b[01]+\b/, 'number.binary'],
            [/\b0o[0-7]+\b/, 'number.octal'],
            [/\b\d+\b/, 'number'],

            // 标识符和关键字
            // variable 
            [/[$][a-zA-Z_]\w*/, 'variable'],

            [/[a-zA-Z_]\w*/, {
                cases: {
                    '@keywords': { token: 'keyword.$0' },
                    '@default': 'identifier',
                },
            }],

            // 操作符
            // [/@operators/, 'operator'],

            // 括号和分隔符
            // delimiters and operators
            [/[{}()\[\]]/, '@brackets'],
            [/[;,.]/, 'delimiter'],

            // 未知的符号
            // [/[<>](?!@symbols)/, 'operator'],
            // [/@symbols/, 'operator'],

            // 其他字符
            [/./, ''],
        ],


        native_call: [
            [/[(]/, { token: 'delimiter.parenthesis', next: '@native_call_params' }],
            [/[{]/, { token: 'delimiter.curly', next: '@native_call_params' }],
            [/[>]/, { token: 'support.function', next: '@pop' }],
            [/[^>({]+/, 'support.function'], // 匹配 native_call_name
        ],
        native_call_params: [
            [/,/, 'delimiter'],

            [/[)]/, { token: 'delimiter.parenthesis', next: '@pop' }],
            [/[}]/, { token: 'delimiter.curly', next: '@pop' }],

            [/[:]/, 'delimiter'],
            [/[=]/, 'delimiter'],
            // 字符串字面量
            [/"([^"\\]|\\.)*"/, 'string'],
            [/'([^'\\]|\\.)*'/, 'string'],
            [/`([^`\\]|\\.)*`/, 'string'],
            // HereDoc
            [/<<<\s*(['"]?)(@docIdentifierName)(\1)/, { token: 'string.heredoc.delimiter', next: '@heredoc.$2' }],

            // 正则表达式字面量
            [/\/(\\\/|[^\/\n])*\//, 'regexp'],
            // 数字字面量
            [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
            [/\b0b[01]+\b/, 'number.binary'],
            [/\b0o[0-7]+\b/, 'number.octal'],
            [/\b\d+\b/, 'number'],
            // 行注释
            [/\/\/.*$/, 'comment'],
            // 空白字符
            [/[ \t\r\n]+/, ''],
            [/[^,)}:=]+/, {
                cases: {
                    // '@keywords': { token: 'keyword.$0', next: '@native_call_params' },
                    '@default': 'identifier', // 匹配参数名称或值
                }
            }],
        ],

        heredoc: [
            [/^\s*(@docIdentifierName)/, {
                cases: {
                    '$1==$S2': { token: 'string.heredoc.delimiter', next: '@pop' },
                    '@default': 'string'
                }
            }],
            [/./, 'string'],
        ],
    },
};


monaco.languages.registerCompletionItemProvider(SyntaxFlowMonacoSpec, {
    provideCompletionItems: (model, position, context, token) => {
        // console.log("triggerCharacters: ", context);
        
        return new Promise(async (resolve, reject) => {
            await newSyntaxflowCompletionHandlerProvider(model, position, context, token as any ).then((data) => {
                // console.log("completionItems: ", data);
                resolve(data)
            }).catch((e) => {
                // console.log("completionItems error: ", e);
                reject(e)
            })
        })
    },
    triggerCharacters: ['<', '(', '"']
});