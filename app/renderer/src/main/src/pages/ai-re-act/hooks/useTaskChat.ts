import {useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {AIChatReviewExtra} from "@/pages/ai-agent/type/aiChat"
import {
    AIReviewJudgeLevelMap,
    AIStreamNodeIdToLabel,
    DefaultAIToolResult,
    DefaultToolStdOutSelectors
} from "./defaultConstant"
import {UseTaskChatEvents, UseTaskChatParams, UseTaskChatState} from "./type"
import {
    handleFlatAITree,
    handleGrpcDataPushLog,
    isAutoContinueReview,
    isToolExecStream,
    isToolStdoutStream,
    noSkipReviewTypes
} from "./utils"
import {yakitNotify} from "@/utils/notification"
import {AIAgentGrpcApi, AIInputEvent, AIOutputEvent} from "./grpcApi"
import {AIChatQSData, AIChatReview, AIStreamOutput, AIToolResult, ToolStreamSelectors} from "./aiRender"
import {v4 as uuidv4} from "uuid"

// 属于该 hook 处理数据的类型
export const UseTaskChatTypes = ["plan_review_require", "plan_task_analysis", "task_review_require", "plan"]

function useTaskChat(params?: UseTaskChatParams): [UseTaskChatState, UseTaskChatEvents]

function useTaskChat(params?: UseTaskChatParams) {
    const {pushLog, updateLog, getRequest, onReview, onReviewExtra, onReviewRelease} = params || {}

    const handlePushLog = useMemoizedFn((logInfo: AIChatQSData) => {
        pushLog && pushLog(logInfo)
    })

    // #region 数据相关
    const [coordinatorId, setCoordinatorId] = useState<string>("")

    // plan_review 原始树结构
    const planTree = useRef<AIAgentGrpcApi.PlanTask>()
    const fetchPlanTree = useMemoizedFn(() => {
        return cloneDeep(planTree.current)
    })
    const [plan, setPlan] = useState<AIAgentGrpcApi.PlanTask[]>([])

    const review = useRef<AIChatReview>()
    const currentPlansId = useRef<string>("")

    // 存放流式输出的EventUUID的集合
    const eventUUIDs = useRef<Set<string>>(new Set())
    const handleSetEventUUID = useMemoizedFn((id: string) => {
        if (!eventUUIDs.current.has(id)) eventUUIDs.current.add(id)
    })
    const [streams, setStreams] = useState<Record<string, AIChatQSData[]>>({})

    const toolStdOutSelectors = useRef<ToolStreamSelectors>(cloneDeep(DefaultToolStdOutSelectors))

    const toolResultMap = useRef<Map<string, AIToolResult>>(new Map())
    const getToolResult = useMemoizedFn((callToolId: string): AIToolResult => {
        return toolResultMap.current.get(callToolId) || cloneDeep(DefaultAIToolResult)
    })
    const onSetToolResult = useMemoizedFn((callToolId: string, value: Partial<AIToolResult>) => {
        let current = getToolResult(callToolId)
        current = {
            ...current,
            ...value
        }
        toolResultMap.current.set(callToolId, current)
    })
    const onRemoveToolResult = useMemoizedFn((callToolId: string) => {
        toolResultMap.current.delete(callToolId)
    })
    // #endregion

    // 设置自由对话的 id
    const handleSetCoordinatorId = useMemoizedFn((id: string) => {
        setCoordinatorId((old) => (old === id ? old : id))
    })

    // #region 流数据处理相关逻辑
    // 接受流式输出数据并处理
    const handleStreams = useMemoizedFn((res: AIOutputEvent) => {
        const {IsSystem, IsReason, NodeId, TaskIndex, Timestamp, EventUUID, Content, StreamDelta, DisableMarkdown} = res
        let ipcContent = Uint8ArrayToString(Content) || ""
        let ipcStreamDelta = Uint8ArrayToString(StreamDelta) || ""
        const content = ipcContent + ipcStreamDelta

        if (!IsSystem && !IsReason) {
            setStreams((old) => {
                const streams = {...old}
                const valueInfo = streams[TaskIndex]
                if (valueInfo) {
                    const streamInfo = valueInfo.find(
                        (item) =>
                            item.type === "stream" &&
                            item.data &&
                            item.data.NodeId === NodeId &&
                            item.data.EventUUID === EventUUID
                    )
                    if (streamInfo && streamInfo.type === "stream") {
                        streamInfo.data.content += content
                    } else {
                        let info: AIChatQSData = {
                            id: uuidv4(),
                            type: "stream",
                            Timestamp: Timestamp,
                            data: {
                                NodeId: NodeId,
                                NodeLabel: AIStreamNodeIdToLabel[NodeId]?.label || "",
                                EventUUID: EventUUID,
                                status: "start",
                                content: content,
                                DisableMarkdown: DisableMarkdown
                            }
                        }
                        if (isToolStdoutStream(NodeId)) info.data.selectors = {...toolStdOutSelectors.current}
                        valueInfo.push(info)
                    }
                    if (NodeId === "call-tools") {
                        streams[TaskIndex] = valueInfo.filter(
                            (item) => item.type === "stream" && !!item.data && item.data.NodeId !== "execute"
                        )
                    }
                    if (isToolStdoutStream(NodeId)) {
                        streams[TaskIndex] = valueInfo.filter(
                            (item) => item.type === "stream" && !!item.data && item.data.NodeId !== "call-tools"
                        )
                    }
                } else {
                    const list: AIChatQSData[] = [
                        {
                            id: uuidv4(),
                            type: "stream",
                            Timestamp: Timestamp,
                            data: {
                                NodeId: NodeId,
                                NodeLabel: AIStreamNodeIdToLabel[NodeId]?.label || "",
                                EventUUID: EventUUID,
                                status: "start",
                                content: content,
                                DisableMarkdown: DisableMarkdown
                            }
                        }
                    ]
                    streams[TaskIndex] = list
                }

                return streams
            })
        } else {
            if (!updateLog) return
            updateLog((old) => {
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
                        id: uuidv4(),
                        type: "stream",
                        data: {
                            NodeId,
                            NodeLabel: AIStreamNodeIdToLabel[NodeId]?.label || "",
                            EventUUID,
                            status: "start",
                            content: content,
                            DisableMarkdown: DisableMarkdown
                        },
                        Timestamp: Timestamp
                    }
                    newArr.push(streamsInfo)
                }
                return newArr
            })
        }
    })

    // 将流式输出的状态改成已完成
    const handleUpdateStreamStatus = useMemoizedFn((EventUUID: string) => {
        try {
            if (!eventUUIDs.current.has(EventUUID)) return
            setStreams((old) => {
                const newData = {...old}
                const keys = Object.keys(old)
                for (let el of keys) {
                    const lists = newData[el]
                    if (!lists || !Array.isArray(lists)) continue
                    let isSuc = false
                    for (let item of lists) {
                        if (item.type === "stream" && !!item.data && item.data.EventUUID === EventUUID) {
                            item.data.status = "end"
                            isSuc = true
                            break
                        }
                    }
                    if (isSuc) break
                }

                return newData
            })
        } catch (error) {}
    })

    const handleToolResultStatus = useMemoizedFn((res: AIOutputEvent, callToolId: string) => {
        const {TaskIndex, Timestamp} = res
        if (!TaskIndex) {
            handleGrpcDataPushLog({type: "error", info: res, pushLog: handlePushLog})
            return
        }
        setStreams((old) => {
            const streams = cloneDeep(old)
            const valueInfo = streams[TaskIndex]
            if (valueInfo) {
                const toolStdout = valueInfo.find(
                    (ele) => ele.type === "stream" && !!ele.data && isToolStdoutStream(ele.data.NodeId)
                )
                const content = (toolStdout?.data as AIStreamOutput)?.content
                const isShowAll = !!(content && content.length > 200)
                const toolStdoutShowContent = isShowAll ? content.substring(0, 200) + "..." : content

                const newValue = valueInfo.filter(
                    (ele) => ele.type === "stream" && !!ele.data && !isToolExecStream(ele.data.NodeId)
                )
                const toolResult = getToolResult(callToolId)
                newValue.push({
                    id: uuidv4(),
                    type: "tool_result",
                    Timestamp: Timestamp,
                    data: {
                        ...toolResult,
                        toolStdoutContent: {
                            content: toolStdoutShowContent,
                            isShowAll
                        }
                    }
                })
                streams[TaskIndex] = [...newValue]
            }
            return streams
        })
    })

    const handleToolResultSummary = useMemoizedFn((res: AIOutputEvent, callToolId: string) => {
        const {TaskIndex} = res
        if (!TaskIndex) {
            handleGrpcDataPushLog({type: "error", info: res, pushLog: handlePushLog})
            return
        }
        setStreams((old) => {
            const streams = cloneDeep(old)
            const valueInfo = streams[TaskIndex]
            if (valueInfo) {
                const newValue = valueInfo.map((ele) => {
                    if (ele.type === "tool_result" && !!ele.data && ele.data.callToolId === callToolId) {
                        const toolData = getToolResult(callToolId)
                        return {
                            ...ele,
                            toolAggregation: {
                                ...toolData,
                                toolStdoutContent: ele.data.toolStdoutContent || {
                                    ...DefaultAIToolResult.toolStdoutContent
                                }
                            }
                        }
                    }
                    return ele
                })
                streams[TaskIndex] = [...newValue]
            }

            return streams
        })
        onRemoveToolResult(callToolId)
        toolStdOutSelectors.current = cloneDeep(DefaultToolStdOutSelectors)
    })
    // #endregion

    // #region  review 相关逻辑
    // 处理 tool_review 的 ai 判断得分事件
    const handleToolReviewJudgement = useMemoizedFn((score: AIAgentGrpcApi.AIReviewJudgement) => {
        if (!review.current) return

        const isTrigger = !isAutoContinueReview(getRequest)
        if (!isTrigger) return

        const {interactive_id} = score
        score.levelLabel = AIReviewJudgeLevelMap[score?.level || ""]?.label || undefined
        const {type, data} = review.current
        if (type === "tool_use_review_require" && data.id === interactive_id) {
            const info = cloneDeep(data)
            // aiReview 没有或者 aiReview 的 seconds 为空时可以赋值
            if (!info.aiReview || (info.aiReview && typeof info.aiReview.seconds === "undefined")) {
                info.aiReview = cloneDeep(score)
                review.current.data = cloneDeep(info)
                onReview && onReview(cloneDeep(review.current))
            }
        }
    })

    // 触发 review
    const handleTriggerReview = useMemoizedFn((data: AIChatReview) => {
        console.log(`${data.type}-----\n`, JSON.stringify(data.data))
        review.current = cloneDeep(data)
        const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes(data.type)
        if (isTrigger) {
            onReview && onReview(data)
        }
    })

    // plan_review 的补充数据
    const handleTriggerReviewExtra = useMemoizedFn((item: AIChatReviewExtra) => {
        if (!currentPlansId.current) {
            currentPlansId.current = item.data.plans_id
        }
        if (currentPlansId.current !== item.data.plans_id) return
        const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes(item.type)
        if (isTrigger) {
            onReviewExtra && onReviewExtra(item)
        }
    })

    // 自动处理 review 里的信息数据
    const handleAutoRviewData = useMemoizedFn((data: AIChatReview) => {
        if (data.type === "plan_review_require") {
            // 如果是计划的审阅，继续执行代表任务列表已确认，可以进行数据保存
            const tasks = data.data as AIAgentGrpcApi.PlanReviewRequire
            planTree.current = cloneDeep(tasks.plans.root_task)
            const sum: AIAgentGrpcApi.PlanTask[] = []
            handleFlatAITree(sum, tasks.plans.root_task)
            setPlan([...sum])
        }
    })

    // 是否 review 信号处理
    const handleReviewRelease = useMemoizedFn((id: string) => {
        console.log("review.current", review.current, id)

        if (!review.current || review.current.data.id !== id) return
        const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes(review.current.type)

        handleAutoRviewData(review.current)
        review.current = undefined
        currentPlansId.current = ""
        if (isTrigger) {
            onReviewRelease && onReviewRelease(id)
        }
    })
    // #endregion

    // #region 改变任务状态相关方法
    // 更新未完成的任务状态
    const handleUpdateTaskState = useMemoizedFn((index: string, state: AIAgentGrpcApi.PlanTask["progress"]) => {
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
                if (item.progress === "in-progress") {
                    item.progress = "error"
                }
                return item
            })
        })
    })
    // #endregion

    // 处理数据方法
    const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            let ipcContent = Uint8ArrayToString(res.Content) || ""

            if (res.Type === "stream") {
                const {NodeId, EventUUID, TaskIndex} = res
                if (!TaskIndex) return
                if (!NodeId || !EventUUID) {
                    // 没有必须信息算异常日志
                    handleGrpcDataPushLog({
                        type: "error",
                        info: res,
                        pushLog: handlePushLog
                    })
                    return
                }
                if (isToolExecStream(NodeId) && !TaskIndex) {
                    // 这类类型没有 TaskIndex 算异常数据
                    handleGrpcDataPushLog({
                        type: "error",
                        info: res,
                        pushLog: handlePushLog
                    })
                    return
                }

                handleSetEventUUID(EventUUID)
                handleStreams(res)
                return
            }

            if (res.Type === "structured") {
                if (res.NodeId === "stream-finished") {
                    // 标识哪个流式输出已经结束
                    const {event_writer_id} = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStreamFinished
                    if (!event_writer_id) {
                        handleGrpcDataPushLog({type: "error", info: res, pushLog: handlePushLog})
                        return
                    }
                    handleUpdateStreamStatus(event_writer_id)
                    return
                }

                const obj = JSON.parse(ipcContent) || ""
                if (!obj || typeof obj !== "object") return
                if (obj.type && obj.type === "push_task") {
                    // 开始任务
                    const data = obj as AIAgentGrpcApi.ChangeTask
                    handleUpdateTaskState(data.task.index, "in-progress")
                    return
                }
                if (obj.type && obj.type === "pop_task") {
                    // 结束任务
                    const data = obj as AIAgentGrpcApi.ChangeTask
                    handleUpdateTaskState(data.task.index, "success")
                    return
                }

                handleGrpcDataPushLog({
                    type: "info",
                    info: res,
                    pushLog: handlePushLog
                })
                return
            }

            if (["ai_review_start", "ai_review_countdown", "ai_review_end"].includes(res.Type)) {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewJudgement
                if (!review.current || review.current.type !== "tool_use_review_require" || !data?.interactive_id) {
                    handleGrpcDataPushLog({
                        type: "error",
                        info: res,
                        pushLog: handlePushLog
                    })
                    return
                }
                handleToolReviewJudgement(data)
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
                    handleGrpcDataPushLog({type: "error", info: res, pushLog: handlePushLog})
                    return
                }

                handleTriggerReview({type: "plan_review_require", data: data})
                return
            }
            if (res.Type === "plan_task_analysis") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.PlanReviewRequireExtra
                if (!data?.plans_id || !data?.index || !data?.keywords?.length) {
                    handleGrpcDataPushLog({type: "error", info: res, pushLog: handlePushLog})
                    return
                }
                handleTriggerReviewExtra({
                    type: "plan_task_analysis",
                    data
                })
                return
            }
            if (res.Type === "tool_use_review_require") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolUseReviewRequire
                if (!data?.id || !data?.selectors || !data?.selectors?.length) {
                    handleGrpcDataPushLog({type: "error", info: res, pushLog: handlePushLog})
                    return
                }

                handleTriggerReview({type: "tool_use_review_require", data: data})
                return
            }
            if (res.Type === "task_review_require") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.TaskReviewRequire
                if (!data?.id || !data?.selectors || !data?.selectors?.length) {
                    handleGrpcDataPushLog({type: "error", info: res, pushLog: handlePushLog})
                    return
                }

                handleTriggerReview({type: "task_review_require", data: data})
                return
            }
            if (res.Type === "require_user_interactive") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewRequire
                if (!data?.id) {
                    handleGrpcDataPushLog({type: "error", info: res, pushLog: handlePushLog})
                    return
                }

                handleTriggerReview({type: "require_user_interactive", data: data})
                return
            }

            if (res.Type === "review_release") {
                // review释放通知
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReviewRelease
                if (!data?.id) {
                    handleGrpcDataPushLog({
                        type: "error",
                        info: res,
                        pushLog: handlePushLog
                    })
                    return
                }
                handleReviewRelease(data.id)
                return
            }

            if (res.Type === "tool_call_start") {
                // 工具调用开始
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
                onSetToolResult(data?.call_tool_id, {
                    callToolId: data?.call_tool_id,
                    toolName: data?.tool?.name || "-"
                })
                toolStdOutSelectors.current.callToolId = data?.call_tool_id
                return
            }

            if (res.Type === "tool_call_user_cancel") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
                onSetToolResult(data?.call_tool_id, {
                    status: "user_cancelled"
                })
                handleToolResultStatus(res, data?.call_tool_id)
                return
            }
            if (res.Type === "tool_call_done") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
                onSetToolResult(data?.call_tool_id, {
                    status: "success"
                })
                handleToolResultStatus(res, data?.call_tool_id)
                return
            }
            if (res.Type === "tool_call_error") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
                onSetToolResult(data?.call_tool_id, {
                    status: "failed"
                })
                handleToolResultStatus(res, data?.call_tool_id)
                return
            }

            if (res.Type === "tool_call_watcher") {
                // 先于 isToolStdout(nodeID) 为true的节点传给前端
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCallWatcher
                if (!data?.id) return
                if (!data?.selectors || !data?.selectors?.length) return
                const currentToolData = getToolResult(data.call_tool_id)
                if (currentToolData.callToolId === toolStdOutSelectors.current.callToolId) {
                    // 当前的callToolId与本地工具中的一致
                    toolStdOutSelectors.current.selectors = data.selectors
                    toolStdOutSelectors.current.InteractiveId = data.id
                }
                return
            }
            if (res.Type === "tool_call_summary") {
                // 工具调用总结
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
                const currentToolData = getToolResult(data.call_tool_id)
                if (currentToolData.status === "user_cancelled") {
                    currentToolData.summary = "当前工具调用已被取消，会使用当前输出结果进行后续工作决策"
                } else {
                    currentToolData.summary = data.summary || ""
                }
                onSetToolResult(data?.call_tool_id, {
                    summary: currentToolData.summary
                })
                handleToolResultSummary(res, data?.call_tool_id || "")
                return
            }

            if (res.Type === "plan") {
                // 更新正在执行的任务树
                const tasks = JSON.parse(ipcContent) as {root_task: AIAgentGrpcApi.PlanTask}
                planTree.current = cloneDeep(tasks.root_task)
                const sum: AIAgentGrpcApi.PlanTask[] = []
                handleFlatAITree(sum, tasks.root_task)
                setPlan([...sum])
                return
            }

            console.log("unkown---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)
        } catch (error) {
            handleGrpcDataPushLog({
                type: "error",
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    const handleResetData = useMemoizedFn(() => {
        setCoordinatorId("")
        planTree.current = undefined
        setPlan([])
        review.current = undefined
        currentPlansId.current = ""
        eventUUIDs.current.clear()
        setStreams({})
        toolStdOutSelectors.current = cloneDeep(DefaultToolStdOutSelectors)
        toolResultMap.current = new Map()
    })

    /** review 界面选项触发事件 */
    const handleSend = useMemoizedFn((request: AIInputEvent, cb?: () => void) => {
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

            review.current = undefined
            currentPlansId.current = ""

            cb && cb()
        } catch (error) {}
    })

    // 接口流关闭
    const handleCloseGrpc = useMemoizedFn(() => {
        handleFailTaskState()
    })

    return [
        {coordinatorId, plan, streams},
        {handleSetData, handleResetData, handleSetCoordinatorId, handleSend, fetchPlanTree, handleCloseGrpc}
    ] as const
}

export default useTaskChat
