import {FC} from "react"
import {KnowledgeBaseTableProps} from "./KnowledgeBaseTable"
import styles from "../knowledgeBase.module.scss"

const KnowledgeBaseTableHeader: FC<KnowledgeBaseTableProps> = ({streams, knowledgeBaseItems}) => {
    return (
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
    )
}

export {KnowledgeBaseTableHeader}
