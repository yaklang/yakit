import React, {useMemo, useState} from "react"
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
import useChatIPCStore from "../../useContext/ChatIPCContent/useStore"
import useChatIPCDispatcher from "../../useContext/ChatIPCContent/useDispatcher"

export const AITaskQuery: React.FC<AITaskQueryProps> = React.memo((props) => {
    const {chatIPCData} = useChatIPCStore()
    const questionQueue = useMemo(() => {
        return chatIPCData.questionQueue
    }, [chatIPCData.questionQueue])

    const {handleSendSyncMessage} = useChatIPCDispatcher()

    const [showList, setShowList] = useState<boolean>(true)
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
                        {questionQueue.data.map((item) => {
                            const {id, user_input} = item
                            return (
                                <div key={id} className={styles["task-query-list-item"]}>
                                    <div className={styles["item-left"]}>
                                        <OutlineChatIcon className={styles["chat-icon"]} />
                                        <span>{user_input}</span>
                                    </div>
                                    <div className={styles["item-right"]}>
                                        <YakitButton
                                            type='text2'
                                            icon={<OutlineArrowupIcon />}
                                            onClick={() => {
                                                handleSendSyncMessage({
                                                    syncType: "react_jump_queue",
                                                    SyncJsonInput: JSON.stringify({task_id: id}),
                                                    params: {}
                                                })
                                                // 下面这个请求要加防抖节流
                                                handleSendSyncMessage({
                                                    syncType: "queue_info",
                                                    params: {}
                                                })
                                            }}
                                        />
                                        <YakitButton
                                            type='text2'
                                            icon={<OutlineTrashIcon />}
                                            onClick={() => {
                                                handleSendSyncMessage({
                                                    syncType: "react_remove_task",
                                                    SyncJsonInput: JSON.stringify({task_id: id}),
                                                    params: {}
                                                })
                                                // 下面这个请求要加防抖节流
                                                handleSendSyncMessage({
                                                    syncType: "queue_info",
                                                    params: {}
                                                })
                                            }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
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
