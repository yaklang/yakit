import React from "react"
import {ReportItem} from "./schema"

import MDEditor from "@uiw/react-md-editor"
import styles from "./markdownRender.module.scss"
import {useTheme} from "@/hook/useTheme"
const {Markdown} = MDEditor

export interface ReportMarkdownBlockProp {
    item: ReportItem
}

export const ReportMarkdownBlock: React.FC<ReportMarkdownBlockProp> = (props) => {
    const {theme} = useTheme()
    return (
        <Markdown
            source={props.item.content}
            className={styles["markdown-block"]}
            warpperElement={{"data-color-mode": theme}}
        />
    )
}
