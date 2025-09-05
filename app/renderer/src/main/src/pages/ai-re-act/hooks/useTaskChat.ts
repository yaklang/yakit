import {useRef, useState} from "react"
import {yakitNotify} from "@/utils/notification"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {AIChatMessage, AIChatReview, AIOutputEvent} from "@/pages/ai-agent/type/aiChat"
import {DefaultAIToolResult} from "./defaultConstant"
import {UseTaskChatParams} from "./type"
import {handleGrpcDataPushLog, isToolExecStream, isToolStdoutStream} from "./utils"

const {ipcRenderer} = window.require("electron")

// 属于该 hook 处理数据的类型
export const UseTaskChatTypes = ["plan_review_require", "plan_task_analysis", "task_review_require", "plan"]

function useTaskChat(params?: UseTaskChatParams) {
    const {pushLog, getRequest, onReviewRelease} = params || {}

    const handlePushLog = useMemoizedFn((logInfo: AIChatMessage.Log) => {
        pushLog && pushLog(logInfo)
    })
    // 是否 review 策略是自动放行
    const isAutoExecReview = useMemoizedFn(() => {
        if (getRequest) {
            const request = getRequest()
            return request ? request.ReviewPolicy === "yolo" : false
        }
        return false
    })

    // #region 数据相关
    const [coordinatorId, setCoordinatorId] = useState<string>("")

    // plan_review 原始树结构
    const planTree = useRef<AIChatMessage.PlanTask>()
    const fetchPlanTree = useMemoizedFn(() => {
        return cloneDeep(planTree.current)
    })
    const [plan, setPlan] = useState<AIChatMessage.PlanTask[]>([])

    const review = useRef<AIChatReview>()
    const currentPlansId = useRef<string>("")

    // 存放流式输出的EventUUID的集合
    const eventUUIDs = useRef<Set<string>>(new Set())
    const handleSetEventUUID = useMemoizedFn((id: string) => {
        if (!eventUUIDs.current.has(id)) eventUUIDs.current.add(id)
    })
    const [streams, setStreams] = useState<Record<string, AIChatMessage.AITaskStreamOutput[]>>({})

    const selectorsRef = useRef<AIChatMessage.AIToolData>(cloneDeep(DefaultAIToolResult))
    const toolDataMapRef = useRef<Map<string, AIChatMessage.AIToolData>>(new Map())
    // #endregion

    // #region 流数据处理相关逻辑
    const handleStreams = useMemoizedFn((res: AIOutputEvent) => {
        const {IsSystem, IsReason, NodeId, TaskIndex, Timestamp, EventUUID, Content, StreamDelta} = res
        const type = IsSystem ? "systemStream" : IsReason ? "reasonStream" : "stream"
        let ipcContent = Uint8ArrayToString(Content) || ""
        let ipcStreamDelta = Uint8ArrayToString(StreamDelta) || ""
        const content = ipcContent + ipcStreamDelta

        setStreams((old) => {
            const streams = {...old}
            const valueInfo = streams[TaskIndex]
            if (valueInfo) {
                const streamInfo = valueInfo.find((item) => item.NodeId === NodeId && item.EventUUID === EventUUID)
                if (streamInfo) {
                    if (type === "systemStream") streamInfo.stream.system += content
                    if (type === "reasonStream") streamInfo.stream.reason += content
                    if (type === "stream") streamInfo.stream.stream += content
                } else {
                    let info: AIChatMessage.AITaskStreamOutput = {
                        NodeId: NodeId,
                        EventUUID: EventUUID,
                        status: "start",
                        timestamp: Timestamp,
                        stream: {system: "", reason: "", stream: ""}
                    }
                    if (isToolStdoutStream(NodeId)) info.toolAggregation = {...selectorsRef.current}
                    if (type === "systemStream") info.stream.system += content
                    if (type === "reasonStream") info.stream.reason += content
                    if (type === "stream") info.stream.stream += content
                    valueInfo.push(info)
                }
                if (NodeId === "call-tools") {
                    streams[TaskIndex] = valueInfo.filter((item) => item.NodeId !== "execute")
                }
                if (isToolStdoutStream(NodeId)) {
                    streams[TaskIndex] = valueInfo.filter((item) => item.NodeId !== "call-tools")
                }
            } else {
                const list: AIChatMessage.AITaskStreamOutput[] = [
                    {
                        NodeId: NodeId,
                        EventUUID: EventUUID,
                        status: "start",
                        timestamp: Timestamp,
                        stream: {system: "", reason: "", stream: ""}
                    }
                ]
                if (type === "systemStream") list[0].stream.system += content
                if (type === "reasonStream") list[0].stream.reason += content
                if (type === "stream") list[0].stream.stream += content
                streams[TaskIndex] = list
            }

            return streams
        })
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
                        if (item.EventUUID === EventUUID) {
                            item.status = "end"
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
    // #endregion

    // #region  review 相关逻辑
    // 触发 review
    const handleTriggerReview = useMemoizedFn((data: AIChatReview) => {
        console.log(`${data.type}-----\n`, JSON.stringify(data.data))
        review.current = cloneDeep(data)
        const isTrigger = handleIsTriggerReview() || noSkipReviewReleaseTypes.current.includes(data.type)
        if (isTrigger) {
            onReview && onReview(data)
        }
    })
    // #endregion

    // #region 改变任务状态相关方法
    /** 更新任务状态 */
    const handleUpdateTaskState = useMemoizedFn((index: string, state: AIChatMessage.PlanTask["progress"]) => {
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
    /** 任务列表中-执行中的任务全部设置为失败 */
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




    /** 重置所有数据 */
    const handleReset = useMemoizedFn(() => {
    })


    const onSetCoordinatorId = useMemoizedFn((CoordinatorId: string) => {
        coordinatorId.current.cache = CoordinatorId
        if (coordinatorId.current.sent !== coordinatorId.current.cache && setCoordinatorId) {
            setCoordinatorId(coordinatorId.current.cache)
            coordinatorId.current.sent = coordinatorId.current.cache
        }
    })
    const getToolData = useMemoizedFn((callToolId: string): AIChatMessage.AIToolData => {
        return toolDataMapRef.current.get(callToolId) || cloneDeep(DefaultAIToolResult)
    })
    const onSetToolData = useMemoizedFn((callToolId: string, value: Partial<AIChatMessage.AIToolData>) => {
        let current = getToolData(callToolId)
        current = {
            ...current,
            ...value
        }
        toolDataMapRef.current.set(callToolId, current)
    })
    const onRemoveToolData = useMemoizedFn((callToolId: string) => {
        toolDataMapRef.current.delete(callToolId)
    })
    const aggregationToolData = useMemoizedFn((res: AIOutputEvent, callToolId: string) => {
        if (!res.TaskIndex) {
            onCloseByErrorTaskIndexData(res)
            return
        }
        const timestamp = res.Timestamp
        const taskIndex = res.TaskIndex
        setStreams((old) => {
            const streams = cloneDeep(old)
            const valueInfo = streams[taskIndex]
            if (valueInfo) {
                const toolStdout = valueInfo.find((ele) => isToolStdout(ele.nodeId))
                const content = toolStdout?.data.stream || toolStdout?.data.reason || toolStdout?.data.system || ""
                const isShowAll = !!(content && content.length > 200)
                const toolStdoutShowContent = isShowAll ? content.substring(0, 200) + "..." : content

                const newValue = valueInfo.filter((ele) => !isToolSyncNode(ele.nodeId))
                const toolData = getToolData(callToolId)
                newValue.push({
                    nodeId: res.Type,
                    timestamp: timestamp,
                    data: {
                        system: "",
                        reason: "",
                        stream: ""
                    },
                    toolAggregation: {
                        ...toolData,
                        toolStdoutContent: {
                            content: toolStdoutShowContent,
                            isShowAll
                        }
                    }
                })
                streams[taskIndex] = [...newValue]
            }
            return streams
        })
    })

    const onSetToolSummary = useMemoizedFn((res: AIOutputEvent, callToolId: string) => {
        if (!res.TaskIndex) {
            onCloseByErrorTaskIndexData(res)
            return
        }
        const taskIndex = res.TaskIndex
        setStreams((old) => {
            const streams = cloneDeep(old)
            const valueInfo = streams[taskIndex]
            if (valueInfo) {
                const newValue = valueInfo.map((ele) => {
                    if (ele.toolAggregation?.callToolId === callToolId) {
                        const toolData = getToolData(callToolId)
                        return {
                            ...ele,
                            toolAggregation: {
                                ...toolData,
                                toolStdoutContent: ele.toolAggregation?.toolStdoutContent || {
                                    ...DefaultAIToolResult.toolStdoutContent
                                }
                            }
                        }
                    }
                    return ele
                })
                streams[taskIndex] = [...newValue]
            }

            return streams
        })
        onRemoveToolData(callToolId)
        selectorsRef.current = cloneDeep(DefaultAIToolResult)
    })
    const onCloseByErrorTaskIndexData = useMemoizedFn((res: AIOutputEvent) => {
        onClose(chatID.current, {
            tip: () =>
                yakitNotify(
                    "error",
                    `TaskIndex数据异常:${JSON.stringify({
                        ...res,
                        Content: new Uint8Array(),
                        StreamDelta: new Uint8Array()
                    })}`
                )
        })
    })

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
                    const {event_writer_id} = JSON.parse(ipcContent) as AIChatMessage.AIStreamFinished
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
                    const data = obj as AIChatMessage.ChangeTask
                    handleUpdateTaskState(data.task.index, "in-progress")
                    return
                }
                if (obj.type && obj.type === "pop_task") {
                    // 结束任务
                    const data = obj as AIChatMessage.ChangeTask
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

            if (res.Type === "plan_review_require") {
                const data = JSON.parse(ipcContent) as AIChatMessage.PlanReviewRequire

                if (!data?.id) return
                if (!data?.plans || !data?.plans?.root_task) return
                if (!data?.selectors || !data?.selectors?.length) return

                handleTriggerReview({type: "plan_review_require", data: data})
                return
            }
            if (res.Type === "plan_task_analysis") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.PlanReviewRequireExtra
                    if (!data?.plans_id) return
                    if (!data?.index) return
                    if (!data?.keywords?.length) return
                    handleTriggerReviewExtra({
                        type: "plan_task_analysis",
                        data
                    })
                } catch (error) {}

                return
            }
            if (res.Type === "tool_use_review_require") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.ToolUseReviewRequire

                    if (!data?.id) return
                    if (!data?.selectors || !data?.selectors?.length) return

                    handleTriggerReview({type: "tool_use_review_require", data: data})
                } catch (error) {}
                return
            }
            if (res.Type === "task_review_require") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.TaskReviewRequire

                    if (!data?.id) return
                    if (!data?.selectors || !data?.selectors?.length) return

                    handleTriggerReview({type: "task_review_require", data: data})
                } catch (error) {}
                return
            }
            if (res.Type === "require_user_interactive") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIReviewRequire

                    if (!data?.id) return
                    handleTriggerReview({type: "require_user_interactive", data: data})
                } catch (error) {}
                return
            }

            if (res.Type === "review_release") {
                // review释放通知
                const data = JSON.parse(ipcContent) as AIChatMessage.ReviewRelease
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
                const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                onSetToolResult(data?.call_tool_id, {
                    callToolId: data?.call_tool_id,
                    toolName: data?.tool?.name || "-"
                })
                toolStdOutSelectors.current.callToolId = data?.call_tool_id
                return
            }

            if (res.Type === "tool_call_user_cancel") {
                const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                onSetToolResult(data?.call_tool_id, {
                    status: "user_cancelled",
                    time: res.Timestamp
                })
                aggregationToolData(res, data?.call_tool_id)
                return
            }
            if (res.Type === "tool_call_done") {
                const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                onSetToolResult(data?.call_tool_id, {
                    status: "success",
                    time: res.Timestamp
                })
                aggregationToolData(res, data?.call_tool_id)
                return
            }
            if (res.Type === "tool_call_error") {
                const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                onSetToolResult(data?.call_tool_id, {
                    status: "failed",
                    time: res.Timestamp
                })
                aggregationToolData(res, data?.call_tool_id)
                return
            }

            if (res.Type === "tool_call_watcher") {
                // 先于 isToolStdout(nodeID) 为true的节点传给前端
                const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCallWatcher
                if (!data?.id) return
                if (!data?.selectors || !data?.selectors?.length) return
                const currentToolData = getToolResult(data.call_tool_id)
                if (currentToolData.callToolId === toolStdOutSelectors.current.callToolId) {
                    // 当前的callToolId与本地工具中的一致
                    toolStdOutSelectors.current.selectors = data.selectors
                    toolStdOutSelectors.current.interactiveId = data.id
                }
                return
            }
            if (res.Type === "tool_call_summary") {
                // 工具调用总结
                const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                const currentToolData = getToolResult(data.call_tool_id)
                if (currentToolData.status === "user_cancelled") {
                    currentToolData.summary = "当前工具调用已被取消，会使用当前输出结果进行后续工作决策"
                } else {
                    currentToolData.summary = data.summary || ""
                }
                onSetToolResult(data?.call_tool_id, {
                    summary: currentToolData.summary,
                    time: res.Timestamp
                })
                onSetToolSummary(res, data?.call_tool_id || "")
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
        setStreams({})
        toolDataMapRef.current = new Map()
        selectorsRef.current = cloneDeep(DefaultAIToolResult)
    })

    // 接口流关闭
    const handleCloseGrpc = useMemoizedFn(() => {})

    return [
        {coordinatorId, plan, streams},
        {handleSetData, handleResetData, fetchPlanTree, handleCloseGrpc}
    ] as const
}

export default useTaskChat
