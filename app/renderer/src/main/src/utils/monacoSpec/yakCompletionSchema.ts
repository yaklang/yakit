import {editor, IRange, languages, Position} from "monaco-editor";
import {CancellationToken} from "typescript";
import {removeRepeatedParams} from "@/pages/invoker/YakScriptParamsSetter";
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams";

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
            label: "fn closure",
            insertText: "fn{\n" +
                "    defer fn{\n" +
                "        err := recover()\n" +
                "        if err != nil {\n" +
                "            log.error(`recover from panic: %v`, err)\n" +
                "        }\n" +
                "    }\n" +
                "    ${1}\n" +
                "}",
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Snippets For Try-Catch-Finally"
        } as languages.CompletionItem,
        {
            kind: languages.CompletionItemKind.Snippet,
            label: "try-catch-finally",
            insertText: "try {\n" +
                "    ${1}\n" +
                "} catch err {\n" +
                "    ${2}\n" +
                "} finally {\n" +
                "    ${3}\n" +
                "}",
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Snippets For Try-Catch-Finally"
        } as languages.CompletionItem,
        {
            kind: languages.CompletionItemKind.Snippet,
            label: "try-catch",
            insertText: "try {\n" +
                "    ${1}\n" +
                "} catch err {\n" +
                "    ${2}\n" +
                "}${3}",
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Snippets For Try-Catch"
        } as languages.CompletionItem,
        {
            kind: languages.CompletionItemKind.Snippet,
            label: "err",
            insertText: "if ${1:err} != nil { die(${1:err}) }",
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Snippets for input err quickly",
        } as languages.CompletionItem,
        {
            kind: languages.CompletionItemKind.Snippet,
            label: "aes-cbc-pkcs7(pkcs) encrypt",
            insertText: "data = \"${1:your-data}\"\n" +
                "data = codec.PKCS7Padding([]byte(data))\n" +
                "\n" +
                "key, _ = codec.DecodeBase64(\"${2:key-base64}\")\n" +
                "// key = codec.PKCS5Padding(key, 16)\n" +
                "key = codec.PKCS7Padding(key)\n" +
                "\n" +
                "// 设置 iv\n" +
                "// 如果不好设置 base64 的话，可以设置 iv = []byte(\"your-iv\")\n" +
                "iv, _ = codec.DecodeBase64(\"${3:iv-base64}\")\n" +
                "// iv = codec.PKCS5Padding(iv, 16)\n" +
                "iv = codec.PKCS7Padding(iv)\n" +
                "\n" +
                "// 开始调用加密函数\n" +
                "encryptData, err = codec.AESCBCEncrypt(key, data, iv)\n" +
                "base64Encrypted = codec.EncodeBase64(encryptData) # 例如 UMIKHDaF72Kh/zIFnAH2Pw==\n" +
                "hexEncrypted = codec.EncodeToHex(encryptData) # 例如 50c20a1c3685ef62a1ff32059c01f63f\n" +
                "base64urlEncrypted = codec.EscapeQueryUrl(base64Encrypted) # 例如 UMIKHDaF72Kh%2FzIFnAH2Pw%3D%3D\n" +
                "\n",
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "AES CBC PKCS7(PKCS5)",
        } as languages.CompletionItem,
        {
            kind: languages.CompletionItemKind.Snippet,
            label: "aes-ecb-pkcs7 encrypt",
            insertText: "# 需要加密的原文\ndata = \"this is data\"\n" +
                "# 用到的 AES KEY，如果是 base64 编码可用这个解码，不是的话，可直接使用 key = []byte(`your-aes-key...`)\nkey, err = codec.DecodeBase64(\"${1}\")\nkey = codec.PKCS7Padding(key)\n" +
                "# PKCS7Padding(data) / PKCS5Padding(data, 16/*block size*/)\ndata = codec.PKCS7Padding([]byte(data))\n\n" +
                "# 使用 AES ECB 加密内容，如果解密失败，可以查看 err 中错误原因\nencryptData, err = codec.AESECBEncrypt(key, data, nil)\n" +
                "base64Encrypted = codec.EncodeBase64(encryptData) # 例如 UMIKHDaF72Kh/zIFnAH2Pw==\n" +
                "hexEncrypted = codec.EncodeToHex(encryptData) # 例如 50c20a1c3685ef62a1ff32059c01f63f\n" +
                "base64urlEncrypted = codec.EscapeQueryUrl(base64Encrypted) # 例如 UMIKHDaF72Kh%2FzIFnAH2Pw%3D%3D\n",
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "AES ECB PKCS7",
        } as languages.CompletionItem,
        {
            kind: languages.CompletionItemKind.Snippet,
            label: "aes-ecb-pkcs5 encrypt",
            insertText: "# 需要加密的原文\ndata = \"this is data\"\n" +
                "# 用到的 AES KEY，如果是 base64 编码可用这个解码，不是的话，可直接使用 key = []byte(`your-aes-key...`)\nkey, err = codec.DecodeBase64(\"${1}\")\nkey = codec.PKCS5Padding(key, 16)\n" +
                "# PKCS7Padding(data) / PKCS5Padding(data, 16/*block size*/)\ndata = codec.PKCS5Padding([]byte(data), 16)\n\n" +
                "# 使用 AES ECB 加密内容，如果解密失败，可以查看 err 中错误原因\nencryptData, err = codec.AESECBEncrypt(key, data, nil)\n" +
                "base64Encrypted = codec.EncodeBase64(encryptData) # 例如 UMIKHDaF72Kh/zIFnAH2Pw==\n" +
                "hexEncrypted = codec.EncodeToHex(encryptData) # 例如 50c20a1c3685ef62a1ff32059c01f63f\n" +
                "base64urlEncrypted = codec.EscapeQueryUrl(base64Encrypted) # 例如 UMIKHDaF72Kh%2FzIFnAH2Pw%3D%3D\n",
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "AES ECB PKCS5",
        } as languages.CompletionItem,
    ]
