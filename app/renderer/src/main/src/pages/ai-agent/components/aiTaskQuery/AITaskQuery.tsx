import React, {useState} from "react"
import {AITaskQueryProps} from "./type"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {
    OutlineArrowupIcon,
    OutlineChatIcon,
    OutlineListTodoIcon,
    OutlineQuestionmarkcircleIcon,
    OutlineTrashIcon,
    OutlineXIcon
} from "@/assets/icon/outline"
import styles from "./AITaskQuery.module.scss"
import {YakitTag} from "@/components/yakitUI/YakitTag/YakitTag"

export const AITaskQuery: React.FC<AITaskQueryProps> = React.memo((props) => {
    const [showList, setShowList] = useState<boolean>(false)
    return (
        <div className={styles["ai-task-query"]}>
            {showList ? (
                <div className={styles["ai-task-query-list-wrapper"]}>
                    <div className={styles["ai-task-query-list-header"]}>
                        <div className={styles["header-left"]}>
                            <OutlineListTodoIcon className={styles["list-todo-icon"]} />
                            <div className={styles["task-query-title"]}>任务队列</div>
                            <YakitTag size='small' fullRadius={true}>
                                5
                            </YakitTag>
                            <OutlineQuestionmarkcircleIcon className={styles["question-mark-circle"]} />
                        </div>
                        <div className={styles["header-right"]}>
                            <YakitButton type='text' danger className={styles["clear-btn"]}>
                                清空
                            </YakitButton>
                            <YakitButton type='text2' icon={<OutlineXIcon />} onClick={() => setShowList(false)} />
                        </div>
                    </div>
                    <div className={styles["task-query-list"]}>
                        {["项目规划", "市场分析", "技术选型", "风险评估"].map((item) => (
                            <div key={item} className={styles["task-query-list-item"]}>
                                <div className={styles["item-left"]}>
                                    <OutlineChatIcon className={styles["chat-icon"]} />
                                    <span>{item}</span>
                                </div>
                                <div className={styles["item-right"]}>
                                    <YakitButton type='text2' icon={<OutlineArrowupIcon />} />
                                    <YakitButton type='text2' icon={<OutlineTrashIcon />} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <YakitButton
                    type='outline2'
                    icon={<OutlineListTodoIcon />}
                    radius={9999}
                    onClick={() => setShowList(true)}
                >
                    任务队列
                </YakitButton>
            )}
        </div>
    )
})
