import {FC, memo} from "react"
import {KnowledgeBaseTableHeader} from "./KnowledgeBaseTableHeader"
import {IconProps} from "@/assets/newIcon"
import {KnowledgeBaseFile} from "../TKnowledgeBase"

import styles from "../knowledgeBase.module.scss"

interface KnowledgeBaseTableProps {
    streams: any
    knowledgeBaseItems: {
        icon: (props: Partial<IconProps>) => JSX.Element
        KnowledgeBaseFile?: KnowledgeBaseFile[] | undefined
        KnowledgeBaseName?: string | undefined
        KnowledgeBaseType?: string | undefined
        KnowledgeBaseDescription?: string | undefined
        KnowledgeBaseLength?: number | undefined
        streamToken?: string | undefined
        streamstep?: 1 | 2 | "success" | undefined
        ID?: string | undefined
    }
}

const KnowledgeBaseTable: FC<KnowledgeBaseTableProps> = (props) => {
    const {streams, knowledgeBaseItems} = props
    console.log("knowledgeBaseItems", knowledgeBaseItems)
    return (
        <div className={styles["knowledge-base-table-container"]}>
            <div className={styles["table-header"]}>
                <div className={styles["table-header-first"]}>
                    <div className={styles["header-left"]}>
                        <knowledgeBaseItems.icon className={styles["icon"]} />
                        <div>{knowledgeBaseItems.KnowledgeBaseName}</div>
                        <div className={styles["tag"]}>{knowledgeBaseItems.KnowledgeBaseType}</div>
                    </div>
                    <div className={styles["header-right"]}>header-right</div>
                </div>
                <div className={styles["table-header-last"]}>{knowledgeBaseItems.KnowledgeBaseDescription}</div>
            </div>
        </div>
    )
}

export default memo(KnowledgeBaseTable)
export type {KnowledgeBaseTableProps}