;

export interface MethodSuggestion {
    Verbose: string
    FuzzKeywords: string[]
    ExactKeywords: string[]
    Regexp: string[]
    /*
    *
// 这个定义我们争取和 monaco editor suggestion 基本一致
message SuggestionDescription {
  string Label = 1;
  string Description = 2;
  string InsertText = 3;
  bool JustAppend = 4;
}
    * */
    Suggestions: MethodSuggestionItem[]
}

interface MethodSuggestionItem {
    Label: string
    Description: string
    InsertText: string
    JustAppend: boolean
    DefinitionVerbose: string
}

let YaklangBuildInMethodCompletion: MethodSuggestion[] = [];

export const setYaklangBuildInMethodCompletion = (methods: MethodSuggestion[]) => {
    YaklangBuildInMethodCompletion = methods;
}

export const setYaklangCompletions = (data: CompletionTotal) => {
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
};

const removeRepeatedSuggestions = (params: languages.CompletionItem[]): languages.CompletionItem[] => {
    const results: languages.CompletionItem[] = [];
    const labels: string[] = [];

    params.forEach(i => {
        const key = `${i.label}`;
        if (labels.includes(key)) {
            return
        }
        labels.push(key)
        results.push(i)
    });
    return results
}

const loadMethodFromCaller = (caller: string, prefix: string, range: IRange): languages.CompletionItem[] => {
    if (!YaklangBuildInMethodCompletion) {
        return []
    }

    if (prefix.endsWith("].") || prefix.endsWith(").")) {
        // 无法判断 slice 内部和函数结果的内容，所以我们认为他是 raw
        caller = "raw"
    } else if (prefix.endsWith(`".`) || prefix.endsWith("`.")) {
        // 认为这是一个 string
        caller = "s"
    } else if (prefix.endsWith(`}.`)) {
        // 认为这是一个 map
        caller = "m"
    }

    const items: languages.CompletionItem[] = [];
    const pushCompletion = (i: MethodSuggestion, desc: MethodSuggestionItem) => {
        const labelDef = (!!desc.DefinitionVerbose) ? `${desc.DefinitionVerbose}` : `${desc.InsertText}`
        items.push({
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            insertText: desc.InsertText,
            kind: languages.CompletionItemKind.Snippet,
            label: i.Verbose === "" ? `${labelDef}: ${desc.Description}` : `${i.Verbose}.${labelDef}:  ${desc.Description}`,
            detail: `${i.Verbose}`,
            range: range,
            documentation: desc.Description,
        })
    }

    YaklangBuildInMethodCompletion.forEach(i => {
        // 精确匹配到需要补全的变量
        if (i.ExactKeywords.includes(caller)) {
            i.Suggestions.forEach(desc => {
                pushCompletion(i, desc)
            })
            return
        }

        for (let j = 0; j < i.FuzzKeywords.length; j++) {
            const m = i.FuzzKeywords[j];
            if (caller.toLowerCase().includes(m.toLowerCase())) {
                i.Suggestions.forEach(desc => {
                    pushCompletion(i, desc);
                })
                return;
            }
        }
    })
    return items
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

    /*
    * 设置补全: 库补全
    * */
    let items: languages.CompletionItem[] = [];
    const libCompletions = (completions.libCompletions || []);
    for (let i = 0; i < libCompletions.length; i++) {
        const currentLib = libCompletions[i];
        if (lastWord === currentLib.libName) {
            currentLib.functions.forEach(f => {
                let compLabel = f.definitionStr.startsWith("func ") ? f.definitionStr.substring(5) : f.definitionStr;
                compLabel = compLabel.startsWith(currentLib.libName + ".") ? compLabel.substring((currentLib.libName + ".").length) : compLabel;
                items.push({
                    insertText: f.functionName,
                    detail: f.document,
                    label: compLabel,
                    kind: languages.CompletionItemKind.Snippet,
                    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    range: insertRange,
                })
            })
            return {
                suggestions: [...items, ...loadMethodFromCaller(lastWord, line, insertRange)],
            }
        }
    }

    if (items.length <= 0) {
        if (!line.endsWith(".")) {
            /*
            * 全局补全，不是方法补全
            * 如果光标前最后一个不是 . 的话！说明该进入全局补全的内容了
            * */
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

                let suggestions: languages.CompletionItem[] = fieldCompletion.map(i => {
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

                suggestions = [...suggestions, ...loadMethodFromCaller(lastWord, line, insertRange)]
                return {suggestions: removeRepeatedSuggestions(suggestions)}
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