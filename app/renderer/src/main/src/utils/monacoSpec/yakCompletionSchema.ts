import {editor, IRange, languages, Position} from "monaco-editor";
import {CancellationToken} from "typescript";

export interface CompletionSchema {
    libName: string
    prefix: string
    functions: {
        functionName: string
        document?: string
        definitionStr: string
    }[]
}

export interface FieldsCompletion {
    isMethod: boolean
    fieldName: string
    structName: string
    structNameShort: string
    methodsCompletion: string
    isGolangBuildOrigin: string
}

export interface CompletionTotal {
    libNames: string[]
    libCompletions: CompletionSchema[]
    fieldsCompletions: FieldsCompletion[]
}


let globalSuggestions: languages.CompletionItem[] = [];
let completions: CompletionTotal = {libCompletions: [], fieldsCompletions: [], libNames: []};

export const extraSuggestions: languages.CompletionItem[] = [
        {
            kind: languages.CompletionItemKind.Snippet,
            label: "err",
            insertText: "if ${1:err} != nil { die(${1:err}) }",
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Snippets for input err quickly",
        } as languages.CompletionItem
    ]
;

export const setCompletions = (data: CompletionTotal) => {
    completions = {
        libCompletions: data.libCompletions.filter(i => !i.libName.startsWith("_")),
        fieldsCompletions: [],
        libNames: data.libNames.filter(i => !i.startsWith("_")),
    };

    const globalLibs = data.libCompletions.filter(i => i.libName === "__global__");
    if (globalLibs.length <= 0) {
        return
    }
    globalSuggestions = globalLibs[0].functions.map(i => {
        return {
            kind: languages.CompletionItemKind.Function,
            label: i.functionName,
            documentation: i.definitionStr,
            insertText: i.functionName,
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        } as languages.CompletionItem;
    })
}

export const getCompletions = () => {
    return completions
}

export const getGlobalCompletions = (): languages.CompletionItem[] => {
    return globalSuggestions
};

export const getDefaultCompletions = (position: Position): languages.CompletionItem[] => {
    return [
        ...globalSuggestions,
        ...extraSuggestions,
    ].map(i => {
        return {
            ...i, range: {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column || 0,
                endColumn: position.column || 0,
            },
        }
    })
};

export const getDefaultCompletionsWithRange = (range: IRange): languages.CompletionItem[] => {
    return [
        ...globalSuggestions,
        ...extraSuggestions,
    ].map(i => {
        return {
            ...i,
            range,
        }
    })
}

export const yaklangCompletionHandlerProvider = (model: editor.ITextModel, position: Position, context: languages.CompletionContext, token: CancellationToken): { suggestions: any[] } => {
    if (position === undefined) {
        return {suggestions: []}
    }
    const {column, lineNumber} = position;
    if (column === undefined || lineNumber === undefined) {
        return {suggestions: []};
    }

    if ((position?.column || 0) <= 0) {
        return {suggestions: []};
    }
    const beforeCursor = position.column - 1;
    const line = model.getLineContent(position.lineNumber).substr(0, beforeCursor <= 0 ? 0 : beforeCursor);
    const words = Array.from(line.matchAll(/\w+/g), m => m[0]);
    const lastWord = words.length > 0 ? words[words.length - 1] : "";

    const startColumn = position.column - lastWord.length;
    const replaceRange: IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: startColumn > 0 ? startColumn : 0,
        endColumn: position.column || 0,
    };
    const insertRange: IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column || 0,
        endColumn: position.column || 0,
    };

    // 设置补全
    let items: languages.CompletionItem[] = [];
    const libCompletions = (completions.libCompletions || []);
    for (let i = 0; i < libCompletions.length; i++) {
        const currentLib = libCompletions[i];
        if (line.endsWith(currentLib.libName + ".")) {
            currentLib.functions.forEach(f => {
                items.push({
                    insertText: f.functionName,
                    detail: f.definitionStr,
                    label: f.functionName,
                    kind: languages.CompletionItemKind.Snippet,
                    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range: insertRange,
                })
            })
            return {
                suggestions: items,
            }
        }
    }

    if (items.length <= 0) {
        return {
            suggestions: [...completions.libNames.map(i => {
                return {
                    insertText: i,
                    detail: i,
                    label: i,
                    kind: languages.CompletionItemKind.Struct,
                    range: replaceRange,
                }
            }),
                ...getDefaultCompletionsWithRange(replaceRange)
            ].filter(i => {
                return `${i.label}`.includes(lastWord)
            })
        }
    }

    // 如果补全函数失败，则会认为
    return {
        suggestions: [],
    } as any;
}