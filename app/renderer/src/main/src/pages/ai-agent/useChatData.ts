import {useEffect, useRef, useState} from "react"
import {yakitNotify} from "@/utils/notification"
import {useMemoizedFn} from "ahooks"
import {
    AIChatMessage,
    AIChatReview,
    AIChatReviewExtra,
    AIChatStreams,
    AIInputEvent,
    AIOutputEvent,
    AIStartParams
} from "./type/aiChat"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import useGetSetState from "../pluginHub/hooks/useGetSetState"
import {isToolSyncNode, isToolStdout} from "./utils"
import {generateTaskChatExecution} from "./defaultConstant"
import {checkStreamValidity, convertCardInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"

const {ipcRenderer} = window.require("electron")

/** 将树结构任务列表转换成一维数组 */
export const handleFlatAITree = (sum: AIChatMessage.PlanTask[], task: AIChatMessage.PlanTask) => {
    if (!Array.isArray(sum)) return null
    sum.push(generateTaskChatExecution(task))
    if (task.subtasks && task.subtasks.length > 0) {
        for (let subtask of task.subtasks) {
            handleFlatAITree(sum, subtask)
        }
    }
}

const defaultAIToolStdOutSelectors: AIChatMessage.AIToolStdOutSelectors = {
    call_tool_id: "",
    tool: "-",
    selectors: [],
    interactiveId: ""
}
const defaultAIToolResult: AIChatMessage.AIToolData = {
    callToolId: "",
    toolName: "",
    status: "default",
    summary: "",
    timestamp: 0,
    toolStdoutSummary: ""
}

export interface UseChatDataParams {
    onReview?: (data: AIChatReview) => void
    onReviewExtra?: (data: AIChatReviewExtra) => void
    onReviewRelease?: (id: string) => void
    onEnd?: () => void
    setCoordinatorId?: (id: string) => void
}

function useChatData(params?: UseChatDataParams) {
    const {onReview, onReviewExtra, onReviewRelease, onEnd, setCoordinatorId} = params || {}

    const chatID = useRef<string>("")
    const fetchToken = useMemoizedFn(() => {
        return chatID.current
    })
    const chatRequest = useRef<AIStartParams>()
    const [execute, setExecute, getExecute] = useGetSetState(false)

    const [pressure, setPressure] = useState<AIChatMessage.Pressure[]>([])
    const [firstCost, setFirstCost] = useState<AIChatMessage.AICostMS[]>([])
    const [totalCost, setTotalCost] = useState<AIChatMessage.AICostMS[]>([])
    const [consumption, setConsumption] = useState<Record<string, AIChatMessage.Consumption>>({})

    const planTree = useRef<AIChatMessage.PlanTask>()
    const fetchPlanTree = useMemoizedFn(() => {
        return cloneDeep(planTree.current)
    })
    const [plan, setPlan] = useState<AIChatMessage.PlanTask[]>([])

    const review = useRef<AIChatReview>()
    const currentPlansId = useRef<string>()

    const [logs, setLogs] = useState<AIChatMessage.Log[]>([])

    const [stream, setStream] = useState<AIChatMessage.AITaskChatStreamAnswer[]>([])
    const [streams, setStreams] = useState<Record<string, AIChatStreams[]>>({})
    const [card, setCard] = useState<AIChatMessage.AIInfoCard[]>([])

    const [systemOutputs, setSystemOutputs] = useState<AIChatMessage.AIChatSystemOutput[]>([])

    // CoordinatorId
    const coordinatorId = useRef<{cache: string; sent: string}>({cache: "", sent: ""})
    // card
    const cardKVPair = useRef<Map<string, AIChatMessage.AICacheCard>>(new Map<string, AIChatMessage.AICacheCard>())
    const cardTimeRef = useRef<NodeJS.Timeout | null>(null)

    const [activeStream, setActiveStream] = useState<string[]>([])

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

    // #region 流式输出信息的处理相关逻辑
    // 保存着工具数据过程中的一些 watch 相关信息(仅限当前工具周期内[tool_call_start到tool_call_summary])
    const toolStdOutSelectors = useRef<AIChatMessage.AIToolStdOutSelectors>({
        ...cloneDeep(defaultAIToolStdOutSelectors)
    })
    // 保存着工具执行结果的信息数据，供后续直接输出使用，结构是一个Map，可以同时存放多个工具的结果
    const toolResultMap = useRef<Map<string, AIChatMessage.AIToolData>>(new Map())
    const getToolResultMap: (callToolId: string) => AIChatMessage.AIToolData = useMemoizedFn((callToolId) => {
        return toolResultMap.current.get(callToolId) || cloneDeep(defaultAIToolResult)
    })
    const onSetToolResultMap = useMemoizedFn((callToolId: string, value: Partial<AIChatMessage.AIToolData>) => {
        if (!callToolId) return
        let current = getToolResultMap(callToolId)
        current = {
            ...current,
            ...value
        }
        toolResultMap.current.set(callToolId, current)
    })
    const onRemoveToolData = useMemoizedFn((callToolId: string) => {
        if (!callToolId) return
        toolResultMap.current.delete(callToolId)
    })

    // 任务执行相关的正式流式输出信息
    const handleUpdateStream = useMemoizedFn(
        (params: {
            type: string
            NodeId: string
            Timestamp: number
            TaskIndex: string
            ipcContent: string
            ipcStreamDelta: string
        }) => {
            const {type, NodeId, Timestamp, TaskIndex, ipcContent, ipcStreamDelta} = params
            setStream((old) => {
                let newArr = [...old]

                const index = newArr.findIndex((item) => {
                    return item.NodeId === NodeId && item.Timestamp === Timestamp && item.TaskIndex === TaskIndex
                })

                if (index >= 0) {
                    const streamInfo = newArr[index]
                    if (type === "systemStream") streamInfo.stream.system += ipcContent + ipcStreamDelta
                    if (type === "reasonStream") streamInfo.stream.reason += ipcContent + ipcStreamDelta
                    if (type === "stream") streamInfo.stream.stream += ipcContent + ipcStreamDelta
                } else {
                    let newStreamInfo: AIChatMessage.AITaskChatStreamAnswer = {
                        TaskIndex,
                        NodeId,
                        Timestamp,
                        isToolResult: false,
                        stream: {system: "", reason: "", stream: ""}
                    }
                    if (isToolStdout(NodeId)) newStreamInfo.toolStdOutSelectors = {...toolStdOutSelectors.current}
                    if (type === "systemStream") newStreamInfo.stream.system += ipcContent + ipcStreamDelta
                    if (type === "reasonStream") newStreamInfo.stream.reason += ipcContent + ipcStreamDelta
                    if (type === "stream") newStreamInfo.stream.stream += ipcContent + ipcStreamDelta
                    newArr.push(newStreamInfo)

                    if (isToolStdout(NodeId)) {
                        newArr = newArr.filter((item) => item.NodeId !== "call-tools")
                    }
                }

                return newArr
            })
        }
    )

    // 将工具执行结果填充到流式输出的数据集合里
    const aggregationToolData = useMemoizedFn((res: AIOutputEvent, callToolId: string) => {
        const {TaskIndex, Timestamp} = res
        if (!TaskIndex) {
            onCloseByErrorTaskIndexData(res)
            return
        }
        if (!callToolId) return

        setStream((old) => {
            let newArr = [...old]

            const toolStdOut = newArr.find((el) => isToolStdout(el.NodeId))
            const toolStdOutContent = toolStdOut?.stream.stream || ""
            newArr = newArr.filter((item) => !isToolSyncNode(item.NodeId))

            const toolResult = getToolResultMap(callToolId)
            newArr.push({
                TaskIndex,
                NodeId: res.Type,
                Timestamp,
                isToolResult: true,
                stream: {
                    system: "",
                    reason: "",
                    stream: ""
                },
                toolAggregation: {
                    ...toolResult,
                    toolStdoutSummary: toolStdOutContent
                }
            })

            return newArr
        })
    })

    // 将工具执行结果的总结补充到数据输出的数据集合里
    const onSetToolSummary = useMemoizedFn((res: AIOutputEvent, callToolId: string) => {
        const {TaskIndex} = res
        if (!TaskIndex) {
            onCloseByErrorTaskIndexData(res)
            return
        }
        if (!callToolId) return

        setStream((old) => {
            let newArr = old.map((item) => {
                if (item.isToolResult && item?.toolAggregation?.callToolId === callToolId) {
                    const resultInfo = getToolResultMap(callToolId)
                    return {
                        ...item,
                        toolAggregation: {
                            ...resultInfo,
                            toolStdoutSummary:
                                item?.toolAggregation?.toolStdoutSummary || defaultAIToolResult.toolStdoutSummary
                        }
                    }
                }
                return item
            })

            return newArr
        })
        onRemoveToolData(callToolId)
        toolStdOutSelectors.current = cloneDeep(defaultAIToolStdOutSelectors)
    })

    // 系统输出的相关信息
    const onHandleSystemOutput = useMemoizedFn(
        (params: {NodeId: string; Timestamp: number; ipcContent: string; ipcStreamDelta: string}) => {
            const {NodeId, Timestamp, ipcContent, ipcStreamDelta} = params
            setSystemOutputs((old) => {
                const newOutput = cloneDeep(old)
                const streamInfo = newOutput.find((item) => item.NodeId === NodeId && item.Timestamp === Timestamp)
                const text = ipcContent + ipcStreamDelta
                if (streamInfo) {
                    streamInfo.data += text
                } else {
                    const info: AIChatMessage.AIChatSystemOutput = {
                        NodeId: NodeId,
                        Timestamp: Timestamp,
                        data: text,
                        type: "ai"
                    }
                    newOutput.push(info)
                }
                return newOutput
            })
        }
    )
    // #endregion

    // #region review事件相关方法
    /** 不跳过 release 的 review 类型 */
    const noSkipReviewReleaseTypes = useRef<string[]>(["require_user_interactive"])
    /** 是否向外触发 review 事件 */
    const handleIsTriggerReview = useMemoizedFn(() => {
        if (chatRequest.current && chatRequest.current.ReviewPolicy === "yolo") return false
        return true
    })

    /** 触发review事件 */
    const handleTriggerReview = useMemoizedFn((data: AIChatReview) => {
        // console.log(`${data.type}-----\n`, JSON.stringify(data.data))
        review.current = cloneDeep(data)
        const isTrigger = handleIsTriggerReview() || noSkipReviewReleaseTypes.current.includes(data.type)
        if (isTrigger) {
            onReview && onReview(data)
        }
    })
    /** 触发review事件 补充数据 */
    const handleTriggerReviewExtra = useMemoizedFn((item: AIChatReviewExtra) => {
        if (!currentPlansId.current) {
            currentPlansId.current = item.data.plans_id
        }
        if (currentPlansId.current !== item.data.plans_id) return
        const isTrigger = handleIsTriggerReview() || noSkipReviewReleaseTypes.current.includes(item.type)
        if (isTrigger) {
            onReviewExtra && onReviewExtra(item)
        }
    })

    /** 自动处理 review 里的信息数据 */
    const handleAutoRviewData = useMemoizedFn((data: AIChatReview) => {
        if (data.type === "plan_review_require") {
            // 如果是计划的审阅，继续执行代表任务列表已确认，可以进行数据保存
            const tasks = data.data as AIChatMessage.PlanReviewRequire
            planTree.current = cloneDeep(tasks.plans.root_task)
            const sum: AIChatMessage.PlanTask[] = []
            handleFlatAITree(sum, tasks.plans.root_task)
            // console.log("sum", sum)
            setPlan([...sum])
        }
    })

    /** review 自动释放逻辑 */
    const handleReviewRelease = useMemoizedFn((id: string) => {
        // console.log("review.current", review.current, id)

        if (!review.current || review.current.data.id !== id) return
        const isTrigger = handleIsTriggerReview() || noSkipReviewReleaseTypes.current.includes(review.current.type)

        handleAutoRviewData(review.current)
        review.current = undefined
        currentPlansId.current = undefined
        if (isTrigger) {
            onReviewRelease && onReviewRelease(id)
        }
    })

    /** review 界面选项触发事件 */
    const onSend = useMemoizedFn((token: string, info: AIChatReview, params: AIInputEvent) => {
        if (!review.current) {
            yakitNotify("error", " 未获取到审阅信息，请停止对话并重试")
            return
        }
        if (!execute) {
            yakitNotify("warning", "AI 未执行任务，无法发送选项")
            return
        }
        if (!chatID || chatID.current !== token) {
            yakitNotify("warning", "该选项非本次 AI 执行的回答选项")
            return
        }
        if (
            info.type === "plan_review_require" &&
            params.InteractiveJSONInput === JSON.stringify({suggestion: "continue"})
        ) {
            handleAutoRviewData(info)
        }
        console.log("send-ai---\n", token, params)

        review.current = undefined
        currentPlansId.current = undefined
        ipcRenderer.invoke("send-ai-task", token, params)
    })
    // #endregion

    /** 重置所有数据 */
    const handleReset = useMemoizedFn(() => {
        setPressure([])
        setFirstCost([])
        setTotalCost([])
        setConsumption({})
        planTree.current = undefined
        setPlan([])
        review.current = undefined
        currentPlansId.current = undefined
        setLogs([])
        setStreams({})
        setActiveStream([])
        setExecute(false)
        chatID.current = ""
        chatRequest.current = undefined
        onSetCoordinatorId("")
        setCard([])
        cardKVPair.current = new Map()

        setSystemOutputs([])
        coordinatorId.current = {cache: "", sent: ""}
    })

    const onStart = useMemoizedFn((token: string, params: AIInputEvent) => {
        if (execute) {
            yakitNotify("warning", "AI任务正在执行中，请稍后再试！")
            return
        }
        handleReset()
        setExecute(true)
        chatID.current = token
        chatRequest.current = cloneDeep(params.Params)
        ipcRenderer.on(`${token}-data`, (e, res: AIOutputEvent) => {
            // CoordinatorId
            if (!!res?.CoordinatorId) {
                onSetCoordinatorId(res.CoordinatorId)
            }
            let ipcContent = ""
            let ipcStreamDelta = ""
            try {
                ipcContent = Uint8ArrayToString(res.Content) || ""
                ipcStreamDelta = Uint8ArrayToString(res.StreamDelta) || ""
            } catch (error) {}

            if (res.Type === "pressure") {
                // 上下文压力
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.Pressure
                    setPressure((old) => old.concat([{...data, timestamp: Number(res.Timestamp) || 0}]))
                } catch (error) {}
                return
            }

            if (res.Type === "ai_first_byte_cost_ms") {
                // 首字符响应耗时
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AICostMS
                    setFirstCost((old) => old.concat([{...data, timestamp: Number(res.Timestamp) || 0}]))
                } catch (error) {}
                return
            }

            if (res.Type === "ai_total_cost_ms") {
                // 总对话耗时
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AICostMS
                    setTotalCost((old) => old.concat([{...data, timestamp: Number(res.Timestamp) || 0}]))
                } catch (error) {}
                return
            }

            if (res.Type === "consumption") {
                // 消耗Token
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.Consumption
                    const onlyId = data.consumption_uuid || "system"

                    setConsumption((old) => {
                        const newData = cloneDeep(old)
                        const info = newData[onlyId]
                        if (
                            info &&
                            info.input_consumption === data.input_consumption &&
                            info.output_consumption === data.output_consumption
                        ) {
                            return old
                        }
                        newData[onlyId] = data
                        return newData
                    })
                } catch (error) {}
                return
            }

            if (res.Type === "review_release") {
                // review释放通知
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.ReviewRelease
                    if (!data?.id) return
                    handleReviewRelease(data.id)
                    // console.log("review-release---\n", data)
                } catch (error) {}
                return
            }

            if (res.Type === "structured") {
                try {
                    if (!res.IsJson) return

                    const obj = JSON.parse(ipcContent) || ""
                    if (!obj || typeof obj !== "object") return

                    if (obj.level) {
                        // 日志信息
                        const data = obj as AIChatMessage.Log
                        setLogs((pre) => pre.concat([data]))
                    } else if (obj.type && obj.type === "push_task") {
                        // 开始任务
                        const data = obj as AIChatMessage.ChangeTask
                        handleUpdateTaskState(data.task.index, "in-progress")
                    } else if (obj.step && obj.step === "task_execute") {
                        // AI 生成的 prompt
                        const data = obj as AIChatMessage.TaskLog
                        setLogs((pre) => pre.concat([{level: "info", message: `task_execute : ${data.prompt}`}]))
                    } else if (obj.type && obj.type === "update_task_status") {
                        // const data = obj as AIChatMessage.UpdateTask
                        // 暂时不知道这步的具体作用，如果判断执行完成，可以通过 pop 进行判断
                        // 后续应该可以通过这步去判断执行的结果
                    } else if (obj.type && obj.type === "pop_task") {
                        const data = obj as AIChatMessage.ChangeTask
                        handleUpdateTaskState(data.task.index, "success")
                    } else {
                        // console.log("unkown-structured---\n", ipcContent)
                    }
                } catch (error) {}
                return
            }

            if (res.Type === "plan_review_require") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.PlanReviewRequire

                    if (!data?.id) return
                    if (!data?.plans || !data?.plans?.root_task) return
                    if (!data?.selectors || !data?.selectors?.length) return

                    handleTriggerReview({type: "plan_review_require", data: data})
                } catch (error) {}
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
            if (res.Type === "stream") {
                console.log(
                    "stream___",
                    `${res.CoordinatorId}|${res.NodeId}|${res.TaskIndex}`,
                    "\n",
                    ipcContent,
                    "\n",
                    ipcStreamDelta
                )
                const {IsSystem, IsReason, NodeId, Timestamp, TaskIndex} = res
                const type = IsSystem ? "systemStream" : IsReason ? "reasonStream" : "stream"

                /**
                 * 数据验证
                 * - 如果NodeId类型是(execute|call-tools|tool-xxx-stdout),
                 * - 并且TaskIndex不存在
                 * 这代表数据错误，立即停止继续执行
                 */
                if (isToolSyncNode(NodeId) && !TaskIndex) {
                    onCloseByErrorTaskIndexData(res)
                    return
                }

                if (!!TaskIndex) {
                    // 任务信息输出
                    handleUpdateStream({
                        type,
                        TaskIndex,
                        NodeId,
                        Timestamp,
                        ipcContent,
                        ipcStreamDelta
                    })
                } else {
                    // 系统输出
                    onHandleSystemOutput({NodeId, Timestamp, ipcContent, ipcStreamDelta})
                }
                return
            }
            if (res.Type === "tool_call_start") {
                // 工具调用开始
                try {
                    if (!res.IsJson) return
                    console.log(
                        "tool_call_start___",
                        {...res, Content: undefined, StreamDelta: undefined},
                        "\n",
                        ipcContent,
                        "\n",
                        ipcStreamDelta
                    )
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                    if (!data?.call_tool_id) return
                    // 开始记录工具执行结果
                    onSetToolResultMap(data.call_tool_id, {
                        callToolId: data.call_tool_id,
                        toolName: data?.tool?.name || ""
                    })
                    // 开始记录工具执行过程中的可选操作列表
                    toolStdOutSelectors.current.call_tool_id = data.call_tool_id || ""
                    toolStdOutSelectors.current.tool = data?.tool?.name || ""
                } catch (error) {}
                return
            }
            if (res.Type === "tool_call_user_cancel") {
                try {
                    if (!res.IsJson) return
                    console.log(
                        "tool_call_user_cancel___",
                        {...res, Content: undefined, StreamDelta: undefined},
                        "\n",
                        ipcContent,
                        "\n",
                        ipcStreamDelta
                    )
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                    if (!data?.call_tool_id) return
                    onSetToolResultMap(data.call_tool_id, {
                        status: "user_cancelled",
                        timestamp: res.Timestamp
                    })
                    aggregationToolData(res, data.call_tool_id)
                } catch (error) {}
                return
            }

            if (res.Type === "tool_call_done") {
                try {
                    if (!res.IsJson) return
                    console.log(
                        "tool_call_done___",
                        {...res, Content: undefined, StreamDelta: undefined},
                        "\n",
                        ipcContent,
                        "\n",
                        ipcStreamDelta
                    )
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                    if (!data?.call_tool_id) return
                    onSetToolResultMap(data.call_tool_id, {
                        status: "success",
                        timestamp: res.Timestamp
                    })
                    aggregationToolData(res, data.call_tool_id)
                } catch (error) {}
                return
            }

            if (res.Type === "tool_call_error") {
                try {
                    if (!res.IsJson) return
                    console.log(
                        "tool_call_error___",
                        {...res, Content: undefined, StreamDelta: undefined},
                        "\n",
                        ipcContent,
                        "\n",
                        ipcStreamDelta
                    )
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                    if (!data?.call_tool_id) return
                    onSetToolResultMap(data.call_tool_id, {
                        status: "failed",
                        timestamp: res.Timestamp
                    })
                    aggregationToolData(res, data.call_tool_id)
                } catch (error) {}
                return
            }

            if (res.Type === "tool_call_watcher") {
                // 先于 信息流类型 tool_xxx_stdout 之前传过来
                try {
                    if (!res.IsJson) return
                    console.log(
                        "tool_call_watcher___",
                        {...res, Content: undefined, StreamDelta: undefined},
                        "\n",
                        ipcContent,
                        "\n",
                        ipcStreamDelta
                    )
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCallWatcher
                    if (!data?.id || !data?.call_tool_id) return
                    if (!data?.selectors || !data?.selectors?.length) return
                    if (toolStdOutSelectors.current.call_tool_id === data.call_tool_id) {
                        // 获取 toolStdOut 输出中的可执行操作列表
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
                    console.log(
                        "tool_call_summary___",
                        {...res, Content: undefined, StreamDelta: undefined},
                        "\n",
                        ipcContent,
                        "\n",
                        ipcStreamDelta
                    )
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                    if (!data?.call_tool_id) return
                    const currentToolData = getToolResultMap(data.call_tool_id)
                    if (currentToolData.status === "user_cancelled") {
                        currentToolData.summary = "当前工具调用已被取消，会使用当前输出结果进行后续工作决策"
                    } else {
                        currentToolData.summary = data.summary || ""
                    }
                    onSetToolResultMap(data.call_tool_id, {
                        summary: currentToolData.summary,
                        timestamp: res.Timestamp
                    })
                    onSetToolSummary(res, data.call_tool_id)
                } catch (error) {}
                return
            }

            if (res.Type === "plan") {
                // 更新正在执行的任务树
                try {
                    // console.log("plan---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)
                    if (!res.IsJson) return
                    const tasks = JSON.parse(ipcContent) as {root_task: AIChatMessage.PlanTask}
                    planTree.current = cloneDeep(tasks.root_task)
                    const sum: AIChatMessage.PlanTask[] = []
                    handleFlatAITree(sum, tasks.root_task)
                    setPlan([...sum])
                } catch (error) {}
                return
            }

            if (res.Type === "yak_exec_result") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIPluginExecResult
                    onHandleCard(data)
                } catch (error) {}
                return
            }
            console.log("unkown---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)
        })
        ipcRenderer.on(`${token}-end`, (e, res: any) => {
            console.log("end", res)
            setExecute(false)
            onEnd && onEnd()

            ipcRenderer.invoke("cancel-ai-task", token).catch(() => {})
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-end`)
            ipcRenderer.removeAllListeners(`${token}-error`)
        })
        ipcRenderer.on(`${token}-error`, (e, err: any) => {
            console.log("error", err)
            yakitNotify("error", `AI执行失败: ${err}`)
            setTimeout(() => {
                handleFailTaskState()
            }, 300)
        })
        console.log("start-ai-task", token, params)
        ipcRenderer.invoke("start-ai-task", token, params)
    })
    const onHandleCard = useMemoizedFn((value: AIChatMessage.AIPluginExecResult) => {
        try {
            if (!value?.IsMessage) return
            const message = value?.Message || ""
            const obj: AIChatMessage.AICardMessage = JSON.parse(Buffer.from(message, "base64").toString("utf8"))
            const logData = obj.content as StreamResult.Log
            if (!(obj.type === "log" && logData.level === "feature-status-card-data")) return
            const checkInfo: AIChatMessage.AICard = checkStreamValidity(obj.content as StreamResult.Log)
            if (!checkInfo) return
            const {id, data, tags} = checkInfo
            const {timestamp} = logData
            const originData = cardKVPair.current.get(id)
            if (originData && originData.Timestamp > timestamp) {
                return
            }
            cardKVPair.current.set(id, {
                Id: id,
                Data: data,
                Timestamp: timestamp,
                Tags: Array.isArray(tags) ? tags : []
            })
            onSetCard()
        } catch (error) {}
    })
    const onSetCard = useMemoizedFn(() => {
        if (cardTimeRef.current) return
        cardTimeRef.current = setTimeout(() => {
            const cacheCard: AIChatMessage.AIInfoCard[] = convertCardInfo(cardKVPair.current)
            setCard(() => [...cacheCard])
            cardTimeRef.current = null
        }, 500)
    })
    const onSetCoordinatorId = useMemoizedFn((CoordinatorId: string) => {
        coordinatorId.current.cache = CoordinatorId
        if (coordinatorId.current.sent !== coordinatorId.current.cache && setCoordinatorId) {
            setCoordinatorId(coordinatorId.current.cache)
            coordinatorId.current.sent = coordinatorId.current.cache
        }
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
    const onClose = useMemoizedFn((token: string, option?: {tip: () => void}) => {
        ipcRenderer.invoke("cancel-ai-task", token).catch(() => {})
        if (option?.tip) {
            option.tip()
        } else {
            yakitNotify("info", "AI 任务已取消")
        }
    })

    useEffect(() => {
        return () => {
            if (getExecute() && chatID.current) {
                onClose(chatID.current)
                handleReset()
            }
        }
    }, [])

    return [
        {execute, pressure, firstCost, totalCost, consumption, logs, plan, streams, activeStream, card, systemOutputs},
        {onStart, onSend, onClose, handleReset, fetchToken, fetchPlanTree}
    ] as const
}

export default useChatData
