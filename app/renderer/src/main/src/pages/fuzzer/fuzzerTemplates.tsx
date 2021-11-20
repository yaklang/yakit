import React, {useEffect, useState} from "react";
import {IMonacoCodeEditor, IMonacoEditor} from "../../utils/editors";
import {InputInteger, InputItem} from "../../utils/inputUtil";
import {RandInt, RandStrWithLen, RandStrWithMax, RandStrWIthRepeat} from "./templates/Rand";
import {FuzzWithRange, RangeChar} from "./templates/Range";
import {EncodeTag, SingleTag} from "./templates/SingleTag";
import {editor} from "monaco-editor";
import "./style.css"

export const fuzzerTemplates = [
    {
        name: "GET 请求", template: `GET / HTTP/1.1
Host: www.example.com

`
    },
    {
        name: "POST 请求", template: `POST / HTTP/1.1
Host: www.example.com`,
    },
    {
        name: "POST Json 请求", template: `POST / HTTP/1.1
Content-Type: application/json
Host: www.example.com

{"key": "value"}`,
    },
    {name: "无", template: ""},
];

export interface FuzzOperatorItem {
    name: string
    tag?: string
    callback?: (editor: IMonacoEditor) => any
    params?: [],
    optionsRender: (s: string, callback: (s: string) => any) => any
}

export interface FuzzOperatorParam {
    key: string
    defaultValue?: string
    optional?: string
}

export const monacoEditorWrite = (editor: IMonacoEditor | IMonacoCodeEditor, text: string) => {
    if (editor) editor.trigger("keyboard", "type", {text})
}

export const monacoEditorClear = (editor?: IMonacoEditor | IMonacoCodeEditor) => {
    if (editor) {
        let range = editor.getModel()?.getFullModelRange();
        if (range) {
            editor.setSelection(range)
            editor.trigger("keyboard", "type", {text: "\b"})
        }
    }
};

const highlightRanges: any[] = [];

export const monacoEditorRemoveAllHighlight = (editor?: IMonacoEditor) => {
    if (editor && highlightRanges.length > 0) {
        editor.deltaDecorations([], highlightRanges.map(i => {
            console.info(i)
            return {range: i, options: {inlineClassName: undefined}} as any
        }))
    }
}

export const fuzzOperators: FuzzOperatorItem[] = [
    {
        name: "随机字符串(固定长度)", callback: editor => {
            monacoEditorWrite(editor, "{{rs(6)}}")
        }, optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return <RandStrWithLen setOrigin={setOrigin} origin={origin}/>
        }
    },
    {
        name: "随机字符串(指定长度)", callback: editor => {
            monacoEditorWrite(editor, "{{rs(6)}}")
        }, optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return <RandStrWithMax setOrigin={setOrigin} origin={origin}/>
        }
    },
    {
        name: "随机字符串(多次渲染)", callback: editor => {
            monacoEditorWrite(editor, "{{rs(6)}}")
        }, optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return <RandStrWIthRepeat setOrigin={setOrigin} origin={origin}/>
        }
    },
    {
        name: "整数(自由范围)", callback: editor => {

        }, optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return <InputItem label={"输入范围"} setValue={r => setOrigin(`{{int(${r})}}`)}/>
        }
    },
    {
        name: "随机整数(范围)", callback: editor => {
        }, optionsRender: (origin: string, setOrigin: (s: string) => any) => {
            return <RandInt {...{origin, setOrigin}}/>
        }
    },
    {
        name: "IP/IP段/网络/域名(多个，逗号分隔)",
        callback: editor => {
        }, optionsRender: (origin, setOrigin) => <FuzzWithRange
            label={"IP/网段/域名组"} origin={origin}
            setOrigin={setOrigin} tag={"network"}
            help={"一般用于拆开扫描目标，例如: 192.168.0.1/24,example.com,10.1.11.1"}
        />
    },
    {
        name: "生成 .ico 文件头",
        callback: editor => {
        }, optionsRender: (origin, setOrigin) => {
            return <SingleTag
                {...{origin, setOrigin}} help={"生成一个 .ico 文件的文件头，一般用于上传文件"}
                tag={"ico"}
            />
        }, tag: "ico",
    },
    {
        name: "生成 .png 文件头",
        callback: editor => {
        }, optionsRender: (origin, setOrigin) => {
            return <SingleTag
                {...{origin, setOrigin}} help={"生成一个 .png 文件的文件头，一般用于上传文件"}
                tag={"png"}
            />
        }, tag: "png",
    },
    {
        name: "生成 .gif 文件头",
        callback: editor => {
        }, optionsRender: (origin, setOrigin) => {
            return <SingleTag
                {...{origin, setOrigin}} help={"生成一个 .gif 文件的文件头，一般用于上传文件"}
                tag={"gif"}
            />
        }, tag: "gif",
    },
    {
        name: "生成 .tiff 文件头",
        callback: editor => {
        }, optionsRender: (origin, setOrigin) => {
            return <SingleTag
                {...{origin, setOrigin}} help={"生成一个 .tiff 文件的文件头，一般用于上传文件"}
                tag={"tiff"}
            />
        }, tag: "tiff",
    },
    {
        name: "生成 .jpeg(jpg) 文件头",
        callback: editor => {
        }, optionsRender: (origin, setOrigin) => {
            return <SingleTag
                {...{origin, setOrigin}} help={"生成一个 .jpeg/jpg 文件的文件头，一般用于上传文件"}
                tag={"jpegstart"}
            />
        }, tag: "jpegstart",
    },
    {
        name: "生成 .jpeg(jpg) 文件尾",
        callback: editor => {
        }, optionsRender: (origin, setOrigin) => {
            return <SingleTag
                {...{origin, setOrigin}} help={"生成一个 .jpeg/jpg 文件的文件尾，一般用于上传文件"}
                tag={"jpegend"}
            />
        }, tag: "jpegend",
    },
    {
        name: "任意字符（ASCII码范围）", callback: editor => {
        },
        optionsRender: (origin, setOrigin) => {
            return <RangeChar {...{origin, setOrigin}}/>
        }
    },
    {
        name: "生成所有特殊字符",
        callback: editor => {
        }, optionsRender: (origin, setOrigin) => {
            return <SingleTag
                {...{origin, setOrigin}} help={"生成所有特殊字符，一般用于模糊测试"}
                tag={"punc"}
            />
        }, tag: "punc",
    },
]

