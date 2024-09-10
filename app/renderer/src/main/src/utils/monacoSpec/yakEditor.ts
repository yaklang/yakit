import { monaco } from "react-monaco-editor";
import { newYaklangCompletionHandlerProvider, yaklangCompletionHandlerProvider, getCompletions, getGlobalCompletions, Range, SuggestionDescription, YaklangLanguageSuggestionRequest, YaklangLanguageSuggestionResponse, getWordWithPointAtPosition, YaklangLanguageFindResponse } from "./yakCompletionSchema";
import { KeyCode, KeyMod, languages } from "monaco-editor";
import CodeAction = languages.CodeAction;
import CodeActionList = languages.CodeActionList;
import { EditorContext } from "@uiw/react-md-editor";

export const YaklangMonacoSpec = "yak";
// export const GolangMonacoSpec = "go";

export const YAK_FORMATTER_COMMAND_ID = "yak-formatter";

const { ipcRenderer } = window.require("electron");
const { CompletionItemKind } = monaco.languages;
var modelToEditorMap = new Map<monaco.editor.ITextModel, monaco.editor.ICodeEditor>();
var editorToSignatureHelpRangeMap = new Map<monaco.editor.ICodeEditor, monaco.Range>();

const editorContextMap = new Map<monaco.editor.ICodeEditor, Map<string, string>>();

export function setEditorContext(editor: monaco.editor.IStandaloneCodeEditor, key: string, value: string) {
    let context = editorContextMap.get(editor);
    if (!context) {
        context = new Map<string, string>();
        editorContextMap.set(editor, context);
    }
    context.set(key, value);
}

export function getModelContext(model: monaco.editor.ITextModel, key: string): string {
    const editor = modelToEditorMap.get(model);
    if (editor) {
        return getEditorContext(editor, key);
    }
    return "";
}

function getEditorContext(editor: monaco.editor.ICodeEditor, key: string): string {
    const context = editorContextMap.get(editor);
    return context?.get(key) || "";
}

monaco.languages.register({
    id: YaklangMonacoSpec,
    extensions: [".yak"],
    aliases: ['Yak'],
});




interface YaklangInformationKV {
    Key: string
    Value: Uint8Array
    Extern: YaklangInformationKV[]
}
export interface YaklangInformation {
    Name: string
    Data: YaklangInformationKV[]
}

interface YaklangInspectInformationRequest {
    YakScriptType: "yak" | "mitm" | "port-scan" | "codec"
    YakScriptCode: string
    Range: Range
}

interface YaklangInspectInformationResponse {
    Information: YaklangInformation[]
}



