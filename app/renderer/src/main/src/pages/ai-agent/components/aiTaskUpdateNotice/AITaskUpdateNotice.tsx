import React from "react"
import {AITaskUpdateNoticeProps} from "./type"
import {SolidSpeakerphoneIcon} from "@/assets/icon/solid"
import {OutlineChatIcon, OutlineListTodoIcon} from "@/assets/icon/outline"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"
import styles from "./AITaskUpdateNotice.module.scss"
/**任务队列更新通知 */
export  const AITaskUpdateNotice: React.FC<AITaskUpdateNoticeProps> = React.memo((props) => {
    return (
        <div className={styles["task-update-notice"]}>
            <div className={styles["task-update-notice-heard"]}>
                <SolidSpeakerphoneIcon />
                <span>任务队列更新通知</span>
            </div>
            <div className={styles["user-update-content"]}>移出任务：这里是用户输入内容</div>
            <div className={styles["update-reason"]}>
                移出原因：将任务信息补充到深度规划任务“京东云的 DeepSeek-V3 模型如何进行私有化部署”，作为子任务 1.1.7。
            </div>
            <div className={styles["latest-query"]}>
                <div className={styles["latest-query-heard"]}>
                    <div className={styles["latest-query-title"]}>
                        <OutlineListTodoIcon />
                        <span>最新队列</span>
                    </div>

                    <YakitTag color='warning' fullRadius={true}>
                        4
                    </YakitTag>
                </div>
                <div className={styles["latest-query-list"]}>
                    {["项目规划", "市场分析", "技术选型", "风险评估"].map((item) => (
                        <div key={item} className={styles["latest-query-list-item"]}>
                            <OutlineChatIcon />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
})
