import React from "react"
import {ReportItem} from "./schema"

import MDEditor from "@uiw/react-md-editor"
import styles from "./markdownRender.module.scss"
const {Markdown} = MDEditor

export interface ReportMarkdownBlockProp {
    item: ReportItem
}

export const ReportMarkdownBlock: React.FC<ReportMarkdownBlockProp> = (props) => {
    return <Markdown source={props.item.content} className={styles["markdown-block"]} />
}
