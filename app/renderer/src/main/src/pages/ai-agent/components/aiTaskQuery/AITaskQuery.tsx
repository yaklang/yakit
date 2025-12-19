import React, {useMemo, useState} from "react"
import {AITaskQueryItemProps, AITaskQueryProps} from "./type"
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
import {useCreation, useDebounceFn, useMemoizedFn} from "ahooks"
import {AIInputEventSyncTypeEnum} from "@/pages/ai-re-act/hooks/grpcApi"

export const AITaskQuery: React.FC<AITaskQueryProps> = React.memo((props) => {
    const {chatIPCData} = useChatIPCStore()
    const {handleSendSyncMessage} = useChatIPCDispatcher()

    const [loading, setLoading] = useState<boolean>(false)

    const questionQueue = useMemo(() => {
        return chatIPCData.questionQueue
    }, [chatIPCData.questionQueue])

    const [showList, setShowList] = useState<boolean>(true)

    const onClearTaskQueue = useMemoizedFn(() => {
        if (!chatIPCData.execute) return
        setLoading(true)
        handleSendSyncMessage({
            syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CLEAR_TASK,
            params: {}
        })
        handleSendSyncMessage({
            syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
            params: {}
        })
        setTimeout(() => {
            setLoading(false)
            setShowList(false)
        }, 500)
    })
    return (
        <div className={styles["ai-task-query"]}>
            {showList ? (
                <div className={styles["ai-task-query-list-wrapper"]}>
                    <div className={styles["ai-task-query-list-header"]}>
                        <div className={styles["header-left"]}>
                            <OutlineListTodoIcon className={styles["list-todo-icon"]} />
                            <div className={styles["task-query-title"]}>任务队列</div>
                            <YakitTag size='small' fullRadius={true}>
                                {questionQueue.total}
                            </YakitTag>
                            {/* <OutlineQuestionmarkcircleIcon className={styles["question-mark-circle"]} /> */}
                        </div>
                        <div className={styles["header-right"]}>
                            <YakitButton
                                type='text'
                                danger
                                className={styles["clear-btn"]}
                                onClick={onClearTaskQueue}
                                loading={loading}
                            >
                                清空
                            </YakitButton>
                            <YakitButton type='text2' icon={<OutlineXIcon />} onClick={() => setShowList(false)} />
                        </div>
                    </div>
                    <div className={styles["task-query-list"]}>
                        {questionQueue.data.map((item) => {
                            return <AITaskQueryItem key={item.id} item={item} />
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

const AITaskQueryItem: React.FC<AITaskQueryItemProps> = React.memo((props) => {
    const {item} = props
    const {chatIPCData} = useChatIPCStore()
    const [upLoading, setUpLoading] = useState<boolean>(false)
    const [removeLoading, setRemoveLoading] = useState<boolean>(false)
    const execute = useCreation(() => chatIPCData.execute, [chatIPCData.execute])
    const {handleSendSyncMessage} = useChatIPCDispatcher()
    const onTaskUp = useDebounceFn(
        () => {
            if (!execute || upLoading) return
            setUpLoading(true)
            handleSendSyncMessage({
                syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_JUMP_QUEUE,
                SyncJsonInput: JSON.stringify({task_id: item.id}),
                params: {}
            })
            handleSendSyncMessage({
                syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
                params: {}
            })
            setTimeout(() => {
                setUpLoading(false)
            }, 500)
        },
        {wait: 500, leading: true}
    ).run
    const onTaskRemove = useDebounceFn(
        () => {
            if (!execute || removeLoading) return
            setRemoveLoading(true)
            handleSendSyncMessage({
                syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_REMOVE_TASK,
                SyncJsonInput: JSON.stringify({task_id: item.id}),
                params: {}
            })
            handleSendSyncMessage({
                syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO,
                params: {}
            })
            setTimeout(() => {
                setRemoveLoading(false)
            }, 500)
        },
        {wait: 500, leading: true}
    ).run
    return (
        <div key={item.id} className={styles["task-query-list-item"]}>
            <div className={styles["item-left"]}>
                <OutlineChatIcon className={styles["chat-icon"]} />
                <span className='content-ellipsis' title={item.user_input}>
                    {item.user_input}
                </span>
            </div>
            <div className={styles["item-right"]}>
                <YakitButton type='text2' icon={<OutlineArrowupIcon />} onClick={onTaskUp} loading={upLoading} />
                <YakitButton type='text2' icon={<OutlineTrashIcon />} onClick={onTaskRemove} loading={removeLoading} />
            </div>
        </div>
    )
})
