import { monaco } from "react-monaco-editor";
import { editor, languages, Position } from "monaco-editor";
import { CancellationToken } from "typescript";
import "./spaceengine";
import {
    FuzzTagSuggestionRequest,
    getCompletionItemKindByName,
    getSortTextByKindAndLabel,
    getWordWithPointAtPosition,
    newYaklangCompletionHandlerProvider,
    Range,
    YaklangLanguageSuggestionRequest,
    YaklangLanguageSuggestionResponse
} from "@/utils/monacoSpec/yakCompletionSchema";
import {getModelContext, setEditorContext, YaklangMonacoSpec} from "@/utils/monacoSpec/yakEditor";
import IWordAtPosition = editor.IWordAtPosition;
const { ipcRenderer } = window.require("electron");

const httpHeaderSuggestions = [
    {
        kind: languages.CompletionItemKind.Snippet,
        label: "Authorization: Basic ... 快速添加基础认证",
        insertText: "Authorization: Basic {{base64(${1:username}:${2:password})}}",
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: "Authorization",
    } as languages.CompletionItem,
    {
        kind: languages.CompletionItemKind.Snippet,
        label: "Authorization: Bearer ... 快速添加 JWT",
        insertText: "Authorization: Bearer ${1:...}",
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: "Authorization",
    } as languages.CompletionItem,
    {
        kind: languages.CompletionItemKind.Snippet,
        label: "User-Agent",
        insertText: "User-Agent: ${1:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36}",
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: "User-Agent",
    } as languages.CompletionItem,
    {
        kind: languages.CompletionItemKind.Snippet,
        label: "X-Forwarded-For",
        insertText: "X-Forwarded-For: ${1:127.0.0.1}",
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: "XFF 快捷设置",
    } as languages.CompletionItem,
    {
        kind: languages.CompletionItemKind.Snippet,
        label: "Range 设置 Bytes 构造 206 响应",
        insertText: "Range: bytes=0-${1:1023}",
        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: "构造206响应：Range 设置 Bytes",
    } as languages.CompletionItem,
    ...[
        "Accept",
        "Accept-Charset",
        "Accept-Encoding",
        "Accept-Language",
        "Accept-Ranges",
        "Cache-Control",
        "Cc",
        "Connection",
        "Content-Id",
        "Content-Language",
        "Content-Length",
        "Content-Transfer-Encoding",
        "Content-Type",
        "Cookie",
        "Date",
        "Dkim-Signature",
        "Etag",
        "Expires",
        "From",
        "Host",
        "If-Modified-Since",
        "If-None-Match",
        "In-Reply-To",
        "Last-Modified",
        "Location",
        "Message-Id",
        "Mime-Version",
        "Pragma",
        "Received",
        "Return-Path",
        "Server",
        "Set-Cookie",
        "Subject",
        "To",
        // 自有安排
        // "User-Agent",
        // "X-Forwarded-For",
        "Via",
        "X-Imforwards",
        "X-Powered-By",
    ].map(i => {
        return {
            kind: languages.CompletionItemKind.Snippet,
            label: i,
            insertText: i + ": ${1}",
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Common HTTP Header"
        } as languages.CompletionItem
    }),
];

export const getHTTPHeaderSuggestions= (position: monaco.Position) => {
   return httpHeaderSuggestions.map(
       i => {
              return {
                ...i,
                range: new monaco.Range(position.lineNumber, position.column-1, position.lineNumber, position.column-1),
              } as languages.CompletionItem
       }
   )
}

export const fuzzHTTPMonacoSpec= "http";


export const getWordAtPositionWithSep = (model: monaco.editor.ITextModel, position: monaco.Position, sep:string='.'): editor.IWordAtPosition => {
    let iWord = model.getWordAtPosition(position);
    if (iWord === null) {
        iWord = { word: "", startColumn: position.column, endColumn: position.column };
    }
    let word = iWord.word;
    let lastChar = getLastString(model, iWord, position, sep.length)

    if (lastChar === sep) {
        iWord = { word: sep + word, startColumn: iWord.startColumn - sep.length, endColumn: iWord.endColumn };
    }
    return iWord;
}

