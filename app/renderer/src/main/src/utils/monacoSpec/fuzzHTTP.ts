import {monaco} from "react-monaco-editor";
import {editor, languages, Position} from "monaco-editor";
import {CancellationToken} from "typescript";

// https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-custom-languages
monaco.languages.register({id: "http"})
// Register a completion item provider for the new language
monaco.languages.registerCompletionItemProvider('http', {
    triggerCharacters: ["{"],
    // @ts-ignore
    provideCompletionItems: (model, position) => {
        var suggestions = [
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
        const line = model.getLineContent(position.lineNumber);
        if (position.column > 2) {
            const lastTwo = line.charAt(position.column - 3) + line.charAt(position.column - 2)
            if (lastTwo === "{{") {
                return {
                    suggestions: [
                        {
                            label: "int(整数范围)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'int(${1:0}${2:,100})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "int(整数范围-0补位)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'int(${1:0}${2:-100}${3:|3})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "network(拆分网络目标段)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'network(${1:192.168.1.1/24,example.com})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "array(使用‘|’分割数组元素渲染)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'array(${1:abc|def|123})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "x(使用 payload 管理中的数据)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'array(${1:abc|def|123})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "randint(随机生成整数)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'randint(${1:1}${2:,10}${3:10})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "randstr(随机生成字符串)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'randstr(${1:1}${2:,10}${3:10})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "file:line(按行读取文件内容)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'file:line(${1:/tmp/test.txt})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "file(直接插入文件内容)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'file(${1:/tmp/test.txt})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "file:dir(插入文件目录下所有文件-模糊上传)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'file:dir(${1:/tmp/test.txt})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "base64(使用内容 base64 编码)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'base64(${1:testname})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "url(使用 URL 编码)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'url(${1:testname})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "doubleurl(使用双重 URL 编码)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'url(${1:testname})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "hexdec(使用十六进制解码)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'hexdec(${1:testname})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                    ]
                }
            }
        }
        return {suggestions: suggestions,};
    }
} as any);

monaco.languages.setMonarchTokensProvider("http", {
    brackets: [],
    defaultToken: "",
    ignoreCase: true,
    includeLF: false,
    start: "",
    tokenPostfix: "",
    unicode: false,

    tokenizer: {
        root: [
            // 基础 Fuzz 标签解析
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/{{(?!{)(([^{}])|([^{]{)|(}[^}]))+?(?<!})}}/g, "fuzz.tag.inner"],
            [/{{(([^{}])|([^{]{)|(}[^}]))+?{{(?!{)(([^{}])|([^{]{)|(}[^}]))+?(?<!})}}(([^{}])|([^{]{)|(}[^}]))+?}}/g, 'fuzz.tag.outter'],

            // http method
            [/(GET|POST|OPTIONS|DELETE|PUT)/g, "http.method"],

            // http path
            // [/((application)|(text)|(\*)|(\w+?))\/[\w*+.]+?/g, "http.header.mime"],
            ["/(((http)|(https):)?\/\/[^\s]+?)/", "http.url"],
            // [/\/[^\s^?^\/]+/, "http.path"],
            [/\?/, "http.get.query", "@get_query"],

            [/((Content-Length)|(Host)|(Content-Type)|(Origin)|(Referer)): /g, "http.header.danger"],
            [/(Cookie|Authorization|X-Forward|Real|User-Agent|Protection|CSP):/g, "http.header.danger"],
            [/(Sec-[^:]+?):/g, "http.header.warning"],
            [/(Accept[^:]*?):/g, "http.header.info"],
            // [/[*]\/[*]/g, "http.header.mime"],
            // [/([A-Za-z][A-Za-z0-9\-]*?):\s*([^\r^\n]+)\n/g, "keyword"],
            [/"/, "string", "@string_double"],
            [/'/, "string", "@string_single"],
            [/(html|div|src|\<\/?title\>|<alert>)/i, "keyword"],
            [/(\<script\>|<alert>|<prompt>|<svg )/i, "keyword"],
            // [/[^\s]+?\=[^\s]+?/i, "keyword"],
            // [/`/, "string", "@string_backtick"]
        ],
        fuzz_tag: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/(?<!})}}/, "fuzz.tag.inner", "@pop"],
            [/(([^{}])|([^{]{)|(}[^}]))+?/, "fuzz.tag.inner"]
        ],
        get_query: [
            [/\s/, "delimiter", "@pop"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/&/g, 'delimiter'],
            // [/([^=^&^?^\s]+)=([^=^&^?^\s]+)?/g, 'http.get.query.params'],
            [/([^=^&^?^\s]+)=/g, 'http.get.query.params'],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        // cookie: [
        //     [/\n/, "delimiter", "@pop"],
        //     [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
        //     [/[;=]/, 'delimiter'],
        //     [/[^\s^=^;]+?=/, "http.cookie.name"],
        //     // [/=[^\s^=^;]+/, "http.cookie.value"],
        // ],
        string_double: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/[^\\"]+/, "string.value"],
            // [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, "string", "@pop"]
        ],
        string_single: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/[^\\']+/, "string.value"],
            // [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/'/, "string", "@pop"]
        ],
    }
})

