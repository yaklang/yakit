import React, {useEffect, useRef, useState} from "react"
import {
    AIReActTaskChatContentProps,
    AIReActTaskChatLeftSideProps,
    AIReActTaskChatProps,
    AIReActTaskRecommendProps,
    AIRenderTaskFooterExtraProps
} from "./AIReActTaskChatType"
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
    OutlinePlay2Icon,
    OutlinePlussmIcon,
    OutlinePositionIcon,
    RedoDotIcon
} from "@/assets/icon/outline"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import useChatIPCDispatcher from "@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher"
import {AIReviewType} from "../hooks/aiRender"
import {YakitPopconfirm} from "@/components/yakitUI/YakitPopconfirm/YakitPopconfirm"
import {AIInputEventSyncTypeEnum, AITaskStatus} from "../hooks/grpcApi"
import {Tooltip} from "antd"
import useAIAgentStore from "@/pages/ai-agent/useContext/useStore"
import emiter from "@/utils/eventBus/eventBus"
import {randomString} from "@/utils/randomUtil"
import useGetAIMaterialsData, {getAIRecommendIconByType} from "../hooks/useGetAIMaterialsData"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {AIMaterialsData, AIRecommendItem} from "@/pages/ai-agent/aiChatWelcome/type"
import {YakitRoute} from "@/enums/yakitRoute"
import {AIMentionCommandParams} from "@/pages/ai-agent/components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin"

const AIReActTaskChat: React.FC<AIReActTaskChatProps> = React.memo((props) => {
    const {setShowFreeChat, setTimeLine} = props

    const [{randomAIMaterialsData, loadingAIMaterials}] = useGetAIMaterialsData()

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

    const onClickItem = useMemoizedFn((item: AIRecommendItem, mentionType: AIMentionCommandParams["mentionType"]) => {
        const params: AIMentionCommandParams = {
            mentionId: randomString(8),
            mentionType,
            mentionName: item.name
        }
        emiter.emit(
            "setAIInputByType",
            JSON.stringify({
                type: "mention",
                params
            })
        )
    })
    return (
        <div className={styles["ai-re-act-task-chat"]}>
            <AIReActTaskChatLeftSide leftExpand={leftExpand} setLeftExpand={setLeftExpand} />
            {!!taskChat?.elements?.length ? (
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
            ) : (
                <YakitSpin spinning={loadingAIMaterials}>
                    <div className={styles["re-act-task-empty-wrapper"]}>
                        <div className={styles["heard"]}>
                            <div className={styles["title"]}>扩展资源</div>
                            <div className={styles["sub-title"]}>专注于安全编码与漏洞分析的智能助手</div>
                        </div>
                        <div className={styles["list-wrapper"]}>
                            {Object.keys(randomAIMaterialsData).map((key) => {
                                const aiItem: AIMaterialsData =
                                    randomAIMaterialsData[key as keyof typeof randomAIMaterialsData]
                                return aiItem.data.length > 0 ? (
                                    <AIReActTaskRecommend
                                        key={aiItem.type}
                                        title={aiItem.type}
                                        data={aiItem.data}
                                        onClickItem={(item) => onClickItem(item, aiItem.mentionType)}
                                    />
                                ) : (
                                    <React.Fragment key={aiItem.type}></React.Fragment>
                                )
                            })}
                        </div>
                    </div>
                </YakitSpin>
            )}
        </div>
    )
})

export default AIReActTaskChat

