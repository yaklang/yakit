import React, {useEffect, useRef, useState} from "react"
import MDEditor from "@uiw/react-md-editor"
import rehypeSanitize from "rehype-sanitize"
import {useTheme} from "@/hook/useTheme"
import {ErrorBoundary} from "react-error-boundary"
import {StreamdownProps, Streamdown} from "streamdown"
import styles from "./markdownRender.module.scss"
import classNames from "classnames"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import mermaid from "mermaid"
const {ipcRenderer} = window.require("electron")
const {Markdown} = MDEditor

interface SafeMarkdownProp {
    source?: string
    className?: string
    style?: React.CSSProperties
}

export const SafeMarkdown: React.FC<SafeMarkdownProp> = (props) => {
    const {source, className, style} = props
    const {theme} = useTheme()
    return (
        <ErrorBoundary
            FallbackComponent={() => {
                return <div>{source}</div>
            }}
        >
            <Markdown
                source={source}
                // 防止 XSS 攻击
                rehypePlugins={[rehypeSanitize]}
                className={classNames(styles["markdown-block"], className)}
                style={style}
                warpperElement={{"data-color-mode": theme}}
            />
        </ErrorBoundary>
    )
}

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
            <CopyComponents
                className='copy-code-button'
                copyText={copyStr || ""}
                iconColor={"var(--Colors-Use-Neutral-Text-1-Title)"}
            />

            {props.children}
        </pre>
    )
}

interface StreamMarkdownProps extends StreamdownProps {
    content?: string
    wrapperClassName?: string
}

// react-markdown的平替
export const StreamMarkdown: React.FC<StreamMarkdownProps> = React.memo((props) => {
    const {content, wrapperClassName, ...restProps} = props

    return (
        <>
            <div className={classNames(styles["markdown-body"], wrapperClassName)}>
                <Streamdown
                    // Streamdown官网文档中内置了一些常用插件 https://streamdown.ai/docs/configuration#core-props
                    rehypePlugins={[
                        // 防止 XSS 攻击
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
                    {...restProps}
                >
                    {content}
                </Streamdown>
            </div>
            <SafeMarkdown source={content} />
        </>
    )
})
