import {monaco} from "react-monaco-editor";

export const YakMonacoFuzzHTTPSpec = "fuzz-http";
export const YakMonacoFuzzHTTPTheme = "fuzz-http-theme";

// https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-custom-languages
monaco.languages.register({id: YakMonacoFuzzHTTPSpec})
monaco.languages.setMonarchTokensProvider(YakMonacoFuzzHTTPSpec, {
    tokenizer: {
        root: [
            [/{{.*?\}\}/g, "fuzzTemplate"],
            [/(GET|POST|OPTIONS|DELETE|PUT)/g, "httpMethod"],
            [/([A-Za-z][A-Za-z0-9\-]*?): ([^\n]+)/g, "header"],
            [/(html|div|src|\<\/?title\>|<alert>)/i, "keywords"],
            [/(\<script\>|<alert>|<prompt>|<svg )/i, "high-risk"],
        ],
    }
})

// @ts-ignore
monaco.editor.defineTheme(YakMonacoFuzzHTTPTheme, {
    base: "vs-dark", inherit: true,
    rules: [
        {token: "header", foreground: "#38ecf1"},
        {token: "fuzzTemplate", background: "#24c15e", foreground: "#cd8d3c", fontStyle: "bold"},
        {token: "httpMethod", foreground: "#95cd3c", fontStyle: "bold"},
        {token: "keywords", foreground: "#fcb312"},
        {token: "high-risk", foreground: "#ff1212"},
    ],
})