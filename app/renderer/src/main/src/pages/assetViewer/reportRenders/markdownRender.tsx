import React from "react"
import {ReportItem} from "./schema"

import MDEditor from "@uiw/react-md-editor"
import rehypeSanitize from "rehype-sanitize"
import styles from "./markdownRender.module.scss"
import {useTheme} from "@/hook/useTheme"
import classNames from "classnames"
import {ErrorBoundary} from "react-error-boundary"
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
                className={className}
                style={style}
                warpperElement={{"data-color-mode": theme}}
            />
        </ErrorBoundary>
    )
}