const AIReActTaskRecommend: React.FC<AIReActTaskRecommendProps> = React.memo((props) => {
    const {title, data, onClickItem} = props
    const icons = useCreation(() => {
        return getAIRecommendIconByType(title)
    }, [title])
    const onAdd = useMemoizedFn(() => {
        switch (title) {
            case "技能":
                emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AddAIForge}))
                break
            case "知识库":
                emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AI_REPOSITORY}))
                break
            case "工具":
                emiter.emit("menuOpenPage", JSON.stringify({route: YakitRoute.AddAITool}))
                break

            default:
                break
        }
    })
    return (
        <div className={styles["re-act-recommend-list-wrapper"]}>
            <div className={styles["re-act-recommend-list-heard"]}>
                <div className={styles["title"]}>
                    <div className={styles["icon"]}>{icons.icon}</div>
                    <div className={styles["hover-icon"]}>{icons.hoverIcon}</div>
                    {title}
                </div>
                <YakitButton icon={<OutlinePlussmIcon />} className={styles["add-btn"]} type='text' onClick={onAdd}>
                    新建
                </YakitButton>
            </div>
            <div className={styles["re-act-recommend-list"]}>
                {data.map((item, index) => (
                    <div
                        key={index} //不需要缓存，每次刷新重新渲染
                        className={styles["re-act-recommend-list-item"]}
                        onClick={() => onClickItem(item)}
                    >
                        <span className={styles["text"]}>{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    )
})

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

    const getTaskInfo = useMemoizedFn(() => {
        return chatIPCEvents.fetchTaskChatID()
    })
    const getTaskId = useMemoizedFn(() => {
        return getTaskInfo()?.taskID
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
        emiter.emit("onRefreshAITaskHistoryList")
    })
    /**取消当前执行的子任务 */
    const onStopSubTask = useMemoizedFn((syncID: string) => {
        handleSendSyncMessage({
            syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_SKIP_SUBTASK_IN_PLAN,
            SyncJsonInput: JSON.stringify({reason: "用户认为这个任务不需要执行", skip_current_task: true}),
            syncID: syncID
        })
        if (!!reviewInfo) {
            chatIPCEvents.handleTaskReviewRelease((reviewInfo.data as AIReviewType).id)
        }
        setTimeout(() => {
            handleSendSyncMessage({syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN_EXEC_TASKS})
            emiter.emit("onRefreshAITaskHistoryList")
        }, 500)
    })
    const onExtraAction = useMemoizedFn((type: "stopTask" | "stopSubTask" | "recover", syncID: string) => {
        switch (type) {
            case "stopTask":
                onStopTask()
                break
            case "stopSubTask":
                onStopSubTask(syncID)
                break
            case "recover":
                onRecover()
                break
            default:
                break
        }
    })
    const onRecover = useMemoizedFn(() => {
        const info = getTaskInfo()
        const coordinatorId = info?.coordinatorId
        const taskId = info?.taskID
        if (!coordinatorId) return
        // 选停止当前任务，再发送恢复的数据
        !!taskId &&
            handleSendSyncMessage({
                syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_REACT_CANCEL_TASK,
                SyncJsonInput: JSON.stringify({task_id: taskId})
            })

        setTimeout(() => {
            handleSendSyncMessage({
                syncType: AIInputEventSyncTypeEnum.SYNC_TYPE_RECOVERY_PLAN_AND_EXEC,
                SyncJsonInput: JSON.stringify({coordinator_id: coordinatorId})
            })
        }, 200)
        emiter.emit("onRefreshAITaskHistoryList")
        if (!!reviewInfo) {
            chatIPCEvents.handleTaskReviewRelease((reviewInfo.data as AIReviewType).id)
        }
    })

    return (
        <>
            <div className={styles["tab-content"]}>
                <AIAgentChatStream
                    streams={streams}
                    session={activeChat?.SessionID || ""}
                    scrollToBottom={scrollToBottom}
                    taskStatus={chatIPCData.taskStatus}
                />
            </div>
            {!!reviewInfo ? (
                <AIReActTaskChatReview
                    reviewInfo={reviewInfo}
                    planReviewTreeKeywordsMap={planReviewTreeKeywordsMap}
                    setScrollToBottom={setScrollToBottom}
                    footerExtra={(node) => (
                        <AIRenderTaskFooterExtra
                            onExtraAction={onExtraAction}
                            btnProps={{size: "middle"}}
                            subTaskBtnProps={{
                                size: "middle",
                                type: "outline2",
                                className: "",
                                colors: "primary",
                                radius: "4px"
                            }}
                        >
                            {node}
                        </AIRenderTaskFooterExtra>
                    )}
                />
            ) : (
                streams.length > 0 && (
                    <div className={styles["footer"]}>
                        {!!getTaskId() && (
                            <>
                                <AIRenderTaskFooterExtra onExtraAction={onExtraAction} />
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

const AIRenderTaskFooterExtra: React.FC<AIRenderTaskFooterExtraProps> = React.memo((props) => {
    const {onExtraAction, btnProps, subTaskBtnProps, children} = props
    const {chatIPCEvents} = useChatIPCDispatcher()
    const {chatIPCData, syncIdInfoMap} = useChatIPCStore()

    const syncIdOfStopSubTask = useRef<string>("")

    const taskChat = useCreation(() => {
        return chatIPCData.taskChat
    }, [chatIPCData.taskChat])

    const taskStatus = useCreation(() => {
        return chatIPCData.taskStatus
    }, [chatIPCData.taskStatus])

    const cancelTaskLoading = useCreation(() => {
        return chatIPCData.cancelTaskLoading
    }, [chatIPCData.cancelTaskLoading])
    const getTaskInfo = useMemoizedFn(() => {
        return chatIPCEvents.fetchTaskChatID()
    })

    const renderBtn = useMemoizedFn(() => {
        switch (getTaskInfo()?.status) {
            case AITaskStatus.inProgress:
                return (
                    <YakitPopconfirm
                        onConfirm={() => {
                            chatIPCEvents.handleCancelLoadingChange("task", true)
                            onExtraAction("stopTask", "")
                        }}
                        title='是否确认取消执行当前任务规划，确认将停止执行'
                        placement='top'
                    >
                        <YakitButton
                            type='primary'
                            icon={<OutlineExitIcon />}
                            className={styles["task-button"]}
                            radius='28px'
                            size='large'
                            colors='danger'
                            loading={cancelTaskLoading}
                            {...btnProps}
                        />
                    </YakitPopconfirm>
                )
            case AITaskStatus.error:
                return !taskStatus.loading ? (
                    <Tooltip overlay='恢复任务' placement='top'>
                        <YakitButton
                            type='primary'
                            icon={<OutlinePlay2Icon />}
                            radius='28px'
                            size='large'
                            onClick={() => {
                                chatIPCEvents.handleCancelLoadingChange("task", true)
                                onExtraAction("recover", "")
                            }}
                            loading={cancelTaskLoading}
                            {...btnProps}
                        >
                            继续任务
                        </YakitButton>
                    </Tooltip>
                ) : (
                    <YakitButton
                        type='primary'
                        icon={<OutlineExitIcon />}
                        className={styles["task-button"]}
                        radius='28px'
                        size='large'
                        colors='danger'
                        loading={true}
                    >
                        停止任务中...
                    </YakitButton>
                )
            default:
                return null
        }
    })
    return (
        <>
            {getTaskInfo()?.status === AITaskStatus.inProgress && taskChat.plan.length > 0 && (
                <YakitPopconfirm
                    onConfirm={() => {
                        syncIdOfStopSubTask.current = randomString(8)
                        onExtraAction("stopSubTask", syncIdOfStopSubTask.current)
                    }}
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
                        loading={!!syncIdInfoMap?.get(syncIdOfStopSubTask.current)}
                        {...subTaskBtnProps}
                    >
                        跳过子任务
                    </YakitButton>
                </YakitPopconfirm>
            )}
            {children}
            {renderBtn()}
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

    return (
        <div
            className={classNames(styles["content-left-side"], {
                [styles["content-left-side-hidden"]]: !leftExpand
            })}
        >
            <AIChatLeftSide expand={leftExpand} setExpand={setLeftExpand} tasks={taskChat.plan} />
            <div className={styles["open-wrapper"]} onClick={() => setLeftExpand(true)}>
                <ChevrondownButton />
                <div className={styles["text"]}>任务列表</div>
            </div>
        </div>
    )
})