const getLastString = (model: monaco.editor.ITextModel,iWord: editor.IWordAtPosition, position: monaco.Position , len :number): string => {
    return model.getValueInRange({
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: iWord.startColumn - len,
        endColumn: iWord.startColumn,
    });
}

const getNextString = (model: monaco.editor.ITextModel,iWord: editor.IWordAtPosition, position: monaco.Position , len :number): string => {
    return model.getValueInRange({
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: iWord.startColumn + iWord.word.length,
        endColumn: iWord.startColumn + iWord.word.length + len,
    });
}

export const newFuzztagCompletionHandlerProvider = (model: editor.ITextModel,position: Position, context: languages.CompletionContext, token: CancellationToken): Promise<{ incomplete: boolean, suggestions: languages.CompletionItem[] }> => {
    return new Promise(async (resolve, reject) => {
        if (position === undefined) {
            resolve({ incomplete: false, suggestions: httpHeaderSuggestions });
            return
        }
        const { column, lineNumber } = position;
        if (column === undefined || lineNumber === undefined) {
            resolve({ incomplete: false, suggestions: httpHeaderSuggestions });
            return
        }

        let parenthesesWord = ""
        let iWord = getWordAtPositionWithSep(model, position, "(")
        if (iWord.word.includes("(")){
            parenthesesWord = iWord.word
        }
        iWord = getWordAtPositionWithSep(model, new monaco.Position(position.lineNumber, iWord.startColumn - parenthesesWord.length), "{{");
        if (!iWord.word.includes("{{")) {
            resolve({ incomplete: false, suggestions: getHTTPHeaderSuggestions(position)});
            return
        }

        let rangeFix = 2
        if (parenthesesWord.length > 0){
            rangeFix = iWord.word.length + 1
        }
        iWord = { word: iWord.word + parenthesesWord, startColumn: iWord.startColumn, endColumn: iWord.endColumn + parenthesesWord.length };
        await ipcRenderer.invoke("FuzzTagSuggestion", {
            InspectType: "completion",
            HotPatchCode: getModelContext(model,"hotPatchCode"),
            FuzztagCode: iWord.word,
        } as FuzzTagSuggestionRequest).then((r: YaklangLanguageSuggestionResponse) => {
            if (r.SuggestionMessage.length > 0) {
                let range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: iWord.startColumn + rangeFix , // fix range , trim {{
                    endColumn: iWord.endColumn ,
                }

                let suggestions = r.SuggestionMessage.map(i => {
                    return {
                        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        insertText: i.InsertText,
                        kind: getCompletionItemKindByName(i.Kind),
                        label: i.Label,
                        detail: i.DefinitionVerbose,
                        documentation: { value: i.Description, isTrusted: true },
                        range: range,
                        sortText: getSortTextByKindAndLabel(i.Kind, i.Label),
                    } as languages.CompletionItem
                })

                resolve({
                    incomplete: false,
                    suggestions: suggestions,
                });
            }
            resolve({ incomplete: false, suggestions: [] });
        })
    })
}

// https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-custom-languages
monaco.languages.register({ id: fuzzHTTPMonacoSpec })
// Register a completion item provider for the new language
monaco.languages.registerCompletionItemProvider(fuzzHTTPMonacoSpec, {
    triggerCharacters: ["{"],
    // @ts-ignore
    provideCompletionItems: (model, position, context, token) => {
        return new Promise(async (resolve, reject) => {
            await newFuzztagCompletionHandlerProvider(model, position, context, token as any).then((data) => {
                resolve({
                    suggestions: data.suggestions,
                    incomplete: data.incomplete,
                })
            })
        })
    }
} as any);


