import React, {memo, useEffect, useRef} from "react"
import styles from "./HistoryTaskTree.module.scss" // 假设你有对应的样式文件
import {HistoryTaskTreeItemProps, HistoryTaskTreeProps} from "./HistoryTaskTreeType"
import {useCreation, useInViewport, useMemoizedFn} from "ahooks"
import useChatIPCDispatcher from "../../useContext/ChatIPCContent/useDispatcher"
import {AIInputEventSyncTypeEnum, AITaskStatus} from "@/pages/ai-re-act/hooks/grpcApi"
import emiter from "@/utils/eventBus/eventBus"
import {AITree} from "../../aiTree/AITree"
import useChatIPCStore from "../../useContext/ChatIPCContent/useStore"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import YakitCollapse from "@/components/yakitUI/YakitCollapse/YakitCollapse"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {formatTimestamp} from "@/utils/timeUtil"
import {OutlineLoadingIcon} from "@/assets/icon/outline"
import {AIChatLeft} from "../AIAgentChatTemplate"

export const HistoryTaskTree: React.FC<HistoryTaskTreeProps> = memo((props) => {
    const {data, handleTabChange} = props
    const {handleSendSyncMessage, chatIPCEvents} = useChatIPCDispatcher()
    const {chatIPCData} = useChatIPCStore()

    const historyContainerRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(historyContainerRef)
    useEffect(() => {
        emiter.on("onRefreshAITaskHistoryList", onSendPlayHistoryList)
        return () => {
            emiter.off("onRefreshAITaskHistoryList", onSendPlayHistoryList)
        }
    }, [])

    useEffect(() => {
        inViewPort && onSendPlayHistoryList()
    }, [inViewPort])

    const onSendPlayHistoryList = useMemoizedFn(() => {
        chatIPCData.execute && handleSendSyncMessage({syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS})
    })
    const onRecover = useMemoizedFn((coordinatorId: string) => {
        if (!coordinatorId) return
        handleSendSyncMessage({
            syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_PLAN_AND_EXEC,
            SyncJsonInput: JSON.stringify({coordinator_id: coordinatorId})
        })
        handleTabChange(AIChatLeft.TaskTree)
    })
    const getTaskInfo = useMemoizedFn(() => {
        return chatIPCEvents.fetchTaskChatID()
    })

    const isShowLoading = useMemoizedFn((coordinatorId: string) => {
        const taskInfo = getTaskInfo()
        return taskInfo?.status === AITaskStatus.inProgress && taskInfo.coordinatorId === coordinatorId
    })
    return (
        <div className={styles["history-task-tree-container"]} ref={historyContainerRef}>
            {data.records.length === 0 ? (
                <YakitEmpty style={{marginTop: "20%"}} title='暂无历史任务' />
            ) : (
                <YakitCollapse
                    destroyInactivePanel
                    accordion
                    bordered={false}
                    defaultActiveKey={[data.records[0]?.coordinator_id]}
                >
                    {data.records.map((item) => {
                        return (
                            <YakitCollapse.YakitPanel
                                header={
                                    <div className={styles["history-task-tree-item-header"]}>
                                        <div className={styles["history-task-tree-item-header-left"]}>
                                            <div
                                                className={styles["history-task-tree-item-header-title"]}
                                                title={item?.root_task_name}
                                            >
                                                {item?.root_task_name}
                                            </div>
                                        </div>
                                        {isShowLoading(item.coordinator_id) ? (
                                            <YakitButton
                                                type='text'
                                                style={{paddingRight: 0}}
                                                icon={<OutlineLoadingIcon className={styles["icon-primary"]} />}
                                            />
                                        ) : (
                                            <YakitButton
                                                type='text'
                                                onClick={() => onRecover(item.coordinator_id)}
                                                style={{paddingRight: 0}}
                                            >
                                                继续任务
                                            </YakitButton>
                                        )}
                                    </div>
                                }
                                key={item.coordinator_id}
                            >
                                <HistoryTaskTreeItem item={item} />
                            </YakitCollapse.YakitPanel>
                        )
                    })}
                </YakitCollapse>
            )}
        </div>
    )
})

/**任务历史的单个树节点 */
const HistoryTaskTreeItem: React.FC<HistoryTaskTreeItemProps> = memo((props) => {
    const {item} = props

    const time = useCreation(() => {
        return formatTimestamp(item.created_at_unix)
    }, [item.created_at_unix])
    return (
        <div className={styles["tree-item"]}>
            <div className={styles["time"]}>更新时间:{time}</div>
            <AITree tasks={item.task_tree} className={styles["tree-wrapper"]} />
        </div>
    )
})
