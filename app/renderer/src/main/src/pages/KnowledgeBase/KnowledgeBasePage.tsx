import {FC} from "react"

import {KnowledgeBaseManage} from "./KnowledgeBaseManage"
import {KnowledgeBaseTable} from "./knowledgeBaseTable"

import styles from "./knowledgeBase.module.scss"

const KnowledgeBase: FC = () => {
    return (
        <div className={styles["repository-manage"]}>
            <KnowledgeBaseManage />
            <KnowledgeBaseTable />
        </div>
    )
}

export default KnowledgeBase
