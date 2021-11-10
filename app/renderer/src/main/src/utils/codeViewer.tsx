import React, {useEffect} from "react";
import {Controlled as CodeMirror} from "react-codemirror2";
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/zenburn.css'
import 'codemirror/theme/solarized.css'
import 'codemirror/addon/display/fullscreen.css'
import "./CodeMirror.css"
import * as CM from "codemirror";

require("codemirror/mode/go/go");
require("codemirror/mode/php/php");
require("codemirror/mode/shell/shell");
require("codemirror/mode/python/python");
require("codemirror/mode/jsx/jsx");
require("codemirror/mode/javascript/javascript");
require("codemirror/mode/markdown/markdown");
require("codemirror/mode/yaml/yaml");
require("codemirror/mode/textile/textile");
require("codemirror/mode/http/http");
require('codemirror/addon/display/fullscreen');


export interface CodeViewerProps {
    mode?: "go" | "yaml" | "markdown" | "textile" | "http" | "javascript" | string
    value: string
    setValue?: (i: string) => any
    width?: number | string
    height?: number | string
    fullHeight?: boolean
    theme?: string
    highlightKeywords?: string[]
}

const fixMode = (i: string) => {
    switch (i) {
        case "py":
        case "python":
        case "py3":
        case "py2":
        case "ipy":
            return "python"
        case "js":
        case "ts":
            return "javascript"
        case "tsx":
        case "jsx":
            return "jsx"
        case "go":
        case "golang":
            return "go";
        case "yaml":
        case "yml":
            return "yaml";
        case "md":
        case "markdown":
            return "markdown";
        default:
            return "javascript"
    }
}

export const CodeViewer: React.FC<CodeViewerProps> = (p) => {

    return <div style={{
        width: p.width || 650, overflow: "auto",
        height: p.height,
    }}>
        <CodeMirror
            className={p.fullHeight ? "fullText" : "height450px"}
            value={p.value}
            editorDidMount={(editor, start, end) => {
                let pairs: {
                    start: {
                        line: number, ch: number,
                    }, end: {
                        line: number, ch: number
                    }
                }[] = [];
                (p.highlightKeywords || []).map(i => {
                    p.value.split("\n").map((lineValue, index) => {
                        let startIndex = 0
                        do {
                            let iStart = lineValue.indexOf(i, startIndex)
                            if (iStart >= 0) {
                                pairs.push({
                                    start: {
                                        line: index, ch: iStart
                                    }, end: {
                                        line: index, ch: iStart + i.length
                                    },
                                })
                                startIndex = iStart + i.length
                            } else {
                                break
                            }
                        } while (true)
                    })

                })
                pairs.map(i => {
                    editor.markText(i.start, i.end, {className: "codemirror-highlighted"})
                })
            }}
            options={{
                extraKeys: {
                    "F11"(cm: any) {
                        cm.setOption("fullScreen", !cm.getOption("fullScreen"))
                    },
                    "Ctrl-H"(cm: any) {
                        cm.setOption("fullScreen", !cm.getOption("fullScreen"))
                    },
                },
                mode: fixMode(p.mode || "") || "go",
                tabSize: 2,
                theme: p.theme || "zenburn",
                lineNumbers: true,
            }}
            onBeforeChange={(editor, data, value) => {
                p.setValue && p.setValue(value)
            }}
        />
    </div>
}