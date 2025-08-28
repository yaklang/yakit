import {useEffect, useRef, useState} from "react"
import {yakitNotify} from "@/utils/notification"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {checkStreamValidity, convertCardInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStream"
import {StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {
    AIChatMessage,
    AIChatReview,
    AIChatReviewExtra,
    AIInputEvent,
    AIOutputEvent,
    AIStartParams
} from "@/pages/ai-agent/type/aiChat"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import useAIPerfData, {UseAIPerfDataTypes} from "./useAIPerfData"
import {handleFlatAITree} from "./utils"
import useCasualChat, {UseCasualChatTypes} from "./useCasualChat"

const {ipcRenderer} = window.require("electron")

/** 暂时全算到日志的数据类型 */
const LogTypes = [
    "structured|react_task_created",
    "structured|react_task_enqueue",
    "structured|react_task_dequeue",
    "iteration",
    "thought",
    "structured|react_task_status_changed"
]

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

export interface useChatIPCParams {
    setCoordinatorId?: (id: string) => void
    onReviewRelease?: (id: string) => void
    onEnd?: () => void
}

function useChatIPC(params?: useChatIPCParams) {
    const {onReviewRelease, onEnd, setCoordinatorId} = params || {}

    // 通信的唯一标识符
    const chatID = useRef<string>("")
    const fetchToken = useMemoizedFn(() => {
        return chatID.current
    })
    // 建立通信时的请求参数
    const chatRequest = useRef<AIStartParams>()
    const fetchRequest = useMemoizedFn(() => {
        return chatRequest.current
    })

    // 通信的状态
    const [execute, setExecute, getExecute] = useGetSetState(false)

    // 通信的CoordinatorId(唯一标识ID)
    const coordinatorId = useRef<{cache: string; sent: string}>({cache: "", sent: ""})
    const onSetCoordinatorId = useMemoizedFn((CoordinatorId: string) => {
        coordinatorId.current.cache = CoordinatorId
        if (coordinatorId.current.sent !== coordinatorId.current.cache && setCoordinatorId) {
            setCoordinatorId(coordinatorId.current.cache)
            coordinatorId.current.sent = coordinatorId.current.cache
        }
    })

    // 日志
    const [logs, setLogs] = useState<AIChatMessage.Log[]>([])
    const pushLog = useMemoizedFn((logInfo: AIChatMessage.Log) => {
        setLogs((pre) => pre.concat([logInfo]))
    })

    // AI性能相关数据和逻辑
    const [aiPerfData, aiPerfDataEvent] = useAIPerfData({pushErrorLog: pushLog})

    // 自由对话相关数据和逻辑
    const [casualChat, casualChatEvent] = useCasualChat({
        getRequest: fetchRequest,
        pushErrorLog: pushLog,
        onReviewRelease
    })

    let toolDataMapRef = useRef<Map<string, AIChatMessage.AIToolData>>(new Map())

    // #region review事件相关方法

    /** review 界面选项触发事件 */
    const onSend = useMemoizedFn((token: string, type: "casual" | "task", params: AIInputEvent) => {
        try {
            if (!execute) {
                yakitNotify("warning", "AI 未执行任务，无法发送选项")
                return
            }
            if (!chatID || chatID.current !== token) {
                yakitNotify("warning", "该选项非本次 AI 执行的回答选项")
                return
            }
            console.log("send-ai---\n", token, params)

            if (type === "casual") {
                casualChatEvent.handleSend(params, () => {
                    ipcRenderer.invoke("send-ai-task", token, params)
                })
            }
        } catch (error) {}
    })
    // #endregion

    /** 重置所有数据 */
    const handleReset = useMemoizedFn(() => {
        chatID.current = ""
        chatRequest.current = undefined
        setExecute(false)
        coordinatorId.current = {cache: "", sent: ""}
        aiPerfDataEvent.handleResetData()
        setLogs([])
        casualChatEvent.handleReset()
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
            try {
                // CoordinatorId
                if (!!res?.CoordinatorId) {
                    onSetCoordinatorId(res.CoordinatorId)
                }

                let ipcContent = Uint8ArrayToString(res.Content) || ""
                let ipcStreamDelta = Uint8ArrayToString(res.StreamDelta) || ""

                if (UseAIPerfDataTypes.includes(res.Type)) {
                    // AI性能数据处理
                    aiPerfDataEvent.handleSetData(res)
                    return
                }

                if (res.Type === "review_release") {
                    // review释放通知
                    try {
                        if (!res.IsJson) return
                        const data = JSON.parse(ipcContent) as AIChatMessage.ReviewRelease
                        if (!data?.id) return
                        // handleReviewRelease(data.id)
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
                        } /* else if (obj.type && obj.type === "push_task") {
                            // 开始任务
                            const data = obj as AIChatMessage.ChangeTask
                            handleUpdateTaskState(data.task.index, "in-progress")
                        } else if (obj.type && obj.type === "pop_task") {
                            const data = obj as AIChatMessage.ChangeTask
                            handleUpdateTaskState(data.task.index, "success")
                        } */ else {
                            setLogs((pre) => pre.concat([{level: "info", message: `task_execute : ${ipcContent}`}]))
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

                        // handleTriggerReview({type: "plan_review_require", data: data})
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
                        // handleTriggerReviewExtra({
                        //     type: "plan_task_analysis",
                        //     data
                        // })
                    } catch (error) {}

                    return
                }
                if (res.Type === "tool_use_review_require") {
                    try {
                        if (!res.IsJson) return
                        const data = JSON.parse(ipcContent) as AIChatMessage.ToolUseReviewRequire

                        if (!data?.id) return
                        if (!data?.selectors || !data?.selectors?.length) return

                        // handleTriggerReview({type: "tool_use_review_require", data: data})
                    } catch (error) {}
                    return
                }
                if (res.Type === "task_review_require") {
                    try {
                        if (!res.IsJson) return
                        const data = JSON.parse(ipcContent) as AIChatMessage.TaskReviewRequire

                        if (!data?.id) return
                        if (!data?.selectors || !data?.selectors?.length) return

                        // handleTriggerReview({type: "task_review_require", data: data})
                    } catch (error) {}
                    return
                }
                if (res.Type === "require_user_interactive") {
                    try {
                        if (!res.IsJson) return
                        const data = JSON.parse(ipcContent) as AIChatMessage.AIReviewRequire

                        if (!data?.id) return
                        // handleTriggerReview({type: "require_user_interactive", data: data})
                    } catch (error) {}
                    return
                }
                if (res.Type === "stream") {
                    const {TaskIndex, NodeId} = res
                    if (!TaskIndex && UseCasualChatTypes.includes(`stream|${NodeId}`)) {
                        casualChatEvent.handleSetData(res)
                    }

                    return
                }
                if (res.Type === "tool_call_start") {
                    if (res.TaskIndex) {
                    } else {
                        casualChatEvent.handleSetData(res)
                    }
                    return
                }
                if (res.Type === "tool_call_user_cancel") {
                    if (res.TaskIndex) {
                    } else {
                        casualChatEvent.handleSetData(res)
                    }
                    return
                }

                if (res.Type === "tool_call_done") {
                    if (res.TaskIndex) {
                    } else {
                        casualChatEvent.handleSetData(res)
                    }
                    return
                }

                if (res.Type === "tool_call_error") {
                    if (res.TaskIndex) {
                    } else {
                        casualChatEvent.handleSetData(res)
                    }
                    return
                }

                if (res.Type === "tool_call_watcher") {
                    if (res.TaskIndex) {
                    } else {
                        casualChatEvent.handleSetData(res)
                    }
                    return
                }
                if (res.Type === "tool_call_summary") {
                    if (res.TaskIndex) {
                    } else {
                        casualChatEvent.handleSetData(res)
                    }
                    return
                }

                if (res.Type === "plan") {
                    // 更新正在执行的任务树
                    try {
                        console.log("plan---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)
                        if (!res.IsJson) return
                        const tasks = JSON.parse(ipcContent) as {root_task: AIChatMessage.PlanTask}
                        // planTree.current = cloneDeep(tasks.root_task)
                        // const sum: AIChatMessage.PlanTask[] = []
                        // handleFlatAITree(sum, tasks.root_task)
                        // setPlan([...sum])
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
            } catch (error) {}
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
            // setTimeout(() => {
            //     handleFailTaskState()
            // }, 300)
        })
        console.log("start-ai-re-act", token, params)
        ipcRenderer.invoke("start-ai-re-act", token, params)
    })
    const onHandleCard = useMemoizedFn((value: AIChatMessage.AIPluginExecResult) => {
        // try {
        //     if (!value?.IsMessage) return
        //     const message = value?.Message || ""
        //     const obj: AIChatMessage.AICardMessage = JSON.parse(Buffer.from(message, "base64").toString("utf8"))
        //     const logData = obj.content as StreamResult.Log
        //     if (!(obj.type === "log" && logData.level === "feature-status-card-data")) return
        //     const checkInfo: AIChatMessage.AICard = checkStreamValidity(obj.content as StreamResult.Log)
        //     if (!checkInfo) return
        //     const {id, data, tags} = checkInfo
        //     const {timestamp} = logData
        //     const originData = cardKVPair.current.get(id)
        //     if (originData && originData.Timestamp > timestamp) {
        //         return
        //     }
        //     cardKVPair.current.set(id, {
        //         Id: id,
        //         Data: data,
        //         Timestamp: timestamp,
        //         Tags: Array.isArray(tags) ? tags : []
        //     })
        //     onSetCard()
        // } catch (error) {}
    })
    const onSetCard = useMemoizedFn(() => {
        // if (cardTimeRef.current) return
        // cardTimeRef.current = setTimeout(() => {
        //     const cacheCard: AIChatMessage.AIInfoCard[] = convertCardInfo(cardKVPair.current)
        //     setCard(() => [...cacheCard])
        //     cardTimeRef.current = null
        // }, 500)
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
        {execute, aiPerfData, logs, casualChat},
        {onStart, onSend, onClose, handleReset, fetchToken}
    ] as const
}

export default useChatIPC
