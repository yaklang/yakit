import React from "react"
import {ReportItem} from "./schema"

import MDEditor from "@uiw/react-md-editor"
import styles from "./markdownRender.module.scss"
import {useTheme} from "@/hook/useTheme"
import classNames from "classnames"
const {Markdown} = MDEditor

export interface ReportMarkdownBlockProp {
    item: ReportItem
    className?: string
}

export const ReportMarkdownBlock: React.FC<ReportMarkdownBlockProp> = (props) => {
    const {theme} = useTheme()
    return (
        <Markdown
            source={props.item.content}
            className={classNames(styles["markdown-block"], props.className)}
            warpperElement={{"data-color-mode": theme}}
        />
    )
}
