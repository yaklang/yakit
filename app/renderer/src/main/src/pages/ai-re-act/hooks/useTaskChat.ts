import {useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {
    AIInputEventSyncTypeEnum,
    AIReviewJudgeLevelMap,
    convertNodeIdToVerbose,
    DefaultAIToolResult,
    TaskDefaultReToolResultSummary
} from "./defaultConstant"
import {AIChatLogData, handleSendFunc, UseTaskChatEvents, UseTaskChatParams, UseTaskChatState} from "./type"
import {
    genBaseAIChatData,
    genExecTasks,
    handleGrpcDataPushLog,
    isAutoContinueReview,
    isToolExecStream,
    isToolStderrStream,
    isToolStdoutStream,
    noSkipReviewTypes
} from "./utils"
import {yakitNotify} from "@/utils/notification"
import {AIAgentGrpcApi, AIOutputEvent} from "./grpcApi"
import {
    AIChatQSData,
    AIChatQSDataTypeEnum,
    AIReviewType,
    AIStreamOutput,
    AITaskInfoProps,
    AIToolResult,
    ToolStreamSelectors
} from "./aiRender"
import {getLocalFileName} from "@/components/MilkdownEditor/CustomFile/utils"

// 属于该 hook 处理数据的类型
export const UseTaskChatTypes = [
    "plan_review_require",
    "plan_task_analysis",
    "task_review_require",
    "plan",
    "fail_plan_and_execution"
]

function useTaskChat(params?: UseTaskChatParams): [UseTaskChatState, UseTaskChatEvents]

function useTaskChat(params?: UseTaskChatParams) {
    const {pushLog, getRequest, onReview, onReviewExtra, onReviewRelease, sendRequest, onGrpcFolder} = params || {}

    const handlePushLog = useMemoizedFn((logInfo: AIChatLogData) => {
        pushLog && pushLog(logInfo)
    })

    // #region 数据相关
    // plan_review 原始树结构
    const planTree = useRef<AIAgentGrpcApi.PlanTask>()
    const fetchPlanTree = useMemoizedFn(() => {
        return cloneDeep(planTree.current)
    })
    const [plan, setPlan] = useState<AITaskInfoProps[]>([])

    const review = useRef<AIChatQSData>()
    const currentPlansId = useRef<string>("")

    // 存放流式输出的EventUUID的集合
    const eventUUIDs = useRef<Set<string>>(new Set())
    const handleSetEventUUID = useMemoizedFn((id: string) => {
        if (!eventUUIDs.current.has(id)) eventUUIDs.current.add(id)
    })
    const [streams, setStreams] = useState<AIChatQSData[]>([])
    // #endregion

    // #region 工具执行过程相关数据和逻辑
    /** @description 工具执行过程的数据和工具相关的流数据，在执行过程中，顺序是无序，所以需要对其关联记录 */
    /**
     * 这里存放着已经展示到UI上的tool_工具名_stdout流
     * 对应关系是call_tool_id -> EventUUID
     * 供无序的tool_call_watcher消息判断是直接UI展示还是先储存着
     */
    const showUIToolSelectorsUUID = useRef<Map<string, string>>(new Map())
    // 工具执行过程-可操作选项 map
    const toolStdOutSelectors = useRef<Map<string, ToolStreamSelectors>>(new Map())
    const setToolStdOutSelectorMap = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCallWatcher

            if (!data?.call_tool_id || !data?.id || !data?.selectors || !data.selectors?.length) {
                throw new Error("tool_call_watcher data is invalid")
            }

            if (showUIToolSelectorsUUID.current.has(data.call_tool_id)) {
                const eventUUID = showUIToolSelectorsUUID.current.get(data.call_tool_id)
                setStreams((old) => {
                    let newArr = [...old]
                    const itemInfo = newArr.find((item) => {
                        if (item.type === "stream" && item.data) {
                            const {NodeId, EventUUID, CallToolID} = item.data
                            return (
                                isToolStdoutStream(NodeId) &&
                                EventUUID === eventUUID &&
                                CallToolID === data.call_tool_id
                            )
                        }
                        return false
                    })
                    if (!!itemInfo && itemInfo.type === "stream") {
                        itemInfo.data.selectors = {
                            callToolId: data.call_tool_id,
                            InteractiveId: data.id,
                            selectors: data.selectors
                        }
                    }

                    return newArr
                })
                showUIToolSelectorsUUID.current.delete(data.call_tool_id)
            } else {
                toolStdOutSelectors.current.set(data.call_tool_id, {
                    callToolId: data.call_tool_id,
                    InteractiveId: data.id,
                    selectors: data.selectors
                })
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // 工具执行结果-map
    const toolResultMap = useRef<Map<string, AIToolResult>>(new Map())
    const setToolResultMap = useMemoizedFn((callToolId: string, value: Partial<AIToolResult>) => {
        let current = toolResultMap.current.get(callToolId) || cloneDeep(DefaultAIToolResult)
        current = {
            ...current,
            ...value
        }
        toolResultMap.current.set(callToolId, current)
    })

    /**
     * 工具执行结果的错误信息处理
     * 因为错误信息是流数据，所以统一收集到一个地方，等流输出结束后再进行信息的赋值
     * 需要两个map进行储存，一个是eventUUID -> callToolId，另一个是eventUUID -> 错误信息
     */
    const errorUUIDToCallToolId = useRef<Map<string, string>>(new Map())
    const errorUUIDToMessage = useRef<Map<string, {content: string; status: "start" | "end"}>>(new Map())
    const handleSetErrorToolMessage = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const {CallToolID, EventUUID, Content, StreamDelta} = res

            let ipcContent = Uint8ArrayToString(Content) || ""
            let ipcStreamDelta = Uint8ArrayToString(StreamDelta) || ""
            const content = ipcContent + ipcStreamDelta

            errorUUIDToCallToolId.current.set(EventUUID, CallToolID)
            const existing = errorUUIDToMessage.current.get(EventUUID)
            errorUUIDToMessage.current.set(EventUUID, {
                content: existing ? existing.content + content : content,
                status: "start"
            })
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // 错误流信息处理完毕，准备填充到工具结果对象中
    const handleErrorToolMessageEnd = useMemoizedFn((uuid: string) => {
        try {
            const callToolID = errorUUIDToCallToolId.current.get(uuid)
            const errorMessage = errorUUIDToMessage.current.get(uuid)?.content
            if (!callToolID || !errorMessage) {
                errorUUIDToCallToolId.current.delete(uuid)
                errorUUIDToMessage.current.delete(uuid)
                return
            }

            const toolResult = toolResultMap.current.get(callToolID)
            if (toolResult) {
                toolResultMap.current.set(callToolID, {...toolResult, execError: errorMessage || ""})
            } else {
                setStreams((old) => {
                    return old.map((ele) => {
                        if (
                            ele.type === AIChatQSDataTypeEnum.TOOL_RESULT &&
                            !!ele.data &&
                            ele.data.callToolId === callToolID
                        ) {
                            return {
                                ...ele,
                                data: {...ele.data, execError: errorMessage || ""}
                            }
                        }
                        return ele
                    })
                })
            }
            errorUUIDToCallToolId.current.delete(uuid)
            errorUUIDToMessage.current.delete(uuid)
        } catch (error) {}
    })

    // 工具执行过程相关数据重置
    const handleToolCallDataReset = useMemoizedFn(() => {
        showUIToolSelectorsUUID.current.clear()
        toolStdOutSelectors.current.clear()
        toolResultMap.current.clear()
    })
    // #endregion

    // #region 流数据处理相关逻辑
    // 接受流式输出数据并处理
    const handleStreams = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const {
                IsSystem,
                IsReason,
                CallToolID,
                NodeId,
                NodeIdVerbose,
                TaskIndex,
                EventUUID,
                Content,
                StreamDelta,
                ContentType
            } = res
            if (!NodeId || !EventUUID) {
                // 没有对应 UUID 算异常日志
                throw new Error("stream data is invalid")
            }
            if (isToolExecStream(NodeId) && !TaskIndex) {
                // 上述类型没有 taskindex 算异常日志
                throw new Error("stream data is invalid")
            }

            // 工具结果为错误信息时的单独逻辑处理(nodeID为["tool-工具名-stderr"])
            if (isToolStderrStream(NodeId)) {
                handleSetErrorToolMessage(res)
                return
            }

            // 需要显示工具执行操作选项的流，对应的uuid
            if (isToolStdoutStream(NodeId) && !showUIToolSelectorsUUID.current.has(CallToolID)) {
                showUIToolSelectorsUUID.current.set(CallToolID, EventUUID)
            }

            let ipcContent = Uint8ArrayToString(Content) || ""
            let ipcStreamDelta = Uint8ArrayToString(StreamDelta) || ""
            const content = ipcContent + ipcStreamDelta

            const noLog = !IsSystem && !IsReason

            if (noLog) {
                handleSetEventUUID(EventUUID)
                setStreams((old) => {
                    let newArr = [...old]
                    const itemInfo = newArr.find((item) => {
                        if (item.type === "stream" && item.data) {
                            return item.data.NodeId === NodeId && item.data.EventUUID === EventUUID
                        }
                        return false
                    })
                    if (!!itemInfo && itemInfo.type === "stream") {
                        itemInfo.data.content += content
                    } else {
                        const streamsInfo: AIChatQSData = {
                            ...genBaseAIChatData(res),
                            type: AIChatQSDataTypeEnum.STREAM,
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
                        }
                        if (isToolStdoutStream(NodeId) && toolStdOutSelectors.current.has(CallToolID)) {
                            const sls = toolStdOutSelectors.current.get(CallToolID)
                            streamsInfo.data.selectors = sls
                            showUIToolSelectorsUUID.current.delete(CallToolID)
                            toolStdOutSelectors.current.delete(CallToolID)
                        }
                        newArr.push(streamsInfo)
                    }

                    // 出现tool_stdout时，删除前面的call-tools类型数据
                    if (isToolStdoutStream(NodeId)) {
                        newArr = newArr.filter((item) => {
                            if (item.type === "stream" && item.data) {
                                return item.data.NodeId !== "call-tools"
                            }
                            return true
                        })
                    }
                    return newArr
                })
            } else {
                // 输出到日志中
                pushLog?.({
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
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // 将流式输出的状态改成已完成
    const handleUpdateStreamStatus = useMemoizedFn((EventUUID: string) => {
        try {
            if (!eventUUIDs.current.has(EventUUID)) {
                // 没有进入streams变量的数据，可能是不展示的(isToolStderrStream)数据，过滤一遍
                handleErrorToolMessageEnd(EventUUID)
                return
            }
            setStreams((old) => {
                return old.map((item) => {
                    if (item.type === "stream" && item.data && item.data.EventUUID === EventUUID) {
                        item.data = {...item.data, status: "end"}
                        return item
                    }
                    return item
                })
            })
        } catch (error) {}
    })

    // 生成工具执行结果的卡片
    const handleToolResultStatus = useMemoizedFn(
        (res: AIOutputEvent, status: "success" | "failed" | "user_cancelled") => {
            try {
                const ipcContent = Uint8ArrayToString(res.Content) || ""
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall

                if (!data?.call_tool_id) {
                    throw new Error("tool_call_result data is invalid")
                }

                const toolResult = toolResultMap.current.get(data.call_tool_id)
                if (!toolResult) {
                    throw new Error("tool_call_result data is invalid")
                }
                toolResult.status = status
                toolResult.summary =
                    status === "user_cancelled"
                        ? "当前工具调用已被取消，会使用当前输出结果进行后续工作决策"
                        : toolResult.summary || TaskDefaultReToolResultSummary[status]?.label || ""

                setStreams((old) => {
                    let newArr = [...old]

                    const toolStdOut = newArr.find((item) => {
                        if (item.type === "stream" && item.data) {
                            return isToolStdoutStream(item.data.NodeId)
                        }
                        return false
                    })
                    const toolStdOutContent = toolStdOut ? (toolStdOut.data as AIStreamOutput).content : ""
                    const isShowAll = !!(toolStdOutContent && toolStdOutContent.length > 200)
                    const toolStdoutShowContent = isShowAll
                        ? toolStdOutContent.substring(0, 200) + "..."
                        : toolStdOutContent
                    newArr = newArr.filter((item) => {
                        if (item.type === "stream" && item.data) {
                            return !isToolExecStream(item.data.NodeId)
                        }
                        return true
                    })

                    newArr.push({
                        ...genBaseAIChatData(res),
                        type: AIChatQSDataTypeEnum.TOOL_RESULT,
                        data: {
                            ...toolResult,
                            toolStdoutContent: {
                                content: toolStdoutShowContent,
                                isShowAll
                            },
                            TaskIndex: res.TaskIndex || undefined
                        }
                    })
                    return newArr
                })

                toolResultMap.current.delete(data.call_tool_id)
            } catch (error) {
                handleGrpcDataPushLog({
                    info: res,
                    pushLog: handlePushLog
                })
            }
        }
    )
    // 生成工具执行结果卡片里的结果总结内容
    const handleToolResultSummary = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall

            if (!data?.call_tool_id) {
                throw new Error("tool_result data is invalid")
            }

            const toolResult = toolResultMap.current.get(data.call_tool_id)
            if (toolResult) {
                toolResultMap.current.set(data.call_tool_id, {...toolResult, summary: data.summary || ""})
            } else {
                setStreams((old) => {
                    return old.map((ele) => {
                        if (
                            ele.type === AIChatQSDataTypeEnum.TOOL_RESULT &&
                            !!ele.data &&
                            ele.data.callToolId === data.call_tool_id
                        ) {
                            const status = ele.data.status
                            const summary =
                                status === "user_cancelled"
                                    ? "当前工具调用已被取消，会使用当前输出结果进行后续工作决策"
                                    : data.summary || ele.data.summary
                            return {
                                ...ele,
                                data: {...ele.data, summary}
                            }
                        }
                        return ele
                    })
                })
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })
    // #endregion

    // #region  review 相关逻辑
    // 处理 tool_review 的 ai 判断得分事件
    const handleReviewJudgement = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const score = (JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewJudgement) || {}
            const {interactive_id} = score

            if (
                !review.current ||
                !interactive_id ||
                review.current.type !== "tool_use_review_require" ||
                review.current.data.id !== interactive_id
            ) {
                throw new Error("review_judgement data is invalid")
            }

            score.levelLabel = AIReviewJudgeLevelMap[score?.level || ""]?.label || undefined
            if (review.current.type === "tool_use_review_require") {
                const info = review.current.data
                if (!info.aiReview || (info.aiReview && typeof info.aiReview.seconds === "undefined")) {
                    // aiReview 没有或者 aiReview 的 seconds 为空时可以赋值
                    info.aiReview = cloneDeep(score)
                    review.current.data = cloneDeep(info)
                }
            }

            const isTrigger = !isAutoContinueReview(getRequest)
            if (isTrigger) {
                onReview && onReview(cloneDeep(review.current))
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // 触发 review
    const handleTriggerReview = useMemoizedFn((data: AIChatQSData) => {
        review.current = cloneDeep(data)
        const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes(data.type)
        if (isTrigger) {
            onReview && onReview(data)
        }
    })

    // plan_review 的补充数据
    const handleTriggerReviewExtra = useMemoizedFn((res: AIOutputEvent) => {
        try {
            if (!review.current || review.current.type !== "plan_review_require") {
                throw new Error("plan_task_analysis data is invalid")
            }

            const reviewInfo = review.current.data
            if (!reviewInfo.taskExtra) reviewInfo.taskExtra = new Map()

            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequireExtra

            if (
                !data?.plans_id ||
                !data?.index ||
                !data?.keywords?.length ||
                (currentPlansId.current && currentPlansId.current !== data.plans_id)
            ) {
                throw new Error("plan_task_analysis data is invalid")
            }

            if (!currentPlansId.current) {
                currentPlansId.current = data.plans_id
            }
            reviewInfo.taskExtra.set(data.index, data)

            const isTrigger = !isAutoContinueReview(getRequest)
            if (isTrigger) {
                onReviewExtra && onReviewExtra(data)
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // 自动处理 review 里的信息数据
    const handleAutoRviewData = useMemoizedFn((reviewInfo: AIChatQSData) => {
        if (reviewInfo.type === "plan_review_require") {
            // 如果是计划的审阅，继续执行代表任务列表已确认，可以进行数据保存
            const tasks = reviewInfo.data
            planTree.current = cloneDeep(tasks.plans.root_task)
            const plans = genExecTasks(tasks.plans.root_task)
            setPlan(cloneDeep(plans))
            return cloneDeep(plans)
        }
    })

    // 是否 review 信号处理
    const handleReviewRelease = useMemoizedFn((res: AIOutputEvent) => {
        try {
            if (!review.current) return
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReviewRelease

            if (!data?.id) {
                throw new Error("review_release data is invalid")
            }

            const type = review.current.type
            const reviewInfo = cloneDeep(review.current)
            const info = reviewInfo.data as AIReviewType
            if (info?.id !== data.id) {
                throw new Error("review_release data is invalid")
            }

            info.selected = JSON.stringify({suggestion: "continue"})
            info.optionValue = "continue"
            handleAutoRviewData(reviewInfo)
            review.current = undefined
            currentPlansId.current = ""
            setStreams((old) => {
                const newArr = [...old]
                newArr.push(reviewInfo)
                return newArr
            })

            const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes(type)
            if (isTrigger) {
                onReviewRelease && onReviewRelease(data.id)
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })
    // #endregion

    // #region 改变任务状态相关方法
    // 任务开始执行的节点数据生成
    const handleTaskStartNode = useMemoizedFn((res: AIOutputEvent, nodeInfo: AIAgentGrpcApi.ChangeTask) => {
        try {
            // 任务树根节点不进行节点展示
            if (nodeInfo.task.index === "1") return
            setStreams((old) => {
                const newArr = [...old]
                newArr.push({
                    ...genBaseAIChatData(res),
                    type: AIChatQSDataTypeEnum.TASK_INDEX_NODE,
                    data: {
                        taskIndex: nodeInfo.task.index,
                        taskName: nodeInfo.task.name
                    }
                })
                return newArr
            })
        } catch (error) {}
    })

    // 更新未完成的任务状态
    const handleUpdateTaskState = useMemoizedFn((index: string, state: AITaskInfoProps["progress"]) => {
        setPlan((old) => {
            const newData = cloneDeep(old)
            return newData.map((item) => {
                if (item.index === index) {
                    item.progress = state
                }
                return item
            })
        })
    })

    // 将任务列表里所有未完成的任务全部设置为失败
    const handleFailTaskState = useMemoizedFn(() => {
        setPlan((old) => {
            const newData = cloneDeep(old)
            return newData.map((item) => {
                if (item.progress === "processing") {
                    item.progress = "aborted"
                }
                return item
            })
        })
    })
    // #endregion

    /** 文件系统操作处理数据 */
    const handleFileSystemPin = useMemoizedFn(async (res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const {path} = JSON.parse(ipcContent) as AIAgentGrpcApi.FileSystemPin
            const fileInfo = await getLocalFileName(path, true)

            setStreams((old) => {
                const newArr = [...old]
                newArr.push({
                    ...genBaseAIChatData(res),
                    type: AIChatQSDataTypeEnum.FILE_SYSTEM_PIN,
                    data: {
                        path: path,
                        isDir: res.Type === "filesystem_pin_directory",
                        name: fileInfo.name,
                        suffix: fileInfo.suffix
                    }
                })
                return newArr
            })
            if (res.Type === "filesystem_pin_directory") {
                onGrpcFolder && onGrpcFolder(path)
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    /** 工具决策数据处理 */
    const handleToolCallDecision = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolCallDecision
            const i18n = data?.i18n || {zh: data.action, en: data.action}

            setStreams((old) => {
                const newArr = [...old]
                newArr.push({
                    ...genBaseAIChatData(res),
                    type: AIChatQSDataTypeEnum.TOOL_CALL_DECISION,
                    data: {
                        ...data,
                        i18n: {
                            Zh: i18n.zh,
                            En: i18n.en
                        }
                    }
                })
                return newArr
            })
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // 处理数据方法
    const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            let ipcContent = Uint8ArrayToString(res.Content) || ""

            if (res.Type === "stream") {
                handleStreams(res)
                return
            }

            if (res.Type === "structured") {
                if (res.NodeId === "stream-finished") {
                    // 标识哪个流式输出已经结束
                    const {event_writer_id} = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStreamFinished
                    if (!event_writer_id) {
                        throw new Error("stream-finished data is invalid")
                    }
                    handleUpdateStreamStatus(event_writer_id)
                    return
                }

                const obj = JSON.parse(ipcContent) || ""
                if (!obj || typeof obj !== "object") return
                if (obj.type && obj.type === "push_task") {
                    // 开始任务
                    const data = obj as AIAgentGrpcApi.ChangeTask
                    handleTaskStartNode(res, data)
                    handleUpdateTaskState(data.task.index, "processing")
                    return
                }
                if (obj.type && obj.type === "pop_task") {
                    // 结束任务
                    const data = obj as AIAgentGrpcApi.ChangeTask
                    handleUpdateTaskState(data.task.index, "completed")
                    // 更新任务树数据
                    sendRequest && sendRequest({IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_PLAN})
                    return
                }

                handleGrpcDataPushLog({
                    info: res,
                    pushLog: handlePushLog
                })
                return
            }

            if (["ai_review_start", "ai_review_countdown", "ai_review_end"].includes(res.Type)) {
                handleReviewJudgement(res)
                return
            }

            if (res.Type === "plan_review_require") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequire
                if (
                    !data?.id ||
                    !data?.plans ||
                    !data?.plans?.root_task ||
                    !data?.selectors ||
                    !data?.selectors?.length
                ) {
                    throw new Error("plan_review_require data is invalid")
                }

                handleTriggerReview({
                    type: AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE,
                    data: data,
                    ...genBaseAIChatData(res)
                })
                return
            }
            if (res.Type === "plan_task_analysis") {
                handleTriggerReviewExtra(res)
                return
            }
            if (res.Type === "tool_use_review_require") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolUseReviewRequire
                if (!data?.id || !data?.selectors || !data?.selectors?.length) {
                    throw new Error("tool_use_review_require data is invalid")
                }

                handleTriggerReview({
                    type: AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE,
                    data: data,
                    ...genBaseAIChatData(res)
                })
                return
            }
            if (res.Type === "task_review_require") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.TaskReviewRequire
                if (!data?.id || !data?.selectors || !data?.selectors?.length) {
                    throw new Error("task_review_require data is invalid")
                }

                handleTriggerReview({
                    type: AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE,
                    data: data,
                    ...genBaseAIChatData(res)
                })
                return
            }
            if (res.Type === "require_user_interactive") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewRequire
                if (!data?.id) {
                    throw new Error("require_user_interactive data is invalid")
                }

                handleTriggerReview({
                    type: AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE,
                    data: data,
                    ...genBaseAIChatData(res)
                })
                return
            }

            if (res.Type === "review_release") {
                handleReviewRelease(res)
                return
            }

            if (res.Type === "tool_call_start") {
                // 工具调用开始
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
                if (!data?.call_tool_id) {
                    throw new Error("tool_call_start data is invalid")
                }
                setToolResultMap(data.call_tool_id, {
                    callToolId: data.call_tool_id,
                    toolName: data?.tool?.name || "-"
                })
                return
            }
            if (res.Type === "tool_call_watcher") {
                // 先于 isToolStdoutStream(nodeID) 为true的节点传给前端
                setToolStdOutSelectorMap(res)
                return
            }

            if (res.Type === "tool_call_user_cancel") {
                handleToolResultStatus(res, "user_cancelled")
                return
            }
            if (res.Type === "tool_call_done") {
                handleToolResultStatus(res, "success")
                return
            }
            if (res.Type === "tool_call_error") {
                handleToolResultStatus(res, "failed")
                return
            }

            if (res.Type === "tool_call_summary") {
                // 工具调用总结
                handleToolResultSummary(res)
                return
            }

            if (res.Type === "plan") {
                // 更新正在执行的任务树
                const tasks = JSON.parse(ipcContent) as {root_task: AIAgentGrpcApi.PlanTask}
                planTree.current = cloneDeep(tasks.root_task)
                const plans = genExecTasks(tasks.root_task)
                setPlan(cloneDeep(plans))
                return
            }

            if (["filesystem_pin_directory", "filesystem_pin_filename"].includes(res.Type)) {
                // 文件系统操作
                handleFileSystemPin(res)
                return
            }

            if (res.Type === "tool_call_decision") {
                // 工具决策
                handleToolCallDecision(res)
                return
            }

            if (res.Type === "fail_plan_and_execution") {
                // 任务规划崩溃的错误信息
                setStreams((old) => {
                    const newArr = [...old]
                    newArr.push({
                        ...genBaseAIChatData(res),
                        type: AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION,
                        data: ipcContent
                    })
                    return newArr
                })
                return
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    const handleResetData = useMemoizedFn(() => {
        planTree.current = undefined
        setPlan([])
        review.current = undefined
        currentPlansId.current = ""
        eventUUIDs.current.clear()
        setStreams([])
        handleToolCallDataReset()
    })

    /** review 界面选项触发事件 */
    const handleSend: handleSendFunc = useMemoizedFn(({request, optionValue, cb}) => {
        try {
            if (!review.current) {
                yakitNotify("error", " 未获取到审阅信息，请停止对话并重试")
                return
            }
            if (
                review.current.type === "plan_review_require" &&
                request.InteractiveJSONInput === JSON.stringify({suggestion: "continue"})
            ) {
                handleAutoRviewData(review.current)
            }

            const reviewInfo = cloneDeep(review.current)
            ;(reviewInfo.data as AIReviewType).selected = request.InteractiveJSONInput || ""
            ;(reviewInfo.data as AIReviewType).optionValue = optionValue

            review.current = undefined
            currentPlansId.current = ""

            setStreams((old) => {
                const newArr = [...old]
                newArr.push(reviewInfo)
                return newArr
            })

            cb && cb()
        } catch (error) {}
    })

    // 接口流关闭
    const handleCloseGrpc = useMemoizedFn(() => {
        handleFailTaskState()
    })

    // 任务规划结束后的触发逻辑
    const handlePlanExecEnd = useMemoizedFn((res: AIOutputEvent) => {
        setStreams((old) => {
            const newArr = [...old]
            newArr.push({
                ...genBaseAIChatData(res),
                type: AIChatQSDataTypeEnum.END_PLAN_AND_EXECUTION,
                data: ""
            })
            return newArr
        })
    })

    return [
        {plan, streams},
        {
            handleSetData,
            handleResetData,
            handleSend,
            fetchPlanTree,
            handleCloseGrpc,
            handlePlanExecEnd
        }
    ] as const
}

export default useTaskChat
