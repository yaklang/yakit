import {useEffect, useRef, useState} from "react"
import {yakitNotify} from "@/utils/notification"
import {useMemoizedFn} from "ahooks"
import {AIChatMessage, AIChatReview, AIChatStreams, AIInputEvent, AIOutputEvent, AIStartParams} from "./type/aiChat"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import useGetSetState from "../pluginHub/hooks/useGetSetState"

const {ipcRenderer} = window.require("electron")

export interface UseChatDataParams {
    onReview?: (data: AIChatReview) => void
    onReviewRelease?: (id: string) => void
    onRedirectForge?: (old: AIStartParams, request: AIStartParams) => void
}

/** 将树结构任务列表转换成一维数组 */
export const handleFlatAITree = (sum: AIChatMessage.PlanTask[], task: AIChatMessage.PlanTask) => {
    if (!Array.isArray(sum)) return null
    sum.push({...task, state: "wait"})

    if (task.subtasks && task.subtasks.length > 0) {
        for (let subtask of task.subtasks) {
            handleFlatAITree(sum, subtask)
        }
    }
}

function useChatData(params?: UseChatDataParams) {
    const {onReview, onReviewRelease, onRedirectForge} = params || {}

    const chatID = useRef<string>("")
    const chatRequest = useRef<AIStartParams>()
    const [execute, setExecute, getExecute] = useGetSetState(false)

    const [pressure, setPressure] = useState<AIChatMessage.Pressure[]>([])
    const [firstCost, setFirstCost] = useState<AIChatMessage.AICostMS[]>([])
    const [totalCost, setTotalCost] = useState<AIChatMessage.AICostMS[]>([])
    const [consumption, setConsumption] = useState<AIChatMessage.Consumption>({
        input_consumption: 0,
        output_consumption: 0
    })

    const planData = useRef<AIChatMessage.PlanTask>()
    const fetchPlan = useMemoizedFn(() => {
        return cloneDeep(planData.current)
    })
    const [plan, setPlan] = useState<AIChatMessage.PlanTask[]>([])
    const review = useRef<AIChatReview>()

    const [logs, setLogs] = useState<AIChatMessage.Log[]>([])

    const [streams, setStreams] = useState<Record<string, AIChatStreams[]>>({})
    const [activeStream, setActiveStream] = useState("")

    // #region chat-任务相关方法
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

    // #region chat-回答信息流相关方法
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

    /** 重置所有数据 */
    const handleReset = useMemoizedFn(() => {
        setPressure([])
        setFirstCost([])
        setTotalCost([])
        setConsumption({input_consumption: 0, output_consumption: 0})
        planData.current = undefined
        setPlan([])
        review.current = undefined
        setLogs([])
        setStreams({})
        setActiveStream("")
        setExecute(false)
        chatID.current = ""
        chatRequest.current = undefined
    })

    /** 是否向外触发 review 事件 */
    const handleIsTriigerReview = useMemoizedFn(() => {
        if (chatRequest.current && chatRequest.current.ReviewPolicy === "yolo") return false
        return true
    })
    /** review 自动释放逻辑 */
    const handleReviewRelease = useMemoizedFn((id: string) => {
        console.log("handleReviewRelease-flag", review.current && review.current.data.id === id)

        if (review.current && review.current.data.id === id) {
            console.log('review.current.type === "plan_review_require"', review.current.type === "plan_review_require")

            if (review.current.type === "plan_review_require") {
                // 如果是计划的审阅，继续执行代表任务列表已确认，可以进行数据保存
                const data = review.current.data as AIChatMessage.PlanReviewRequire
                planData.current = cloneDeep(data.plans.root_task)
                const sum: AIChatMessage.PlanTask[] = []
                handleFlatAITree(sum, data.plans.root_task)
                console.log("sum", sum)

                setPlan([...sum])
            }
        }
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
                    setPressure((old) => old.concat([{...data}]))
                } catch (error) {}
                return
            }

            if (res.Type === "ai_first_byte_cost_ms") {
                // 首字符响应耗时
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AICostMS
                    setFirstCost((old) => old.concat([{...data}]))
                } catch (error) {}
                return
            }

            if (res.Type === "ai_total_cost_ms") {
                // 总对话耗时
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AICostMS
                    setTotalCost((old) => old.concat([{...data}]))
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
                    console.log("review-release", data)

                    if (handleIsTriigerReview()) {
                        onReviewRelease && onReviewRelease(data.id)
                    } else {
                        handleReviewRelease(data.id)
                    }
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
                    review.current = {type: "plan_review_require", data: data}
                    if (handleIsTriigerReview()) {
                        onReview && onReview({type: "plan_review_require", data: data})
                    }
                } catch (error) {}
                console.log("plan_review_require---\n", ipcContent)
                return
            }
            if (res.Type === "tool_use_review_require") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.ToolUseReviewRequire
                    review.current = {type: "tool_use_review_require", data: data}
                    if (handleIsTriigerReview()) {
                        onReview && onReview({type: "tool_use_review_require", data: data})
                    }
                } catch (error) {}
                console.log("tool_use_review_require---\n", ipcContent)
                return
            }
            if (res.Type === "task_review_require") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.TaskReviewRequire
                    review.current = {type: "task_review_require", data: data}
                    if (handleIsTriigerReview()) {
                        onReview && onReview({type: "task_review_require", data: data})
                    }
                } catch (error) {}
                console.log("task_review_require---\n", ipcContent)
                return
            }
            if (res.Type === "require_user_interactive") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIReviewRequire
                    review.current = {type: "require_user_interactive", data: data}
                    onReview && onReview({type: "require_user_interactive", data: data})
                } catch (error) {}
                console.log("require_user_interactive---\n", ipcContent)
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

            if (res.Type === "redirect_forge") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIStartParams
                    if (!chatRequest.current) return
                    onRedirectForge && onRedirectForge(cloneDeep(chatRequest.current), data)
                } catch (error) {}
                console.log("redirect_forge---\n", ipcContent)
                return
            }

            console.log("unkown---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)
        })
        ipcRenderer.on(`${token}-end`, (e, res: any) => {
            console.log("end", res)
            setExecute(false)
        })
        ipcRenderer.on(`${token}-error`, (e, err: any) => {
            console.log("error", err)
            yakitNotify("error", `AI执行失败: ${err}`)
            setTimeout(() => {
                handleFailTaskState()
            }, 300)
        })
        console.log("start-ai-agent-chat", token, params)
        ipcRenderer.invoke("start-ai-agent-chat", token, params)
    })

    /** 审阅选项的发送 */
    const onSend = useMemoizedFn((token: string, info: AIChatReview, params: AIInputEvent) => {
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
            // 如果是计划的审阅，继续执行代表任务列表已确认，可以进行数据保存
            const data = info.data as AIChatMessage.PlanReviewRequire
            planData.current = cloneDeep(data.plans.root_task)
            const sum: AIChatMessage.PlanTask[] = []
            handleFlatAITree(sum, data.plans.root_task)
            setPlan([...sum])
        }
        console.log("send-ai", token, params)

        review.current = undefined
        ipcRenderer.invoke("send-ai-agent-chat", token, params)
    })

    const onClose = useMemoizedFn((token: string) => {
        ipcRenderer.invoke("cancel-ai-agent-chat", token).catch(() => {})
        yakitNotify("info", "AI 任务已取消")
        setTimeout(() => {
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-end`)
            ipcRenderer.removeAllListeners(`${token}-error`)
        }, 1000)
    })

    /** 获取当前数据信息的对应唯一ID */
    const fetchToken = useMemoizedFn(() => {
        return chatID.current
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
        {execute, pressure, firstCost, totalCost, consumption, logs, fetchPlan, plan, streams, activeStream},
        {onStart, onSend, onClose, handleReset, fetchToken}
    ] as const
}

export default useChatData
