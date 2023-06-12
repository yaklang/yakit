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
        const line = model.getLineContent(position.lineNumber);
        if (position.column > 2) {
            const lastTwo = line.charAt(position.column - 3) + line.charAt(position.column - 2)
            if (lastTwo === "{{") {
                return {
                    suggestions: [
                        {
                            label: "date() 生成一个日期",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'date(YYYY-MM-dd)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "datetime() 生成一个日期(带时间)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'datetime(YYYY-MM-dd HH:mm:ss)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "timestamp(s/ms/ns) 生成一个时间戳（秒/毫秒/纳秒）",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'timestamp(seconds)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "uuid(n) 生成 n 个 UUID",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'uuid(3)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
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
                            label: "array(使用'|'分割数组元素渲染)",
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
                        {
                            label: "repeat(重复一定次数发包)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'repeat(${1:10})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "repeat:str(data|n) 重复 data n 次，a|3 为 aaa",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'repeat:str(${1:abc}|10)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "repeat:range(data|n) a|3 为 ['' a aa aaa] 多次重复",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'repeat:range(${1:abc}|10)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        // yso 生成提示
                        {
                            label: "yso:urldns(domain)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:urldns(domain)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "yso:dnslog(domain|随机标识) // 第二个参数可不填",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:dnslog(domain|flag)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "yso:find_gadget_by_dns(domain) // 通过 dnslog 探测 gadget ",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:find_gadget_by_dns(domain)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "yso:find_gadget_by_bomb(all) // all 为内置,也可以自己指定class类 ",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:find_gadget_by_bomb(all)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "yso:headerecho(key|value) // 指定回显成功的返回头 key:value",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:headerecho(testecho|echo_flag)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "yso:bodyexec(whoami) // 执行命令",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:bodyexec(whoami)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "headerauth // 回显链中需要添加此header头",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'headerauth}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "trim(...) 移除前后空格",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'trim(${1})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "nullbyte(n) 生成长度为N的nullbyte，默认为1",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'nullbyte(${1})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: `padding:zero(data|n) 为 data 长度不足的部分用 0 填充`,
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'padding:zero(${1}|${2:6})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: `padding:null(data|n) 为 data 长度不足的部分用 null(ascii 0x00) 填充`,
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'padding:null(${1}|${2:6})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: `fuzz:pass(...|levelN) 根据材料生成密码（levelN 表示生成密码详细数量0-3级）`,
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'fuzz:pass(${1:root,admin}|${2:0})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: `fuzz:user(...|levelN) 根据材料生成用户名（levelN 表示生成数量，0-3级）`,
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'fuzz:pass(${1:root,admin}|${2:0})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: `gzip:encode(...) gzip 编码`,
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'gzip(${1})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: `gzip:decode(...) gzip 解码`,
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'gzip:decode(${1})}}',
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
            // [/"/, "string", "@string_double"],
            // [/'/, "string", "@string_single"],
            [/(html|div|src|\<\/?title\>|<alert>)/i, "keyword"],
            [/(\<script\>|<alert>|<prompt>|<svg )/i, "keyword"],

            [/[^\s; &=]+=[^\s; &=]+/, "bold-keyword"],

            [/(secret)|(access)|(password)|(verify)|(login)/i, "bold-keyword"]

            // [/[^\s]+?\=[^\s]+?/i, "keyword"],
            // [/`/, "string", "@string_backtick"]
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
        "fuzz_tag_param": [
            [/\\\)/, "bold-keyword"],
            [/\)/, "fuzz.tag.inner", "@pop"],
            [/{{/, "fuzz.tag.second", "@fuzz_tag_second"],
            [/./, "bold-keyword"]
        ],
        "fuzz_tag_param_second": [
            [/\\\)/, "bold-keyword"],
            [/\)/, "fuzz.tag.second", "@pop"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/./, "bold-keyword"]
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

