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
import emiter from "@/utils/eventBus/eventBus"
import {generateTaskChatExecution} from "./defaultConstant"
import {checkStreamValidity, convertCardInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {v4 as uuidv4} from "uuid"

const {ipcRenderer} = window.require("electron")

export interface UseChatDataParams {
    onReview?: (data: AIChatReview) => void
    onReviewExtra?: (data: AIChatReviewExtra) => void
    onReviewRelease?: (id: string) => void
    onEnd?: () => void
    setCoordinatorId?: (id: string) => void
}

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

    const [streams, setStreams] = useState<Record<string, AIChatStreams[]>>({})
    const [card, setCard] = useState<AIChatMessage.AIInfoCard[]>([])
    const [yakExecResultLogs, setYakExecResultLogs] = useState<StreamResult.Log[]>([]) // log:目前只有file

    const [systemOutputs, setSystemOutputs] = useState<AIChatMessage.AIChatSystemOutput[]>([])

    // CoordinatorId
    const coordinatorId = useRef<{cache: string; sent: string}>({cache: "", sent: ""})
    // card
    const cardKVPair = useRef<Map<string, AIChatMessage.AICacheCard>>(new Map<string, AIChatMessage.AICacheCard>())
    const cardTimeRef = useRef<NodeJS.Timeout | null>(null)
    // 从 active 里排除 nodeId 的计时器
    const clearActiveStreamTime = useRef<Record<string, NodeJS.Timeout | null>>({})
    const [activeStream, setActiveStream] = useState<string[]>([])
    const handleSetClearActiveStreamTime = useMemoizedFn((streamId: string) => {
        const time = clearActiveStreamTime.current[streamId]
        if (time) {
            clearTimeout(time)
            clearActiveStreamTime.current[streamId] = setTimeout(() => {
                setActiveStream((old) => old.filter((item) => item !== streamId))
                clearActiveStreamTime.current[streamId] = null
            }, 1000)
        } else {
            clearActiveStreamTime.current[streamId] = setTimeout(() => {
                setActiveStream((old) => old.filter((item) => item != streamId))
                clearActiveStreamTime.current[streamId] = null
            }, 1000)
        }
    })

    let toolDataMapRef = useRef<Map<string, AIChatMessage.AIToolData>>(new Map())

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

    // #region 更新回答信息数据流
    const selectorsRef = useRef<AIChatMessage.AIToolData>({
        ...cloneDeep(defaultAIToolData),
        callToolId: "",
        selectors: [],
        interactiveId: ""
    }) // 保存当前工具周期内selectors和interactiveId数据
    const handleUpdateStream = useMemoizedFn(
        (params: {
            type: string
            nodeID: string
            timestamp: number
            taskIndex: string
            ipcContent: string
            ipcStreamDelta: string
        }) => {
            const {type, nodeID, timestamp, taskIndex, ipcContent, ipcStreamDelta} = params
            const index = taskIndex || "system"
            setStreams((old) => {
                const streams = cloneDeep(old)
                const valueInfo = streams[index]
                if (valueInfo) {
                    const streamInfo = valueInfo.find((item) => item.nodeId === nodeID && item.timestamp === timestamp)
                    if (streamInfo) {
                        if (type === "systemStream") streamInfo.data.system += ipcContent + ipcStreamDelta
                        if (type === "reasonStream") streamInfo.data.reason += ipcContent + ipcStreamDelta
                        if (type === "stream") streamInfo.data.stream += ipcContent + ipcStreamDelta
                    } else {
                        let info: AIChatStreams = {
                            nodeId: nodeID,
                            timestamp: timestamp,
                            data: {system: "", reason: "", stream: ""}
                        }
                        if (isToolStdout(nodeID)) info.toolAggregation = {...selectorsRef.current}
                        if (type === "systemStream") info.data.system += ipcContent + ipcStreamDelta
                        if (type === "reasonStream") info.data.reason += ipcContent + ipcStreamDelta
                        if (type === "stream") info.data.stream += ipcContent + ipcStreamDelta
                        valueInfo.push(info)
                    }
                    if (nodeID === "call-tools") {
                        streams[index] = valueInfo.filter((item) => item.nodeId !== "execute")
                    }
                    if (isToolStdout(nodeID)) {
                        streams[index] = valueInfo.filter((item) => item.nodeId !== "call-tools")
                    }
                } else {
                    const list: AIChatStreams[] = [
                        {
                            nodeId: nodeID,
                            timestamp: timestamp,
                            data: {system: "", reason: "", stream: ""}
                        }
                    ]
                    if (type === "systemStream") list[0].data.system += ipcContent + ipcStreamDelta
                    if (type === "reasonStream") list[0].data.reason += ipcContent + ipcStreamDelta
                    if (type === "stream") list[0].data.stream += ipcContent + ipcStreamDelta
                    streams[taskIndex || "system"] = list
                }

                return streams
            })
        }
    )
    // #endregion

    //#region 处理系统输出
    const onHandleSystemOutput = useMemoizedFn(
        (params: {nodeID: string; timestamp: number; ipcContent: string; ipcStreamDelta: string}) => {
            const {nodeID, timestamp, ipcContent, ipcStreamDelta} = params
            setSystemOutputs((old) => {
                const newOutput = cloneDeep(old)
                const streamInfo = newOutput.find((item) => item.nodeId === nodeID && item.timestamp === timestamp)
                const text = ipcContent + ipcStreamDelta
                if (streamInfo) {
                    streamInfo.data += text
                } else {
                    const info: AIChatMessage.AIChatSystemOutput = {
                        nodeId: nodeID,
                        timestamp: timestamp,
                        data: text,
                        type: "ai"
                    }
                    newOutput.push(info)
                }
                return newOutput
            })
        }
    )
    //#endregion

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
        console.log(`${data.type}-----\n`, JSON.stringify(data.data))
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
            console.log("sum", sum)
            setPlan([...sum])
        }
    })

    /** review 自动释放逻辑 */
    const handleReviewRelease = useMemoizedFn((id: string) => {
        console.log("review.current", review.current, id)

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
        clearActiveStreamTime.current = {}
        setExecute(false)
        chatID.current = ""
        chatRequest.current = undefined
        onSetCoordinatorId("")
        setCard([])
        cardKVPair.current = new Map()
        setYakExecResultLogs([])
        setSystemOutputs([])
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
            if (res.IsSync) {
                // AI 工具点击查询详情需要展示的数据,临时数据
                if (!isToolSyncNode(res.NodeId)) return
                try {
                    const info: AIChatStreams = {
                        nodeId: res.NodeId,
                        timestamp: res.Timestamp,
                        data: {system: "", reason: "", stream: ""}
                    }
                    // 目前AI只有IsStream为true的展示数据
                    if (res.IsStream) {
                        info.data.stream = ipcContent + ipcStreamDelta
                    }
                    emiter.emit(
                        "onTooCardDetails",
                        JSON.stringify({
                            syncId: res.SyncID,
                            info
                        })
                    )
                } catch (error) {}
                return
            }

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
                    console.log("review-release---\n", data)
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
                        setLogs((pre) => pre.concat([{...data, id: uuidv4()}]))
                    } else if (obj.type && obj.type === "push_task") {
                        // 开始任务
                        const data = obj as AIChatMessage.ChangeTask
                        handleUpdateTaskState(data.task.index, "in-progress")
                    } else if (obj.step && obj.step === "task_execute") {
                        // AI 生成的 prompt
                        const data = obj as AIChatMessage.TaskLog
                        setLogs((pre) =>
                            pre.concat([{id: uuidv4(), level: "info", message: `task_execute : ${data.prompt}`}])
                        )
                    } else if (obj.type && obj.type === "update_task_status") {
                        // const data = obj as AIChatMessage.UpdateTask
                        // 暂时不知道这步的具体作用，如果判断执行完成，可以通过 pop 进行判断
                        // 后续应该可以通过这步去判断执行的结果
                    } else if (obj.type && obj.type === "pop_task") {
                        const data = obj as AIChatMessage.ChangeTask
                        handleUpdateTaskState(data.task.index, "success")
                    } else {
                        console.log("unkown-structured---\n", ipcContent)
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
                const type = res.IsSystem ? "systemStream" : res.IsReason ? "reasonStream" : "stream"
                const nodeID = res.NodeId
                const timestamp = res.Timestamp
                const taskIndex = res.TaskIndex
                if (isToolSyncNode(nodeID) && !taskIndex) {
                    onCloseByErrorTaskIndexData(res)
                    return
                }

                if (!!taskIndex) {
                    handleUpdateStream({type, nodeID, timestamp, taskIndex, ipcContent, ipcStreamDelta})
                } else {
                    onHandleSystemOutput({nodeID, timestamp, ipcContent, ipcStreamDelta})
                }

                const streamId = `${taskIndex || "system"}|${nodeID}-${timestamp}`
                handleSetClearActiveStreamTime(streamId)
                setActiveStream((old) => {
                    if (old.includes(streamId)) return old
                    return [...old, streamId]
                })
                return
            }
            if (res.Type === "tool_call_start") {
                // 工具调用开始
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                    onSetToolData(data?.call_tool_id, {
                        callToolId: data?.call_tool_id,
                        toolName: data?.tool?.name || "-"
                    })
                    selectorsRef.current.callToolId = data?.call_tool_id
                } catch (error) {}
                return
            }
            if (res.Type === "tool_call_user_cancel") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                    onSetToolData(data?.call_tool_id, {
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
                    onSetToolData(data?.call_tool_id, {
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
                    onSetToolData(data?.call_tool_id, {
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
                    const currentToolData = getToolData(data.call_tool_id)
                    if (currentToolData.callToolId === selectorsRef.current.callToolId) {
                        // 当前的callToolId与本地工具中的一致
                        selectorsRef.current.selectors = data.selectors
                        selectorsRef.current.interactiveId = data.id
                    }
                } catch (error) {}
                return
            }
            if (res.Type === "tool_call_summary") {
                // 工具调用总结
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIToolCall
                    const currentToolData = getToolData(data.call_tool_id)
                    if (currentToolData.status === "user_cancelled") {
                        currentToolData.summary = "当前工具调用已被取消，会使用当前输出结果进行后续工作决策"
                    } else {
                        currentToolData.summary = data.summary || ""
                    }
                    onSetToolData(data?.call_tool_id, {
                        summary: currentToolData.summary,
                        time: res.Timestamp
                    })
                    onSetToolSummary(res, data?.call_tool_id || "")
                } catch (error) {}
                return
            }

            if (res.Type === "plan") {
                // 更新正在执行的任务树
                try {
                    console.log("plan---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)
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
                    onHandleYakExecResult(data)
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

    const onHandleYakExecResult = useMemoizedFn((value: AIChatMessage.AIPluginExecResult) => {
        try {
            if (!value?.IsMessage) return
            const message = value?.Message || ""
            const obj: AIChatMessage.AICardMessage = JSON.parse(Buffer.from(message, "base64").toString("utf8"))

            if (obj.type !== "log") return
            const content = obj.content as StreamResult.Log
            switch (content.level) {
                case "feature-status-card-data":
                    onHandleCard(obj)
                    break
                case "file":
                    onHandleYakExecResultLogs(obj)
                    break
                default:
                    break
            }
        } catch (error) {}
    })
    /**
     * @description 该方法可以记录yak_exec_result中所有的日志，但是目前只对接level:fil;后续根据可需求更改
     */
    const onHandleYakExecResultLogs = useMemoizedFn((obj: AIChatMessage.AICardMessage) => {
        const log = obj.content as StreamResult.Log
        setYakExecResultLogs((perLog) => [...perLog, {...log, id: uuidv4()}])
    })
    const onHandleCard = useMemoizedFn((obj: AIChatMessage.AICardMessage) => {
        const logData = obj.content as StreamResult.Log
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
    const getToolData = useMemoizedFn((callToolId: string): AIChatMessage.AIToolData => {
        return toolDataMapRef.current.get(callToolId) || cloneDeep(defaultAIToolData)
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
                                    ...defaultAIToolData.toolStdoutContent
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
        selectorsRef.current = cloneDeep(defaultAIToolData)
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
        {
            execute,
            pressure,
            firstCost,
            totalCost,
            consumption,
            logs,
            plan,
            streams,
            activeStream,
            card,
            systemOutputs,
            yakExecResultLogs
        },
        {onStart, onSend, onClose, handleReset, fetchToken, fetchPlanTree}
    ] as const
}

export default useChatData
