import React, {useEffect, useMemo, useState} from "react"
import {AIReActTaskChatContentProps, AIReActTaskChatLeftSideProps, AIReActTaskChatProps} from "./AIReActTaskChatType"
import styles from "./AIReActTaskChat.module.scss"
import {ColorsBrainCircuitIcon} from "@/assets/icon/colors"
import {AIAgentChatStream, AIChatLeftSide} from "@/pages/ai-agent/chatTemplate/AIAgentChatTemplate"
import {useControllableValue, useCreation, useMemoizedFn} from "ahooks"
import classNames from "classnames"
import useChatIPCStore from "@/pages/ai-agent/useContext/ChatIPCContent/useStore"
import {ChevrondownButton} from "../aiReActChat/AIReActComponent"
import {AIReActTaskChatReview} from "@/pages/ai-agent/aiAgentChat/AIAgentChat"
import {
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineExitIcon,
    OutlinePositionIcon,
    RedoDotIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import {AIReviewType} from "../hooks/aiRender"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {AIInputEventSyncTypeEnum} from "../hooks/grpcApi"
import {Tooltip} from "antd"
import {AIReActTaskChatReviewProps} from "@/pages/ai-agent/aiAgentChat/type"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"

const AIReActTaskChat: React.FC<AIReActTaskChatProps> = React.memo((props) => {
    const {setShowFreeChat, setTimeLine} = props
    const {taskChat} = useChatIPCStore().chatIPCData
    const [leftExpand, setLeftExpand] = useState(true)
    const [expand, setExpand] = useState(false)

    const onIsExpand = useMemoizedFn(() => {
        setLeftExpand(expand)
        setShowFreeChat(expand)
        setExpand((v) => !v)
    })

    useEffect(() => {
        setTimeLine(leftExpand)
    }, [leftExpand])

    return (
        <div className={styles["ai-re-act-task-chat"]}>
            <AIReActTaskChatLeftSide leftExpand={leftExpand} setLeftExpand={setLeftExpand} />
            {!!taskChat?.elements?.length && (
                <div className={styles["chat-content-wrapper"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>
                            <ColorsBrainCircuitIcon />
                            深度规划
                        </div>
                        <div className={styles["extra"]}>
                            <YakitButton
                                type='text2'
                                icon={expand ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
                                onClick={onIsExpand}
                            />
                        </div>
                    </div>
                    <AIReActTaskChatContent />
                </div>
            )}
        </div>
    )
})

export default AIReActTaskChat

const AIReActTaskChatContent: React.FC<AIReActTaskChatContentProps> = React.memo((props) => {
    const {reviewInfo, planReviewTreeKeywordsMap, chatIPCData} = useChatIPCStore()

    const {activeChat} = useAIAgentStore()
    const {taskChat} = chatIPCData

    const {handleSendSyncMessage, chatIPCEvents} = useChatIPCDispatcher()

    const streams = useCreation(() => {
        return taskChat.elements
    }, [taskChat.elements])

    const [scrollToBottom, setScrollToBottom] = useState(false)
    const onScrollToBottom = useMemoizedFn(() => {
        setScrollToBottom((v) => !v)
    })
    const getTaskId = useMemoizedFn(() => {
        return chatIPCEvents.fetchTaskChatID()
    })
    /**取消当前指定任务 */
    const onStopTask = useMemoizedFn(() => {
        const taskId = getTaskId()
        if (!taskId) return
        handleSendSyncMessage({
            syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
            SyncJsonInput: JSON.stringify({task_id: taskId})
        })
        if (!!reviewInfo) {
            chatIPCEvents.handleTaskReviewRelease((reviewInfo.data as AIReviewType).id)
        }
    })
    /**取消当前执行的子任务 */
    const onStopSubTask = useMemoizedFn(() => {
        handleSendSyncMessage({
            syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKIP_SUBTASK_IN_PLAN,
            SyncJsonInput: JSON.stringify({reason: "用户认为这个任务不需要执行", skip_current_task: true})
        })
        if (!!reviewInfo) {
            chatIPCEvents.handleTaskReviewRelease((reviewInfo.data as AIReviewType).id)
        }
    })
    const onExtraAction: AIReActTaskChatReviewProps["onExtraAction"] = useMemoizedFn((type) => {
        switch (type) {
            case "stopTask":
                onStopTask()
                break
            case "stopSubTask":
                onStopSubTask()
                break
            default:
                break
        }
    })
    return (
        <>
            <div className={styles["tab-content"]}>
                <AIAgentChatStream
                    streams={streams}
                    session={activeChat?.session || ""}
                    scrollToBottom={scrollToBottom}
                    taskStatus={chatIPCData.taskStatus}
                />
            </div>
            {!!reviewInfo ? (
                <AIReActTaskChatReview
                    reviewInfo={reviewInfo}
                    planReviewTreeKeywordsMap={planReviewTreeKeywordsMap}
                    setScrollToBottom={setScrollToBottom}
                    onExtraAction={onExtraAction}
                    showCancelSubtask={taskChat.plan.length > 0}
                />
            ) : (
                streams.length > 0 && (
                    <div className={styles["footer"]}>
                        {!!getTaskId() && (
                            <>
                                {taskChat.plan.length > 0 && (
                                    <YakitPopconfirm
                                        onConfirm={onStopSubTask}
                                        title='是否确认取消该子任务，取消后会按顺序执行下一个子任务'
                                        placement='top'
                                    >
                                        <YakitButton
                                            type='outline1'
                                            icon={<RedoDotIcon />}
                                            className={styles["task-sub-button"]}
                                            radius='28px'
                                            size='large'
                                            colors='danger'
                                        >
                                            跳过子任务
                                        </YakitButton>
                                    </YakitPopconfirm>
                                )}
                                <YakitPopconfirm
                                    onConfirm={onStopTask}
                                    title='是否确认取消整个任务，确认将停止执行'
                                    placement='top'
                                >
                                    <Tooltip overlay='终止任务' placement='top'>
                                        <YakitButton
                                            type='primary'
                                            icon={<OutlineExitIcon />}
                                            className={styles["task-button"]}
                                            radius='28px'
                                            size='large'
                                            colors='danger'
                                        />
                                    </Tooltip>
                                </YakitPopconfirm>
                            </>
                        )}
                        <YakitButton
                            type='outline2'
                            icon={<OutlinePositionIcon />}
                            radius='50%'
                            onClick={onScrollToBottom}
                            className={styles["position-button"]}
                            size='large'
                        />
                    </div>
                )
            )}
        </>
    )
})

export const AIReActTaskChatLeftSide: React.FC<AIReActTaskChatLeftSideProps> = React.memo((props) => {
    const {taskChat} = useChatIPCStore().chatIPCData
    const [leftExpand, setLeftExpand] = useControllableValue(props, {
        defaultValue: true,
        valuePropName: "leftExpand",
        trigger: "setLeftExpand"
    })
    const hasStreams = useMemo(() => {
        return (taskChat?.elements?.length ?? 0) > 0
    }, [taskChat?.elements?.length])

    return (
        <div
            className={classNames(styles["content-left-side"], {
                [styles["content-left-side-hidden"]]: !leftExpand
            })}
            style={hasStreams ? undefined : {width: "100%"}}
        >
            <AIChatLeftSide expand={leftExpand} setExpand={setLeftExpand} tasks={taskChat.plan} />
            <div className={styles["open-wrapper"]} onClick={() => setLeftExpand(true)}>
                <ChevrondownButton />
                <div className={styles["text"]}>任务列表</div>
            </div>
        </div>
    )
})
