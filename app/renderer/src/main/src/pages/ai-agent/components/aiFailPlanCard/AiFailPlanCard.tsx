import type {FailPlanAndExecutionError} from "@/pages/ai-re-act/hooks/aiRender"
import {type FC} from "react"
import ChatCard from "../ChatCard"
import styles from "./AiFailPlanCard.module.scss"
import useAINodeLabel from "@/pages/ai-re-act/hooks/useAINodeLabel"
import {TaskErrorIcon} from "../../aiTree/icon"

const AiFailPlanCard: FC<{item: FailPlanAndExecutionError}> = ({item}) => {
    const {content} = item
    const {nodeLabel} = useAINodeLabel(item.NodeIdVerbose)
    return (
        <ChatCard className={styles["ai-fail-plan-wrapper"]} titleText={nodeLabel} titleIcon={<TaskErrorIcon />}>
            <div className={styles["ai-fail-plan-card"]}>
                <div className={styles["ai-fail-plan-card-title"]}>失败原因</div>
                <div className={styles["ai-fail-plan-card-content"]}>
                    {content && (
                        <pre className={styles["ai-fail-plan-card-code"]}>
                            <code>{content}</code>
                        </pre>
                    )}
                </div>
            </div>
        </ChatCard>
    )
}
export default AiFailPlanCard
