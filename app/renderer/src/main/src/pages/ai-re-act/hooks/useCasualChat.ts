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
import {handleSendFunc, UseCasualChatEvents, UseCasualChatParams, UseCasualChatState} from "./type"
import {
    AIReviewJudgeLevelMap,
    CasualDefaultToolResultSummary,
    convertNodeIdToVerbose,
    DefaultAIToolResult
} from "./defaultConstant"
import {yakitNotify} from "@/utils/notification"
import {AIAgentGrpcApi, AIOutputEvent} from "./grpcApi"
import {AIChatQSData, AIReviewType, AIStreamOutput, AIToolResult, ToolStreamSelectors} from "./aiRender"
import {getLocalFileName} from "@/components/MilkdownEditor/CustomFile/utils"

// 属于该 hook 处理数据的类型
export const UseCasualChatTypes = ["thought", "result", "exec_aiforge_review_require"]

function useCasualChat(params?: UseCasualChatParams): [UseCasualChatState, UseCasualChatEvents]

function useCasualChat(params?: UseCasualChatParams) {
    const {pushLog, updateLog, getRequest, onReviewRelease} = params || {}

    const handlePushLog = useMemoizedFn((logInfo: AIChatQSData) => {
        pushLog && pushLog(logInfo)
    })

    const review = useRef<AIChatQSData>()

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
            const {
                IsSystem,
                IsReason,
                CallToolID,
                NodeId,
                NodeIdVerbose,
                Timestamp,
                EventUUID,
                Content,
                StreamDelta,
                ContentType
            } = res
            if (!NodeId || !EventUUID) {
                // 没有对应 UUID 算异常日志
                throw new Error("stream data is invalid")
            }

            handleSetEventUUID(EventUUID)

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
                                CallToolID,
                                NodeId,
                                NodeIdVerbose: NodeIdVerbose || convertNodeIdToVerbose(NodeId),
                                EventUUID,
                                status: "start",
                                content: content,
                                ContentType
                            },
                            Timestamp: Timestamp
                        }
                        const sls = toolStdOutSelectors.current.get(CallToolID)
                        if (isToolStdoutStream(NodeId) && sls) {
                            streamsInfo.data.selectors = sls
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
            }
        } catch (error) {
            handleGrpcDataPushLog({
                type: "error",
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // 将流式输出的状态改成已完成
    const handleUpdateStreamStatus = useMemoizedFn((EventUUID: string) => {
        try {
            if (!eventUUIDs.current.has(EventUUID)) return
            setContents((old) => {
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
    // #endregion

    // #region 自由问题的结果处理逻辑
    const handleThought = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatThought

            setContents((old) => {
                const newArr = [...old]
                newArr.push({
                    id: uuidv4(),
                    type: "thought",
                    Timestamp: res.Timestamp,
                    data: data.thought
                })
                return newArr
            })
        } catch (error) {
            handleGrpcDataPushLog({
                type: "error",
                info: res,
                pushLog: handlePushLog
            })
        }
    })
    const handleResult = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const {result, after_stream} = JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatResult
            if (!!after_stream) return

            setContents((old) => {
                const newArr = [...old]
                newArr.push({
                    id: uuidv4(),
                    type: "result",
                    Timestamp: res.Timestamp,
                    data: result
                })
                return newArr
            })
        } catch (error) {
            handleGrpcDataPushLog({
                type: "error",
                info: res,
                pushLog: handlePushLog
            })
        }
    })
    // #endregion

    // #region 调用工具数据的相关处理逻辑
    // 工具执行结果-map
    let toolResultMap = useRef<Map<string, AIToolResult>>(new Map())
    const setToolResultMap = useMemoizedFn((callToolId: string, value: Partial<AIToolResult>) => {
        let current = toolResultMap.current.get(callToolId) || cloneDeep(DefaultAIToolResult)
        current = {
            ...current,
            ...value
        }
        toolResultMap.current.set(callToolId, current)
    })

    // 工具执行过程-可操作选项 map
    const toolStdOutSelectors = useRef<Map<string, ToolStreamSelectors>>(new Map())
    const setToolStdOutSelectorMap = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCallWatcher

            if (!data?.call_tool_id || !data?.id || !data?.selectors || !data.selectors?.length) {
                throw new Error("tool_call_watcher data is invalid")
            }

            toolStdOutSelectors.current.set(data.call_tool_id, {
                callToolId: data.call_tool_id,
                InteractiveId: data.id,
                selectors: data.selectors
            })
        } catch (error) {
            handleGrpcDataPushLog({
                type: "error",
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // 工具执行结果生成为答案UI的逻辑
    const handleToolResultStatus = useMemoizedFn(
        (res: AIOutputEvent, status: "success" | "failed" | "user_cancelled") => {
            try {
                const ipcContent = Uint8ArrayToString(res.Content) || ""
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall

                if (!data?.call_tool_id) {
                    throw new Error("tool_result data is invalid")
                }

                const toolResult = toolResultMap.current.get(data.call_tool_id)
                if (!toolResult) {
                    throw new Error("tool_result data is invalid")
                }
                toolResult.status = status
                toolResult.summary = CasualDefaultToolResultSummary[status]?.label || ""

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
                toolResultMap.current.delete(data.call_tool_id)
            } catch (error) {
                handleGrpcDataPushLog({
                    type: "error",
                    info: res,
                    pushLog: handlePushLog
                })
            }
        }
    )
    // #endregion

    // #region review事件转换成UI处理逻辑
    // 处理 tool_review和forge_view 的 ai 判断得分事件
    const handleReviewJudgement = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const score = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewJudgement

            if (!score?.interactive_id) {
                throw new Error("review_judgement data is invalid")
            }

            const {interactive_id} = score
            score.levelLabel = AIReviewJudgeLevelMap[score?.level || ""]?.label || undefined
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
        } catch (error) {
            handleGrpcDataPushLog({
                type: "error",
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // review触发事件处理
    const handleToolReview = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolUseReviewRequire

            if (!data?.id || !data?.selectors || !data?.selectors?.length) {
                throw new Error("tool_review data is invalid")
            }

            const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes("tool_use_review_require")
            review.current = cloneDeep({
                type: "tool_use_review_require",
                data: {
                    ...cloneDeep(data),
                    selected: isTrigger ? undefined : JSON.stringify({suggestion: "continue"}),
                    optionValue: isTrigger ? undefined : "continue"
                },
                id: uuidv4(),
                Timestamp: res.Timestamp
            })

            setContents((old) => {
                const newArr = [...old]
                if (!review.current) return newArr
                newArr.push(cloneDeep(review.current))
                return newArr
            })
        } catch (error) {
            handleGrpcDataPushLog({
                type: "error",
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // AI人机交互的review事件处理
    const handleUserRequireReview = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIReviewRequire

            if (!data?.id) {
                throw new Error("user_require_review data is invalid")
            }

            review.current = cloneDeep({
                type: "require_user_interactive",
                data: cloneDeep(data),
                id: uuidv4(),
                Timestamp: res.Timestamp
            })

            setContents((old) => {
                const newArr = [...old]
                if (!review.current) return newArr
                newArr.push(cloneDeep(review.current))
                return newArr
            })
        } catch (error) {
            handleGrpcDataPushLog({
                type: "error",
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // forge_review 事件处理
    const handleExecForgeReview = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ExecForgeReview

            if (!data?.id) {
                throw new Error("exec_forge_review data is invalid")
            }

            const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes("exec_aiforge_review_require")
            review.current = cloneDeep({
                type: "exec_aiforge_review_require",
                data: {
                    ...cloneDeep(data),
                    selected: isTrigger ? undefined : JSON.stringify({suggestion: "continue"}),
                    optionValue: isTrigger ? undefined : "continue"
                },
                id: uuidv4(),
                Timestamp: res.Timestamp
            })

            setContents((old) => {
                const newArr = [...old]
                if (!review.current) return newArr
                newArr.push(cloneDeep(review.current))
                return newArr
            })
        } catch (error) {
            handleGrpcDataPushLog({
                type: "error",
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // 释放当前review信息
    const handleReviewRelease = useMemoizedFn((res: AIOutputEvent) => {
        try {
            if (!review.current) return
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReviewRelease

            if (!data?.id) {
                throw new Error("review_release data is invalid")
            }
            const type = review.current.type
            const info = cloneDeep(review.current.data) as AIReviewType
            if (info?.id !== data.id) {
                throw new Error("review_release data is invalid")
            }

            info.selected = JSON.stringify({suggestion: "continue"})
            info.optionValue = "continue"
            review.current = undefined
            setContents((old) => {
                return old.map((item) => {
                    if (item.type === type && item.data && (item.data as AIReviewType).id === info.id) {
                        item.data = cloneDeep(info)
                    }
                    return item
                })
            })

            const isTrigger = !isAutoContinueReview(getRequest) || noSkipReviewTypes(type)
            if (isTrigger) {
                onReviewRelease && onReviewRelease(data.id)
            }
        } catch (error) {
            handleGrpcDataPushLog({
                type: "error",
                info: res,
                pushLog: handlePushLog
            })
        }
    })
    // #endregion

    /** 文件系统操作处理数据 */
    const handleFileSystemPin = useMemoizedFn(async (res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const {path} = JSON.parse(ipcContent) as AIAgentGrpcApi.FileSystemPin
            const fileInfo = await getLocalFileName(path, true)

            setContents((old) => {
                const newArr = [...old]
                newArr.push({
                    id: uuidv4(),
                    type: "file_system_pin",
                    Timestamp: res.Timestamp,
                    data: {
                        path: path,
                        isDir: res.Type === "filesystem_pin_directory",
                        name: fileInfo.name,
                        suffix: fileInfo.suffix
                    }
                })
                return newArr
            })
        } catch (error) {
            handleGrpcDataPushLog({
                type: "error",
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // 设置自由对话的 id
    const handleSetCoordinatorId = useMemoizedFn((id: string) => {
        setCoordinatorId((old) => (old === id ? old : id))
    })

    // 处理数据方法
    const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            let ipcContent = Uint8ArrayToString(res.Content) || ""

            if (res.Type === "stream") {
                handleStreams(res)
                return
            }

            if (res.Type === "thought") {
                handleThought(res)
                return
            }
            if (res.Type === "result") {
                handleResult(res)
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

                handleGrpcDataPushLog({
                    type: "info",
                    info: res,
                    pushLog: handlePushLog
                })
                return
            }

            if (res.Type === "review_release") {
                // review释放通知
                handleReviewRelease(res)
                return
            }

            if (["ai_review_start", "ai_review_countdown", "ai_review_end"].includes(res.Type)) {
                handleReviewJudgement(res)
                return
            }

            if (res.Type === "tool_use_review_require") {
                handleToolReview(res)
                return
            }
            if (res.Type === "require_user_interactive") {
                handleUserRequireReview(res)
                return
            }

            if (res.Type === "exec_aiforge_review_require") {
                handleExecForgeReview(res)
                return
            }

            if (res.Type === "tool_call_start") {
                // 工具调用开始
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
                if (!data?.call_tool_id) {
                    throw new Error("tool_call_start data is invalid")
                }
                setToolResultMap(data.call_tool_id, {
                    callToolId: data?.call_tool_id,
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

            if (["filesystem_pin_directory", "filesystem_pin_filename"].includes(res.Type)) {
                // 文件系统操作
                handleFileSystemPin(res)
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
    const handleSend: handleSendFunc = useMemoizedFn(({request, optionValue, cb}) => {
        try {
            const {IsInteractiveMessage, InteractiveId, IsFreeInput, FreeInput} = request
            if (IsInteractiveMessage && InteractiveId) {
                if (!review.current || (review.current.data as AIReviewType)?.id !== InteractiveId) {
                    yakitNotify("error", "未获取到 review 信息, 操作无效")
                    return
                }

                ;(review.current.data as AIReviewType).selected = request.InteractiveJSONInput
                ;(review.current.data as AIReviewType).optionValue = optionValue

                const type = review.current.type
                const info = cloneDeep(review.current.data) as AIReviewType
                review.current = undefined
                setContents((old) => {
                    return old.map((item) => {
                        if (item.type === type && item.data && (item.data as AIReviewType).id === info.id) {
                            item.data = cloneDeep(info)
                        }
                        return item
                    })
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
        toolResultMap.current.clear()
        toolStdOutSelectors.current.clear()
    })

    return [
        {coordinatorId, contents},
        {handleSetData, handleResetData, handleSetCoordinatorId, handleSend}
    ] as const
}

export default useCasualChat
