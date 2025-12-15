import {useRef, useState} from "react"
import {useMemoizedFn, useThrottleFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {
    genBaseAIChatData,
    handleGrpcDataPushLog,
    isAutoContinueReview,
    isToolExecStream,
    isToolStderrStream,
    isToolStdoutStream,
    noSkipReviewTypes
} from "./utils"
import {v4 as uuidv4} from "uuid"
import {AIChatLogData, handleSendFunc, UseCasualChatEvents, UseCasualChatParams, UseCasualChatState} from "./type"
import {
    AIReviewJudgeLevelMap,
    CasualDefaultToolResultSummary,
    convertNodeIdToVerbose,
    DefaultAIToolResult
} from "./defaultConstant"
import {yakitNotify} from "@/utils/notification"
import {AIAgentGrpcApi, AIInputEventSyncTypeEnum, AIOutputEvent} from "./grpcApi"
import {
    AIChatQSData,
    AIChatQSDataTypeEnum,
    AIReviewType,
    AIStreamOutput,
    AIToolResult,
    ToolStreamSelectors
} from "./aiRender"

// 属于该 hook 处理数据的类型
export const UseCasualChatTypes = [
    "thought",
    "result",
    "exec_aiforge_review_require",
    // 自由对话崩溃的错误信息
    "fail_react_task",
    // 自由对话成功结束标志
    "success_react_task"
]

function useCasualChat(params?: UseCasualChatParams): [UseCasualChatState, UseCasualChatEvents]

function useCasualChat(params?: UseCasualChatParams) {
    const {pushLog, getRequest, onReviewRelease, onGrpcFolder, sendRequest, onNotifyMessage} = params || {}

    const handlePushLog = useMemoizedFn((logInfo: AIChatLogData) => {
        pushLog && pushLog(logInfo)
    })

    const review = useRef<AIChatQSData>()

    // 存放流式输出的EventUUID的集合
    const eventUUIDs = useRef<Set<string>>(new Set())
    const handleSetEventUUID = useMemoizedFn((id: string) => {
        if (!eventUUIDs.current.has(id)) eventUUIDs.current.add(id)
    })
    const [contents, setContents] = useState<AIChatQSData[]>([])

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
                setContents((old) => {
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
                setContents((old) => {
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

    // #region 流式输出处理的相关逻辑
    const handleStreams = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const {
                IsSystem,
                IsReason,
                CallToolID,
                NodeId,
                NodeIdVerbose,
                EventUUID,
                Content,
                StreamDelta,
                ContentType
            } = res
            if (!NodeId || !EventUUID) {
                // 没有对应 UUID 算异常日志
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
                setContents((old) => {
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
                    ...genBaseAIChatData(res),
                    type: AIChatQSDataTypeEnum.THOUGHT,
                    data: data.thought
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
    const handleResult = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const {result, after_stream} = JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatResult
            if (!!after_stream) return

            setContents((old) => {
                const newArr = [...old]
                newArr.push({
                    ...genBaseAIChatData(res),
                    type: AIChatQSDataTypeEnum.RESULT,
                    data: result
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
    // #endregion

    // #region 调用工具数据的相关处理逻辑
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
                            }
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
                type: AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE,
                data: {
                    ...cloneDeep(data),
                    selected: isTrigger ? undefined : JSON.stringify({suggestion: "continue"}),
                    optionValue: isTrigger ? undefined : "continue"
                },
                ...genBaseAIChatData(res)
            })

            setContents((old) => {
                const newArr = [...old]
                if (!review.current) return newArr
                newArr.push(cloneDeep(review.current))
                return newArr
            })
        } catch (error) {
            handleGrpcDataPushLog({
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
                type: AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE,
                data: cloneDeep(data),
                ...genBaseAIChatData(res)
            })

            setContents((old) => {
                const newArr = [...old]
                if (!review.current) return newArr
                newArr.push(cloneDeep(review.current))
                return newArr
            })
        } catch (error) {
            handleGrpcDataPushLog({
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
                type: AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE,
                data: {
                    ...cloneDeep(data),
                    selected: isTrigger ? undefined : JSON.stringify({suggestion: "continue"}),
                    optionValue: isTrigger ? undefined : "continue"
                },
                ...genBaseAIChatData(res)
            })

            setContents((old) => {
                const newArr = [...old]
                if (!review.current) return newArr
                newArr.push(cloneDeep(review.current))
                return newArr
            })
        } catch (error) {
            handleGrpcDataPushLog({
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
                info: res,
                pushLog: handlePushLog
            })
        }
    })
    // #endregion

    /** 文件系统操作处理数据 */
    const handleFileSystemPin = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const {Type, NodeId, NodeIdVerbose, Timestamp, Content} = res
            const ipcContent = Uint8ArrayToString(Content) || ""
            const {path} = JSON.parse(ipcContent) as AIAgentGrpcApi.FileSystemPin

            onNotifyMessage &&
                onNotifyMessage({
                    Type,
                    NodeId,
                    NodeIdVerbose,
                    Timestamp,
                    Content: path
                })

            if (Type === "filesystem_pin_directory") {
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

            setContents((old) => {
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

    /** 流式数据追加参考材料 */
    const handleStreamAppendReference = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReferenceMaterialPayload

            setContents((old) => {
                let newArr = [...old]
                const itemInfo = newArr.find((item) => {
                    if (item.type === "stream" && item.data) {
                        return item.data.EventUUID === data.event_uuid
                    }
                    return false
                })
                if (!!itemInfo && itemInfo.type === "stream") {
                    if (!itemInfo.data.reference) itemInfo.data.reference = []
                    itemInfo.data.reference.push(data)
                }

                return newArr
            })
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // #region 问题队列状态变化相关逻辑处理
    const handleTriggerQuestionQueueRequest = useThrottleFn(
        () => {
            // 更新任务树数据
            sendRequest && sendRequest({IsSyncMessage: true, SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_QUEUE_INFO})
        },
        {wait: 50, leading: false}
    ).run
    // 状态变化处理
    const handleQuestionQueueStatusChange = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const {Type, NodeId, NodeIdVerbose, Timestamp, Content} = res
            const ipcContent = Uint8ArrayToString(Content) || ""
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
                pushLog: handlePushLog
            })
        } finally {
            handleTriggerQuestionQueueRequest()
        }
    })

    // 问题队列清空处理
    const handleClearQuestionQueue = useMemoizedFn((res: AIOutputEvent) => {
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
                pushLog: handlePushLog
            })
        }
    })
    // #endregion

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

                if (["react_task_enqueue", "react_task_dequeue"].includes(res.NodeId)) {
                    // 问题(入|出)队列状态变化
                    handleQuestionQueueStatusChange(res)
                    return
                }

                if (res.NodeId === "react_task_cleared") {
                    handleClearQuestionQueue(res)
                    return
                }

                handleGrpcDataPushLog({
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

            if (res.Type === "tool_call_decision") {
                // 工具决策
                handleToolCallDecision(res)
                return
            }

            if (res.Type === "fail_plan_and_execution") {
                // 任务规划崩溃的错误信息
                setContents((old) => {
                    const newArr = [...old]
                    newArr.push({
                        ...genBaseAIChatData(res),
                        type: AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION,
                        data: {
                            content: ipcContent,
                            NodeId: res.NodeId,
                            NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId)
                        }
                    })
                    return newArr
                })
                return
            }

            if (res.Type === "fail_react_task") {
                // ReAct任务崩溃的错误信息
                setContents((old) => {
                    const newArr = [...old]
                    newArr.push({
                        ...genBaseAIChatData(res),
                        type: AIChatQSDataTypeEnum.FAIL_REACT,
                        data: {
                            content: ipcContent,
                            NodeId: res.NodeId,
                            NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId)
                        }
                    })
                    return newArr
                })
                return
            }

            if (res.Type === "success_react_task") {
                // ReAct任务成功结束标志
                // 暂时过滤不展示到UI上
                return
            }

            if (res.Type === "reference_material") {
                // 流式数据追加参考材料
                handleStreamAppendReference(res)
                return
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: handlePushLog
            })
        }
    })

    // 用户问题或review的主动操作
    const handleSend: handleSendFunc = useMemoizedFn(({request, optionValue, extraValue, cb}) => {
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
                        type: AIChatQSDataTypeEnum.QUESTION,
                        Timestamp: Date.now(),
                        data: FreeInput || "",
                        AIService: "",
                        extraValue: extraValue
                    })
                    return newArr
                })
            }
            cb && cb()
        } catch (error) {}
    })

    const handleResetData = useMemoizedFn(() => {
        review.current = undefined
        eventUUIDs.current.clear()
        setContents([])
        handleToolCallDataReset()
    })

    return [{contents}, {handleSetData, handleResetData, handleSend}] as const
}

export default useCasualChat
