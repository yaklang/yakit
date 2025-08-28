import {useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {AIChatMessage, AIChatReview, AIInputEvent, AIOutputEvent, AIStartParams} from "@/pages/ai-agent/type/aiChat"
import {isToolStdoutStream, noSkipReviewTypes} from "./utils"
import {v4 as uuidv4} from "uuid"

// 属于该 hook 处理数据的类型
export const UseCasualChatTypes = ["stream|re-act-verify", "stream|re-act-loop", "result", "structured|stream-finished"]

export interface useCasualChatParams {
    // 获取创建流时的请求参数
    getRequest?: () => AIStartParams | undefined
    // 异常数据放入日志中
    pushErrorLog: (log: AIChatMessage.Log) => void
    // review 主动释放事件
    onReviewRelease?: (id: string) => void
}

const defaultAIToolData: AIChatMessage.AIToolData = {
    callToolId: "",
    toolName: "-",
    status: "default",
    summary: "",
    time: 0,
    selectors: [],
    interactiveId: "",
    toolStdoutContent: {
        content: "",
        isShowAll: false
    }
}
function useCasualChat(params?: useCasualChatParams) {
    const {getRequest, pushErrorLog, onReviewRelease} = params || {}

    const pushLog = useMemoizedFn((logInfo: AIChatMessage.Log) => {
        pushErrorLog && pushErrorLog(logInfo)
    })
    const isAutoExecReview = useMemoizedFn(() => {
        if (getRequest) {
            const request = getRequest()
            return request ? request.ReviewPolicy === "yolo" : false
        }
        return false
    })

    const review = useRef<AIChatReview>()

    const [contents, setContents] = useState<AIChatMessage.AICasualChatQAStream[]>([])

    // #region 流式输出处理的相关逻辑
    const handleStreams = useMemoizedFn(
        (params: {type: string; NodeId: string; EventUUID: string; Timestamp: number; content: string}) => {
            const {type, NodeId, EventUUID, Timestamp, content} = params
            try {
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
                        if (type === "systemStream") streamsInfo.stream.system += content
                        if (type === "reasonStream") streamsInfo.stream.reason += content
                        if (type === "stream") streamsInfo.stream.stream += content
                        if (isToolStdoutStream(NodeId)) streamsInfo.toolAggregation = {...toolStdOutSelectors.current}
                        newArr.push({
                            id: uuidv4(),
                            type: "answer",
                            uiType: "stream",
                            Timestamp,
                            data: {...streamsInfo}
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
        }
    )

    // 将流式输出的状态改成已完成
    const handleUpdateStreamStatus = useMemoizedFn((EventUUID: string) => {
        try {
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
    const handleResult = useMemoizedFn((params: {Timestamp: number; Result: string}) => {
        const {Timestamp, Result} = params
        setContents((old) => {
            const newArr = [...old]
            newArr.push({
                id: uuidv4(),
                type: "answer",
                uiType: "stream",
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
        return toolResultMap.current.get(callToolId) || cloneDeep(defaultAIToolData)
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
        ...cloneDeep(defaultAIToolData),
        callToolId: "",
        selectors: [],
        interactiveId: ""
    })

    // 工具执行结果生成为答案UI的逻辑
    const aggregationToolData = useMemoizedFn((res: AIOutputEvent, callToolId: string) => {
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
                    return isToolStdoutStream(streamData.NodeId)
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
    const onSetToolSummary = useMemoizedFn((res: AIOutputEvent, callToolId: string) => {
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
                                        ...defaultAIToolData.toolStdoutContent
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
        toolStdOutSelectors.current = cloneDeep(defaultAIToolData)
    })
    // #endregion

    // #region review事件转换成UI处理逻辑
    // review触发事件处理
    const handleTriggerReview = useMemoizedFn(
        (params: {Timestamp: number; data: AIChatMessage.ToolUseReviewRequire}) => {
            const {Timestamp, data} = params
            console.log(`handleTriggerReview-----\n`, JSON.stringify(data))
            review.current = cloneDeep({type: "tool_use_review_require", data: data})
            if (!isAutoExecReview() || noSkipReviewTypes("tool_use_review_require")) {
                setContents((old) => {
                    const newArr = [...old]
                    newArr.push({
                        id: uuidv4(),
                        type: "answer",
                        uiType: "toolReview",
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
            console.log(`handleTriggerRequireReview-----\n`, JSON.stringify(data))
            review.current = cloneDeep({type: "require_user_interactive", data: data})
            setContents((old) => {
                const newArr = [...old]
                newArr.push({
                    id: uuidv4(),
                    type: "answer",
                    uiType: "requireUser",
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
        const isTrigger = !isAutoExecReview() || noSkipReviewTypes("tool_use_review_require")
        review.current = undefined
        if (isTrigger) {
            onReviewRelease && onReviewRelease(id)
        }
    })
    // #endregion

    // 处理数据方法
    const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            let ipcContent = Uint8ArrayToString(res.Content) || ""
            let ipcStreamDelta = Uint8ArrayToString(res.StreamDelta) || ""

            if (res.Type === "stream") {
                if (res.NodeId === "re-act-loop" || res.NodeId === "re-act-verify") {
                    const {IsSystem, IsReason, NodeId, Timestamp, EventUUID} = res
                    if (!NodeId || !EventUUID) {
                        pushLog({id: uuidv4(), level: "error", message: `${JSON.stringify(res)}`})
                        return
                    }
                    const type = IsSystem ? "systemStream" : IsReason ? "reasonStream" : "stream"
                    handleStreams({type, NodeId, EventUUID, Timestamp, content: ipcContent + ipcStreamDelta})
                    return
                }
                return
            }

            if (res.Type === "result") {
                if (!res.IsJson) return
                const data = JSON.parse(ipcContent) as AIChatMessage.AIChatResult
                handleResult({Timestamp: res.Timestamp, Result: data.result})
                return
            }

            if (res.Type === "structured") {
                if (!res.IsJson) return

                if (res.NodeId === "stream-finished") {
                    // 有问题
                    const {event_writer_id} = JSON.parse(ipcContent) as AIChatMessage.AIStreamFinished
                    if (!event_writer_id) {
                        pushLog({id: uuidv4(), level: "error", message: `${JSON.stringify(res)}`})
                        return
                    }
                    handleUpdateStreamStatus(event_writer_id)
                }

                return
            }

            if (res.Type === "review_release") {
                // review释放通知
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.ReviewRelease
                    console.log("casualChat-review-release---\n", data)
                    if (!data?.id) {
                        pushLog({id: uuidv4(), level: "error", message: `${JSON.stringify(res)}`})
                        return
                    }
                    handleReviewRelease(data.id)
                } catch (error) {}
                return
            }

            if (res.Type === "tool_use_review_require") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.ToolUseReviewRequire

                    if (!data?.id) return
                    if (!data?.selectors || !data?.selectors?.length) return

                    handleTriggerReview({Timestamp: res.Timestamp, data})
                } catch (error) {}
                return
            }
            if (res.Type === "require_user_interactive") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIReviewRequire

                    if (!data?.id) return
                    handleTriggerRequireReview({Timestamp: res.Timestamp, data})
                } catch (error) {}
                return
            }

            if (res.Type === "tool_call_start") {
                // 工具调用开始
                if (!res.IsJson) return
                const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                onSetToolResult(data?.call_tool_id, {
                    callToolId: data?.call_tool_id,
                    toolName: data?.tool?.name || "-"
                })
                toolStdOutSelectors.current.callToolId = data?.call_tool_id
                return
            }

            if (res.Type === "tool_call_user_cancel") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                    onSetToolResult(data?.call_tool_id, {
                        status: "user_cancelled",
                        time: res.Timestamp
                    })
                    aggregationToolData(res, data?.call_tool_id)
                } catch (error) {}
                return
            }
            if (res.Type === "tool_call_done") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                    onSetToolResult(data?.call_tool_id, {
                        status: "success",
                        time: res.Timestamp
                    })
                    aggregationToolData(res, data?.call_tool_id)
                } catch (error) {}
                return
            }
            if (res.Type === "tool_call_error") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                    onSetToolResult(data?.call_tool_id, {
                        status: "failed",
                        time: res.Timestamp
                    })
                    aggregationToolData(res, data?.call_tool_id)
                } catch (error) {}
                return
            }

            if (res.Type === "tool_call_watcher") {
                // 先于 isToolStdout(nodeID) 为true的节点传给前端
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCallWatcher
                    if (!data?.id) return
                    if (!data?.selectors || !data?.selectors?.length) return
                    const currentToolData = getToolResult(data.call_tool_id)
                    if (currentToolData.callToolId === toolStdOutSelectors.current.callToolId) {
                        // 当前的callToolId与本地工具中的一致
                        toolStdOutSelectors.current.selectors = data.selectors
                        toolStdOutSelectors.current.interactiveId = data.id
                    }
                } catch (error) {}
                return
            }
            if (res.Type === "tool_call_summary") {
                // 工具调用总结
                try {
                    if (!res.IsJson) return
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
                } catch (error) {}
                return
            }

            console.log("unkown---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)
        } catch (error) {}
    })

    // 用户问题或review的主动操作
    const handleSend = useMemoizedFn((request: AIInputEvent, cb?: () => void) => {
        try {
            const {IsInteractiveMessage, InteractiveId, IsFreeInput, FreeInput} = request
            if (IsInteractiveMessage && InteractiveId) {
                // tool_review事件操作
                setContents((old) => {
                    return old.filter((item) => item.uiType !== "toolReview")
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

    const handleReset = useMemoizedFn(() => {
        review.current = undefined
        setContents([])
    })
    return [{contents}, {handleSetData, handleSend, handleReset}] as const
}

export default useCasualChat
