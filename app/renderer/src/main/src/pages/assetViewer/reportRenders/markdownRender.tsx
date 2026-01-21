import React, {useEffect, useMemo, useRef, useState} from "react"
import MDEditor from "@uiw/react-md-editor"
import rehypeSanitize from "rehype-sanitize"
import {useTheme} from "@/hook/useTheme"
import {ErrorBoundary} from "react-error-boundary"
import {StreamdownProps, Streamdown, MathPlugin} from "streamdown"
import styles from "./markdownRender.module.scss"
import classNames from "classnames"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
// 代码高亮
import {code} from "@streamdown/code"
// 渲染美人鱼图，包括流程图、序列图等
import {mermaid} from "@streamdown/mermaid"
// 使用 KaTeX 呈现数学表达式。
import {math} from "@streamdown/math"
// 给所有标题（h1–h6）自动生成 id，用于锚点跳转
import rehypeSlug from "rehype-slug"
// import { cjk } from "@streamdown/cjk";
const {ipcRenderer} = window.require("electron")
const {Markdown} = MDEditor

function PreCode(props: {children?: React.ReactNode}) {
    const ref = useRef<HTMLPreElement>(null)
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

interface SafeMarkdownProp {
    source?: string
    className?: string
    style?: React.CSSProperties
}

// 目前非流式优先使用此SafeMarkdown，流式使用 StreamMarkdown
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
                // rehypeSanitize 防止 XSS 攻击
                // rehypeSlug 用于生成锚点 此处带前缀user-content-
                rehypePlugins={[rehypeSlug, rehypeSanitize]}
                className={classNames(styles["safe-markdown"], className)}
                style={style}
                warpperElement={{"data-color-mode": theme}}
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
            />
        </ErrorBoundary>
    )
}

interface StreamMarkdownProps extends StreamdownProps {
    content?: string
    wrapperClassName?: string
    // 是否显示主题
    isShowTheme?: boolean
}

// react-markdown的平替（注：xss传入的markdown中不可包含html元素 ）
// 由于Streamdown的样式引入需Tailwind / UnoCSS / WindiCSS 的语法，故自己写样式
// 在 Streamdown 中，代码块内容都会被压平成一行文本是由于其流式解析器的设计决定的
export const StreamMarkdown: React.FC<StreamMarkdownProps> = React.memo((props) => {
    const {content, wrapperClassName, isShowTheme = true, ...restProps} = props
    const {theme} = useTheme()
    const plugins = useMemo(() => {
        if (theme === "dark" || !isShowTheme) {
            return {
                mermaid,
                math: math as MathPlugin
            }
        }
        return {code, mermaid, math: math as MathPlugin}
    }, [theme, isShowTheme])
    return (
        <>
            {/* caret="block"|"circle" isAnimating={true} */}
            {/* wmde-markdown为复用SafeMarkdown样式  data-color-mode为平替SafeMarkdown样式的日夜间模式*/}
            <div
                className={classNames(
                    styles["stream-markdown"],
                    wrapperClassName
                    // "wmde-markdown"
                )}
                // data-color-mode={theme}
            >
                <Streamdown
                    plugins={plugins}
                    shikiTheme={["github-light", "github-dark"]}
                    controls={{
                        mermaid: {
                            // 全屏不展示
                            fullscreen: false,
                            download: true,
                            copy: true,
                            // 平移缩放不展示
                            panZoom: false
                        }
                    }}
                    mermaid={{
                        config: {
                            theme: theme === "dark" ? "dark" : "default"
                        }
                    }}
                    // Streamdown官网文档中内置了一些常用插件 https://streamdown.ai/docs/configuration#core-props
                    rehypePlugins={[
                        // rehypeSanitize 防止 XSS 攻击 官方文档已内置
                        rehypeSlug as any
                    ]}
                    components={{
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
        </>
    )
})
