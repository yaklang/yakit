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

const {ipcRenderer} = window.require("electron")

export interface UseChatDataParams {
    onReview?: (data: AIChatReview) => void
    onReviewExtra?: (data: AIChatReviewExtra) => void
    onReviewRelease?: (id: string) => void
    onEnd?: () => void
}

/** 将树结构任务列表转换成一维数组 */
export const handleFlatAITree = (sum: AIChatMessage.PlanTask[], task: AIChatMessage.PlanTask) => {
    if (!Array.isArray(sum)) return null
    sum.push({
        index: task.index || "",
        name: task.name || "",
        goal: task.goal || "",
        state: "wait",
        isRemove: false,
        tools: [],
        description: ""
    })
    if (task.subtasks && task.subtasks.length > 0) {
        for (let subtask of task.subtasks) {
            handleFlatAITree(sum, subtask)
        }
    }
}

function useChatData(params?: UseChatDataParams) {
    const {onReview, onReviewExtra, onReviewRelease, onEnd} = params || {}

    const chatID = useRef<string>("")
    const fetchToken = useMemoizedFn(() => {
        return chatID.current
    })
    const chatRequest = useRef<AIStartParams>()
    const [execute, setExecute, getExecute] = useGetSetState(false)

    const [pressure, setPressure] = useState<AIChatMessage.Pressure[]>([])
    const [firstCost, setFirstCost] = useState<AIChatMessage.AICostMS[]>([])
    const [totalCost, setTotalCost] = useState<AIChatMessage.AICostMS[]>([])
    const [consumption, setConsumption] = useState<AIChatMessage.Consumption>({
        input_consumption: 0,
        output_consumption: 0
    })

    const planTree = useRef<AIChatMessage.PlanTask>()
    const fetchPlanTree = useMemoizedFn(() => {
        return cloneDeep(planTree.current)
    })
    const [plan, setPlan] = useState<AIChatMessage.PlanTask[]>([])

    const review = useRef<AIChatReview>()
    const currentPlansId = useRef<string>()

    const [logs, setLogs] = useState<AIChatMessage.Log[]>([])

    const [streams, setStreams] = useState<Record<string, AIChatStreams[]>>({})
    const [activeStream, setActiveStream] = useState("")

    // #region 改变任务状态相关方法
    /** 更新任务状态 */
    const handleUpdateTaskState = useMemoizedFn((index: string, state: AIChatMessage.PlanTask["state"]) => {
        setPlan((old) => {
            const newData = cloneDeep(old)
            return newData.map((item) => {
                if (item.index === index) {
                    item.state = state
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
                if (item.state === "in-progress") {
                    item.state = "error"
                }
                return item
            })
        })
    })
    // #endregion

    // #region 更新回答信息数据流
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

            setStreams((old) => {
                const streams = cloneDeep(old)
                const valueInfo = streams[taskIndex || "system"]

                if (valueInfo) {
                    const streamInfo = valueInfo.find((item) => item.type === nodeID && item.timestamp === timestamp)
                    if (streamInfo) {
                        if (type === "systemStream") streamInfo.data.system += ipcContent + ipcStreamDelta
                        if (type === "reasonStream") streamInfo.data.reason += ipcContent + ipcStreamDelta
                        if (type === "stream") streamInfo.data.stream += ipcContent + ipcStreamDelta
                    } else {
                        const info = {
                            type: nodeID,
                            timestamp: timestamp,
                            data: {system: "", reason: "", stream: ""}
                        }
                        if (type === "systemStream") info.data.system += ipcContent + ipcStreamDelta
                        if (type === "reasonStream") info.data.reason += ipcContent + ipcStreamDelta
                        if (type === "stream") info.data.stream += ipcContent + ipcStreamDelta
                        valueInfo.push(info)
                    }
                } else {
                    const list: AIChatStreams[] = [
                        {
                            type: nodeID,
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
        setConsumption({input_consumption: 0, output_consumption: 0})
        planTree.current = undefined
        setPlan([])
        review.current = undefined
        currentPlansId.current = undefined
        setLogs([])
        setStreams({})
        setActiveStream("")
        setExecute(false)
        chatID.current = ""
        chatRequest.current = undefined
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
                    setConsumption(cloneDeep(data))
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
                        const data = obj as AIChatMessage.UpdateTask
                        console.log("update_task_status---\n", data, ipcContent)
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
                console.log("stream---\n", {type, nodeID, timestamp, taskIndex}, ipcContent, ipcStreamDelta)

                handleUpdateStream({type, nodeID, timestamp, taskIndex, ipcContent, ipcStreamDelta})
                setActiveStream(`${taskIndex || "system"}|${nodeID}-${timestamp}`)
                return
            }

            console.log("unkown---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)
        })
        ipcRenderer.on(`${token}-end`, (e, res: any) => {
            console.log("end", res)
            setExecute(false)
            onEnd && onEnd()
            onClose(token)
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

    const onClose = useMemoizedFn((token: string) => {
        ipcRenderer.invoke("cancel-ai-task", token).catch(() => {})
        yakitNotify("info", "AI 任务已取消")
        setTimeout(() => {
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-end`)
            ipcRenderer.removeAllListeners(`${token}-error`)
        }, 1000)
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
        {execute, pressure, firstCost, totalCost, consumption, logs, plan, streams, activeStream},
        {onStart, onSend, onClose, handleReset, fetchToken, fetchPlanTree}
    ] as const
}

export default useChatData
