import {useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {
    handleGrpcDataPushLog,
    isAutoContinueReview,
    isToolExecStream,
    isToolStdoutStream,
    noSkipReviewTypes
} from "./utils"
import {v4 as uuidv4} from "uuid"
import {UseCasualChatEvents, UseCasualChatParams, UseCasualChatState} from "./type"
import {
    AIReviewJudgeLevelMap,
    AIStreamNodeIdToLabel,
    DefaultAIToolResult,
    DefaultToolStdOutSelectors
} from "./defaultConstant"
import {yakitNotify} from "@/utils/notification"
import {AIAgentGrpcApi, AIInputEvent, AIOutputEvent} from "./grpcApi"
import {AIChatQSData, AIChatReview, AIStreamOutput, AIToolResult, ToolStreamSelectors} from "./aiRender"

// 属于该 hook 处理数据的类型
export const UseCasualChatTypes = ["thought", "result", "exec_aiforge_review_require"]

function useCasualChat(params?: UseCasualChatParams): [UseCasualChatState, UseCasualChatEvents]

function useCasualChat(params?: UseCasualChatParams) {
    const {pushLog, updateLog, getRequest, onReviewRelease} = params || {}

    const handlePushLog = useMemoizedFn((logInfo: AIChatQSData) => {
        pushLog && pushLog(logInfo)
    })

    const review = useRef<AIChatReview>()

    const [coordinatorId, setCoordinatorId] = useState<string>("")
    // 存放流式输出的EventUUID的集合
    const eventUUIDs = useRef<Set<string>>(new Set())
    const handleSetEventUUID = useMemoizedFn((id: string) => {
        if (!eventUUIDs.current.has(id)) eventUUIDs.current.add(id)
    })
    const [contents, setContents] = useState<AIChatQSData[]>([])

    // #region 流式输出处理的相关逻辑
    const handleStreams = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const {IsSystem, IsReason, NodeId, Timestamp, EventUUID, Content, StreamDelta, DisableMarkdown} = res
            let ipcContent = Uint8ArrayToString(Content) || ""
            let ipcStreamDelta = Uint8ArrayToString(StreamDelta) || ""
            const content = ipcContent + ipcStreamDelta

            const setFunc = !IsSystem && !IsReason ? setContents : updateLog

            if (setFunc) {
                setFunc((old) => {
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
                                NodeLabel: AIStreamNodeIdToLabel[NodeId]?.label || NodeId,
                                EventUUID,
                                status: "start",
                                content: content,
                                DisableMarkdown: DisableMarkdown
                            },
                            Timestamp: Timestamp
                        }
                        if (isToolStdoutStream(NodeId)) streamsInfo.data.selectors = {...toolStdOutSelectors.current}
                        newArr.push(streamsInfo)
                    }

                    if (NodeId === "call-tools") {
                        newArr = newArr.filter((item) => {
                            if (item.type === "stream" && item.data) {
                                return item.data.NodeId !== "execute"
                            }
                            return true
                        })
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
            }
        } catch (error) {}
    })

    // 将流式输出的状态改成已完成
    const handleUpdateStreamStatus = useMemoizedFn((EventUUID: string) => {
        try {
            if (!eventUUIDs.current.has(EventUUID)) return
            setContents((old) => {
                return old.map((item) => {
                    if (item.type === "stream" && item.data) {
                        if (item.data.EventUUID === EventUUID) {
                            item.data = {...item.data, status: "end"}
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
                type: "thought",
                Timestamp,
                data: thought
            })
            return newArr
        })
    })
    const handleResult = useMemoizedFn((params: {Timestamp: number; result: string}) => {
        const {Timestamp, result} = params
        setContents((old) => {
            const newArr = [...old]
            newArr.push({
                id: uuidv4(),
                type: "result",
                Timestamp,
                data: result
            })
            return newArr
        })
    })
    // #endregion

    // #region 调用工具数据的相关处理逻辑
    // 存放工具执行结果的Map对象
    let toolResultMap = useRef<Map<string, AIToolResult>>(new Map())
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

    // 存放工具执行过程中的可选择操作列表
    const toolStdOutSelectors = useRef<ToolStreamSelectors>(cloneDeep(DefaultToolStdOutSelectors))

    // 工具执行结果生成为答案UI的逻辑
    const handleToolResultStatus = useMemoizedFn((res: AIOutputEvent, callToolId: string) => {
        setContents((old) => {
            let newArr = [...old]

            const toolStdOut = newArr.find((item) => {
                if (item.type === "stream" && item.data) {
                    return isToolStdoutStream(item.data.NodeId)
                }
                return false
            })
            const toolStdOutContent = (toolStdOut?.data as AIStreamOutput)?.content
            const isShowAll = !!(toolStdOutContent && toolStdOutContent.length > 200)
            const toolStdoutShowContent = isShowAll ? toolStdOutContent.substring(0, 200) + "..." : toolStdOutContent
            newArr = newArr.filter((item) => {
                if (item.type === "stream" && item.data) {
                    return !isToolExecStream(item.data.NodeId)
                }
                return true
            })

            const toolResult = getToolResult(callToolId)
            newArr.push({
                id: uuidv4(),
                type: "tool_result",
                Timestamp: res.Timestamp,
                data: {
                    ...toolResult,
                    toolStdoutContent: {
                        content: toolStdoutShowContent,
                        isShowAll
                    }
                }
            })

            return newArr
        })
        onRemoveToolResult(callToolId)
        toolStdOutSelectors.current = cloneDeep(DefaultToolStdOutSelectors)
    })
    // #endregion

    // #region review事件转换成UI处理逻辑
    // 处理 tool_review和forge_view 的 ai 判断得分事件
    const handleToolReviewJudgement = useMemoizedFn((score: AIAgentGrpcApi.AIReviewJudgement) => {
        const {interactive_id} = score
        score.levelLabel = AIReviewJudgeLevelMap[score?.level || ""]?.label || undefined
        const isTrigger = !isAutoContinueReview(getRequest)
        if (isTrigger) {
            setContents((old) => {
                return old.map((item) => {
                    if (
                        (item.type === "tool_use_review_require" || item.type === "exec_aiforge_review_require") &&
                        item.data
                    ) {
                        const data = item.data
                        if (
                            data.id === interactive_id &&
                            // aiReview 没有或者 aiReview 的 seconds 为空时可以赋值
                            (!data.aiReview || (data.aiReview && typeof data.aiReview.seconds === "undefined"))
                        ) {
                            data.aiReview = cloneDeep(score)
                            item.data = cloneDeep(data)
                        }
                        return item
                    }
                    return item
                })
            })
        }
    })

    // review触发事件处理
    const handleTriggerReview = useMemoizedFn(
        (params: {Timestamp: number; data: AIAgentGrpcApi.ToolUseReviewRequire}) => {
            const {Timestamp, data} = params
            review.current = cloneDeep({type: "tool_use_review_require", data: data})
            const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes("tool_use_review_require")
            if (isTrigger) {
                setContents((old) => {
                    const newArr = [...old]
                    newArr.push({
                        id: uuidv4(),
                        type: "tool_use_review_require",
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
        (params: {Timestamp: number; data: AIAgentGrpcApi.AIReviewRequire}) => {
            const {Timestamp, data} = params
            review.current = cloneDeep({type: "require_user_interactive", data: data})
            setContents((old) => {
                const newArr = [...old]
                newArr.push({
                    id: uuidv4(),
                    type: "require_user_interactive",
                    Timestamp,
                    data: cloneDeep(data)
                })
                return newArr
            })
        }
    )

    // forge_review 事件处理
    const handleExecForgeReview = useMemoizedFn((params: {Timestamp: number; data: AIAgentGrpcApi.ExecForgeReview}) => {
        const {Timestamp, data} = params
        review.current = cloneDeep({type: "exec_aiforge_review_require", data: data})
        const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes("exec_aiforge_review_require")
        if (isTrigger) {
            setContents((old) => {
                const newArr = [...old]
                newArr.push({
                    id: uuidv4(),
                    type: "exec_aiforge_review_require",
                    Timestamp,
                    data: cloneDeep(data)
                })
                return newArr
            })
        }
    })

    // 释放当前review信息
    const handleReviewRelease = useMemoizedFn((id: string) => {
        if (!review.current || review.current.data.id !== id) return
        const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes(review.current.type)
        const type = review.current.type
        review.current = undefined
        setContents((old) => {
            return old.filter((item) => item.type !== type)
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
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatThought
                handleThought({Timestamp: res.Timestamp, thought: data.thought})
                return
            }
            if (res.Type === "result") {
                const {result, after_stream} = JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatResult
                if (!!after_stream) return
                handleResult({Timestamp: res.Timestamp, result: result})
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

                handleGrpcDataPushLog({
                    type: "info",
                    info: res,
                    pushLog: handlePushLog
                })
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

            if (["ai_review_start", "ai_review_countdown", "ai_review_end"].includes(res.Type)) {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewJudgement
                if (!data?.interactive_id) {
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

            if (res.Type === "tool_use_review_require") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolUseReviewRequire
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
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewRequire
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

            if (res.Type === "exec_aiforge_review_require") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ExecForgeReview
                if (!data?.id) {
                    handleGrpcDataPushLog({
                        type: "error",
                        info: res,
                        pushLog: handlePushLog
                    })
                    return
                }
                handleExecForgeReview({Timestamp: res.Timestamp, data})
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
                // 自由对话的 tool 执行没有 summary 这一步
                return
            }
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
                    return old.filter((item) => item.type !== type)
                })
            }

            if (IsFreeInput && FreeInput) {
                // 用户问题
                setContents((old) => {
                    const newArr = [...old]
                    newArr.push({
                        id: uuidv4(),
                        type: "question",
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
