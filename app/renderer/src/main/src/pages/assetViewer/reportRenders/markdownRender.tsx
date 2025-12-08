import React from "react"
import {ReportItem} from "./schema"

import MDEditor from "@uiw/react-md-editor"
import styles from "./markdownRender.module.scss"
import {useTheme} from "@/hook/useTheme"
import classNames from "classnames"
import {ErrorBoundary} from "react-error-boundary"
const {Markdown} = MDEditor

export interface ReportMarkdownBlockProp {
    item: ReportItem
    className?: string
}

export const ReportMarkdownBlock: React.FC<ReportMarkdownBlockProp> = (props) => {
    const {theme} = useTheme()
    return (
        <ErrorBoundary
            FallbackComponent={() => {
                return <div>{props.item.content}</div>
            }}
        >
            <Markdown
                source={props.item.content}
                className={classNames(styles["markdown-block"], props.className)}
                warpperElement={{"data-color-mode": theme}}
            />
        </ErrorBoundary>
    )
}
