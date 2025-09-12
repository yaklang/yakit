import {useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {AIChatMessage, AIChatReview, AIInputEvent, AIOutputEvent} from "@/pages/ai-agent/type/aiChat"
import {
    handleGrpcDataPushLog,
    isAutoContinueReview,
    isToolExecStream,
    isToolStdoutStream,
    noSkipReviewTypes
} from "./utils"
import {v4 as uuidv4} from "uuid"
import {UseCasualChatEvents, UseCasualChatParams, UseCasualChatState} from "./type"
import {DefaultAIToolResult} from "./defaultConstant"
import {yakitNotify} from "@/utils/notification"

// 属于该 hook 处理数据的类型
export const UseCasualChatTypes = ["thought", "result"]

function useCasualChat(params?: UseCasualChatParams): [UseCasualChatState, UseCasualChatEvents]

function useCasualChat(params?: UseCasualChatParams) {
    const {pushLog, getRequest, onReviewRelease} = params || {}

    const handlePushLog = useMemoizedFn((logInfo: AIChatMessage.Log) => {
        pushLog && pushLog(logInfo)
    })

    const review = useRef<AIChatReview>()

    const [coordinatorId, setCoordinatorId] = useState<string>("")
    // 存放流式输出的EventUUID的集合
    const eventUUIDs = useRef<Set<string>>(new Set())
    const handleSetEventUUID = useMemoizedFn((id: string) => {
        if (!eventUUIDs.current.has(id)) eventUUIDs.current.add(id)
    })
    const [contents, setContents] = useState<AIChatMessage.AICasualChatQAStream[]>([])

    // #region 流式输出处理的相关逻辑
    const handleStreams = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const {IsSystem, IsReason, NodeId, Timestamp, EventUUID, Content, StreamDelta} = res
            const type = IsSystem ? "systemStream" : IsReason ? "reasonStream" : "stream"
            let ipcContent = Uint8ArrayToString(Content) || ""
            let ipcStreamDelta = Uint8ArrayToString(StreamDelta) || ""
            const content = ipcContent + ipcStreamDelta

            setContents((old) => {
                let newArr = [...old]
                const index = newArr.findIndex((item) => {
                    if (item.uiType === "stream" && item.data) {
                        const streamData = item.data as AIChatMessage.AIStreamOutput
                        return streamData.NodeId === NodeId && streamData.EventUUID === EventUUID
                    }
                    return false
                })
                if (index >= 0) {
                    const streamsInfo = newArr[index].data as AIChatMessage.AIStreamOutput
                    if (type === "systemStream") streamsInfo.stream.system += content
                    if (type === "reasonStream") streamsInfo.stream.reason += content
                    if (type === "stream") streamsInfo.stream.stream += content
                    newArr[index].data = {...streamsInfo}
                } else {
                    const streamsInfo: AIChatMessage.AIStreamOutput = {
                        NodeId,
                        EventUUID,
                        status: "start",
                        stream: {system: "", reason: "", stream: ""}
                    }
                    if (isToolStdoutStream(NodeId)) streamsInfo.toolAggregation = {...toolStdOutSelectors.current}
                    if (type === "systemStream") streamsInfo.stream.system += content
                    if (type === "reasonStream") streamsInfo.stream.reason += content
                    if (type === "stream") streamsInfo.stream.stream += content
                    newArr.push({
                        id: uuidv4(),
                        type: "answer",
                        uiType: "stream",
                        Timestamp,
                        data: {...streamsInfo}
                    })
                }

                if (NodeId === "call-tools") {
                    newArr = newArr.filter((item) => {
                        if (item.uiType === "stream" && item.data) {
                            const streamData = item.data as AIChatMessage.AIStreamOutput
                            return streamData.NodeId !== "execute"
                        }
                        return true
                    })
                }
                // 出现tool_stdout时，删除前面的call-tools类型数据
                if (isToolStdoutStream(NodeId)) {
                    newArr = newArr.filter((item) => {
                        if (item.uiType === "stream" && item.data) {
                            const streamData = item.data as AIChatMessage.AIStreamOutput
                            return streamData.NodeId !== "call-tools"
                        }
                        return true
                    })
                }
                return newArr
            })
        } catch (error) {}
    })

    // 将流式输出的状态改成已完成
    const handleUpdateStreamStatus = useMemoizedFn((EventUUID: string) => {
        try {
            if (!eventUUIDs.current.has(EventUUID)) return
            setContents((old) => {
                return old.map((item) => {
                    if (item.uiType === "stream" && item.data) {
                        const streamData = item.data as AIChatMessage.AIStreamOutput
                        if (streamData.EventUUID === EventUUID) {
                            item.data = {...streamData, status: "end"}
                            return item
                        }
                    }
                    return item
                })
            })
        } catch (error) {}
    })
    // #endregion

    // #region 自由问题的结果处理逻辑
    const handleThought = useMemoizedFn((params: {Timestamp: number; thought: string}) => {
        const {Timestamp, thought} = params
        setContents((old) => {
            const newArr = [...old]
            newArr.push({
                id: uuidv4(),
                type: "answer",
                uiType: "thought",
                Timestamp,
                data: thought
            })
            return newArr
        })
    })
    const handleResult = useMemoizedFn((params: {Timestamp: number; Result: string}) => {
        const {Timestamp, Result} = params
        setContents((old) => {
            const newArr = [...old]
            newArr.push({
                id: uuidv4(),
                type: "answer",
                uiType: "result",
                Timestamp,
                data: Result
            })
            return newArr
        })
    })
    // #endregion

    // #region 调用工具数据的相关处理逻辑
    // 存放工具执行结果的Map对象
    let toolResultMap = useRef<Map<string, AIChatMessage.AIToolData>>(new Map())
    const getToolResult = useMemoizedFn((callToolId: string): AIChatMessage.AIToolData => {
        return toolResultMap.current.get(callToolId) || cloneDeep(DefaultAIToolResult)
    })
    const onSetToolResult = useMemoizedFn((callToolId: string, value: Partial<AIChatMessage.AIToolData>) => {
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

    // 存放工具执行过程中的可选择操作列表
    const toolStdOutSelectors = useRef<AIChatMessage.AIToolData>({
        ...cloneDeep(DefaultAIToolResult),
        callToolId: "",
        selectors: [],
        interactiveId: ""
    })

    // 工具执行结果生成为答案UI的逻辑
    const handleToolResultStatus = useMemoizedFn((res: AIOutputEvent, callToolId: string) => {
        setContents((old) => {
            let newArr = [...old]

            const toolStdOut = newArr.find((item) => {
                if (item.uiType === "stream" && item.data) {
                    const streamData = item.data as AIChatMessage.AIStreamOutput
                    return isToolStdoutStream(streamData.NodeId)
                }
                return false
            })
            const streamInfo = (toolStdOut?.data as AIChatMessage.AIStreamOutput)?.stream
            const toolStdOutContent = streamInfo?.stream || streamInfo?.reason || streamInfo?.system || ""
            const isShowAll = !!(toolStdOutContent && toolStdOutContent.length > 200)
            const toolStdoutShowContent = isShowAll ? toolStdOutContent.substring(0, 200) + "..." : toolStdOutContent
            newArr = newArr.filter((item) => {
                if (item.uiType === "stream" && item.data) {
                    const streamData = item.data as AIChatMessage.AIStreamOutput
                    return !isToolExecStream(streamData.NodeId)
                }
                return true
            })

            const toolResult = getToolResult(callToolId)
            newArr.push({
                id: uuidv4(),
                type: "answer",
                uiType: "toolResult",
                Timestamp: res.Timestamp,
                data: {
                    NodeId: res.Type,
                    toolAggregation: {
                        ...toolResult,
                        toolStdoutContent: {
                            content: toolStdoutShowContent,
                            isShowAll
                        }
                    }
                }
            })

            return newArr
        })
    })

    // 补全工具执行结果UI内的执行总结
    const handleToolResultSummary = useMemoizedFn((res: AIOutputEvent, callToolId: string) => {
        setContents((old) => {
            let newArr = old.map((item) => {
                if (item.uiType === "toolResult") {
                    const resultInfo = item.data as AIChatMessage.AIChatToolResult
                    if (resultInfo.toolAggregation.callToolId === callToolId) {
                        const toolResult = getToolResult(callToolId)
                        return {
                            ...item,
                            data: {
                                ...resultInfo,
                                toolAggregation: {
                                    ...toolResult,
                                    toolStdoutContent: resultInfo?.toolAggregation?.toolStdoutContent || {
                                        ...DefaultAIToolResult.toolStdoutContent
                                    }
                                }
                            }
                        }
                    }
                }
                return item
            })
            return newArr
        })
        onRemoveToolResult(callToolId)
        toolStdOutSelectors.current = cloneDeep(DefaultAIToolResult)
    })
    // #endregion

    // #region review事件转换成UI处理逻辑
    // review触发事件处理
    const handleTriggerReview = useMemoizedFn(
        (params: {Timestamp: number; data: AIChatMessage.ToolUseReviewRequire}) => {
            const {Timestamp, data} = params
            review.current = cloneDeep({type: "tool_use_review_require", data: data})
            const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes("tool_use_review_require")
            if (isTrigger) {
                setContents((old) => {
                    const newArr = [...old]
                    newArr.push({
                        id: uuidv4(),
                        type: "answer",
                        uiType: "tool_use_review_require",
                        Timestamp,
                        data: cloneDeep(data)
                    })
                    return newArr
                })
            }
        }
    )

    // AI人机交互的review事件处理
    const handleTriggerRequireReview = useMemoizedFn(
        (params: {Timestamp: number; data: AIChatMessage.AIReviewRequire}) => {
            const {Timestamp, data} = params
            review.current = cloneDeep({type: "require_user_interactive", data: data})
            setContents((old) => {
                const newArr = [...old]
                newArr.push({
                    id: uuidv4(),
                    type: "answer",
                    uiType: "require_user_interactive",
                    Timestamp,
                    data: cloneDeep(data)
                })
                return newArr
            })
        }
    )

    // 释放当前review信息
    const handleReviewRelease = useMemoizedFn((id: string) => {
        if (!review.current || review.current.data.id !== id) return
        const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes(review.current.type)
        const type = review.current.type
        review.current = undefined
        setContents((old) => {
            return old.filter((item) => item.uiType !== type)
        })
        if (isTrigger) {
            onReviewRelease && onReviewRelease(id)
        }
    })
    // #endregion

    // 设置自由对话的 id
    const handleSetCoordinatorId = useMemoizedFn((id: string) => {
        setCoordinatorId((old) => (old === id ? old : id))
    })

    // 处理数据方法
    const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            let ipcContent = Uint8ArrayToString(res.Content) || ""
            if (res.Type === "stream") {
                const {NodeId, EventUUID} = res
                if (!NodeId || !EventUUID) {
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

            if (res.Type === "thought") {
                const data = JSON.parse(ipcContent) as AIChatMessage.AIChatThought
                handleThought({Timestamp: res.Timestamp, thought: data.thought})
                return
            }
            if (res.Type === "result") {
                const data = JSON.parse(ipcContent) as AIChatMessage.AIChatResult
                handleResult({Timestamp: res.Timestamp, Result: data.result})
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

                handleGrpcDataPushLog({
                    type: "info",
                    info: res,
                    pushLog: handlePushLog
                })
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

            if (res.Type === "ai_review_start") {
            }
            if (res.Type === "ai_review_countdown") {
            }
            if (res.Type === "ai_review_end") {
            }
            if (res.Type === "tool_use_review_require") {
                const data = JSON.parse(ipcContent) as AIChatMessage.ToolUseReviewRequire
                if (!data?.id || !data?.selectors || !data?.selectors?.length) {
                    handleGrpcDataPushLog({
                        type: "error",
                        info: res,
                        pushLog: handlePushLog
                    })
                    return
                }
                handleTriggerReview({Timestamp: res.Timestamp, data})
                return
            }
            if (res.Type === "require_user_interactive") {
                const data = JSON.parse(ipcContent) as AIChatMessage.AIReviewRequire
                if (!data?.id) {
                    handleGrpcDataPushLog({
                        type: "error",
                        info: res,
                        pushLog: handlePushLog
                    })
                    return
                }
                handleTriggerRequireReview({Timestamp: res.Timestamp, data})
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
                handleToolResultStatus(res, data?.call_tool_id)
                return
            }
            if (res.Type === "tool_call_done") {
                const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                onSetToolResult(data?.call_tool_id, {
                    status: "success",
                    time: res.Timestamp
                })
                handleToolResultStatus(res, data?.call_tool_id)
                return
            }
            if (res.Type === "tool_call_error") {
                const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                onSetToolResult(data?.call_tool_id, {
                    status: "failed",
                    time: res.Timestamp
                })
                handleToolResultStatus(res, data?.call_tool_id)
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
                handleToolResultSummary(res, data?.call_tool_id || "")
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

    // 用户问题或review的主动操作
    const handleSend = useMemoizedFn((request: AIInputEvent, cb?: () => void) => {
        try {
            const {IsInteractiveMessage, InteractiveId, IsFreeInput, FreeInput} = request
            if (IsInteractiveMessage && InteractiveId) {
                if (!review.current) {
                    yakitNotify("error", "未获取到 review 信息, 操作无效")
                    return
                }
                const type = review.current.type
                review.current = undefined
                // tool_review事件操作
                setContents((old) => {
                    return old.filter((item) => item.uiType !== type)
                })
            }

            if (IsFreeInput && FreeInput) {
                // 用户问题
                setContents((old) => {
                    const newArr = [...old]
                    newArr.push({
                        id: uuidv4(),
                        type: "question",
                        uiType: "result",
                        Timestamp: Date.now(),
                        data: FreeInput || ""
                    })
                    return newArr
                })
            }
            cb && cb()
        } catch (error) {}
    })

    const handleResetData = useMemoizedFn(() => {
        review.current = undefined
        setCoordinatorId("")
        eventUUIDs.current.clear()
        setContents([])
    })

    return [
        {coordinatorId, contents},
        {handleSetData, handleResetData, handleSetCoordinatorId, handleSend}
    ] as const
}

export default useCasualChat
