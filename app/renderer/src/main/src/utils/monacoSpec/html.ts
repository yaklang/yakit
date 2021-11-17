import {monaco} from "react-monaco-editor";

export const Html = {
    defaultToken: '',
    tokenPostfix: '.html',
    ignoreCase: true,

    // The main tokenizer for our languages
    tokenizer: {
        root: [
            [/((application)|(text)|(\*)|(\w+))\/[\w*+.]+/g, "http.header.mime"],
            [/((Content-Length)|(Host)|(Set-Cookie)|(Server)|(Content-Type)|(Origin)|(Referer)): /g, "http.header.danger"],

            [/<!DOCTYPE/, 'metatag', '@doctype'],
            [/<!--/, 'comment', '@comment'],
            [/(<)((?:[\w\-]+:)?[\w\-]+)(\s*)(\/>)/, ['delimiter', 'tag', '', 'delimiter']],
            [/(<)(script)/, ['delimiter', {token: 'tag', next: '@script'}]],
            [/(<)(style)/, ['delimiter', {token: 'tag', next: '@style'}]],
            [/(<)((?:[\w\-]+:)?[\w\-]+)/, ['delimiter', {token: 'tag', next: '@otherTag'}]],
            [/(<\/)((?:[\w\-]+:)?[\w\-]+)/, ['delimiter', {token: 'tag', next: '@otherTag'}]],
            [/</, 'delimiter'],
            [/[^<]+/], // text

            // http
            [/(GET|POST|OPTIONS|DELETE|PUT)/g, "http.method"],
            // http path
            ["/(((http)|(https):)?\/\/[^\s]+)/", "http.url"],
            [/\/[^\s^?^\/]+/, "http.path"],
            [/[*]\/[*]/g, "http.header.mime"],
            [/([A-Za-z][A-Za-z0-9\-]*?):\s*([^\r^\n]+)\n/g, "keyword"],
            [/(html|div|src|\<\/?title\>|<alert>)/i, "keyword"],
            [/(\<script\>|<alert>|<prompt>|<svg )/i, "keyword"],
            [/^\s+\=[^\s]+/i, "keyword"],
        ],

        doctype: [
            [/[^>]+/, 'metatag.content'],
            [/>/, 'metatag', '@pop'],
        ],

        comment: [
            [/-->/, 'comment', '@pop'],
            [/[^-]+/, 'comment.content'],
            [/./, 'comment.content']
        ],

        otherTag: [
            [/\/?>/, 'delimiter', '@pop'],
            [/"([^"]*)"/, 'attribute.value'],
            [/'([^']*)'/, 'attribute.value'],
            [/[\w\-]+/, 'attribute.name'],
            [/=/, 'delimiter'],
            [/[ \t\r\n]+/], // whitespace
        ],

        // -- BEGIN <script> tags handling

        // After <script
        script: [
            [/type/, 'attribute.name', '@scriptAfterType'],
            [/"([^"]*)"/, 'attribute.value'],
            [/'([^']*)'/, 'attribute.value'],
            [/[\w\-]+/, 'attribute.name'],
            [/=/, 'delimiter'],
            [/>/, {token: 'delimiter', next: '@scriptEmbedded', nextEmbedded: 'text/javascript'}],
            [/[ \t\r\n]+/], // whitespace
            [/(<\/)(script\s*)(>)/, ['delimiter', 'tag', {token: 'delimiter', next: '@pop'}]]
        ],

        // After <script ... type
        scriptAfterType: [
            [/=/, 'delimiter', '@scriptAfterTypeEquals'],
            [/>/, {token: 'delimiter', next: '@scriptEmbedded', nextEmbedded: 'text/javascript'}], // cover invalid e.g. <script type>
            [/[ \t\r\n]+/], // whitespace
            [/<\/script\s*>/, {token: '@rematch', next: '@pop'}]
        ],

        // After <script ... type =
        scriptAfterTypeEquals: [
            [/"([^"]*)"/, {token: 'attribute.value', switchTo: '@scriptWithCustomType.$1'}],
            [/'([^']*)'/, {token: 'attribute.value', switchTo: '@scriptWithCustomType.$1'}],
            [/>/, {token: 'delimiter', next: '@scriptEmbedded', nextEmbedded: 'text/javascript'}], // cover invalid e.g. <script type=>
            [/[ \t\r\n]+/], // whitespace
            [/<\/script\s*>/, {token: '@rematch', next: '@pop'}]
        ],

        // After <script ... type = $S2
        scriptWithCustomType: [
            [/>/, {token: 'delimiter', next: '@scriptEmbedded.$S2', nextEmbedded: '$S2'}],
            [/"([^"]*)"/, 'attribute.value'],
            [/'([^']*)'/, 'attribute.value'],
            [/[\w\-]+/, 'attribute.name'],
            [/=/, 'delimiter'],
            [/[ \t\r\n]+/], // whitespace
            [/<\/script\s*>/, {token: '@rematch', next: '@pop'}]
        ],

        scriptEmbedded: [
            [/<\/script/, {token: '@rematch', next: '@pop', nextEmbedded: '@pop'}],
            [/[^<]+/, '']
        ],

        // -- END <script> tags handling


        // -- BEGIN <style> tags handling

        // After <style
        style: [
            [/type/, 'attribute.name', '@styleAfterType'],
            [/"([^"]*)"/, 'attribute.value'],
            [/'([^']*)'/, 'attribute.value'],
            [/[\w\-]+/, 'attribute.name'],
            [/=/, 'delimiter'],
            [/>/, {token: 'delimiter', next: '@styleEmbedded', nextEmbedded: 'text/css'}],
            [/[ \t\r\n]+/], // whitespace
            [/(<\/)(style\s*)(>)/, ['delimiter', 'tag', {token: 'delimiter', next: '@pop'}]]
        ],

        // After <style ... type
        styleAfterType: [
            [/=/, 'delimiter', '@styleAfterTypeEquals'],
            [/>/, {token: 'delimiter', next: '@styleEmbedded', nextEmbedded: 'text/css'}], // cover invalid e.g. <style type>
            [/[ \t\r\n]+/], // whitespace
            [/<\/style\s*>/, {token: '@rematch', next: '@pop'}]
        ],

        // After <style ... type =
        styleAfterTypeEquals: [
            [/"([^"]*)"/, {token: 'attribute.value', switchTo: '@styleWithCustomType.$1'}],
            [/'([^']*)'/, {token: 'attribute.value', switchTo: '@styleWithCustomType.$1'}],
            [/>/, {token: 'delimiter', next: '@styleEmbedded', nextEmbedded: 'text/css'}], // cover invalid e.g. <style type=>
            [/[ \t\r\n]+/], // whitespace
            [/<\/style\s*>/, {token: '@rematch', next: '@pop'}]
        ],

        // After <style ... type = $S2
        styleWithCustomType: [
            [/>/, {token: 'delimiter', next: '@styleEmbedded.$S2', nextEmbedded: '$S2'}],
            [/"([^"]*)"/, 'attribute.value'],
            [/'([^']*)'/, 'attribute.value'],
            [/[\w\-]+/, 'attribute.name'],
            [/=/, 'delimiter'],
            [/[ \t\r\n]+/], // whitespace
            [/<\/style\s*>/, {token: '@rematch', next: '@pop'}]
        ],

        styleEmbedded: [
            [/<\/style/, {token: '@rematch', next: '@pop', nextEmbedded: '@pop'}],
            [/[^<]+/, '']
        ],

        // -- END <style> tags handling
    },
};

monaco.languages.register({id: "html"})
// monaco.languages.setMonarchTokensProvider("http-packet", Html as any)
monaco.languages.setMonarchTokensProvider("html", Html as any)
