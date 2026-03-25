import React, {memo, useEffect, useRef, useState} from "react"
import styles from "./HistoryTaskTree.module.scss" // 假设你有对应的样式文件
import {AIHistoryContinueTaskProps, HistoryTaskTreeItemProps, HistoryTaskTreeProps} from "./HistoryTaskTreeType"
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
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {yakitNotify} from "@/utils/notification"

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

    const taskStatus = useCreation(() => {
        return chatIPCData.taskStatus
    }, [chatIPCData.taskStatus])

    const onSendPlayHistoryList = useMemoizedFn(() => {
        chatIPCData.execute && handleSendSyncMessage({syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS})
    })
    const getTaskId = useMemoizedFn(() => {
        const taskInfo = getTaskInfo()
        return taskInfo?.taskID || ""
    })
    const onRecover = useMemoizedFn((coordinatorId: string) => {
        const taskId = getTaskId()
        if (!coordinatorId) return
        // 选停止当前任务，再发送恢复的数据
        !!taskId &&
            handleSendSyncMessage({
                syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
                SyncJsonInput: JSON.stringify({task_id: taskId})
            })
        chatIPCEvents.handleCancelLoadingChange("task", true)
        setTimeout(() => {
            handleSendSyncMessage({
                syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_PLAN_AND_EXEC,
                SyncJsonInput: JSON.stringify({coordinator_id: coordinatorId})
            })
        }, 200)
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
                                            <AIHistoryContinueTask
                                                item={item}
                                                isExecuting={taskStatus.loading}
                                                onRecover={onRecover}
                                            />
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

const AIHistoryContinueTask: React.FC<AIHistoryContinueTaskProps> = React.memo((props) => {
    const {chatIPCEvents} = useChatIPCDispatcher()
    const {chatIPCData} = useChatIPCStore()

    const {item, isExecuting, onRecover} = props
    const [visible, setVisible] = useState<boolean>(false)

    const cancelTaskLoading = useCreation(() => {
        return chatIPCData.cancelTaskLoading
    }, [chatIPCData.cancelTaskLoading])

    const getCoordinatorId = useMemoizedFn(() => {
        const taskInfo = getTaskInfo()
        return taskInfo?.coordinatorId || ""
    })
    const getTaskId = useMemoizedFn(() => {
        const taskInfo = getTaskInfo()
        return taskInfo?.taskID || ""
    })
    const getTaskInfo = useMemoizedFn(() => {
        return chatIPCEvents.fetchTaskChatID()
    })

    return (
        <YakitPopconfirm
            title={!!getTaskId() ? "停掉当前正在执行的任务，恢复此任务" : "是否确认恢复该此任务"}
            onConfirm={(e) => {
                e?.stopPropagation()
                onRecover(item.coordinator_id)
            }}
            onCancel={(e) => {
                e?.stopPropagation()
                setVisible(false)
            }}
            visible={visible}
            onVisibleChange={(v) => {
                if (isExecuting) return
                setVisible(v)
            }}
        >
            <YakitButton
                type='text'
                onClick={(e) => {
                    e.stopPropagation()
                    if (isExecuting) {
                        yakitNotify("error", "请停止当前任务规划后再点击“继续任务”")
                        return
                    }
                }}
                style={{paddingRight: 0}}
                loading={getCoordinatorId() === item.coordinator_id && cancelTaskLoading}
            >
                继续任务
            </YakitButton>
        </YakitPopconfirm>
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