export const encodeOperators: FuzzOperatorItem[] = [
    {
        name: "全部转大写", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"upper"} help={"编码标签内容转大写"}
        />, tag: "upper"
    },
    {
        name: "全部转小写", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"lower"} help={"编码标签内容转小写"}
        />, tag: "lower"
    },
    {
        name: `解析成字符串（例如{{str(\\xA0\\x45)}}）`, optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"str"} help={"解析成字符串（例如{{str(\"\xA0\x45\")}}），用于转换不可见字符"}
        />, tag: "str"
    },
    {
        name: "base64编码", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"base64enc"} help={"Base64 编码标签内内容"}
        />, tag: "base64enc"
    },
    {
        name: "base64解码", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"base64dec"} help={"Base64 解码标签内内容"}
        />, tag: "base64dec"
    },
    {
        name: "16进制编码", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"hex"} help={"把标签内容变成16进制编码"}
        />, tag: "hex"
    },
    {
        name: "16进制解码", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"hexdec"} help={"把标签内容按16进制解码"}
        />, tag: "hexdec"
    },
    {
        name: "计算SHA1", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"sha1"} help={"计算标签内容的 Sha1"}
        />, tag: "sha1"
    },
    {
        name: "计算SHA256", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"sha256"} help={"计算标签内容的 Sha256"}
        />, tag: "sha256"
    },
    {
        name: "计算SHA512", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"sha512"} help={"计算标签内容的 Sha512"}
        />, tag: "sha512"
    },
    {
        name: "URL 编码", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"urlenc"} help={"把标签内容变成URL 编码"}
        />, tag: "urlenc"
    },
    {
        name: "URL 解码", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"urldec"} help={"把标签内容按URL 解码"}
        />, tag: "urldec"
    },
    {
        name: "'双重URL'编码", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"doubleurlenc"} help={"把标签内容变成'双重URL'编码"}
        />, tag: "doubleurlenc"
    },
    {
        name: "'双重URL'解码", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"doubleurldec"} help={"把标签内容按'双重URL'解码"}
        />, tag: "doubleurldec"
    },
    {
        name: "HTML(&#xxxx;)编码", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"html"} help={"把标签内容变成HTML(&#xxxx;)编码"}
        />, tag: "html"
    },
    {
        name: "HTML(&#xAAAA;)编码 - 16进制", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"htmlhex"} help={"把标签内容变成HTML(&#xAAAA;)编码"}
        />, tag: "htmlhex"
    },
    {
        name: "HTML(&#xxxx;)解码", optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"htmldec"} help={"把标签内容按HTML(&#xxxx;)解码"}
        />, tag: "htmldec"
    },
    {
        name: "'ASCII'编码",
        tag: "ascii",
        optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"ascii"} help={"把标签内容变成'ASCII'编码"}
        />
    },
    {
        name: "'ASCII'解码",
        tag: "asciidec",
        optionsRender: (s, callback) => <EncodeTag
            {...{origin: s, setOrigin: callback}}
            tag={"asciidec"} help={"把标签内容按'ASCII'解码"}
        />
    },
];