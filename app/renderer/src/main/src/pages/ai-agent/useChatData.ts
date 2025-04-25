import {useEffect, useRef, useState} from "react"
import {yakitNotify} from "@/utils/notification"
import {useMemoizedFn} from "ahooks"
import {AIChatMessage, AIChatReview, AIChatStreams, AIInputEvent, AIOutputEvent} from "./type/aiChat"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import useGetSetState from "../pluginHub/hooks/useGetSetState"

const {ipcRenderer} = window.require("electron")

export interface UseChatDataParams {
    onConsumption?: (data: AIChatMessage.Consumption) => void
    onLog?: (data: AIChatMessage.Log) => void
    onReview?: (data: AIChatReview) => void
    onStream?: (data: AIChatStreams[]) => void
}

function useChatData(params?: UseChatDataParams) {
    const {onConsumption, onLog, onReview, onStream} = params || {}

    const chatID = useRef<string>("")
    const [execute, setExecute, getExecute] = useGetSetState(false)

    const [consumption, setConsumption] = useState<AIChatMessage.Consumption>({
        input_consumption: 0,
        output_consumption: 0
    })
    const [logs, setLogs] = useState<AIChatMessage.Log[]>([])
    const [plan, setPlan] = useState<AIChatMessage.PlanTask>()
    const [review, setReview] = useState<AIChatReview>()

    const [activeStream, setActiveStream] = useState<string>("")
    const [streams, setStreams] = useState<AIChatStreams[]>([])

    // 更新计划里任务的状态
    const handleUpdateTaskState = useMemoizedFn(
        (data: AIChatMessage.PlanTask[], info: AIChatMessage.PlanTask, state: AIChatMessage.PlanTask["state"]) => {
            if (data.length === 0) return
            for (let item of data) {
                const {name, goal, subtasks} = item
                if (name === info.name && goal === info.goal) {
                    item.state = state
                    return
                } else {
                    if (subtasks && subtasks.length > 0) {
                        handleUpdateTaskState(subtasks, info, state)
                    }
                }
            }
        }
    )
    // 任务列表中-等待任务全部设置为失败
    const handleFailTaskState = useMemoizedFn(() => {
        const handleSetFail = (data: AIChatMessage.PlanTask[]) => {
            if (data.length === 0) return
            for (let item of data) {
                const {state, subtasks} = item
                item.state = item.state !== "end" ? "error" : "end"
                if (subtasks && subtasks.length > 0) {
                    handleSetFail(subtasks)
                }
            }
        }

        setPlan((old) => {
            if (!old) return old
            const newPlan = cloneDeep(old)
            handleSetFail([newPlan])
            return newPlan
        })
    })

    const handleReset = useMemoizedFn(() => {
        setConsumption({input_consumption: 0, output_consumption: 0})
        setLogs([])
        setPlan(undefined)
        setReview(undefined)
        setActiveStream("")
        setStreams([])
        chatID.current = ""
    })

    const onStart = useMemoizedFn((token: string, params: AIInputEvent) => {
        if (execute) {
            yakitNotify("warning", "AI任务正在执行中，请稍后再试！")
            return
        }
        handleReset()
        setExecute(true)
        chatID.current = token
        ipcRenderer.on(`${token}-data`, (e, res: AIOutputEvent) => {
            let ipcContent = ""
            let ipcStreamDelta = ""
            try {
                ipcContent = Uint8ArrayToString(res.Content) || ""
                ipcStreamDelta = Uint8ArrayToString(res.StreamDelta) || ""
            } catch (error) {}

            if (res.Type === "consumption") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.Consumption
                    setConsumption(cloneDeep(data))
                    onConsumption && onConsumption(cloneDeep(data))
                } catch (error) {}
                return
            }

            if (res.Type === "structured") {
                try {
                    if (!res.IsJson) return

                    const obj = JSON.parse(ipcContent) || ""
                    if (!obj || typeof obj !== "object") return

                    if (obj.level) {
                        const data = obj as AIChatMessage.Log
                        setLogs((pre) => pre.concat([data]))
                        onLog && onLog(data)
                    } else if (obj.type && obj.type === "push_task") {
                        const data = obj as AIChatMessage.ChangeTask
                        setPlan((old) => {
                            if (!old) return old
                            const newPlan = cloneDeep(old)
                            handleUpdateTaskState([newPlan], data.task, "exec")
                            return newPlan
                        })
                    } else if (obj.step && obj.step === "task_execute") {
                        const data = obj as AIChatMessage.TaskLog
                        setLogs((pre) => pre.concat([{level: "info", message: `task_execute : ${data.prompt}`}]))
                        onLog && onLog({level: "info", message: `task_execute : ${data.prompt}`})
                    } else if (obj.type && obj.type === "update_task_status") {
                        // const data = obj as AIChatMessage.UpdateTask
                        // 暂时不知道这步的具体作用，如果判断执行完成，可以通过 pop 进行判断
                        // 后续应该可以通过这步去判断执行的结果
                    } else if (obj.type && obj.type === "pop_task") {
                        const data = obj as AIChatMessage.ChangeTask
                        setPlan((old) => {
                            if (!old) return old
                            const newPlan = cloneDeep(old)
                            handleUpdateTaskState([newPlan], data.task, "end")
                            return newPlan
                        })
                    } else {
                        console.log("structured---\n", ipcContent)
                    }
                } catch (error) {}
                return
            }
            if (res.Type === "plan_review_require") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.PlanReviewRequire
                    setReview({type: "plan_review_require", data: data})
                    onReview && onReview({type: "plan_review_require", data: data})
                } catch (error) {}
                console.log("plan_review_require---\n", ipcContent)
                return
            }
            if (res.Type === "tool_use_review_require") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.ToolUseReviewRequire
                    setReview({type: "tool_use_review_require", data: data})
                    onReview && onReview({type: "tool_use_review_require", data: data})
                } catch (error) {}
                console.log("tool_use_review_require---\n", ipcContent)
                return
            }
            if (res.Type === "task_review_require") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.TaskReviewRequire
                    setReview({type: "task_review_require", data: data})
                    onReview && onReview({type: "task_review_require", data: data})
                } catch (error) {}
                console.log("task_review_require---\n", ipcContent)
                return
            }
            if (res.Type === "stream") {
                const type = res.IsSystem ? "systemStream" : res.IsReason ? "reasonStream" : "stream"
                const nodeID = res.NodeId
                const timestamp = res.Timestamp
                console.log("stream---\n", {type, nodeID, timestamp}, ipcContent, ipcStreamDelta)

                setActiveStream((old) => {
                    if (old !== `${nodeID}-${timestamp}`) return `${nodeID}-${timestamp}`
                    return old
                })

                setStreams((old) => {
                    const data = cloneDeep(old)
                    const find = data.find((item) => item.type === nodeID && item.timestamp === timestamp)
                    if (find) {
                        if (type === "systemStream") find.data.system += ipcContent + ipcStreamDelta
                        if (type === "reasonStream") find.data.reason += ipcContent + ipcStreamDelta
                        if (type === "stream") find.data.stream += ipcContent + ipcStreamDelta
                    } else {
                        const newObj: AIChatStreams = {
                            type: nodeID,
                            timestamp: timestamp,
                            data: {system: "", reason: "", stream: ""}
                        }
                        if (type === "systemStream") newObj.data.system += ipcContent + ipcStreamDelta
                        if (type === "reasonStream") newObj.data.reason += ipcContent + ipcStreamDelta
                        if (type === "stream") newObj.data.stream += ipcContent + ipcStreamDelta
                        data.push(newObj)
                    }
                    return data
                })
                onStream && onStream(cloneDeep(streams))
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
        ipcRenderer.invoke("start-ai-agent-chat", token, params)
    })

    const onSend = useMemoizedFn((token: string, review: AIChatReview, params: AIInputEvent) => {
        if (!execute) {
            yakitNotify("warning", "AI 未执行任务，无法发送选项")
            return
        }
        if (!chatID || chatID.current !== token) {
            yakitNotify("warning", "该选项非本次 AI 执行的回答选项")
            return
        }
        if (
            review.type === "plan_review_require" &&
            params.InteractiveJSONInput === JSON.stringify({suggestion: "continue"})
        ) {
            const data = review.data as AIChatMessage.PlanReviewRequire
            setPlan(data.plans.root_task)
        }
        setReview(undefined)
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
        {execute, consumption, logs, plan, review, activeStream, streams},
        {onStart, onSend, onClose, handleReset, fetchToken}
    ] as const
}

export default useChatData
