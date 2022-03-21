import {monaco} from "react-monaco-editor";

// https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-custom-languages
monaco.languages.register({id: "http"})
monaco.languages.setMonarchTokensProvider("http", {
    brackets: [],
    defaultToken: "",
    ignoreCase: false,
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
            [/((application)|(text)|(\*)|(\w+))\/[\w*+.]+/g, "http.header.mime"],
            ["/(((http)|(https):)?\/\/[^\s]+)/", "http.url"],
            // [/\/[^\s^?^\/]+/, "http.path"],
            // [/\?/, "http.get.query", "@get_query"],

            [/((Content-Length)|(Host)|(Content-Type)|(Origin)|(Referer)): /g, "http.header.danger"],
            [/(Cookie|Authorization|X-Forward|Real|User-Agent|Protection|CSP):/g, "http.header.danger"],
            [/(Sec-[^:]+):/g, "http.header.warning"],
            [/(Accept[^:]*):/g, "http.header.info"],
            [/[*]\/[*]/g, "http.header.mime"],
            [/([A-Za-z][A-Za-z0-9\-]*?):\s*([^\r^\n]+)\n/g, "keyword"],
            // [/"/, "string", "@string_double"],
            // [/'/, "string", "@string_single"],
            [/(html|div|src|\<\/?title\>|<alert>)/i, "keyword"],
            [/(\<script\>|<alert>|<prompt>|<svg )/i, "keyword"],
            [/^\s+\=[^\s]+/i, "keyword"],
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
        // string_double: [
        //     [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
        //     [/[^\\"]+/, "string.value"],
        //     // [/@escapes/, "string.escape"],
        //     [/\\./, "string.escape.invalid"],
        //     [/"/, "string", "@pop"]
        // ],
        // string_single: [
        //     [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
        //     [/[^\\']+/, "string.value"],
        //     // [/@escapes/, "string.escape"],
        //     [/\\./, "string.escape.invalid"],
        //     [/'/, "string", "@pop"]
        // ],
    }
})

