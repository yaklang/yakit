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
            // http method
            [/(GET|POST|OPTIONS|DELETE|PUT)/g, "http.method"],

            // http path
            [/((application)|(text)|(\*)|(\w+))\/[\w*+.]+/g, "http.header.mime"],
            ["/(((http)|(https):)?\/\/[^\s]+)/", "http.url"],
            [/\/[^\s^?^\/]+/, "http.path"],
            [/\?/, "http.get.query", "@get_query"],

            [/((Content-Length)|(Host)|(Content-Type)|(Origin)|(Referer)): /g, "http.header.danger"],
            [/Cookie: /g, "http.header.danger"],
            [/[*]\/[*]/g, "http.header.mime"],
            [/{{.*?\}\}/g, "markup.error"],
            [/([A-Za-z][A-Za-z0-9\-]*?):\s*([^\r^\n]+)\n/g, "keyword"],
            [/"/, "string", "@string_double"],
            [/'/, "string", "@string_single"],
            [/(html|div|src|\<\/?title\>|<alert>)/i, "keyword"],
            [/(\<script\>|<alert>|<prompt>|<svg )/i, "keyword"],
            [/^\s+\=[^\s]+/i, "keyword"],
            // [/`/, "string", "@string_backtick"]
        ],
        get_query: [
            [/\s/, "delimiter", "@pop"],
            [/&/g, 'delimiter'],
            // [/([^=^&^?^\s]+)=([^=^&^?^\s]+)?/g, 'http.get.query.params'],
            [/([^=^&^?^\s]+)=/g, 'http.get.query.params'],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        cookie: [
            [/\n/, "delimiter", "@pop"],
            [/[;=]/, 'delimiter'],
            [/[^\s^=^;]+?=/, "http.cookie.name"],
            // [/=[^\s^=^;]+/, "http.cookie.value"],
        ],
        string_double: [
            [/[^\\"]+/, "string.value"],
            // [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, "string", "@pop"]
        ],
        string_single: [
            [/[^\\']+/, "string.value"],
            // [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/'/, "string", "@pop"]
        ],
    }
})