export const setUpYaklangMonaco = () => {
    monaco.languages.setLanguageConfiguration(YaklangMonacoSpec, {
        autoClosingPairs: [
            { "open": "{{", "close": "}}" },
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
            { "open": "{{", "close": "}}", token: "double-braces" },
            { "open": "{", "close": "}", token: "braces" },
            { "open": "[", "close": "]", token: "brackets" },
            { "open": "(", "close": ")", token: "parentheses" },
            // {"open": "'", "close": "'", token: "single-quote"},
            // {"open": "\"", "close": "\"", token: "quote"},
            // {"open": "`", "close": "`", token: "backticks"},
            { "open": "/**", "close": " */", token: "comment" }
        ],
        defaultToken: "",
        tokenPostfix: ".yak",
        keywords: [
            "break", "case", "continue", "default", "defer", "else",
            "for", "go", "if", "range", "return", "select", "switch",
            "chan", "func", "fn", "def", "var", "nil", "undefined",
            "map", "class", "include", "type", "bool", "true", "false",
            "string", "try", "catch", "finally", "in", "elif",
        ],
        types: [
            "uint", "uint8", "byte", "uint16", "uint32", "uint64",
            "int", "int8", "int16", "int32", "int64",
            "bool", "float", "float64", "double", "string", "omap", "var", "any",
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
        libnames: getCompletions().libNames,
        libFuncNames: getCompletions().libCompletions.reduce((acc, cur) => {
            cur.functions.forEach(func => {
                const funcName = func.functionName.split("(")[0];
                acc.push(`${cur.libName}.${funcName}`);
            })
            return acc;
        }, [] as Array<string>),
        globals: getGlobalCompletions().reduce((acc, cur) => {
            const match = /(^\w+)\(.*\)/.exec(cur.insertText)
            if (match?.length === 2) {
                acc.push(match[1].toString());
            }
            return acc;
        }, [] as Array<string>),
        digits: /\d+(_+\d+)*/,
        symbols: /[=><!~?:&|+\-*\/\^%]+/,
        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4})/,

        docIdentifierName: /[a-zA-Z_\u0080-\ufffe][a-zA-Z0-9_\u0080-\ufffe]*/,
        inlineExpr: /\$\{[^}]*\}/,
        invalidInlineExpr: /\$\{[^}]*$/,
        tokenizer: {
            root: [

                // f-strings
                [/f"/, 'string.quoted.double.js', '@fstring'],
                [/f'/, 'string.quoted.single.js', '@fstring2'],
                [/f`/, 'string', '@frawstring'],
                // x-strings
                [/x"/, 'string.quoted.double.js', '@xstring'],
                [/x'/, 'string.quoted.single.js', '@xstring2'],
                [/x`/, 'string', '@xrawstring'],
                // doc-strings
                [/<<<\s*(['"]?)(@docIdentifierName)(\1)/, 'string.heredoc.delimiter', '@heredoc.$2'],
                // identifiers and keywords
                [/_(?!\w)/, 'keyword.$0'],
                [
                    /([a-zA-Z_]\w+)(\.)([a-zA-Z_]\w+)/,
                    {
                        cases: {
                            '@libFuncNames': ['type.identifier', 'delimiter', 'libFunction'],
                            '@default': 'identifier'
                        }
                    },
                ],
                [
                    /[a-zA-Z_]\w*/,
                    {
                        cases: {
                            '@keywords': { token: 'keyword.$0' },
                            '@types': { token: 'basic.type' },
                            '@libnames': 'type.identifier',
                            '@globals': 'globals',
                            '@default': 'identifier'
                        }
                    },
                ],

                // whitespace
                { include: '@whitespace' },

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
                            '@operators': 'operator',
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



                // characters
                [/'[^\\']'/, 'string'],
                [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],

                // strings
                [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
                [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-teminated string
                [/"/, 'string.quoted.double.js', '@string'],
                [/'/, 'string.quoted.single.js', '@string2'],
                [/`/, 'string', '@rawstring'],
                [/'/, 'string.invalid'],
            ],

            fuzz_tag: [
                [/{{/, "fuzz.tag.inner", "@fuzz_tag_second"],
                [/}}/, "fuzz.tag.inner", "@pop"],
                [/[\w:]+}}/, "fuzz.tag.inner", "@pop"],
                [/[\w:]+\(/, "fuzz.tag.inner", "@fuzz_tag_param"],
            ],
            fuzz_tag_second: [
                [/{{/, "fuzz.tag.second", "@fuzz_tag"],
                [/}}/, "fuzz.tag.second", "@pop"],
                [/[\w:]+}}/, "fuzz.tag.second", "@pop"],
                [/[\w:]+\(/, "fuzz.tag.second", "@fuzz_tag_param_second"],
            ],
            fuzz_tag_param: [
                [/\(/, "fuzz.tag.inner", "@fuzz_tag_param"],
                [/\\\)/, "bold-keyword"],
                [/\)/, "fuzz.tag.inner", "@pop"],
                [/{{/, "fuzz.tag.second", "@fuzz_tag_second"],
                [/./, "bold-keyword"]
            ],
            fuzz_tag_param_second: [
                [/\\\)/, "bold-keyword"],
                [/\)/, "fuzz.tag.second", "@pop"],
                [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
                [/./, "bold-keyword"]
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

            // disable fuzztag because of monaco editor bug
            xrawstring: [
                // [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
                [/[^`]/, 'string'],
                [/`/, 'string', '@pop']
            ],

            xstring: [
                // [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
                [/@escapes/, 'string.escape'],
                [/[^\\"]+/, 'string'],
                [/\\./, 'string.escape.invalid'],
                [/"/, 'string', '@pop']
            ],

            xstring2: [
                // [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
                [/@escapes/, 'string.escape'],
                [/[^\\']/, 'string'],
                [/'/, 'string', '@pop']
            ],


            frawstring: [
                [/@inlineExpr/, 'string.inline.expr'],
                [/@invalidInlineExpr/, 'string.invalid'],
                [/[^`]/, 'string'],
                [/`/, 'string', '@pop']
            ],

            fstring: [
                [/@escapes/, 'string.escape'],
                [/@inlineExpr/, 'string.inline.expr'],
                [/@invalidInlineExpr/, 'string.invalid'],
                [/[^\\"]/, 'string'],
                [/\\./, 'string.escape.invalid'],
                [/"/, 'string', '@pop']
            ],

            fstring2: [
                [/@escapes/, 'string.escape'],
                [/@inlineExpr/, 'string.inline.expr'],
                [/@invalidInlineExpr/, 'string.invalid'],
                [/[^\\']/, 'string'],
                [/'/, 'string', '@pop']
            ],

            string: [
                [/@escapes/, 'string.escape'],
                [/[^\\"]/, 'string'],
                [/\\./, 'string.invalid'],
                [/"/, 'string', '@pop']
            ],

            string2: [
                [/@escapes/, 'string.escape'],
                [/[^\\']/, 'string'],
                [/'/, 'string', '@pop']
            ],

            rawstring: [
                [/[^`]/, 'string'],
                [/`/, 'string', '@pop']
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

        }
    })

}

monaco.languages.registerCompletionItemProvider(YaklangMonacoSpec, {
    provideCompletionItems: (model, position, context, token) => {
        return new Promise(async (resolve, reject) => {
            await newYaklangCompletionHandlerProvider(model, position, context, token as any).then((data) => {
                if (data.suggestions.length > 0) {
                    let items = data.suggestions;
                    for (const item of items) {
                        if (item.kind === CompletionItemKind.Method || item.kind === CompletionItemKind.Function) {
                            item.command = { title: 'triggerParameterHints', id: 'editor.action.triggerParameterHints' };
                        }
                    }
                    if (position.column < model.getLineMaxColumn(position.lineNumber)) {
                        // get next character
                        let nextValue = model.getValueInRange({
                            startLineNumber: position.lineNumber,
                            startColumn: position.column,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column + 1,
                        })

                        // if next character is "(", remove the "(" and after content in the insertText
                        if (nextValue === "(") {
                            items = items.map(item => {
                                let index = item.insertText.indexOf("(");
                                if (index !== -1) {
                                    item.insertText = item.insertText.slice(0, index);
                                }
                                return item;
                            }
                            )
                        }
                    }

                    resolve({
                        suggestions: items,
                        incomplete: data.incomplete,
                    })
                } else {
                    resolve({ suggestions: [] })
                }
            })
        })
    },
    triggerCharacters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '.']
});


monaco.editor.onDidCreateEditor((editor) => {
    monaco.editor.addKeybindingRules([
        {
            keybinding: KeyMod.Alt | KeyCode.KeyR,
            command: 'editor.action.goToReferences',
        },
        {
            keybinding: KeyMod.Alt | KeyCode.KeyD,
            command: 'editor.action.revealDefinition',
        },
    ],
    )
    editor.onDidChangeModel((e) => {
        const model = editor.getModel();
        if (!model) {
            return;
        }
        modelToEditorMap.set(model, editor);
    })
    editor.onDidDispose(() => {
        editorContextMap.delete(editor)
    })
    editor.onDidChangeCursorPosition((e) => {
        const range = editorToSignatureHelpRangeMap.get(editor);
        if (!range) {
            return
        }
        const position = e.position;

        // 如果光标不在函数签名提示的范围内，关闭函数签名提示
        if (range.containsPosition(position)) {
            return
        }
        editor.trigger('keyboard', 'closeParameterHints', null);
        editorToSignatureHelpRangeMap.delete(editor);
    })
    editor.onDidChangeModelContent((e) => {
        // 修改函数签名提示的范围
        let range = editorToSignatureHelpRangeMap.get(editor);
        if (!range) {
            return
        }
        e.changes.forEach(change => {
            if (!range) {
                return
            }
            if (range.containsRange(change.range)) {
                const model = editor.getModel();
                if (!model) {
                    return
                }
                const LParenMatch = model.findPreviousMatch("(", new monaco.Position(range.startLineNumber, range.endColumn), false, false, null, false);
                const RParenMatch = model.findNextMatch(")", new monaco.Position(range.startLineNumber, range.endColumn), false, false, null, false);
                if (LParenMatch && RParenMatch) {
                    const startPosition = LParenMatch.range.getStartPosition();
                    const endPosition = RParenMatch.range.getStartPosition();
                    range = new monaco.Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column);
                    editorToSignatureHelpRangeMap.set(editor, range);
                }
            }
        })
    })
})

monaco.editor.onWillDisposeModel((model) => {
    modelToEditorMap.delete(model);
})



monaco.languages.registerSignatureHelpProvider(YaklangMonacoSpec, {
    provideSignatureHelp: (model, position, token, context) => {

        return new Promise(async (resolve, reject) => {
            let newPosition = new monaco.Position(position.lineNumber, position.column - 1)
            const editor = modelToEditorMap.get(model);
            let rng: monaco.Range;
            if (editor) { // 修复在补全后的函数签名提示问题
                // 补全后一般会选择某些内容
                const LParenMatch = model.findPreviousMatch("(", position, false, false, null, false);
                if (LParenMatch) {
                    newPosition = LParenMatch.range.getStartPosition();
                }
                const RParenMatch = model.findNextMatch(")", newPosition, false, false, null, false);
                // 如果找到了右括号，证明是一个完整的函数调用，可以设置editorToSignatureHelpRangeMap
                if (RParenMatch) {
                    const RParenPosition = RParenMatch.range.getStartPosition();
                    rng = new monaco.Range(newPosition.lineNumber, newPosition.column, RParenPosition.lineNumber, RParenPosition.column)
                    editorToSignatureHelpRangeMap.set(editor, rng);
                } else {
                    reject();
                    return;
                }
                // rng include position
                if (!rng.containsPosition(position)) {
                    reject();
                    return;
                }
            }

            const iWord = getWordWithPointAtPosition(model, newPosition);
            let doc = "";
            let decl = "";



            const type = getModelContext(model, "plugin") || "yak"

            await ipcRenderer.invoke("YaklangLanguageSuggestion", {
                InspectType: "signature",
                YakScriptType: type,
                YakScriptCode: model.getValue(),
                ModelID: model.id,
                Range: {
                    Code: iWord.word,
                    StartLine: position.lineNumber,
                    StartColumn: iWord.startColumn,
                    EndLine: position.lineNumber,
                    EndColumn: iWord.endColumn,
                } as Range,
            } as YaklangLanguageSuggestionRequest).then((r: YaklangLanguageSuggestionResponse) => {
                if (r.SuggestionMessage.length > 0) {
                    r.SuggestionMessage.forEach(v => {
                        decl += v.Label ?? "" + "\n";
                        doc += v.Description ?? "" + "\n";
                    })
                    doc = doc.trim();
                    decl = decl.trim();
                    if (decl.length === 0) {
                        resolve(null);
                        return
                    }

                    let parameters: languages.ParameterInformation[] = [];
                    let activeParameter: number = -1;
                    if (rng != null) {
                        const nowParamsInnerText = model.getValueInRange(rng)

                        const startIdx = decl.indexOf('(');
                        const endIdx = decl.lastIndexOf(')');
                        if (startIdx != -1 && endIdx != -1 && startIdx < endIdx) {
                            const paramsInnerText = decl.substring(startIdx + 1, endIdx);
                            parameters = paramsInnerText.split(",").map((param, index) => {
                                return {
                                    label: param.trim(),
                                }
                            })
                        }
                        if (editor) {
                            let nowPosition = editor.getPosition()!;
                            let beforeText = model.getValueInRange({
                                startLineNumber: rng.startLineNumber, 
                                startColumn: rng.startColumn,
                                endLineNumber: nowPosition.lineNumber,
                                endColumn: nowPosition.column,
                            })
                            activeParameter = beforeText.match(/,/g)?.length || 0;
                            console.log(activeParameter, parameters)
                        }
                    }

                    resolve({
                        value: {
                            signatures: [
                                {
                                    label: decl,
                                    parameters: parameters,
                                    documentation: { value: doc, isTrusted: true },
                                }
                            ],
                            activeSignature: 0,
                            activeParameter: activeParameter,
                        },
                        dispose: () => { },
                    });
                    return
                }
            })
        })
    },
    signatureHelpTriggerCharacters: ['(', ')', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '.', ',']
})

monaco.languages.registerHoverProvider(YaklangMonacoSpec, {
    provideHover: function (model: monaco.editor.ITextModel, position: monaco.Position, cancellationToken: monaco.CancellationToken): languages.ProviderResult<languages.Hover> {
        return new Promise(async (resolve, reject) => {
            const iWord = getWordWithPointAtPosition(model, position);
            let desc = "";
            const type = getModelContext(model, "plugin") || "yak"
            await ipcRenderer.invoke("YaklangLanguageSuggestion", {
                InspectType: "hover",
                YakScriptType: type,
                YakScriptCode: model.getValue(),
                ModelID: model.id,
                Range: {
                    Code: iWord.word,
                    StartLine: position.lineNumber,
                    StartColumn: iWord.startColumn,
                    EndLine: position.lineNumber,
                    EndColumn: iWord.endColumn,
                } as Range,
            } as YaklangLanguageSuggestionRequest).then((r: YaklangLanguageSuggestionResponse) => {
                if (r.SuggestionMessage.length > 0) {
                    r.SuggestionMessage.forEach(v => {
                        desc += v.Label ?? "" + "\n";
                    })
                    resolve({
                        range: new monaco.Range(position.lineNumber, iWord.startColumn, position.lineNumber, iWord.endColumn),
                        contents: [
                            {
                                value: desc,
                                isTrusted: true
                            },
                        ],
                    });
                    return
                }
            })


            resolve(null);
        })


    }
})


monaco.languages.registerDefinitionProvider(YaklangMonacoSpec, {
    provideDefinition: function (model: monaco.editor.ITextModel, position: monaco.Position, token: monaco.CancellationToken): languages.ProviderResult<languages.Definition> {
        return new Promise(async (resolve, reject) => {
            const iWord = getWordWithPointAtPosition(model, position);
            let desc = "";
            const type = getModelContext(model, "plugin") || "yak"
            await ipcRenderer.invoke("YaklangLanguageFind", {
                InspectType: "definition",
                YakScriptType: type,
                YakScriptCode: model.getValue(),
                Range: {
                    Code: iWord.word,
                    StartLine: position.lineNumber,
                    StartColumn: iWord.startColumn,
                    EndLine: position.lineNumber,
                    EndColumn: iWord.endColumn,
                } as Range,
            } as YaklangLanguageSuggestionRequest).then((r: YaklangLanguageFindResponse) => {
                if (r.Ranges.length == 0) {
                    return
                }
                resolve(r.Ranges.map(v => {
                    return {
                        uri: model.uri,
                        range: new monaco.Range(Number(v.StartLine), Number(v.StartColumn), Number(v.EndLine), Number(v.EndColumn))
                    }
                }))
            })


            resolve(null);
        })
    }
}
)


monaco.languages.registerReferenceProvider(YaklangMonacoSpec, {
    provideReferences: function (model: monaco.editor.ITextModel, position: monaco.Position, context: languages.ReferenceContext, token: monaco.CancellationToken): languages.ProviderResult<languages.Location[]> {
        return new Promise(async (resolve, reject) => {
            const iWord = getWordWithPointAtPosition(model, position);
            let desc = "";
            const type = getModelContext(model, "plugin") || "yak"
            await ipcRenderer.invoke("YaklangLanguageFind", {
                InspectType: "reference",
                YakScriptType: type,
                YakScriptCode: model.getValue(),
                Range: {
                    Code: iWord.word,
                    StartLine: position.lineNumber,
                    StartColumn: iWord.startColumn,
                    EndLine: position.lineNumber,
                    EndColumn: iWord.endColumn,
                } as Range,
            } as YaklangLanguageSuggestionRequest).then((r: YaklangLanguageFindResponse) => {
                if (r.Ranges.length == 0) {
                    return
                }
                console.log(r.Ranges)
                resolve(r.Ranges.map(v => {
                    return {
                        uri: model.uri,
                        range: new monaco.Range(Number(v.StartLine), Number(v.StartColumn), Number(v.EndLine), Number(v.EndColumn))
                    }
                }))
            })

            resolve(null);
        })
    }
}
)

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