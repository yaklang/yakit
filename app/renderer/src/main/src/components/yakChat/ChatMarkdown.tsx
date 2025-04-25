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
import rehypeSanitize from "rehype-sanitize"

import "./chatMarkdown.scss"

const {ipcRenderer} = window.require("electron")

interface ChatMarkdownBaseProps {
    content: string
    skipHtml?: boolean
}
export type ChatMarkdownProps = ChatMarkdownBaseProps & React.DOMAttributes<HTMLDivElement>

export const ChatMarkdown: React.FC<ChatMarkdownProps> = memo((props) => {
    return (
        <div className='markdown-body'>
            <MarkdownContent {...props} />
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

function PreCode(props: {children?: React.ReactNode}) {
    const ref = useRef<HTMLPreElement>(null)
    const [mermaidCode, setMermaidCode] = useState("")
    const [copyStr, setCopyStr] = useState("")
    useEffect(() => {
        if (ref.current) {
            // 初始赋值
            setCopyStr(ref.current.textContent || "")
            // 监听后续变化
            const observer = new MutationObserver(() => {
                if (ref.current) {
                    setCopyStr(ref.current.textContent || "")
                }
            })
            observer.observe(ref.current, {childList: true, subtree: true})
            return () => observer.disconnect()
        }
    }, [props.children])

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

function _MarkDownContent(props: ChatMarkdownBaseProps) {
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
                ],
                rehypeSanitize
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
            skipHtml={props.skipHtml}
        >
            {props.content}
        </ReactMarkdown>
    )
}

const MarkdownContent = React.memo(_MarkDownContent)
