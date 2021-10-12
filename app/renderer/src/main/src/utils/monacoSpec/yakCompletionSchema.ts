import {editor, languages, Position} from "monaco-editor";
import {CancellationToken, forEachChild} from "typescript";

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


let completions: CompletionTotal = {libCompletions: [], fieldsCompletions: [], libNames: []};

export const setCompletions = (data: CompletionTotal) => {
    completions = data;
}

export const getCompletions = () => {
    return completions
}

export const yaklangCompletionHandlerProvider = (model: editor.ITextModel, position: Position, context: languages.CompletionContext, token: CancellationToken) => {
    const beforeCursor = position.column - 1;
    const line = model.getLineContent(position.lineNumber).substr(0, beforeCursor <= 0 ? 0 : beforeCursor);
    const words = Array.from(line.matchAll(/\w+/g), m => m[0]);
    const lastWord = words.length > 0 ? words[words.length - 1] : "";
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
                    range: {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: position.column || 0,
                        endColumn: position.column || 0,
                    }
                })
            })
            return {
                suggestions: items,
            }
        }
    }

    if (items.length <= 0) {
        return {
            suggestions: completions.libNames.filter(i => {
                return i.includes(lastWord)
            }).map(i => {
                const startColumn = position.column - lastWord.length;
                return {
                    insertText: i,
                    detail: i,
                    label: i,
                    kind: languages.CompletionItemKind.Struct,
                    range: {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: startColumn > 0 ? startColumn : 0,
                        endColumn: position.column || 0,
                    }
                }
            })
        }
    }

    // 如果补全函数失败，则会认为
    return {
        suggestions: []
    }
}