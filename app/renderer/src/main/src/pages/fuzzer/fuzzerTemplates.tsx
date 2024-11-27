import {IMonacoCodeEditor, IMonacoEditor} from "../../utils/editors"
import {EncodeTag} from "./templates/SingleTag"
import {IRange} from "monaco-editor"
import "./style.css"

export interface FuzzOperatorItem {
    name: string
    tag?: string
    callback?: (editor: IMonacoEditor) => any
    params?: []
    optionsRender: (s: string, callback: (s: string) => any) => any
}

export interface FuzzOperatorParam {
    key: string
    defaultValue?: string
    optional?: string
}

export const monacoEditorWrite = (editor: IMonacoEditor | IMonacoCodeEditor, text: string, range?: IRange | null) => {
    if (editor) {
        if (range) {
            editor.executeEdits(editor.getValue(), [{range: range, text: text}])
            return
        }

        const selection = editor.getSelection()
        if (selection) {
            editor.executeEdits(editor.getValue(), [{range: selection, text: text}])
        }
    }
}

export const monacoEditorReplace = (editor: IMonacoEditor | IMonacoCodeEditor, text: string) => {
    if (editor) editor.setValue(text)
}

export const monacoEditorClear = (editor?: IMonacoEditor | IMonacoCodeEditor) => {
    if (editor) {
        editor.getModel()?.setValue("")
    }
}

const highlightRanges: any[] = []

export const monacoEditorRemoveAllHighlight = (editor?: IMonacoEditor) => {
    if (editor && highlightRanges.length > 0) {
        editor.deltaDecorations(
            [],
            highlightRanges.map((i) => {
                return {range: i, options: {inlineClassName: undefined}} as any
            })
        )
    }
}

export const encodeOperators: FuzzOperatorItem[] = [
    {
        name: "全部转大写",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"upper"} help={"编码标签内容转大写"} />
        ),
        tag: "upper"
    },
    {
        name: "全部转小写",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"lower"} help={"编码标签内容转小写"} />
        ),
        tag: "lower"
    },
    {
        name: `解析成字符串（例如{{str(\\xA0\\x45)}}）`,
        optionsRender: (s, callback) => (
            <EncodeTag
                {...{origin: s, setOrigin: callback}}
                tag={"str"}
                help={'解析成字符串（例如{{str("\xA0\x45")}}），用于转换不可见字符'}
            />
        ),
        tag: "str"
    },
    {
        name: "base64编码",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"base64enc"} help={"Base64 编码标签内内容"} />
        ),
        tag: "base64enc"
    },
    {
        name: "base64解码",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"base64dec"} help={"Base64 解码标签内内容"} />
        ),
        tag: "base64dec"
    },
    {
        name: "16进制编码",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"hex"} help={"把标签内容变成16进制编码"} />
        ),
        tag: "hex"
    },
    {
        name: "16进制解码",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"hexdec"} help={"把标签内容按16进制解码"} />
        ),
        tag: "hexdec"
    },
    {
        name: "计算SHA1",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"sha1"} help={"计算标签内容的 Sha1"} />
        ),
        tag: "sha1"
    },
    {
        name: "计算SHA256",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"sha256"} help={"计算标签内容的 Sha256"} />
        ),
        tag: "sha256"
    },
    {
        name: "计算SHA512",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"sha512"} help={"计算标签内容的 Sha512"} />
        ),
        tag: "sha512"
    },
    {
        name: "URL 编码",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"urlenc"} help={"把标签内容变成URL 编码"} />
        ),
        tag: "urlenc"
    },
    {
        name: "URL 解码",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"urldec"} help={"把标签内容按URL 解码"} />
        ),
        tag: "urldec"
    },
    {
        name: "'双重URL'编码",
        optionsRender: (s, callback) => (
            <EncodeTag
                {...{origin: s, setOrigin: callback}}
                tag={"doubleurlenc"}
                help={"把标签内容变成'双重URL'编码"}
            />
        ),
        tag: "doubleurlenc"
    },
    {
        name: "'双重URL'解码",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"doubleurldec"} help={"把标签内容按'双重URL'解码"} />
        ),
        tag: "doubleurldec"
    },
    {
        name: "HTML(&#xxxx;)编码",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"html"} help={"把标签内容变成HTML(&#xxxx;)编码"} />
        ),
        tag: "html"
    },
    {
        name: "HTML(&#xAAAA;)编码 - 16进制",
        optionsRender: (s, callback) => (
            <EncodeTag
                {...{origin: s, setOrigin: callback}}
                tag={"htmlhex"}
                help={"把标签内容变成HTML(&#xAAAA;)编码"}
            />
        ),
        tag: "htmlhex"
    },
    {
        name: "HTML(&#xxxx;)解码",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"htmldec"} help={"把标签内容按HTML(&#xxxx;)解码"} />
        ),
        tag: "htmldec"
    },
    {
        name: "'ASCII'编码",
        tag: "ascii",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"ascii"} help={"把标签内容变成'ASCII'编码"} />
        )
    },
    {
        name: "'ASCII'解码",
        tag: "asciidec",
        optionsRender: (s, callback) => (
            <EncodeTag {...{origin: s, setOrigin: callback}} tag={"asciidec"} help={"把标签内容按'ASCII'解码"} />
        )
    }
]
