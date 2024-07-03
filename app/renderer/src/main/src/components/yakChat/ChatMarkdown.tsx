import React, {memo, useEffect, useRef, useState} from "react"
import ReactMarkdown from "react-markdown"
import "katex/dist/katex.min.css"
import RemarkMath from "remark-math"
import RemarkBreaks from "remark-breaks"
import RehypeKatex from "rehype-katex"
import RemarkGfm from "remark-gfm"
import RehypeHighlight from "rehype-highlight"
import mermaid from "mermaid"
import rehypeRaw from "rehype-raw"
import {CopyComponents} from "../yakitUI/YakitTag/YakitTag"

import "./chatMarkdown.scss"

const {ipcRenderer} = window.require("electron")

interface ChatMarkdownBaseProps {
    content: string
}
export type ChatMarkdownProps = ChatMarkdownBaseProps & React.DOMAttributes<HTMLDivElement>

export const ChatMarkdown: React.FC<ChatMarkdownProps> = memo((props) => {
    const {content} = props

    return (
        <div className='markdown-body'>
            <MarkdownContent content={content} />
        </div>
    )
})

function Mermaid(props: {code: string; onError: () => void}) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (props.code && ref.current) {
            mermaid
                .run({
                    nodes: [ref.current]
                })
                .catch((e) => {
                    props.onError()
                    console.error("[Mermaid] ", e.message)
                })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.code])

    function viewSvgInNewWindow() {
        const svg = ref.current?.querySelector("svg")
        if (!svg) return
        const text = new XMLSerializer().serializeToString(svg)
        const blob = new Blob([text], {type: "image/svg+xml"})
        const url = URL.createObjectURL(blob)
        const win = window.open(url)
        if (win) {
            win.onload = () => URL.revokeObjectURL(url)
        }
    }

    return (
        <div
            className='no-dark'
            style={{cursor: "pointer", overflow: "auto"}}
            ref={ref}
            onClick={() => viewSvgInNewWindow()}
        >
            {props.code}
        </div>
    )
}

function PreCode(props: {children: any}) {
    const ref = useRef<HTMLPreElement>(null)
    const [mermaidCode, setMermaidCode] = useState("")
    const [copyStr, setCopyStr] = useState("")
    useEffect(() => {
        if (!ref.current) return
        const mermaidDom = ref.current.querySelector("code.language-mermaid")
        if (mermaidDom) {
            setMermaidCode((mermaidDom as HTMLElement).innerText)
        }
    }, [props.children])

    useEffect(() => {
        if (ref.current) {
            setCopyStr(ref.current.innerText)
        }
    }, [ref.current])

    if (mermaidCode) {
        return <Mermaid code={mermaidCode} onError={() => setMermaidCode("")} />
    }

    return (
        <pre ref={ref}>
            <CopyComponents className='copy-code-button' copyText={copyStr || ""} iconColor={"#85899e"} />

            {props.children}
        </pre>
    )
}

function _MarkDownContent(props: {content: string}) {
    return (
        <ReactMarkdown
            remarkPlugins={[RemarkMath, RemarkGfm, RemarkBreaks]}
            rehypePlugins={[
                RehypeKatex,
                rehypeRaw,
                [
                    RehypeHighlight,
                    {
                        detect: false,
                        ignoreMissing: true
                    }
                ]
            ]}
            components={{
                pre: PreCode,
                a: (aProps) => {
                    return (
                        <a
                            {...aProps}
                            onClick={(e) => {
                                e.stopPropagation()
                                ipcRenderer.invoke("open-url", aProps.href || "")
                            }}
                        />
                    )
                }
            }}
        >
            {props.content}
        </ReactMarkdown>
    )
}

const MarkdownContent = React.memo(_MarkDownContent)
