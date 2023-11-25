import {monaco} from "react-monaco-editor";
import {languages} from "monaco-editor";

export const isRegisteredLanguage = (languageId: string) => {
    return monaco.languages.getLanguages().some((language) => language.id === languageId);
}

monaco.languages.register({id: "zoomeye"})
monaco.languages.registerCompletionItemProvider('zoomeye', {
    // @ts-ignore
    provideCompletionItems: (model, position) => {
        let suggestions = [
            {
                kind: languages.CompletionItemKind.Snippet,
                label: "device:",
                insertText: 'device:"${1:router}"',
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: 'after:"2020-01-01"',
                insertText: 'after:"${1:2020-01-01}"',
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: 'country:"USA"',
                insertText: 'country:"${1:USA}"',
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: 'city:"chengdu"',
                insertText: 'city:"${1:chengdu}"',
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: 'ssl:"google"',
                insertText: 'ssl:"${1:google}"',
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: 'ip:"8.8.8.8"',
                insertText: 'ip:"${1}"',
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: 'port:"80"',
                insertText: 'ip:"${1:80}"',
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: 'site:"baidu.com"',
                insertText: 'site:"${1:baidu.com}"',
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: 'org:"Apple Inc."',
                insertText: 'org:"${1:Apple Inc.}"',
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: 'app:"cisco"',
                insertText: 'app:"${1:cisco}"',
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            } as languages.CompletionItem,
        ];
        return {suggestions: suggestions,};
    }
} as any);

monaco.languages.register({id: "shodan"});
monaco.languages.registerCompletionItemProvider('shodan', {
    // @ts-ignore
    provideCompletionItems: (model, position) => {
        let suggestions = [
            {
                label: "net:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'net:"${1:192.168.0.0/24}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "port:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'port:"${1:22}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "hostname:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'hostname:"${1:example.com}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "os:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'os:"${1:windows}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "city:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'city:"${1:New York}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "country:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'country:"${1:US}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "org:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'org:"${1:Google}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "before:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'before:"${1:1 January 2020}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "after:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'after:"${1:1 January 2020}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "product:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'product:"${1:Apache}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
        ];
        return {suggestions: suggestions};
    }
});

monaco.languages.register({id: "fofa"});
monaco.languages.registerCompletionItemProvider('fofa', {
    // @ts-ignore
    provideCompletionItems: (model, position) => {
        let suggestions = [
            {
                label: "ip:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'ip="${1:1.1.1.1}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "domain:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'domain="${1:example.com}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "port:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'port="${1:80}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "title:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'title="${1:Home Page}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "body:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'body="${1:Welcome to our website}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "header:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'header="${1:Server: Apache}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "cert:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'cert="${1:example.com}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "protocol:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'protocol="${1:https}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "server:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'server="${1:Apache}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
            {
                label: "app:",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'app="${1:Apache}"',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            },
        ];
        return {suggestions: suggestions};
    }
});