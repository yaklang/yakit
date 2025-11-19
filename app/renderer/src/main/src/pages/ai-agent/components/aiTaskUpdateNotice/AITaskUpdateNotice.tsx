import React from "react"
import {AITaskClearNoticeProps, AITaskUpdateNoticeProps} from "./type"
import {SolidSpeakerphoneIcon} from "@/assets/icon/solid"
import {OutlineChatIcon, OutlineListTodoIcon} from "@/assets/icon/outline"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import styles from "./AITaskUpdateNotice.module.scss"
import useAINodeLabel from "@/pages/ai-re-act/hooks/useAINodeLabel"
import {useCreation} from "ahooks"
/**任务队列更新通知 */
export const AITaskUpdateNotice: React.FC<AITaskUpdateNoticeProps> = React.memo((props) => {
    const {item} = props
    const {nodeLabel} = useAINodeLabel(item.NodeIdVerbose)
    const total = useCreation(() => item.queues?.total || 0, [item.queues?.total])
    const queues = useCreation(() => item.queues?.data || [], [item.queues?.data])
    return (
        <div className={styles["task-update-notice"]}>
            <div className={styles["task-update-notice-heard"]}>
                <SolidSpeakerphoneIcon />
                <span>任务队列更新通知</span>
            </div>
            <div className={styles["user-update-content"]}>
                {nodeLabel}:{item.react_task_input}
            </div>
            {/* <div className={styles["update-reason"]}>
                移出原因：将任务信息补充到深度规划任务“京东云的 DeepSeek-V3 模型如何进行私有化部署”，作为子任务 1.1.7。
            </div> */}
            {total > 0 && (
                <div className={styles["latest-query"]}>
                    <div className={styles["latest-query-heard"]}>
                        <div className={styles["latest-query-title"]}>
                            <OutlineListTodoIcon />
                            <span>最新队列</span>
                        </div>

                        <YakitTag color='warning' fullRadius={true}>
                            {total}
                        </YakitTag>
                    </div>
                    <div className={styles["latest-query-list"]}>
                        {queues.map((item) => (
                            <div key={item.id} className={styles["latest-query-list-item"]}>
                                <OutlineChatIcon />
                                <span>{item.user_input}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
})

export const AITaskClearNotice: React.FC<AITaskClearNoticeProps> = React.memo((props) => {
    const {item} = props
    const {nodeLabel} = useAINodeLabel(item.NodeIdVerbose)
    return (
        <div className={styles["task-update-notice"]}>
            <div className={styles["task-update-notice-heard"]}>
                <SolidSpeakerphoneIcon />
                <span>任务队列更新通知</span>
            </div>
            <div className={styles["user-update-content"]}>{nodeLabel}:已清空所有任务队列数据</div>
        </div>
    )
})
