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
    fieldTypeVerbose: string
    libName?: string
    structName: string
    structNameShort: string
    methodsCompletion: string
    methodsCompletionVerbose: string
    isGolangBuildOrigin: string
}

export interface CompletionTotal {
    libNames: string[]
    libCompletions: CompletionSchema[]
    fieldsCompletions: FieldsCompletion[]
    libToFieldCompletions: { [index: string]: FieldsCompletion[] }
}


let globalSuggestions: languages.CompletionItem[] = [];
let completions: CompletionTotal = {libCompletions: [], fieldsCompletions: [], libNames: [], libToFieldCompletions: {}};
let maxLibLength = 1;

export const extraSuggestions: languages.CompletionItem[] = [
        {
            kind: languages.CompletionItemKind.Snippet,
            label: "err",
            insertText: "if ${1:err} != nil { die(${1:err}) }",
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Snippets for input err quickly",
        } as languages.CompletionItem,
    ]
;

export const setCompletions = (data: CompletionTotal) => {
    if (!data.libToFieldCompletions) {
        data.libToFieldCompletions = {}
    }

    data.libToFieldCompletions[`__global__`] = [];
    completions = {
        libCompletions: data.libCompletions.filter(i => !i.libName.startsWith("_")),
        fieldsCompletions: [],
        libNames: data.libNames.filter(i => !i.startsWith("_")),
        libToFieldCompletions: data.libToFieldCompletions,
    };

    completions.libNames.map(i => {
        if (i.length > maxLibLength) {
            maxLibLength = i.length
        }
    })

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
    const line = model.getLineContent(position.lineNumber).substring(0, beforeCursor);
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
        if (!line.endsWith(".")) {
            // 如果光标前最后一个不是 . 的话！说明该进入全局补全的内容了
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
        } else {
            // 如果 . 有的话，一般这个时候需要筛选一下内容，来尝试补充字段名
            try {
                let value = model.getValueInRange({
                    endColumn: position.column,
                    endLineNumber: position.lineNumber,
                    startColumn: 0,
                    startLineNumber: 0
                });
                if (value.length > 10000) {
                    value = value.substring(value.length - 9999)
                }
                const fieldCompletion: FieldsCompletion[] = [];
                const included = new Map<string, boolean>();
                const methodMerged = new Map<string, FieldsCompletion>();
                const fieldMerged = new Map<string, FieldsCompletion>();
                Array.from(value.matchAll(/[a-z]+/g), m => m[0]).map(i => {
                    if (i === "") {
                        return
                    }
                    if (i.length > maxLibLength) {
                        return
                    }

                    if (!!included.get(i)) {
                        return
                    } else {
                        included.set(i, true)
                    }
                    if (!!completions.libToFieldCompletions[i]) {
                        completions.libToFieldCompletions[i].map(comp => {
                            if (comp.isMethod) {
                                const k = comp.methodsCompletionVerbose;
                                if (methodMerged.has(k)) {
                                    const e = methodMerged.get(k);
                                    if (e === undefined) {
                                        return
                                    }
                                    e.structNameShort = `${e.structNameShort}/${comp.structNameShort}`
                                } else {
                                    methodMerged.set(k, {...comp})
                                }
                            } else {
                                const k = `${comp.fieldName}: ${comp.fieldTypeVerbose}`;
                                if (fieldMerged.has(k)) {
                                    const e = fieldMerged.get(k)
                                    if (e === undefined) {
                                        return
                                    }
                                    e.structNameShort = `${e.structNameShort}/${comp.structNameShort}`
                                } else {
                                    fieldMerged.set(k, {...comp})
                                }
                            }
                        })
                    }
                });

                fieldCompletion.push(...Array.from(fieldMerged.values()))
                fieldCompletion.push(...Array.from(methodMerged.values()))

                const suggestions = fieldCompletion.map(i => {
                    if (i.isMethod) {
                        return {
                            insertText: i.methodsCompletion,
                            detail: `Method:${i.structNameShort}`,
                            label: `${i.methodsCompletionVerbose}`,
                            kind: languages.CompletionItemKind.Function,
                            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range: insertRange,
                        }
                    }
                    return {
                        insertText: i.fieldName,
                        detail: `Field:${i.structNameShort}`,
                        label: `${i.fieldName}: ${i.fieldTypeVerbose}`,
                        kind: languages.CompletionItemKind.Field,
                        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range: insertRange,
                    }
                });
                return {suggestions}
            } catch (e) {
                console.info(e)
            }
        }
    }

    // 如果补全函数失败，则会认为
    return {
        suggestions: [],
    } as any;
}