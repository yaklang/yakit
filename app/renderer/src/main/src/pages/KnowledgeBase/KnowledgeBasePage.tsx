import {FC} from "react"

import {KnowledgeBaseManage} from "./KnowledgeBaseManage"
import KnowledgeBaseTable from "./knowledgeBaseTable"

import styles from "./knowledgeBase.module.scss"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {useSafeState} from "ahooks"

const KnowledgeBase: FC = () => {
    const [knowledgeBaseitems, setKnowledgeBaseItems] = useSafeState<{id: number, name: string}>()
    return (
        <div className={styles["repository-manage"]}>
            <YakitResizeBox
                firstNodeStyle={{padding: 0}}
                lineStyle={{display: "none"}}
                firstNode={
                    <KnowledgeBaseManage setKnowledgeBaseItems={setKnowledgeBaseItems} knowledgeBaseitems={knowledgeBaseitems} />
                }
                firstRatio='300px'
                firstMinSize={300}
                secondNode={<KnowledgeBaseTable knowledgeBaseitems={knowledgeBaseitems} />}
            />
        </div>
    )
}

export default KnowledgeBase
