import React, {useCallback, useEffect, useMemo, useRef, useState} from "react"
import MDEditor from "@uiw/react-md-editor"
import rehypeSanitize from "rehype-sanitize"
import {useTheme} from "@/hook/useTheme"
import {ErrorBoundary} from "react-error-boundary"
import {StreamdownProps, Streamdown, MathPlugin} from "streamdown"
import styles from "./markdownRender.module.scss"
import "./markdownRender.scss"
import classNames from "classnames"
import {CopyComponents} from "@/components/yakitUI/YakitTag/YakitTag"
import {code} from "@streamdown/code"
import {mermaid} from "@streamdown/mermaid"
import {math} from "@streamdown/math"
import rehypeSlug from "rehype-slug"
import {yakitNotify} from "@/utils/notification"
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
    }, [])

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

function svgToPngBlob(svgEl: SVGSVGElement, scale = 2): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const cloned = svgEl.cloneNode(true) as SVGSVGElement
        if (!cloned.getAttribute("xmlns")) cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg")

        const bbox = svgEl.getBoundingClientRect()
        const w = Math.min(bbox.width * scale, 4096)
        const h = Math.min(bbox.height * scale, 4096)

        const svgData = new XMLSerializer().serializeToString(cloned)
        const dataUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
        const img = new Image()
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas")
                canvas.width = w
                canvas.height = h
                const ctx = canvas.getContext("2d")
                if (!ctx) {
                    reject(new Error("Failed to get canvas 2d context"))
                    return
                }
                ctx.fillStyle = "#ffffff"
                ctx.fillRect(0, 0, w, h)
                ctx.drawImage(img, 0, 0, w, h)
                canvas.toBlob(
                    (blob) => {
                        blob ? resolve(blob) : reject(new Error("toBlob returned null"))
                    },
                    "image/png"
                )
            } catch (e) {
                reject(e)
            }
        }
        img.onerror = () => {
            reject(new Error("Failed to load SVG as image"))
        }
        img.src = dataUrl
    })
}

async function copyMermaidAsPng(mermaidBlock: HTMLElement) {
    const svgEl = mermaidBlock.querySelector('[data-streamdown="mermaid"] svg') as SVGSVGElement | null
    if (!svgEl) {
        yakitNotify("error", "No SVG found")
        return
    }
    try {
        const blob = await svgToPngBlob(svgEl, 2)
        await navigator.clipboard.write([new ClipboardItem({"image/png": blob})])
        yakitNotify("success", "PNG copied to clipboard")
    } catch (e) {
        yakitNotify("error", `Copy PNG failed: ${e}`)
    }
}

async function downloadMermaidAsPng(mermaidBlock: HTMLElement) {
    const svgEl = mermaidBlock.querySelector('[data-streamdown="mermaid"] svg') as SVGSVGElement | null
    if (!svgEl) {
        yakitNotify("error", "No SVG found")
        return
    }
    try {
        const blob = await svgToPngBlob(svgEl, 2)
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "diagram.png"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    } catch (e) {
        yakitNotify("error", `Download PNG failed: ${e}`)
    }
}

interface StreamMarkdownProps extends StreamdownProps {
    content?: string
    wrapperClassName?: string
}

const MERMAID_BTN_CLASS =
    "cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground"

const COPY_SOURCE_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 3h1.25a1.25 1.25 0 0 1 1.25 1.25v8.5a1.25 1.25 0 0 1-1.25 1.25h-7.5a1.25 1.25 0 0 1-1.25-1.25v-8.5a1.25 1.25 0 0 1 1.25-1.25h1.25"/><rect x="5.5" y="1.5" width="5" height="2.5" rx="0.75" ry="0.75"/></svg>`

const COPY_PNG_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="12" height="12" rx="1.5" ry="1.5"/><circle cx="5.5" cy="5.5" r="1"/><polyline points="14 10 10.5 6.5 3 14"/></svg>`

const DOWNLOAD_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v8.5"/><path d="M4.5 7.5 8 11l3.5-3.5"/><path d="M2.5 13h11"/></svg>`

