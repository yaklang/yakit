import {useEffect, useRef, useState} from "react"
import {yakitNotify} from "@/utils/notification"
import {useCreation, useInterval, useMemoizedFn, useThrottleFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import useAIPerfData, {UseAIPerfDataTypes} from "./useAIPerfData"
import useCasualChat from "./useCasualChat"
import useYakExecResult, {UseYakExecResultTypes} from "./useYakExecResult"
import useTaskChat from "./useTaskChat"
import {genErrorLogData, handleGrpcDataPushLog} from "./utils"
import {
    AIChatIPCStartParams,
    AIChatSendParams,
    AIFileSystemPin,
    AIQuestionQueues,
    CasualLoadingStatus,
    PlanLoadingStatus,
    UseCasualChatEvents,
    UseChatIPCEvents,
    UseChatIPCParams,
    UseChatIPCState
} from "./type"
import {AIAgentGrpcApi, AIInputEvent, AIInputEventSyncTypeEnum, AIOutputEvent} from "./grpcApi"
import useAIChatLog from "./useAIChatLog"
import cloneDeep from "lodash/cloneDeep"
import {
    convertNodeIdToVerbose,
    DeafultAIQuestionQueues,
    DefaultCasualLoadingStatus,
    DefaultMemoryList,
    DefaultPlanLoadingStatus
} from "./defaultConstant"
import useThrottleState from "@/hook/useThrottleState"

const {ipcRenderer} = window.require("electron")

function useChatIPC(params?: UseChatIPCParams): [UseChatIPCState, UseChatIPCEvents]

function useChatIPC(params?: UseChatIPCParams) {
    const {
        getRequest,
        onTaskStart,
        onTaskReview,
        onTaskReviewExtra,
        onReviewRelease,
        onTimelineMessage,
        onEnd,
        onNotifyMessage
    } = params || {}

    // #region 全局公共方法集合
    /** 自由对话(ReAct)-review 信息的自动释放 */
    const handleCasualReviewRelease = useMemoizedFn((id: string) => {
        onReviewRelease && onReviewRelease("casual", id)
    })
    // 任务规划-review 信息的自动释放
    const handleTaskReviewRelease = useMemoizedFn((id: string) => {
        onReviewRelease && onReviewRelease("task", id)
    })

    /** 获取当前grpc接口的请求参数 */
    const fetchRequestParams = useMemoizedFn(() => {
        return getRequest?.()
    })

    // 向进行中的grpc流接口发送请求
    const sendRequest = useMemoizedFn((request: AIInputEvent) => {
        if (!chatID.current) return
        console.log("send-ai-re-act---\n", chatID.current, request)
        ipcRenderer.invoke("send-ai-re-act", chatID.current, request)
    })
    // #endregion

    // #region 全局状态变量
    /** 通信的唯一标识符 */
    const chatID = useRef<string>("")
    const fetchToken = useMemoizedFn(() => {
        return chatID.current
    })

    // 通信的状态
    const [execute, setExecute, getExecute] = useGetSetState(false)
    // #endregion

    // CoordinatorIDs
    const [coordinatorIDs, setCoordinatorIDs] = useState<string[]>([])

    // #region 接口更新的(文件|文件夹)数据集合
    const [grpcFolders, setGrpcFolders] = useState<AIFileSystemPin[]>([])
    const handleSetGrpcFolders = useMemoizedFn((info: AIFileSystemPin) => {
        setGrpcFolders((old) => {
            const isExist = old.find((item) => item.path === info.path)
            if (!!isExist) return old
            return [...old, info]
        })
    })

    const handleResetGrpcFile = useMemoizedFn(() => {
        setGrpcFolders([])
    })
    // #endregion

    // #region grpc流里所有的runtimeIDs集合
    const [runTimeIDs, setRunTimeIDs] = useState<string[]>([])

    const handleResetRunTimeIDs = useMemoizedFn(() => {
        setRunTimeIDs([])
    })
    // #endregion

    // #region 问题队列相关逻辑
    // 问题队列(自由对话专属)[todo: 后续存在任务规划的问题队列后，需要放入对应的hook中进行处理和储存]
    const [questionQueue, setQuestionQueue] = useState<AIQuestionQueues>(cloneDeep(DeafultAIQuestionQueues))

    const handleResetQuestionQueue = useMemoizedFn(() => {
        setQuestionQueue(cloneDeep(DeafultAIQuestionQueues))
    })
    // #endregion

    // #region 实时记忆列表相关逻辑
    const reactMemorys = useRef<AIAgentGrpcApi.MemoryEntryList>(cloneDeep(DefaultMemoryList))
    const taskMemorys = useRef<AIAgentGrpcApi.MemoryEntryList>(cloneDeep(DefaultMemoryList))
    const [memoryList, setMemoryList] = useState<AIAgentGrpcApi.MemoryEntryList>(cloneDeep(DefaultMemoryList))

    const handleResetMemoryList = useMemoizedFn(() => {
        reactMemorys.current = cloneDeep(DefaultMemoryList)
        taskMemorys.current = cloneDeep(DefaultMemoryList)
        setMemoryList(cloneDeep(DefaultMemoryList))
    })
    // #endregion

    //#region 时间线相关逻辑
    // 实时时间线
    const [reActTimelines, setReActTimelines] = useThrottleState<AIAgentGrpcApi.TimelineItem[]>([], {wait: 100})

    const handleResetReActTimelines = useMemoizedFn(() => {
        setReActTimelines([])
    })
    //#endregion

    // #region 系统信息流展示相关逻辑
    /** 记录都存在过的系统信息uuid, 只展示最新的一条系统信息 */
    const systemEventUUID = useRef<string[]>([])
    const [systemStream, setSystemStream] = useState("")
    const handleSetSystemStream = useMemoizedFn((uuid: string, content: string) => {
        const lastUUID = systemEventUUID.current[systemEventUUID.current.length - 1]
        if (lastUUID) {
            if (lastUUID === uuid) {
                setSystemStream((old) => old + content)
            } else {
                if (systemEventUUID.current.includes(uuid)) return
                systemEventUUID.current.push(uuid)
                setSystemStream(content)
            }
        } else {
            systemEventUUID.current.push(uuid)
            setSystemStream(content)
        }
    })
    const handleResetSystemStream = useMemoizedFn(() => {
        systemEventUUID.current = []
        setSystemStream("")
    })
    // #endregion

    // #region 单次流执行时的输出展示数据
    // 日志
    const logEvents = useAIChatLog()

    // AI性能相关数据和逻辑
    const [aiPerfData, aiPerfDataEvent] = useAIPerfData({pushLog: logEvents.pushLog})
    // 执行过程中插件输出的卡片
    const [yakExecResult, yakExecResultEvent] = useYakExecResult({pushLog: logEvents.pushLog})
    // #endregion

    // #region 自由对话(ReAct)相关变量和hook
    const casualChatID = useRef("")
    /** 自由对话(ReAct)的loading状态 */
    const [casualStatus, setCasualStatus] = useState<CasualLoadingStatus>(cloneDeep(DefaultCasualLoadingStatus))
    const handleResetCasualChatLoading = useMemoizedFn(() => {
        casualChatID.current = ""
        setCasualStatus(cloneDeep(DefaultCasualLoadingStatus))
    })

    const [casualChat, casualChatEvent] = useCasualChat({
        pushLog: logEvents.pushLog,
        getRequest: fetchRequestParams,
        onReviewRelease: handleCasualReviewRelease
    })
    // #endregion

    // #region 任务规划相关变量和hook
    /** 任务规划对应的问题ID */
    const taskChatID = useRef("")
    const fetchTaskChatID = useMemoizedFn(() => {
        return taskChatID.current
    })

    /** 当前任务规划对应的数据流-CoordinatorId */
    const planCoordinatorId = useRef("")
    /** 任务规划的loading状态 */
    const [taskStatus, setTaskStatus] = useState<PlanLoadingStatus>(cloneDeep(DefaultPlanLoadingStatus))

    const handleResetTaskChatLoading = useMemoizedFn(() => {
        taskChatID.current = ""
        planCoordinatorId.current = ""
        setTaskStatus(cloneDeep(DefaultPlanLoadingStatus))
    })

    const [taskChat, taskChatEvent] = useTaskChat({
        pushLog: logEvents.pushLog,
        getRequest: fetchRequestParams,
        onReview: onTaskReview,
        onReviewExtra: onTaskReviewExtra,
        onReviewRelease: handleTaskReviewRelease,
        sendRequest: sendRequest
    })
    // #endregion

    /** grpc接口流断开瞬间, 需要将状态相关变量进行重置 */
    const handleResetGrpcStatus = useMemoizedFn(() => {
        taskChatEvent.handleCloseGrpc()
        chatID.current = ""
        setExecute(false)
        handleResetCasualChatLoading()
        handleResetTaskChatLoading()
    })

    // #region 问题和问题队列相关逻辑
    /** 更新问题队列状态 */
    const handleTriggerQuestionQueueRequest = useThrottleFn(
        () => {
            sendRequest({IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO})
        },
        {wait: 50, leading: false}
    ).run

    // 问题入队|出队变化时-进行通知逻辑
    const handleQuestionQueueStatusChange = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const {Type, NodeId, NodeIdVerbose, Timestamp} = res
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.QuestionQueueStatusChange
            onNotifyMessage &&
                onNotifyMessage({
                    Type,
                    NodeId,
                    NodeIdVerbose,
                    Timestamp,
                    Content: data.react_task_input
                })
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: logEvents.pushLog
            })
        } finally {
            handleTriggerQuestionQueueRequest()
        }
    })

    // 问题队列清空操作-进行通知逻辑
    const handleReActTaskCleared = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const {Type, NodeId, NodeIdVerbose, Timestamp} = res
            onNotifyMessage &&
                onNotifyMessage({
                    Type,
                    NodeId,
                    NodeIdVerbose,
                    Timestamp,
                    Content: "已清空所有任务队列数据"
                })
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: logEvents.pushLog
            })
        }
    })
    // #endregion

    // #region review事件相关方法
    /** review 界面选项触发事件 */
    const onSend = useMemoizedFn(({token, type, params, optionValue, extraValue}: AIChatSendParams) => {
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
                        extraValue,
                        cb: () => {
                            sendRequest(params)
                        }
                    })
                    break

                default:
                    sendRequest(params)
                    break
            }
        } catch (error) {}
    })
    // #endregion

    /** 重置所有数据 */
    const onReset = useMemoizedFn(() => {
        chatID.current = ""
        setExecute(false)
        handleResetGrpcFile()
        handleResetRunTimeIDs()
        setCoordinatorIDs([])
        handleResetQuestionQueue()
        handleResetMemoryList()
        handleResetReActTimelines()
        handleResetSystemStream()
        handleResetCasualChatLoading()
        handleResetTaskChatLoading()

        // logEvents.clearLogs()
        aiPerfDataEvent.handleResetData()
        yakExecResultEvent.handleResetData()
        casualChatEvent.handleResetData()
        taskChatEvent.handleResetData()
    })

    /** 需要轮询获取最新的数据请求 */
    const handleStartQuestionQueue = useMemoizedFn(() => {
        // 获取最新问题队列数据
        sendRequest({IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO})
        // 获取最新记忆列表数据
        sendRequest({IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_MEMORY_CONTEXT})
    })

    const onStart = useMemoizedFn((args: AIChatIPCStartParams) => {
        const {token, params, extraValue} = args

        if (execute) {
            yakitNotify("warning", "useChatIPC AI任务正在执行中，请稍后再试！")
            return
        }
        onReset()
        setExecute(true)
        chatID.current = token
        ipcRenderer.on(`${token}-data`, (e, res: AIOutputEvent) => {
            try {
                // 记录会话中所有的 CoordinatorId
                if (res.CoordinatorId) {
                    setCoordinatorIDs((old) => {
                        if (old.includes(res.CoordinatorId)) return old
                        return [...old, res.CoordinatorId]
                    })
                }

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
                        // 设置任务规划对应的问题ID, 并清除自由对话(ReAct)的loading状态
                        taskChatID.current = startInfo["re-act_task"]
                        if (casualChatID.current === taskChatID.current) handleResetCasualChatLoading()
                        // 标记grpc流里属于任务规划的流
                        planCoordinatorId.current = startInfo.coordinator_id
                        // 任务规划的loading开始置为true
                        setTaskStatus(() => ({loading: true, plan: "加载中...", task: "加载中..."}))
                        // 触发任务规划UI展示的回调
                        onTaskStart && onTaskStart()
                    }
                    return
                }
                if (res.Type === "end_plan_and_execution") {
                    // 结束任务规划，并传出任务规划流的标识 coordinator_id
                    const startInfo = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStartPlanAndExecution
                    if (startInfo.coordinator_id && planCoordinatorId.current === startInfo.coordinator_id) {
                        taskChatEvent.handlePlanExecEnd(res)
                        taskChatEvent.handleCloseGrpc()
                        handleResetTaskChatLoading()
                    }
                    return
                }

                if (res.Type === "memory_context") {
                    // 实时记忆列表
                    const lists = JSON.parse(ipcContent) as AIAgentGrpcApi.MemoryEntryList
                    if (planCoordinatorId.current === res.CoordinatorId) {
                        taskMemorys.current = lists
                    } else {
                        reactMemorys.current = lists
                    }
                    try {
                        const newMemoryEntryList: AIAgentGrpcApi.MemoryEntryList = {
                            memories: [
                                ...(taskMemorys.current.memories || []),
                                ...(reactMemorys.current.memories || [])
                            ],
                            memory_pool_limit:
                                Number(taskMemorys.current.memory_pool_limit) +
                                Number(reactMemorys.current.memory_pool_limit),
                            memory_session_id: reactMemorys.current.memory_session_id,
                            total_memories:
                                Number(taskMemorys.current.total_memories) +
                                Number(reactMemorys.current.total_memories),
                            total_size:
                                Number(taskMemorys.current.total_size) + Number(reactMemorys.current.total_size),
                            score_overview: {
                                A_total:
                                    Number(taskMemorys.current.score_overview.A_total) +
                                    Number(reactMemorys.current.score_overview.A_total),
                                C_total:
                                    Number(taskMemorys.current.score_overview.C_total) +
                                    Number(reactMemorys.current.score_overview.C_total),
                                E_total:
                                    Number(taskMemorys.current.score_overview.E_total) +
                                    Number(reactMemorys.current.score_overview.E_total),

                                O_total:
                                    Number(taskMemorys.current.score_overview.O_total) +
                                    Number(reactMemorys.current.score_overview.O_total),
                                P_total:
                                    Number(taskMemorys.current.score_overview.P_total) +
                                    Number(reactMemorys.current.score_overview.P_total),
                                R_total:
                                    Number(taskMemorys.current.score_overview.R_total) +
                                    Number(reactMemorys.current.score_overview.R_total),
                                T_total:
                                    Number(taskMemorys.current.score_overview.T_total) +
                                    Number(reactMemorys.current.score_overview.T_total)
                            }
                        }
                        setMemoryList(newMemoryEntryList)
                    } catch (error) {}

                    return
                }

                if (["filesystem_pin_directory", "filesystem_pin_filename"].includes(res.Type)) {
                    // 会话在本地缓存数据的(文件夹/文件)路径-更新就通知[不区分自由对话和任务规划]
                    const {path} = JSON.parse(ipcContent) as AIAgentGrpcApi.FileSystemPin
                    handleSetGrpcFolders({path, isFolder: res.Type === "filesystem_pin_directory"})
                    return
                }

                if (res.Type === "structured" && ["react_task_enqueue", "react_task_dequeue"].includes(res.NodeId)) {
                    // 展示只通知自由对话里的问题出入队消息
                    if (planCoordinatorId.current === res.CoordinatorId) return
                    // 问题入队/问题出队
                    handleQuestionQueueStatusChange(res)
                    return
                }
                if (res.Type === "structured" && res.NodeId === "react_task_cleared") {
                    // 展示只通知自由对话里的问题出入队消息
                    if (planCoordinatorId.current === res.CoordinatorId) return
                    // 问题队列清空操作
                    handleReActTaskCleared(res)
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
                    return
                }

                if (res.Type === "structured") {
                    const obj = JSON.parse(ipcContent) || ""

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
                    } else if (res.NodeId === "react_task_status_changed") {
                        // 只负责获取自由对话的任务状态
                        if (planCoordinatorId.current === res.CoordinatorId) return
                        /* 问题的状态变化 */
                        const {react_task_id, react_task_now_status} = JSON.parse(
                            ipcContent
                        ) as AIAgentGrpcApi.ReactTaskChanged

                        if (react_task_now_status === "processing") {
                            casualChatID.current = react_task_id
                            setCasualStatus(() => ({loading: true, title: "thinking..."}))
                        }

                        if (react_task_now_status === "completed") {
                            handleResetCasualChatLoading()
                        }
                        return
                    } else if (res.NodeId === "timeline_item") {
                        /* 问题的状态变化 */
                        const timelineItem = JSON.parse(ipcContent) as AIAgentGrpcApi.TimelineItem
                        setReActTimelines((old) => [...old, timelineItem])
                        return
                    } else if (res.NodeId === "status") {
                        const data = JSON.parse(ipcContent) as {key: string; value: string}
                        if (data.key === "re-act-loading-status-key") {
                            if (planCoordinatorId.current === res.CoordinatorId) {
                                // 任务规划-loading展示标题
                                setTaskStatus((old) => {
                                    if (old.loading) {
                                        return {...old, task: data.value || "加载中..."}
                                    }
                                    return old
                                })
                            } else {
                                // 自由对话-loading展示标题
                                setCasualStatus((old) => {
                                    if (old.loading) {
                                        return {...old, title: data.value || "thinking..."}
                                    }
                                    return old
                                })
                            }
                        } else if (data.key === "plan-executing-loading-status-key") {
                            if (planCoordinatorId.current === res.CoordinatorId) {
                                // 任务规划-loading展示标题
                                setTaskStatus((old) => {
                                    if (old.loading) {
                                        return {...old, plan: data.value || "加载中..."}
                                    }
                                    return old
                                })
                            }
                        } else {
                            // 执行状态卡片处理
                            yakExecResultEvent.handleSetData(res)
                        }
                    } else {
                        // 因为流数据有日志类型，所以都放入日志逻辑过滤一遍
                        if (res.NodeId === "stream-finished") {
                            const {event_writer_id} = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStreamFinished
                            if (!event_writer_id) {
                                logEvents.pushLog(
                                    genErrorLogData(res.Timestamp, `stream-finished数据异常, event_writer_id缺失`)
                                )
                                return
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

                if (res.Type === "stream") {
                    if (res.IsSystem || res.IsReason) {
                        const {CallToolID, TaskIndex, NodeId, NodeIdVerbose, EventUUID, StreamDelta, ContentType} = res
                        if (!NodeId || !EventUUID) return
                        let ipcStreamDelta = Uint8ArrayToString(StreamDelta) || ""
                        const content = ipcContent + ipcStreamDelta
                        logEvents.pushLog({
                            type: "stream",
                            Timestamp: res.Timestamp,
                            data: {
                                TaskIndex,
                                CallToolID,
                                NodeId,
                                NodeIdVerbose: NodeIdVerbose || convertNodeIdToVerbose(NodeId),
                                EventUUID,
                                status: "start",
                                content: content,
                                ContentType
                            }
                        })

                        // 输出实时系统信息流
                        if (res.IsSystem) handleSetSystemStream(EventUUID, content)
                        return
                    }

                    if (planCoordinatorId.current === res.CoordinatorId) {
                        taskChatEvent.handleSetData(res)
                    } else {
                        casualChatEvent.handleSetData(res)
                    }
                    return
                }

                // 自由对话和任务规划共用的类型
                if (planCoordinatorId.current === res.CoordinatorId) {
                    taskChatEvent.handleSetData(res)
                } else {
                    casualChatEvent.handleSetData(res)
                }
                return
            } catch (error) {
                handleGrpcDataPushLog({info: res, pushLog: logEvents.pushLog})
            }
        })
        ipcRenderer.on(`${token}-end`, (e, res: any) => {
            console.log("end", res)
            handleResetGrpcStatus()
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
        casualChatEvent.handleSend({
            request: {...params, IsFreeInput: true, FreeInput: params?.Params?.UserQuery || ""},
            extraValue
        })

        ipcRenderer.invoke("start-ai-re-act", token, params)
        setTimeout(() => {
            handleStartQuestionQueue()
        }, 50)
    })

    const onClose = useMemoizedFn((token: string, option?: {tip: () => void}) => {
        ipcRenderer.invoke("cancel-ai-re-act", token).catch(() => {})
        if (option?.tip) {
            option.tip()
        } else {
            // yakitNotify("info", "useChatIPC AI 任务已取消")
        }
    })

    /** 获取自由对话(ReAct)指定mapKey的详情数据 */
    const getCasualMap = useMemoizedFn((mapKey: string) => {
        return casualChatEvent.handleGetContentMap(mapKey)
    })
    /** 获取任务规划指定mapKey的详情数据 */
    const getTaskMap = useMemoizedFn((mapKey: string) => {
        return taskChatEvent.handleGetContentMap(mapKey)
    })

    useInterval(
        () => {
            handleStartQuestionQueue()
        },
        execute ? 5000 : undefined
    )

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

    const event: UseChatIPCEvents = useCreation(() => {
        return {
            fetchToken,
            fetchTaskChatID,
            onStart,
            onSend,
            onClose,
            onReset,
            handleTaskReviewRelease,
            getCasualMap,
            getTaskMap
        }
    }, [])

    return [
        {
            execute,
            runTimeIDs,
            yakExecResult,
            aiPerfData,
            casualChat,
            taskChat,
            grpcFolders,
            questionQueue,
            casualStatus,
            reActTimelines,
            memoryList,
            taskStatus,
            systemStream,
            coordinatorIDs
        },
        event
    ] as const
}

export default useChatIPC