monaco.languages.setMonarchTokensProvider(fuzzHTTPMonacoSpec, {
    brackets: [],
    defaultToken: "",
    ignoreCase: true,
    includeLF: true,
    start: "",
    tokenPostfix: "",
    unicode: false,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    tokenizer: {
        root: [
            // HTTP请求方法
            // 基础 Fuzz 标签解析
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/(GET|POST|OPTIONS|DELETE|PUT)/g, "http.method"],
            [/\s/, "delimiter", "@http_path"],
            // [/(html|div|src|\<\/?title\>|<alert>)/i, "keyword"],
            // [/(\<script\>|<alert>|<prompt>|<svg )/i, "keyword"],
            // [/(secret)|(access)|(password)|(verify)|(login)/i, "bold-keyword"],
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
        http_path: [
            [/\s/, "delimiter", "@http_protocol"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            ["/(((http)|(https):)?\/\/[^\s]+?)/", "http.url"],
            [/#/, "http.anchor", "@http_anchor"],
            // [/\/[^\s^?^\/]+/, "http.path"],
            [/\?/, "http.query", "@query"],
        ],
        http_anchor: [
            [/\s/, "delimiter", "@http_protocol"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/./, "http.anchor"],
        ],
        http_protocol: [
            [/\n/, "delimiter", "@http_header"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/HTTP\/[0-9.]+/, "http.protocol"],
        ],
        http_header: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/^\n$/, 'body.delimiter', '@body'],
            [/(Cookie)(:)/g, ["http.header.danger", { token: "delimiter", next: "@http_cookie" }]],
            [/(Content-Type)(:)/g, ["http.header.danger", { token: "delimiter", next: "@content_type" }]],
            [/(Content-Length|Host|Origin|Referer)(:)/g, ["http.header.danger", { token: "delimiter", next: "@http_header_value" }]],
            [/(Authorization|X-Forward|Real|User-Agent|Protection|CSP)(:)/g, ["http.header.danger", { token: "delimiter", next: "@http_header_value" }]],
            [/Sec/, "http.header.warning", "@sec_http_header"],
            [/:/, "delimiter", "@http_header_value"],
            [/\S/, "http.header.info"],
        ],
        sec_http_header: [
            [/\n/, 'body.delimiter', '@pop'],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/:/, "delimiter", "@http_header_value"],
            [/\S/, "http.header.warning"],
        ],
        content_type: [
            [/\s+$/, "delimiter", "@pop"],
            [/\s+/, "delimiter"],
            [/^\n$/, 'body.delimiter', '@pop'],
            [/multipart\/form-data[^\n]*/, "http.header.mime.form"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/application\/xml/, "http.header.mime.xml"],
            [/application\/json/, "http.header.mime.json"],
            [/application\/x-www-form-urlencoded/, "http.header.mime.urlencoded"],
            [/\S/, "http.header.mime.default"],
        ],
        query: [
            [/\s/, "delimiter", "@http_protocol"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/#/, "http.anchor", "@http_anchor"],
            [/[^=&?\[\]\s]/, "http.query.params", "@http_query_params"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        http_query_params: [
            [/\s/, { token: "delimiter", next: "@pop", goBack: 1 }],
            [/#/, "http.anchor", "@http_anchor"],
            [/&/, 'delimiter', "@pop"],
            [/(\[)(\w+)(\])/, ["http.query.index", "http.query.index.values", "http.query.index"]],
            [/\=/, "http.query.equal", "http_query_params_values"],
            [/./, "http.query.params"],
        ],
        http_query_params_values: [
            [/\s/, { token: "delimiter", next: "@pop", goBack: 1 }],
            [/#/, "http.anchor", "@http_anchor"],
            [/&/, { token: 'delimiter', next: "@pop", goBack: 1 }],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/[^=&?\s]/, "http.query.values"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        http_cookie: [
            [/\n/, "delimiter", "@pop"],
            [/\s/, "delimiter"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/[^=;\s]+/, "http.query.params", "@http_cookie_params"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        http_cookie_params: [
            [/\n/, { token: "delimiter", next: "@pop", goBack: 1 }],
            [/[\s|;]/, "delimiter", "@pop"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/\=/, "http.query.equal"],
            [/[^=;?\s]/, "http.query.values"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        http_header_value: [
            [/\n/,  { token: "delimiter", next: "@pop", goBack: 1 }],
            [/\s/, "delimiter"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
        ],
        string_double: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/[^\\"]/, "json.key"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, "json.key", "@pop"],
        ],
        string_double_value: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/[^\\"]/, "json.value"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, "json.value", "@pop"],
        ],
        body: [
            [/(\{)("|\d|\n)/, ["json.start", {token:"json.key", next: "@body_json", goBack: 1}]],
            // [/(\d+)(:)/, [{ token: "number", next: "@body_json" }, "delimiter"]],
            // [/(\d+\.\d*)(:)/, [{ token: "number", next: "@body_json" }, "delimiter"]],
            // [/"/, 'string', '@string_double'],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/-{2,}.*/, "body.boundary", "@body_form"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
            [/./, "http.query.params", "@http_query_params"],
        ],
        body_json: [
            ["\}", { token: "json.end", next: "@pop" }],
            [/(\{)("|\d|\n)/, ["json.start.value", {token:"json.key", next: "@body_json", goBack: 1}]],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/(:\s*)/, { token: "delimiter", next: "@body_json_value"}],
            [/(\d+\.\d*)/, "json.key"],
            [/(\d+)/, "json.key"],
            [/"/, 'json.key', '@string_double'],
            [/true|false|null/, "json.key"]
        ],
        body_json_value: [
            ["\}|\,", { token: "json.end.value", next: "@pop", goBack: 1 }],
            [/(\{)("|\d|\n)/, ["json.start.value", {token:"json.key", next: "@body_json", goBack: 1,}]],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/(\d+\.\d*)/, "json.value"],
            [/(\d+)/, "json.value"],
            [/"/, 'json.value', '@string_double_value'],
            [/\[/, "json.array.start", "@body_json_array_value"],
            [/true|false|null/, "json.value"],
        ],
        body_json_array_value: [
            [/\]/, "json.array.end", "@pop"],
            [/(\{)("|\d|\n)/, ["json.start.value", {token:"json.key", next: "@body_json", goBack: 1}]],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/(\d+\.\d*)/, "json.value"],
            [/(\d+)/, "json.value"],
            [/"/, 'json.value', '@string_double_value'],
        ],
        body_form: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/^\n$/, "body.delimiter", "@body_data"],
            [/([^:]*?)(:)/g, ["http.header.info", { token: "delimiter", next: "@http_header_value" }]],
        ],
        body_data: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/(-{2,}[a-zA-z0-9]+--)/, [{ token: "body.boundary.end", next: "@end" }]],
            [/(-{2,}[a-zA-z0-9]+)/, [{ token: "body.boundary", next: "@pop" }]],
        ],
        end: [],
    }
})



monaco.languages.registerHoverProvider(fuzzHTTPMonacoSpec, {
    provideHover: function (model: monaco.editor.ITextModel, position: monaco.Position, cancellationToken: monaco.CancellationToken): languages.ProviderResult<languages.Hover> {
        return new Promise(async (resolve, reject) => {
            let secondWord:IWordAtPosition|null = null
            let firstWord = model.getWordAtPosition(position);
            if (firstWord === null) {
                firstWord = { word: "", startColumn: position.column, endColumn: position.column };
            }

            if(getLastString(model, firstWord, position, 1) === ":"){
                secondWord = firstWord
                firstWord = model.getWordAtPosition({
                    lineNumber: position.lineNumber,
                    column: firstWord.startColumn - 1,
                });
                if (firstWord === null) {
                    firstWord = { word: "", startColumn: position.column, endColumn: position.column };
                }
            }else if (getNextString(model, firstWord, position, 1) === ":"){
                secondWord = model.getWordAtPosition({
                    lineNumber: position.lineNumber,
                    column: firstWord.endColumn + 1,
                });
            }
            if(getLastString(model, firstWord, position, 2) !== "{{"){
                resolve(null);
                return
            }

            let rangeCode = firstWord.word
            if (secondWord !== null) {
                rangeCode = firstWord.word + ":" +secondWord.word
            }

            let desc = "";
            await ipcRenderer.invoke("FuzzTagSuggestion", {
                InspectType: "hover",
                FuzztagCode: rangeCode,
            } as FuzzTagSuggestionRequest).then((r: YaklangLanguageSuggestionResponse) => {
                if (r.SuggestionMessage.length > 0) {
                    r.SuggestionMessage.forEach(v => {
                        desc += v.Label ?? "" + "\n";
                    })
                    resolve({
                        range: new monaco.Range(position.lineNumber, firstWord!.startColumn, position.lineNumber, firstWord!.endColumn),
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