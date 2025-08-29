import {useEffect, useRef, useState} from "react"
import {yakitNotify} from "@/utils/notification"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {AIChatMessage, AIInputEvent, AIOutputEvent, AIStartParams} from "@/pages/ai-agent/type/aiChat"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import useAIPerfData, {UseAIPerfDataTypes} from "./useAIPerfData"
import useCasualChat, {UseCasualChatTypes} from "./useCasualChat"
import useExecCard, {UseExecCardTypes} from "./useExecCard"
import {v4 as uuidv4} from "uuid"

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
        setLogs((pre) => pre.concat([{...logInfo, id: uuidv4()}]))
    })

    // AI性能相关数据和逻辑
    const [aiPerfData, aiPerfDataEvent] = useAIPerfData({pushErrorLog: pushLog})

    // 执行过程中插件输出的卡片
    const [card, cardEvent] = useExecCard()

    // 自由对话相关数据和逻辑
    const [casualChat, casualChatEvent] = useCasualChat({
        getRequest: fetchRequest,
        pushErrorLog: pushLog,
        onReviewRelease
    })

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
            console.log("send-ai-re-act---\n", token, params)

            if (type === "casual") {
                casualChatEvent.handleSend(params, () => {
                    ipcRenderer.invoke("send-ai-re-act", token, params)
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
        setLogs([])
        aiPerfDataEvent.handleResetData()
        cardEvent.handleResetData()
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
            console.log("onStart-res", res)
            try {
                // CoordinatorId
                if (!!res?.CoordinatorId) {
                    onSetCoordinatorId(res.CoordinatorId)
                }

                let ipcContent = Uint8ArrayToString(res.Content) || ""

                if (UseAIPerfDataTypes.includes(res.Type)) {
                    // AI性能数据处理
                    aiPerfDataEvent.handleSetData(res)
                    return
                }

                if (UseExecCardTypes.includes(res.Type)) {
                    // 执行过程中插件输出的卡片
                    cardEvent.handleSetData(res)
                    return
                }

                if (UseCasualChatTypes.includes(res.Type)) {
                    // 用户问题的答案
                    casualChatEvent.handleSetData(res)
                    return
                }

                if (res.Type === "review_release") {
                    // review释放通知
                    if (!res.IsJson) return
                    const {TaskIndex} = res
                    if (!TaskIndex) {
                        casualChatEvent.handleSetData(res)
                    }
                    return
                }

                if (res.Type === "structured") {
                    try {
                        if (!res.IsJson) return

                        const {TaskIndex, NodeId} = res
                        if (!TaskIndex && UseCasualChatTypes.includes(`structured|${NodeId}`)) {
                            casualChatEvent.handleSetData(res)
                            return
                        }

                        const obj = JSON.parse(ipcContent) || ""
                        if (!obj || typeof obj !== "object") return

                        if (obj.level) {
                            // 日志信息
                            const data = obj as AIChatMessage.Log
                            setLogs((pre) => pre.concat([{...data, id: uuidv4()}]))
                        } else {
                            setLogs((pre) =>
                                pre.concat([{id: uuidv4(), level: "info", message: `task_execute : ${ipcContent}`}])
                            )
                            console.log("unkown-structured---\n", ipcContent)
                        }
                    } catch (error) {}
                    return
                }

                if (res.Type === "tool_use_review_require") {
                    if (!res.IsJson) return
                    const {TaskIndex} = res
                    if (!TaskIndex) {
                        casualChatEvent.handleSetData(res)
                    }
                    return
                }
                if (res.Type === "require_user_interactive") {
                    if (!res.IsJson) return
                    const {TaskIndex} = res
                    if (!TaskIndex) {
                        casualChatEvent.handleSetData(res)
                    }
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
                console.log("unkown---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)
                setLogs((pre) => pre.concat([{id: uuidv4(), level: "info", message: `task_execute : ${ipcContent}`}]))
            } catch (error) {}
        })
        ipcRenderer.on(`${token}-end`, (e, res: any) => {
            console.log("end", res)
            setExecute(false)
            onEnd && onEnd()

            ipcRenderer.invoke("cancel-ai-re-act", token).catch(() => {})
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-end`)
            ipcRenderer.removeAllListeners(`${token}-error`)
        })
        ipcRenderer.on(`${token}-error`, (e, err: any) => {
            console.log("error", err)
            yakitNotify("error", `AI执行失败: ${err}`)
        })
        console.log("start-ai-re-act", token, params)

        // 初次用户对话的问题，属于自由对话中的问题
        casualChatEvent.handleSend({IsFreeInput: true, FreeInput: params?.Params?.UserQuery || ""})

        ipcRenderer.invoke("start-ai-re-act", token, params)
    })

    const onClose = useMemoizedFn((token: string, option?: {tip: () => void}) => {
        ipcRenderer.invoke("cancel-ai-re-act", token).catch(() => {})
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
        {execute, logs, aiPerfData, card, casualChat},
        {onStart, onSend, onClose, handleReset, fetchToken}
    ] as const
}

export default useChatIPC
