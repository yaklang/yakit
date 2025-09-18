import {FC} from "react"

import {KnowledgeBaseManage} from "./KnowledgeBaseManage"
import KnowledgeBaseTable from "./knowledgeBaseTable"

import styles from "./knowledgeBase.module.scss"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {useSafeState} from "ahooks"

const KnowledgeBase: FC = () => {
    const [knowledgeBaseId, setKnowledgeBaseId] = useSafeState<number>()
    return (
        <div className={styles["repository-manage"]}>
            <YakitResizeBox
                firstNodeStyle={{padding: 0}}
                lineStyle={{display: "none"}}
                firstNode={
                    <KnowledgeBaseManage setKnowledgeBaseId={setKnowledgeBaseId} knowledgeBaseId={knowledgeBaseId} />
                }
                firstRatio='300px'
                firstMinSize={300}
                secondNode={<KnowledgeBaseTable knowledgeBaseId={knowledgeBaseId} />}
            />
        </div>
    )
}

export default KnowledgeBase
