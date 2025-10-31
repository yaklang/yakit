import {useRef, useState} from "react"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {
    AIReviewJudgeLevelMap,
    convertNodeIdToVerbose,
    DefaultAIToolResult,
    TaskDefaultReToolResultSummary
} from "./defaultConstant"
import {handleSendFunc, UseTaskChatEvents, UseTaskChatParams, UseTaskChatState} from "./type"
import {
    genBaseAIChatData,
    handleFlatAITree,
    handleGrpcDataPushLog,
    isAutoContinueReview,
    isToolExecStream,
    isToolStdoutStream,
    noSkipReviewTypes
} from "./utils"
import {yakitNotify} from "@/utils/notification"
import {AIAgentGrpcApi, AIOutputEvent} from "./grpcApi"
import {AIChatQSData, AIReviewType, AIStreamOutput, AIToolResult, ToolStreamSelectors} from "./aiRender"
import {getLocalFileName} from "@/components/MilkdownEditor/CustomFile/utils"

// 属于该 hook 处理数据的类型
export const UseTaskChatTypes = ["plan_review_require", "plan_task_analysis", "task_review_require", "plan"]

function useTaskChat(params?: UseTaskChatParams): [UseTaskChatState, UseTaskChatEvents]

function useTaskChat(params?: UseTaskChatParams) {
    const {pushLog, updateLog, getRequest, onReview, onReviewExtra, onReviewRelease, sendRequest} = params || {}

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

    const review = useRef<AIChatQSData>()
    const currentPlansId = useRef<string>("")

    // 存放流式输出的EventUUID的集合
    const eventUUIDs = useRef<Set<string>>(new Set())
    const handleSetEventUUID = useMemoizedFn((id: string) => {
        if (!eventUUIDs.current.has(id)) eventUUIDs.current.add(id)
    })
    const [streams, setStreams] = useState<AIChatQSData[]>([])

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
    // #endregion

    // 设置自由对话的 id
    const handleSetCoordinatorId = useMemoizedFn((id: string) => {
        setCoordinatorId((old) => (old === id ? old : id))
    })

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

            handleSetEventUUID(EventUUID)

            let ipcContent = Uint8ArrayToString(Content) || ""
            let ipcStreamDelta = Uint8ArrayToString(StreamDelta) || ""
            const content = ipcContent + ipcStreamDelta

            const setFunc = !IsSystem && !IsReason ? setStreams : updateLog

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
                            ...genBaseAIChatData(res),
                            type: "stream",
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
                toolResult.summary = TaskDefaultReToolResultSummary[status]?.label || ""

                setStreams((old) => {
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
                        ...genBaseAIChatData(res),
                        type: "tool_result",
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
                    type: "error",
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

            setStreams((old) => {
                return old.map((ele) => {
                    if (ele.type === "tool_result" && !!ele.data && ele.data.callToolId === data.call_tool_id) {
                        const status = ele.data.status
                        const summary =
                            status === "user_cancelled"
                                ? "当前工具调用已被取消，会使用当前输出结果进行后续工作决策"
                                : data.summary || ""
                        return {
                            ...ele,
                            data: {...ele.data, summary}
                        }
                    }
                    return ele
                })
            })
            toolResultMap.current.delete(data.call_tool_id)
        } catch (error) {
            handleGrpcDataPushLog({
                type: "error",
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
                type: "error",
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
                type: "error",
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
            const sum: AIAgentGrpcApi.PlanTask[] = []
            handleFlatAITree(sum, tasks.plans.root_task)
            setPlan([...sum])
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
                type: "error",
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
            setStreams((old) => {
                const newArr = [...old]
                newArr.push({
                    ...genBaseAIChatData(res),
                    type: "task_index_node",
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
                    type: "file_system_pin",
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
                    type: "tool_call_decision",
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
                type: "error",
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
                    handleUpdateTaskState(data.task.index, "in-progress")
                    return
                }
                if (obj.type && obj.type === "pop_task") {
                    // 结束任务
                    const data = obj as AIAgentGrpcApi.ChangeTask
                    handleUpdateTaskState(data.task.index, "success")
                    // 更新任务树数据
                    sendRequest && sendRequest({IsSyncMessage: true, SyncType: "plan"})
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
                    type: "plan_review_require",
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
                    type: "tool_use_review_require",
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
                    type: "task_review_require",
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
                    type: "require_user_interactive",
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
                const sum: AIAgentGrpcApi.PlanTask[] = []
                handleFlatAITree(sum, tasks.root_task)
                setPlan([...sum])
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
        setStreams([])
        toolResultMap.current.clear()
        toolStdOutSelectors.current.clear()
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
                type: "end_plan_and_execution",
                data: ""
            })
            return newArr
        })
    })

    return [
        {coordinatorId, plan, streams},
        {
            handleSetData,
            handleResetData,
            handleSetCoordinatorId,
            handleSend,
            fetchPlanTree,
            handleCloseGrpc,
            handlePlanExecEnd
        }
    ] as const
}

export default useTaskChat
