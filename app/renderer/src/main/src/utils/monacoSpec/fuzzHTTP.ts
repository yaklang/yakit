import {monaco} from "react-monaco-editor";

export const YakMonacoFuzzHTTPSpec = "fuzz-http";
export const YakMonacoFuzzHTTPTheme = "fuzz-http-theme";

// https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-custom-languages
monaco.languages.register({id: YakMonacoFuzzHTTPSpec})
monaco.languages.setMonarchTokensProvider(YakMonacoFuzzHTTPSpec, {
    tokenizer: {
        root: [
            [/{{.*?\}\}/g, "markup.error"],
            [/(GET|POST|OPTIONS|DELETE|PUT)/g, "keyword"],
            [/([A-Za-z][A-Za-z0-9\-]*?):\s*([^\r^\n]+)\n/g, "keyword"],
            [/(html|div|src|\<\/?title\>|<alert>)/i, "markup.output"],
            [/(\<script\>|<alert>|<prompt>|<svg )/i, "markup.bold"],
            [/^\s+\=[^\s]+/i, "markup.bold"],
        ],
    }
})

