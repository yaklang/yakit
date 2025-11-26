import {useEffect, useRef, useState} from "react"
import {yakitNotify} from "@/utils/notification"
import {useInterval, useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import useAIPerfData, {UseAIPerfDataTypes} from "./useAIPerfData"
import useCasualChat, {UseCasualChatTypes} from "./useCasualChat"
import useYakExecResult, {UseYakExecResultTypes} from "./useYakExecResult"
import useTaskChat, {UseTaskChatTypes} from "./useTaskChat"
import {handleGrpcDataPushLog} from "./utils"
import {
    AIChatSendParams,
    AIQuestionQueues,
    UseCasualChatEvents,
    UseChatIPCEvents,
    UseChatIPCParams,
    UseChatIPCState
} from "./type"
import {AIAgentGrpcApi, AIInputEvent, AIOutputEvent} from "./grpcApi"
import useAIChatLog from "./useAIChatLog"
import cloneDeep from "lodash/cloneDeep"
import {AIInputEventSyncTypeEnum, DeafultAIQuestionQueues} from "./defaultConstant"

const {ipcRenderer} = window.require("electron")

/** 任务规划和自由对话共用的类型 */
const UseCasualAndTaskTypes = [
    "tool_use_review_require",
    "require_user_interactive",
    "review_release",
    "stream",
    "tool_call_start",
    "tool_call_user_cancel",
    "tool_call_done",
    "tool_call_error",
    "tool_call_watcher",
    "tool_call_summary",
    // 对 tool_review 的 ai 评分
    "ai_review_start",
    "ai_review_countdown",
    "ai_review_end",
    // 文件系统操作相关
    "filesystem_pin_directory",
    "filesystem_pin_filename",
    // 决策总结
    "tool_call_decision"
]

function useChatIPC(params?: UseChatIPCParams): [UseChatIPCState, UseChatIPCEvents]

function useChatIPC(params?: UseChatIPCParams) {
    const {getRequest, onTaskStart, onTaskReview, onTaskReviewExtra, onReviewRelease, onTimelineMessage, onEnd} =
        params || {}

    // 自由对话-review 信息的自动释放
    const handleCasualReviewRelease = useMemoizedFn((id: string) => {
        onReviewRelease && onReviewRelease("casual", id)
    })
    // 任务规划-review 信息的自动释放
    const handleTaskReviewRelease = useMemoizedFn((id: string) => {
        onReviewRelease && onReviewRelease("task", id)
    })

    // 执行中的接口流里请求的配置参数
    const fetchRequestParams = useMemoizedFn(() => {
        return getRequest?.()
    })

    // 向接口发送消息
    const sendRequest = useMemoizedFn((request: AIInputEvent) => {
        if (!chatID.current) return
        ipcRenderer.invoke("send-ai-re-act", chatID.current, request)
    })

    // #region 启动流接口后的相关全局数据
    // 通信的唯一标识符
    const chatID = useRef<string>("")
    const fetchToken = useMemoizedFn(() => {
        return chatID.current
    })

    // 通信的状态
    const [execute, setExecute, getExecute] = useGetSetState(false)
    // #endregion

    // #region 单次流执行时的输出展示数据
    // RunTimeIDs
    const [runTimeIDs, setRunTimeIDs] = useState<string[]>([])

    // 接口流里的文件树路径集合
    const [grpcFolders, setGrpcFolders] = useState<string[]>([])
    const handleSetGrpcFolders = useMemoizedFn((path: string) => {
        setGrpcFolders((old) => {
            if (old.includes(path)) {
                return old
            }
            return [...old, path]
        })
    })

    // 问题队列(自由对话专属)[todo: 后续存在任务规划的问题队列后，需要放入对应的hook中进行处理和储存]
    const [questionQueue, setQuestionQueue, getQuestionQueue] = useGetSetState<AIQuestionQueues>(
        cloneDeep(DeafultAIQuestionQueues)
    )
    // 开始定时循环获取问题队列
    const handleStartQuestionQueue = useMemoizedFn(() => {
        setTimeout(() => {
            sendRequest({IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO})
        }, 50)
    })

    useInterval(
        () => {
            sendRequest({IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO})
        },
        execute ? 5000 : undefined
    )

    // 日志
    const logEvents = useAIChatLog()

    // AI性能相关数据和逻辑
    const [aiPerfData, aiPerfDataEvent] = useAIPerfData({pushLog: logEvents.pushLog})
    // 执行过程中插件输出的卡片
    const [yakExecResult, yakExecResultEvent] = useYakExecResult({pushLog: logEvents.pushLog})

    /**
     * 触发任务规划的问题id(react_task_id)
     * 用于取消任务规划
     */
    const reactTaskToAsync = useRef<string>("")
    const fetchReactTaskToAsync = useMemoizedFn(() => {
        return reactTaskToAsync.current
    })

    // 设置任务规划的标识ID
    const planCoordinatorId = useRef<string>("")

    // 自由对话相关数据和逻辑
    const [casualChat, casualChatEvent] = useCasualChat({
        pushLog: logEvents.pushLog,
        getRequest: fetchRequestParams,
        onReviewRelease: handleCasualReviewRelease,
        onGrpcFolder: handleSetGrpcFolders,
        sendRequest: sendRequest,
        getQuestionQueue
    })

    // 任务规划相关数据和逻辑
    const [taskChat, taskChatEvent] = useTaskChat({
        pushLog: logEvents.pushLog,
        getRequest: fetchRequestParams,
        onReview: onTaskReview,
        onReviewExtra: onTaskReviewExtra,
        onReviewRelease: handleTaskReviewRelease,
        sendRequest: sendRequest,
        onGrpcFolder: handleSetGrpcFolders
    })
    // #endregion

    // #region review事件相关方法
    /** review 界面选项触发事件 */
    const onSend = useMemoizedFn(({token, type, params, optionValue}: AIChatSendParams) => {
        try {
            if (!execute) {
                yakitNotify("warning", "AI 未执行任务，无法发送选项")
                return
            }
            if (!chatID || chatID.current !== token) {
                yakitNotify("warning", "该选项非本次 AI 执行的回答选项")
                return
            }

            switch (type) {
                case "casual":
                case "task":
                    const events: UseCasualChatEvents | UseChatIPCEvents =
                        type === "casual" ? casualChatEvent : taskChatEvent
                    events.handleSend({
                        request: params,
                        optionValue,
                        cb: () => {
                            console.log("send-ai-re-act---\n", token, params)
                            ipcRenderer.invoke("send-ai-re-act", token, params)
                        }
                    })
                    break

                default:
                    console.log("send-ai-re-act---\n", token, params)
                    ipcRenderer.invoke("send-ai-re-act", token, params)
                    break
            }
        } catch (error) {}
    })
    // #endregion

    /** 重置所有数据 */
    const onReset = useMemoizedFn(() => {
        chatID.current = ""
        setExecute(false)
        setRunTimeIDs([])
        setGrpcFolders([])
        // handleResetQuestionQueueTimer()
        setQuestionQueue(cloneDeep(DeafultAIQuestionQueues))
        // logEvents.clearLogs()
        aiPerfDataEvent.handleResetData()
        yakExecResultEvent.handleResetData()
        planCoordinatorId.current = ""
        casualChatEvent.handleResetData()
        taskChatEvent.handleResetData()
    })

    const onStart = useMemoizedFn((token: string, params: AIInputEvent) => {
        if (execute) {
            yakitNotify("warning", "useChatIPC AI任务正在执行中，请稍后再试！")
            return
        }
        onReset()
        setExecute(true)
        chatID.current = token
        ipcRenderer.on(`${token}-data`, (e, res: AIOutputEvent) => {
            try {
                // 记录会话中所有的RunTimeID
                setRunTimeIDs((old) => {
                    if (!res.CallToolID || old.includes(res.CallToolID)) return old
                    return [...old, res.CallToolID]
                })

                let ipcContent = Uint8ArrayToString(res.Content) || ""
                console.log("onStart-res", res, ipcContent)

                if (res.Type === "start_plan_and_execution") {
                    // 触发任务规划，并传出任务规划流的标识 coordinator_id
                    const startInfo = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStartPlanAndExecution
                    if (startInfo.coordinator_id && planCoordinatorId.current !== startInfo.coordinator_id) {
                        onTaskStart && onTaskStart(startInfo.coordinator_id)
                        planCoordinatorId.current = startInfo.coordinator_id
                    }
                    return
                }
                if (res.Type === "end_plan_and_execution") {
                    // 结束任务规划，并传出任务规划流的标识 coordinator_id
                    const startInfo = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStartPlanAndExecution
                    if (startInfo.coordinator_id && planCoordinatorId.current === startInfo.coordinator_id) {
                        taskChatEvent.handlePlanExecEnd(res)
                    }
                    return
                }

                if (res.Type === "ai_task_switched_to_async") {
                    // 准备执行任务规划的问题id(react_task_id)
                    const reactTaskInfo = JSON.parse(ipcContent) as AIAgentGrpcApi.ReactTaskToAsync
                    reactTaskToAsync.current = reactTaskInfo.task_id
                    return
                }

                if (UseAIPerfDataTypes.includes(res.Type)) {
                    // AI性能数据处理
                    aiPerfDataEvent.handleSetData(res)
                    return
                }

                if (UseYakExecResultTypes.includes(res.Type)) {
                    // 执行过程中插件输出的卡片
                    yakExecResultEvent.handleSetData(res)

                    // 其中的文件输出也要和对话内容绑定一次
                    if (planCoordinatorId.current === res.CoordinatorId) {
                        taskChatEvent.handleSetData(res)
                    } else {
                        casualChatEvent.handleSetData(res)
                    }

                    return
                }

                if (res.Type === "structured") {
                    const obj = JSON.parse(ipcContent) || ""
                    // if (!obj || typeof obj !== "object") return

                    if (obj?.level) {
                        // 执行日志信息
                        const data = obj as AIAgentGrpcApi.Log
                        logEvents.pushLog({
                            type: "log",
                            Timestamp: res.Timestamp,
                            data: data
                        })
                    } else if (res.NodeId === "timeline") {
                        const data = JSON.parse(ipcContent) as AIAgentGrpcApi.TimelineDump
                        onTimelineMessage && onTimelineMessage(data.dump)
                    } else if (res.NodeId === "queue_info") {
                        // 因为问题队列也分自由对话和任务规划队列，所以需要先屏蔽处理任务规划的队列信息
                        if (planCoordinatorId.current === res.CoordinatorId) return
                        // 问题队列信息由chatIPC-hook进行收集
                        const {tasks, total_tasks} = JSON.parse(ipcContent) as AIAgentGrpcApi.QuestionQueues
                        setQuestionQueue({
                            total: total_tasks,
                            data: tasks ?? []
                        })
                        return
                    } else {
                        // 因为流数据有日志类型，所以都放入日志逻辑过滤一遍
                        if (res.NodeId === "stream-finished") {
                            const {event_writer_id} = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStreamFinished
                            if (!event_writer_id) {
                                throw new Error("stream-finished data is invalid")
                            }
                            logEvents.sendStreamLog(event_writer_id)
                        }

                        if (planCoordinatorId.current === res.CoordinatorId) {
                            taskChatEvent.handleSetData(res)
                        } else {
                            casualChatEvent.handleSetData(res)
                        }
                    }
                    return
                }

                if (UseCasualChatTypes.includes(res.Type)) {
                    // 专属自由对话类型的流数据
                    if (!!planCoordinatorId.current && planCoordinatorId.current === res.CoordinatorId) {
                        handleGrpcDataPushLog({info: res, pushLog: logEvents.pushLog})
                        return
                    }
                    casualChatEvent.handleSetData(res)
                    return
                }

                if (UseTaskChatTypes.includes(res.Type)) {
                    // 专属任务规划类型的流数据
                    if (!planCoordinatorId.current || planCoordinatorId.current !== res.CoordinatorId) {
                        handleGrpcDataPushLog({info: res, pushLog: logEvents.pushLog})
                        return
                    }
                    taskChatEvent.handleSetData(res)
                    return
                }

                if (UseCasualAndTaskTypes.includes(res.Type)) {
                    // 自由对话和任务规划共用的类型
                    if (planCoordinatorId.current === res.CoordinatorId) {
                        taskChatEvent.handleSetData(res)
                    } else {
                        casualChatEvent.handleSetData(res)
                    }
                    return
                }
                handleGrpcDataPushLog({info: res, pushLog: logEvents.pushLog})
            } catch (error) {
                handleGrpcDataPushLog({info: res, pushLog: logEvents.pushLog})
            }
        })
        ipcRenderer.on(`${token}-end`, (e, res: any) => {
            console.log("end", res)
            taskChatEvent.handleCloseGrpc()
            setExecute(false)
            onEnd && onEnd()

            ipcRenderer.invoke("cancel-ai-re-act", token).catch(() => {})
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-end`)
            ipcRenderer.removeAllListeners(`${token}-error`)
        })
        ipcRenderer.on(`${token}-error`, (e, err: any) => {
            console.log("error", err)
            yakitNotify("error", `AI执行失败: ${err}`)
        })
        console.log("start-ai-re-act", token, params)

        // 初次用户对话的问题，属于自由对话中的问题
        casualChatEvent.handleSend({request: {IsFreeInput: true, FreeInput: params?.Params?.UserQuery || ""}})

        ipcRenderer.invoke("start-ai-re-act", token, params)
        handleStartQuestionQueue()
    })

    const onClose = useMemoizedFn((token: string, option?: {tip: () => void}) => {
        ipcRenderer.invoke("cancel-ai-re-act", token).catch(() => {})
        if (option?.tip) {
            option.tip()
        } else {
            // yakitNotify("info", "useChatIPC AI 任务已取消")
        }
    })

    useEffect(() => {
        return () => {
            if (getExecute() && chatID.current) {
                onClose(chatID.current)
                onReset()
            }
            // 多个接口流不会清空，只在页面卸载时触发清空并关闭页面
            logEvents.cancelLogsWin()
        }
    }, [])

    return [
        {execute, runTimeIDs, yakExecResult, aiPerfData, casualChat, taskChat, grpcFolders, questionQueue},
        {fetchToken, fetchReactTaskToAsync, onStart, onSend, onClose, onReset}
    ] as const
}

export default useChatIPC