export const StreamMarkdown: React.FC<StreamMarkdownProps> = React.memo((props) => {
    const {content, wrapperClassName, ...restProps} = props
    const {theme} = useTheme()
    const wrapperRef = useRef<HTMLDivElement>(null)
    const plugins = useMemo(() => {
        if (theme === "dark") {
            return {
                mermaid,
                math: math as MathPlugin
            }
        }
        return {code, mermaid, math: math as MathPlugin}
    }, [theme])

    const handleMermaidAction = useCallback(
        (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const btn = target.closest("[data-mermaid-action]") as HTMLElement | null
            if (!btn) return
            const action = btn.getAttribute("data-mermaid-action")
            const block = btn.closest('[data-streamdown="mermaid-block"]') as HTMLElement | null
            if (!block) return

            e.stopPropagation()
            e.preventDefault()

            if (action === "copy-png") {
                copyMermaidAsPng(block)
            } else if (action === "download-png") {
                downloadMermaidAsPng(block)
            } else if (action === "copy-source") {
                const src = content || ""
                const mermaidBlocks = src.match(/```mermaid\n([\s\S]*?)```/g)
                if (mermaidBlocks && mermaidBlocks.length > 0) {
                    const allBlocks = wrapperRef.current?.querySelectorAll('[data-streamdown="mermaid-block"]')
                    if (allBlocks) {
                        const idx = Array.from(allBlocks).indexOf(block)
                        const match = mermaidBlocks[idx >= 0 ? idx : 0]
                        const source = match?.replace(/```mermaid\n?/, "").replace(/\n?```$/, "") || ""
                        navigator.clipboard.writeText(source).then(() => {
                            yakitNotify("success", "Mermaid source copied")
                        })
                    }
                }
            }
        },
        [content]
    )

    useEffect(() => {
        const wrapper = wrapperRef.current
        if (!wrapper) return

        const preventZoom = (e: WheelEvent) => {
            if ((e.target as HTMLElement).closest('[data-streamdown="mermaid-block"]')) {
                e.stopPropagation()
            }
        }
        wrapper.addEventListener("wheel", preventZoom, {capture: true})

        const preventPointer = (e: PointerEvent) => {
            const t = e.target as HTMLElement
            if (
                t.closest('[data-streamdown="mermaid"]') &&
                !t.closest("button") &&
                !t.closest("[data-mermaid-action]")
            ) {
                e.stopPropagation()
            }
        }
        wrapper.addEventListener("pointerdown", preventPointer, {capture: true})

        const injectButtons = () => {
            const blocks = wrapper.querySelectorAll('[data-streamdown="mermaid-block"]')
            blocks.forEach((block) => {
                if (block.querySelector("[data-mermaid-action]")) return
                const controlsArea = block.querySelector(".flex.items-center.justify-end.gap-2")
                if (!controlsArea) return

                const mkBtn = (action: string, title: string, svg: string) => {
                    const btn = document.createElement("button")
                    btn.setAttribute("data-mermaid-action", action)
                    btn.className = MERMAID_BTN_CLASS
                    btn.title = title
                    btn.type = "button"
                    btn.innerHTML = svg
                    return btn
                }

                const downloadBtn = mkBtn("download-png", "Download PNG", DOWNLOAD_SVG)
                const copyPngBtn = mkBtn("copy-png", "Copy as PNG", COPY_PNG_SVG)
                const copySourceBtn = mkBtn("copy-source", "Copy Source", COPY_SOURCE_SVG)

                const existingDownload = controlsArea.querySelector('[title="Download diagram"]')
                if (existingDownload) existingDownload.remove()

                controlsArea.insertBefore(downloadBtn, controlsArea.firstChild)
                controlsArea.insertBefore(copyPngBtn, controlsArea.firstChild)
                controlsArea.insertBefore(copySourceBtn, controlsArea.firstChild)
            })
        }

        const observer = new MutationObserver(() => injectButtons())
        observer.observe(wrapper, {childList: true, subtree: true})
        injectButtons()

        wrapper.addEventListener("click", handleMermaidAction)
        return () => {
            observer.disconnect()
            wrapper.removeEventListener("click", handleMermaidAction)
            wrapper.removeEventListener("wheel", preventZoom, {capture: true} as any)
            wrapper.removeEventListener("pointerdown", preventPointer, {capture: true} as any)
        }
    }, [handleMermaidAction])

    return (
        <div ref={wrapperRef} className={classNames("stream-markdown", wrapperClassName)}>
            <Streamdown
                plugins={plugins}
                shikiTheme={["github-light", "github-dark"]}
                controls={{
                    mermaid: {
                        fullscreen: true,
                        download: true,
                        copy: false,
                        panZoom: false
                    }
                }}
                mermaid={{
                    config: {
                        theme: theme === "dark" ? "dark" : "default"
                    }
                }}
                rehypePlugins={[rehypeSlug as any]}
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
    )
})
