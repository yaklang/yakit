import {useRef} from "react"
import {useCreation, useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import {
    genBaseAIChatData,
    genErrorLogData,
    handleGrpcDataPushLog,
    isToolStderrStream,
    isToolStdoutStream
} from "./utils"
import {UseChatContentEvents, UseChatContentParams} from "./type"
import {
    AIStreamContentType,
    convertNodeIdToVerbose,
    DefaultAIToolResult,
    DefaultToolResultSummary
} from "./defaultConstant"
import {AIAgentGrpcApi, AIOutputEvent} from "./grpcApi"
import {AIChatQSData, AIChatQSDataTypeEnum, AIToolResult, ReActChatGroupElement} from "./aiRender"
import cloneDeep from "lodash/cloneDeep"

function useChatContent(params: UseChatContentParams): UseChatContentEvents

function useChatContent(params: UseChatContentParams) {
    const {chatType, getContentMap, setContentMap, deleteContentMap, getElements, setElements, pushLog, handleUnkData} =
        params

    /** 更新触发渲染的UI数据项 */
    const updateElements = useMemoizedFn(
        (main: {mapKey: string; type: AIChatQSDataTypeEnum}, sub?: {mapKey: string; type: AIChatQSDataTypeEnum}) => {
            // 先判断该项是否存在
            const target = getElements().findIndex(
                (item) => item.token === main.mapKey && item.type === main.type && (sub ? item.isGroup : true)
            )
            try {
                if (target >= 0) {
                    const newArr = [...getElements()]

                    const item = newArr[target]
                    item.renderNum += 1

                    if (!sub || !item.isGroup) return newArr
                    const subIndex = item.children.findIndex(
                        (item) => item.token === sub.mapKey && item.type === sub.type
                    )
                    if (subIndex >= 0) {
                        item.children[subIndex].renderNum += 1
                    } else {
                        item.children.push({
                            chatType: chatType,
                            token: sub.mapKey,
                            type: sub.type,
                            renderNum: 1
                        })
                    }
                    setElements([...newArr])
                } else {
                    if (sub) {
                        setElements((old) =>
                            old.concat([
                                {
                                    chatType: chatType,
                                    token: main.mapKey,
                                    type: main.type,
                                    renderNum: 1,
                                    isGroup: true,
                                    children: [{chatType: chatType, token: sub.mapKey, type: sub.type, renderNum: 1}]
                                }
                            ])
                        )
                    } else {
                        setElements((old) =>
                            old.concat([{chatType: chatType, token: main.mapKey, type: main.type, renderNum: 1}])
                        )
                    }
                }
            } catch (error) {}
        }
    )
    /** 删除触发渲染的UI数据项 */
    // const deleteElements = useMemoizedFn((token: string, type: AIChatQSDataTypeEnum) => {
    //     // 先判断该项是否存在
    //     const target = getElements().findIndex((item) => item.token === token && item.type === type)
    //     if (target >= 0) {
    //         setElements((old) => {
    //             const newArr = [...old]
    //             newArr.splice(target, 1)
    //             return newArr
    //         })
    //     }
    // })

    /**
     * - 存放 CallTollId 对应的stream类型集合({eventUUID, nodeID}[])
     * - 没有 CallToolId 的stream类型数据不进行记录
     * - 一般由stream-start类型进行记录，如果没有则由stream类型进行补充
     */
    const callToolIDToUUIDMap = useRef<Map<string, {eventUUID: string; nodeID: string}[]>>(new Map())

    /**
     * - 存放 Type:stream NodeId:tool-xxx-stderr 的UUID对应的CallToolID
     * - eventUUID => call_tool_id
     */
    const toolResultErrorUUIDToCallToolID = useRef<Map<string, string>>(new Map())
    /**
     * - 存放 Type:stream NodeId:tool-xxx-stderr 的内容数据
     * - call_tool_id => {content:string uuid:string status:"start" | "end"}
     * - 当stream-finished触发后，将内容全部设置到工具结果对象中的execError字段中
     * - 本NodeId和stream类型中的其他NodeId有一样的后端逻辑，但是前端需要将其区分出来
     */
    const streamToToolResultError = useRef<Map<string, {content: string; uuid: string; status: "start" | "end"}>>(
        new Map()
    )

    // #region stream类型数据处理(OK)
    /** 判断流式数据(type==='stream')在UI中是单项展示还是集合组展示 */
    const handleIsGroupDisplay = useMemoizedFn(
        (params: {
            mapKey: string
            type: AIChatQSDataTypeEnum
            nodeID: AIOutputEvent["NodeId"]
            contentType: AIOutputEvent["ContentType"]
        }) => {
            const {mapKey, type, nodeID, contentType} = params

            const renderList = getElements()
            if (contentType !== AIStreamContentType.DEFAULT || renderList.length === 0) {
                // 非默认内容类型, 直接渲染 || 没有任何渲染数据, 直接渲染
                updateElements({mapKey, type})
                return
            }

            const lastRender = renderList[renderList.length - 1]
            if (lastRender.token === mapKey) {
                // 最后一项渲染数据就是当前数据，直接更新渲染次数
                updateElements({mapKey, type: lastRender.type}, lastRender.isGroup ? {mapKey, type} : undefined)
                return
            }
            const lastRenderData = getContentMap(lastRender.token)
            if (!lastRenderData || lastRenderData.type !== AIChatQSDataTypeEnum.STREAM) {
                updateElements({mapKey, type})
                return
            }

            if (lastRender.type === AIChatQSDataTypeEnum.STREAM && !lastRender.isGroup) {
                // 单项的stream数据
                if (lastRenderData.data.NodeId === nodeID) {
                    // 命中单项，准备整合成组数据，将原有单项的token当成组token
                    const groupInfo: ReActChatGroupElement = {
                        chatType: chatType,
                        token: lastRender.token,
                        type: AIChatQSDataTypeEnum.STREAM_GROUP,
                        renderNum: 1,
                        isGroup: true,
                        children: [
                            cloneDeep(lastRender),
                            {chatType: chatType, token: mapKey, type: AIChatQSDataTypeEnum.STREAM, renderNum: 1}
                        ]
                    }
                    const arr = groupInfo.children.map((item) => item.token)
                    for (let el of arr) {
                        const info = getContentMap(el)
                        if (info) setContentMap(el, {...info, parentGroupKey: lastRender.token})
                    }
                    setElements((old) => {
                        const newArr = [...old]
                        newArr.pop()
                        newArr.push(groupInfo)
                        return newArr
                    })
                } else {
                    // 未命中
                    updateElements({mapKey, type})
                }
            } else if (lastRender.type === AIChatQSDataTypeEnum.STREAM_GROUP && lastRender.isGroup) {
                // 组的stream数据
                if (lastRenderData.data.NodeId === nodeID) {
                    // 命中组内数据，追加到组内
                    const subData = getContentMap(mapKey)
                    if (subData) {
                        setContentMap(mapKey, {...subData, parentGroupKey: lastRender.token})
                    }
                    updateElements({mapKey: lastRender.token, type: lastRender.type}, {mapKey: mapKey, type: type})
                } else {
                    // 未命中
                    updateElements({mapKey, type})
                }
            } else {
                updateElements({mapKey, type})
            }
        }
    )

    /** stream类型数据初始化 */
    const handleInitStream = useMemoizedFn((res: AIOutputEvent) => {
        try {
            // 属于日志数据的不进入UI展示
            if (res.IsSystem || res.IsReason) return

            const {CallToolID, NodeId} = res
            if (!NodeId) return

            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const {event_writer_id} = JSON.parse(ipcContent) as {event_writer_id: string}
            // event_writer_id为空
            if (!event_writer_id) {
                pushLog(genErrorLogData(res.Timestamp, `${res.Type}数据(NodeId: ${NodeId}), event_writer_id 为空`))
                return
            }

            // tool-xxx-stdout 数据单独初始化逻辑
            if (isToolStdoutStream(NodeId) && !!CallToolID) {
                let toolResult = getContentMap(CallToolID)
                if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
                    pushLog(
                        genErrorLogData(
                            res.Timestamp,
                            `NodeID: ${NodeId} 的stream数据没有对应的工具结果(CallToolID: ${CallToolID})初始化`
                        )
                    )
                    return
                }

                setContentMap(CallToolID, {
                    ...toolResult,
                    data: {
                        ...toolResult.data,
                        type: "stream",
                        stream: {
                            EventUUID: event_writer_id,
                            NodeId,
                            NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(NodeId),
                            status: "start",
                            content: "",
                            ContentType: res.ContentType
                        }
                    }
                })
                return
            }
            // tool-xxx-stderr 数据单独初始化逻辑
            if (isToolStderrStream(NodeId) && !!CallToolID) {
                if (!toolResultErrorUUIDToCallToolID.current.has(event_writer_id)) {
                    toolResultErrorUUIDToCallToolID.current.set(event_writer_id, CallToolID)
                }
                if (!streamToToolResultError.current.has(CallToolID)) {
                    streamToToolResultError.current.set(CallToolID, {
                        content: "",
                        uuid: event_writer_id,
                        status: "start"
                    })
                }
                return
            }

            // 数据集合中对应的数据
            const streamData = getContentMap(event_writer_id)

            // 数据已存在，流数据输出顺序不对, 视为异常
            if (!!streamData) {
                pushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `异常 ${res.Type} 类型, NodeId: ${NodeId}, eventuuid: (${event_writer_id}), 已存在对应的数据`
                    )
                )
                return
            }

            // callToolID 对应 stream-eventuuid
            if (CallToolID) {
                const ids = callToolIDToUUIDMap.current.get(CallToolID) || []
                const idFind = ids.find((item) => item.eventUUID === event_writer_id && item.nodeID === NodeId)
                !idFind &&
                    callToolIDToUUIDMap.current.set(
                        CallToolID,
                        ids.concat([{eventUUID: event_writer_id, nodeID: NodeId}])
                    )
            }

            setContentMap(event_writer_id, {
                ...genBaseAIChatData(res),
                id: event_writer_id,
                chatType,
                type: AIChatQSDataTypeEnum.STREAM,
                data: {
                    NodeId,
                    NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(NodeId),
                    TaskIndex: res.TaskIndex || undefined,
                    CallToolID,
                    EventUUID: event_writer_id,
                    status: "start",
                    content: "",
                    ContentType: res.ContentType
                }
            })
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: pushLog
            })
        }
    })

    /** stream类型流数据进入 */
    const handleStream = useMemoizedFn((res: AIOutputEvent) => {
        try {
            // 属于日志数据的不进入UI展示
            if (res.IsSystem || res.IsReason) return

            const {CallToolID, EventUUID, NodeId} = res
            if (!EventUUID || !NodeId) return

            const content = (Uint8ArrayToString(res.Content) || "") + (Uint8ArrayToString(res.StreamDelta) || "")

            // tool-xxx-stderr 数据单独处理逻辑
            if (!!CallToolID && isToolStderrStream(NodeId)) {
                const call_tool_id = toolResultErrorUUIDToCallToolID.current.get(EventUUID)
                const errorResult = streamToToolResultError.current.get(call_tool_id || "")
                if (call_tool_id && errorResult) {
                    streamToToolResultError.current.set(call_tool_id, {
                        ...errorResult,
                        content: errorResult.content + content
                    })
                }
                return
            }
            // tool-xxx-stdout 数据单独处理逻辑
            if (!!CallToolID && isToolStdoutStream(NodeId)) {
                const tool_result = getContentMap(CallToolID)
                if (!tool_result || tool_result.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
                    pushLog(
                        genErrorLogData(
                            res.Timestamp,
                            `NodeID: ${NodeId} 的stream数据没有对应的工具结果(CallToolID: ${CallToolID})初始化`
                        )
                    )
                    return
                }
                const isRender = !tool_result.data.stream.content
                // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
                tool_result.data.stream.content += content
                if (isRender) {
                    updateElements({mapKey: tool_result.id, type: tool_result.type})
                }
                return
            }

            // 数据集合中对应的数据
            const streamData = getContentMap(EventUUID)

            // 数据不存在
            if (!streamData || streamData.type !== AIChatQSDataTypeEnum.STREAM) {
                pushLog(
                    genErrorLogData(res.Timestamp, `异常 stream 类型, NodeId: ${NodeId}, eventuuid: (${EventUUID})`)
                )
                return
            }

            // 没有经过stream初始化的数据，后补初始化状态情况
            if (CallToolID) {
                const ids = callToolIDToUUIDMap.current.get(CallToolID) || []
                const idFind = ids.find((item) => item.eventUUID === EventUUID && item.nodeID === NodeId)
                !idFind &&
                    callToolIDToUUIDMap.current.set(CallToolID, ids.concat([{eventUUID: EventUUID, nodeID: NodeId}]))
            }

            const isRender = !streamData.data.content

            const newStream = {
                ...streamData,
                Timestamp: isRender ? res.Timestamp : streamData.Timestamp,
                data: {
                    ...streamData.data,
                    content: streamData.data.content + content
                }
            }

            setContentMap(EventUUID, newStream)
            if (isRender) {
                // 如果折叠写不完，则打开注释，然后将注释的下一个方法调用注释
                handleIsGroupDisplay({
                    mapKey: EventUUID,
                    type: newStream.type,
                    nodeID: NodeId,
                    contentType: res.ContentType
                })
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: pushLog
            })
        }
    })

    /** stream类型数据结束 */
    const handleEndStream = useMemoizedFn((res: AIOutputEvent) => {
        try {
            let ipcContent = Uint8ArrayToString(res.Content) || ""
            const {event_writer_id, node_id} = JSON.parse(ipcContent) as AIAgentGrpcApi.AIStreamFinished
            if (!event_writer_id) {
                pushLog(genErrorLogData(res.Timestamp, `stream-finished数据, event_writer_id 为空`))
                return
            }

            // tool-xxx-stderr 数据单独结束逻辑
            if (isToolStderrStream(node_id)) {
                handleToolResultErrorEnd(event_writer_id)
                return
            }
            // tool-xxx-stdout 数据单独结束逻辑
            if (isToolStdoutStream(node_id)) {
                const tool_result = getContentMap(res.CallToolID)
                if (!tool_result || tool_result.type !== AIChatQSDataTypeEnum.TOOL_RESULT || !tool_result.data.stream) {
                    return
                }
                // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
                tool_result.data.stream.status = "end"
                updateElements({mapKey: tool_result.id, type: tool_result.type})
                return
            }

            // 数据集合中对应的数据
            const streamData = getContentMap(event_writer_id)
            // 数据不存在 不输出到日志，因为日志的流数据也有该类型数据
            if (!streamData || streamData.type !== AIChatQSDataTypeEnum.STREAM) return

            // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
            streamData.data.status = "end"
            // setContentMap(event_writer_id, {
            //     ...streamData,
            //     data: {
            //         ...streamData.data,
            //         status: "end"
            //     }
            // })
            if (streamData.parentGroupKey) {
                updateElements(
                    {mapKey: streamData.parentGroupKey, type: AIChatQSDataTypeEnum.STREAM_GROUP},
                    {mapKey: event_writer_id, type: AIChatQSDataTypeEnum.STREAM}
                )
            } else {
                updateElements({mapKey: event_writer_id, type: AIChatQSDataTypeEnum.STREAM})
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: pushLog
            })
        }
    })

    /** 工具结果错误信息结束输出 */
    const handleToolResultErrorEnd = useMemoizedFn((uuid: string) => {
        const call_tool_id = toolResultErrorUUIDToCallToolID.current.get(uuid)
        const errorResult = streamToToolResultError.current.get(call_tool_id || "")
        if (!call_tool_id || !errorResult) return

        const toolResult = getContentMap(call_tool_id)
        if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
            // 工具执行结果卡片UI没有展示时
            errorResult.status = "end"
            streamToToolResultError.current.set(call_tool_id, {...errorResult})
            return
        } else {
            const showUI =
                getElements().findIndex(
                    (item) => item.token === call_tool_id && item.type === AIChatQSDataTypeEnum.TOOL_RESULT
                ) >= 0
            // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
            toolResult.data.tool.execError = errorResult.content
            if (showUI) updateElements({mapKey: toolResult.id, type: toolResult.type})
            streamToToolResultError.current.delete(call_tool_id)
            toolResultErrorUUIDToCallToolID.current.delete(uuid)
        }
    })
    // #endregion

    // #region 工具执行过程和结果相关数据逻辑
    /** 工具开始执行 */
    const handleStartTool = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const {call_tool_id, tool, start_time, start_time_ms} = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall
            if (!call_tool_id) {
                pushLog(genErrorLogData(res.Timestamp, `${res.Type}数据, call_tool_id 为空`))
                return
            }

            const toolResult: AIToolResult = {
                ...cloneDeep(DefaultAIToolResult),
                TaskIndex: res.TaskIndex || undefined,
                callToolId: call_tool_id,
                toolName: tool?.name || "-",
                toolDescription: tool?.description || "",
                startTime: start_time || 0,
                startTimeMS: start_time_ms || 0
            }

            setContentMap(call_tool_id, {
                ...genBaseAIChatData(res),
                id: call_tool_id,
                chatType,
                type: AIChatQSDataTypeEnum.TOOL_RESULT,
                data: toolResult
            })
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: pushLog
            })
        }
    })

    /** 工具执行中的可操作项 */
    const handleExceTool = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const {call_tool_id, id, selectors} = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCallWatcher

            if (!call_tool_id || !id || !selectors || !selectors?.length) {
                pushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据, call_tool_id: ${call_tool_id || "为空"} | id: ${id || "为空"}`
                    )
                )
                return
            }

            const tool_result = getContentMap(call_tool_id)
            if (!tool_result || tool_result.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
                pushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应输出的tool_call_start类型初始化`
                    )
                )
                return
            }
            // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
            tool_result.data.stream.selectors = {
                callToolId: call_tool_id,
                InteractiveId: id,
                selectors: selectors
            }
            updateElements({mapKey: tool_result.id, type: tool_result.type})
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: pushLog
            })
        }
    })

    /** 工具执行中的工作文件目录路径 */
    const handleToolDirPath = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const {call_tool_id, dir_path} = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCallDirPath
            if (!call_tool_id) {
                pushLog(genErrorLogData(res.Timestamp, `${res.Type}数据, call_tool_id 为空`))
                return
            }

            const toolResult = getContentMap(call_tool_id)
            if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
                pushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应输出的tool_call_start类型初始化`
                    )
                )
                return
            }

            if (toolResult.data.tool.dirPath) {
                pushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据(call_tool_id:${call_tool_id}), dir_path已存在，不能重复设置`
                    )
                )
                return
            }

            // 这里是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
            toolResult.data.tool.dirPath = dir_path || ""
            if (toolResult.data.tool.status !== "default") {
                updateElements({mapKey: toolResult.id, type: toolResult.type})
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: pushLog
            })
        }
    })

    /** 工具执行的结果 */
    const handleToolResult = useMemoizedFn((res: AIOutputEvent, status:AIToolResult["tool"]["status"]) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const {call_tool_id, ...rest} = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall

            if (!call_tool_id) {
                pushLog(genErrorLogData(res.Timestamp, `${res.Type}数据, call_tool_id 为空`))
                return
            }

            const toolResult = getContentMap(call_tool_id)
            if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
                pushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应输出的tool_call_start类型初始化`
                    )
                )
                return
            }

            // 下面的设置: 是直接使用引用设置的值，所以不需要在使用setContentMap设置回去

            // 设置工具执行的开始时间、结束时间和持续时间等数据
            toolResult.data.type = "result"
            toolResult.data.startTime = rest.start_time || 0
            toolResult.data.startTimeMS = rest.start_time_ms || 0
            toolResult.data.endTime = rest.end_time || 0
            toolResult.data.endTimeMS = rest.end_time_ms || 0
            toolResult.data.durationMS = rest.duration_ms || 0
            toolResult.data.durationSeconds = rest.duration_seconds || 0
            toolResult.data.tool.status = status

            // 设置总结内容，没有就设置成获取中，有就使用获取到的内容
            toolResult.data.tool.summary = toolResult.data.tool.summary || DefaultToolResultSummary[status]?.wait || ""
            // 设置执行结果错误数据内容(std_xxx_stderr)
            const errorResult = streamToToolResultError.current.get(call_tool_id)
            if (errorResult && errorResult.status === "end") {
                toolResult.data.tool.execError = errorResult.content
                // error数据先出但未存在对应的工具执行结果，工具结果出现后直接使用并删除map中的缓存数据
                streamToToolResultError.current.delete(call_tool_id)
                toolResultErrorUUIDToCallToolID.current.delete(errorResult.uuid)
            }
            updateElements({mapKey: toolResult.id, type: toolResult.type})
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: pushLog
            })
        }
    })

    /** 工具执行的总结 */
    const handleToolSummary = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const {call_tool_id, summary} = JSON.parse(ipcContent) as AIAgentGrpcApi.AIToolCall

            if (!call_tool_id) {
                pushLog(genErrorLogData(res.Timestamp, `${res.Type}数据, call_tool_id 为空`))
                return
            }

            const toolResult = getContentMap(call_tool_id)
            if (!toolResult || toolResult.type !== AIChatQSDataTypeEnum.TOOL_RESULT) {
                pushLog(
                    genErrorLogData(
                        res.Timestamp,
                        `${res.Type}数据(call_tool_id:${call_tool_id}), 没有对应输出的tool_call_start类型初始化`
                    )
                )
                return
            }

            const statusInfo = toolResult.data.tool.status
            const summaryContent = !summary || summary === "null" ? "" : summary
            // 下面的设置: 是直接使用引用设置的值，所以不需要在使用setContentMap设置回去
            // 设置总结内容，没有就设置成默认的状态展示内容，有就使用获取到的内容
            toolResult.data.tool.summary =
                statusInfo === "user_cancelled"
                    ? "当前工具调用已被取消，会使用当前输出结果进行后续工作决策"
                    : summaryContent || DefaultToolResultSummary[toolResult.data.tool.status]?.result || ""
            // 设置执行结果错误数据内容(std_xxx_stderr)
            const errorResult = streamToToolResultError.current.get(call_tool_id)
            if (errorResult && errorResult.status === "end") {
                toolResult.data.tool.execError = errorResult.content
                // error数据先出但未存在对应的工具执行结果，工具结果出现后直接使用并删除map中的缓存数据
                streamToToolResultError.current.delete(call_tool_id)
                toolResultErrorUUIDToCallToolID.current.delete(errorResult.uuid)
            }
            if (statusInfo !== "default") updateElements({mapKey: toolResult.id, type: toolResult.type})
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: pushLog
            })
        }
    })
    // #endregion

    // #region 自由对话和任务规划的公共类型数据处理逻辑
    /** 参考资料类型-数据处理 */
    const handleStreamAppendReference = useMemoizedFn((res: AIOutputEvent) => {
        try {
            const ipcContent = Uint8ArrayToString(res.Content) || ""
            const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ReferenceMaterialPayload

            const chatData = getContentMap(data.event_uuid)
            const toolResult = getContentMap(res.CallToolID || "")
            if (chatData) {
                const references = (chatData.reference || []).concat([data])
                setContentMap(data.event_uuid, {...chatData, reference: references})
                if (chatData.parentGroupKey) {
                    updateElements(
                        {mapKey: chatData.parentGroupKey, type: AIChatQSDataTypeEnum.STREAM_GROUP},
                        {mapKey: data.event_uuid, type: chatData.type}
                    )
                } else if (chatData.type === AIChatQSDataTypeEnum.STREAM) {
                    handleIsGroupDisplay({
                        mapKey: chatData.id,
                        type: chatData.type,
                        nodeID: chatData.data.NodeId,
                        contentType: chatData.data.ContentType
                    })
                } else {
                    updateElements({mapKey: data.event_uuid, type: chatData.type})
                }
            } else if (
                !!toolResult &&
                toolResult.type === AIChatQSDataTypeEnum.TOOL_RESULT &&
                toolResult.data.stream.EventUUID === data.event_uuid
            ) {
                toolResult.reference = (toolResult.reference || []).concat([data])
                updateElements({mapKey: toolResult.id, type: toolResult.type})
            } else {
                const chatData: AIChatQSData = {
                    ...genBaseAIChatData(res),
                    id: data.event_uuid,
                    chatType,
                    type: AIChatQSDataTypeEnum.Reference_Material,
                    data: {
                        NodeId: res.NodeId,
                        NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId)
                    },
                    reference: [data]
                }
                setContentMap(chatData.id, chatData)
                updateElements({mapKey: chatData.id, type: AIChatQSDataTypeEnum.Reference_Material})
            }
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: pushLog
            })
        }
    })
    // #endregion

    // 处理数据方法
    const handleSetData = useMemoizedFn((res: AIOutputEvent) => {
        try {
            let ipcContent = Uint8ArrayToString(res.Content) || ""

            // #region 自由对话(ReAct)专属类型(OK)
            // 问题的思考
            if (res.Type === "thought") {
                const {thought} = (JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatThought) || {}

                const chatData: AIChatQSData = {
                    ...genBaseAIChatData(res),
                    chatType,
                    type: AIChatQSDataTypeEnum.THOUGHT,
                    data: thought || ""
                }
                setContentMap(chatData.id, chatData)
                updateElements({mapKey: chatData.id, type: chatData.type})
                return
            }

            // 问题一次性的结果输出
            if (res.Type === "result") {
                const {result, after_stream} = (JSON.parse(ipcContent) as AIAgentGrpcApi.AIChatResult) || {}
                if (!!after_stream) return

                const chatData: AIChatQSData = {
                    ...genBaseAIChatData(res),
                    chatType,
                    type: AIChatQSDataTypeEnum.THOUGHT,
                    data: result || ""
                }
                setContentMap(chatData.id, chatData)
                updateElements({mapKey: chatData.id, type: chatData.type})
                return
            }

            // ReAct任务(自由对话)崩溃的错误信息
            if (res.Type === "fail_react_task") {
                const chatData: AIChatQSData = {
                    ...genBaseAIChatData(res),
                    chatType,
                    type: AIChatQSDataTypeEnum.FAIL_REACT,
                    data: {
                        content: ipcContent,
                        NodeId: res.NodeId,
                        NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId)
                    }
                }
                setContentMap(chatData.id, chatData)
                updateElements({mapKey: chatData.id, type: chatData.type})
                return
            }
            // #endregion

            // #region stream类型数据处理(OK)
            // stream数据开始标识
            if (res.Type === "stream_start") {
                handleInitStream(res)
                return
            }

            // stream数据
            if (res.Type === "stream") {
                handleStream(res)
                return
            }

            // stream数据结束标识
            if (res.Type === "structured" && res.NodeId === "stream-finished") {
                handleEndStream(res)
                return
            }
            // #endregion

            // #region 工具结果和总结数据处理逻辑
            // 工具执行-开始标识(OK)
            if (res.Type === "tool_call_start") {
                handleStartTool(res)
                return
            }

            // 工具执行中-可操作选项
            if (res.Type === "tool_call_watcher") {
                handleExceTool(res)
                return
            }

            // 工具执行-工作目录路径
            if (res.Type === "tool_call_log_dir") {
                handleToolDirPath(res)
                return
            }

            // 工具执行结果-用户取消
            if (res.Type === "tool_call_user_cancel") {
                handleToolResult(res, "user_cancelled")
                return
            }
            // 工具执行结果-成功
            if (res.Type === "tool_call_done") {
                handleToolResult(res, "success")
                return
            }
            // 工具执行结果-失败
            if (res.Type === "tool_call_error") {
                handleToolResult(res, "failed")
                return
            }

            if (res.Type === "tool_call_summary") {
                // 工具执行结果-总结
                handleToolSummary(res)
                return
            }
            // #endregion

            // #region 任务规划和自由对话都有的公共类型(OK)
            // 工具决策
            if (res.Type === "tool_call_decision") {
                const data = JSON.parse(ipcContent) as AIAgentGrpcApi.ToolCallDecision
                const i18n = data?.i18n || {zh: data.action, en: data.action}
                const chatData: AIChatQSData = {
                    ...genBaseAIChatData(res),
                    chatType,
                    type: AIChatQSDataTypeEnum.TOOL_CALL_DECISION,
                    data: {
                        ...data,
                        i18n: {
                            Zh: i18n.zh,
                            En: i18n.en
                        }
                    }
                }
                setContentMap(chatData.id, chatData)
                updateElements({mapKey: chatData.id, type: chatData.type})
                return
            }

            // 任务规划崩溃的错误信息[在任务规划启动就崩溃时，出现在自由对话中]
            if (res.Type === "fail_plan_and_execution") {
                const chatData: AIChatQSData = {
                    ...genBaseAIChatData(res),
                    chatType,
                    type: AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION,
                    data: {
                        content: ipcContent,
                        NodeId: res.NodeId,
                        NodeIdVerbose: res.NodeIdVerbose || convertNodeIdToVerbose(res.NodeId)
                    }
                }
                setContentMap(chatData.id, chatData)
                updateElements({mapKey: chatData.id, type: chatData.type})
                return
            }

            // 参考资料, 可独立或追加到别的类型数据中展示
            if (res.Type === "reference_material") {
                handleStreamAppendReference(res)
                return
            }
            // #endregion

            handleUnkData(res)
        } catch (error) {
            handleGrpcDataPushLog({
                info: res,
                pushLog: pushLog
            })
        }
    })

    /** reset */
    const handleResetData = useMemoizedFn(() => {
        callToolIDToUUIDMap.current.clear()
        toolResultErrorUUIDToCallToolID.current.clear()
        streamToToolResultError.current.clear()
    })

    const events: UseChatContentEvents = useCreation(() => {
        return {handleSetData, handleResetData}
    }, [])

    return events
}

export default useChatContent
