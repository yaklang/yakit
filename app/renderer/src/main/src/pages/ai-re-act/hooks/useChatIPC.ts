import {useEffect, useRef, useState} from "react"
import {yakitNotify} from "@/utils/notification"
import {useMemoizedFn} from "ahooks"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import {AIChatMessage, AIInputEvent, AIOutputEvent, AIStartParams} from "@/pages/ai-agent/type/aiChat"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"
import useAIPerfData, {UseAIPerfDataTypes} from "./useAIPerfData"
import useCasualChat, {UseCasualChatTypes} from "./useCasualChat"
import useYakExecResult, {UseYakExecResultTypes} from "./useYakExecResult"
import {v4 as uuidv4} from "uuid"
import useTaskChat, {UseTaskChatTypes} from "./useTaskChat"
import {handleGrpcDataPushLog} from "./utils"
import {ChatIPCSendType, UseCasualChatEvents, UseChatIPCEvents, UseChatIPCParams, UseChatIPCState} from "./type"

const {ipcRenderer} = window.require("electron")

/** 任务规划和自由对话共用的类型 */
const UseCasualAndTaskTypes = [
    "tool_use_review_require",
    "require_user_interactive",
    "review_release",
    // "stream",
    "tool_call_start",
    "tool_call_user_cancel",
    "tool_call_done",
    "tool_call_error",
    "tool_call_watcher",
    "tool_call_summary",
    // 对 tool_review 的 ai 评分
    "ai_review_start",
    "ai_review_countdown",
    "ai_review_end"
]

function useChatIPC(params?: UseChatIPCParams): [UseChatIPCState, UseChatIPCEvents]

function useChatIPC(params?: UseChatIPCParams) {
    const {onTaskStart, onTaskReview, onTaskReviewExtra, onReviewRelease, onEnd} = params || {}

    // 自由对话-review 信息的自动释放
    const handleCasualReviewRelease = useMemoizedFn((id: string) => {
        onReviewRelease && onReviewRelease("casual", id)
    })
    // 任务规划-review 信息的自动释放
    const handleTaskReviewRelease = useMemoizedFn((id: string) => {
        onReviewRelease && onReviewRelease("task", id)
    })

    // #region 启动流接口后的相关全局数据
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
    // #endregion

    // #region 单次流执行时的输出展示数据
    // 日志
    const [logs, setLogs] = useState<AIChatMessage.Log[]>([])
    const pushLog = useMemoizedFn((logInfo: AIChatMessage.Log) => {
        setLogs((pre) => pre.concat([{...logInfo, id: uuidv4()}]))
    })

    // AI性能相关数据和逻辑
    const [aiPerfData, aiPerfDataEvent] = useAIPerfData({pushLog: pushLog})
    // 执行过程中插件输出的卡片
    const [yakExecResult, yakExecResultEvent] = useYakExecResult({pushLog: pushLog})

    // 设置任务规划的标识ID
    const planCoordinatorId = useRef<string>("")

    // 自由对话相关数据和逻辑
    const [casualChat, casualChatEvent] = useCasualChat({
        getRequest: fetchRequest,
        pushLog,
        onReviewRelease: handleCasualReviewRelease
    })

    // 任务规划相关数据和逻辑
    const [taskChat, taskChatEvent] = useTaskChat({
        getRequest: fetchRequest,
        pushLog,
        onReview: onTaskReview,
        onReviewExtra: onTaskReviewExtra,
        onReviewRelease: handleTaskReviewRelease
    })
    // #endregion

    // #region review事件相关方法
    /** review 界面选项触发事件 */
    const onSend = useMemoizedFn((token: string, type: ChatIPCSendType, params: AIInputEvent) => {
        try {
            if (!execute) {
                yakitNotify("warning", "AI 未执行任务，无法发送选项")
                return
            }
            if (!chatID || chatID.current !== token) {
                yakitNotify("warning", "该选项非本次 AI 执行的回答选项")
                return
            }

            const events: UseCasualChatEvents | UseChatIPCEvents = type === "casual" ? casualChatEvent : taskChatEvent
            events.handleSend(params, () => {
                console.log("send-ai-re-act---\n", token, params)
                ipcRenderer.invoke("send-ai-re-act", token, params)
            })
        } catch (error) {}
    })
    // #endregion

    /** 重置所有数据 */
    const onReset = useMemoizedFn(() => {
        chatID.current = ""
        chatRequest.current = undefined
        setExecute(false)
        setLogs([])
        aiPerfDataEvent.handleResetData()
        yakExecResultEvent.handleResetData()
        planCoordinatorId.current = ""
        casualChatEvent.handleResetData()
        taskChatEvent.handleResetData()
    })

    const onStart = useMemoizedFn((token: string, params: AIInputEvent) => {
        if (execute) {
            yakitNotify("warning", "useChatIPC AI任务正在执行中，请稍后再试！")
            return
        }
        onReset()
        setExecute(true)
        chatID.current = token
        chatRequest.current = cloneDeep(params.Params)
        ipcRenderer.on(`${token}-data`, (e, res: AIOutputEvent) => {
            try {
                let ipcContent = Uint8ArrayToString(res.Content) || ""
                console.log("onStart-res", res, ipcContent)
                if (res.Type === "start_plan_and_execution") {
                    // 触发任务规划，并传出任务规划流的标识 coordinator_id
                    const startInfo = JSON.parse(ipcContent) as AIChatMessage.AIStartPlanAndExecution
                    if (startInfo.coordinator_id && planCoordinatorId.current !== startInfo.coordinator_id) {
                        onTaskStart && onTaskStart(startInfo.coordinator_id)
                        taskChatEvent.handleSetCoordinatorId(startInfo.coordinator_id)
                        planCoordinatorId.current = startInfo.coordinator_id
                    }
                    return
                }

                casualChatEvent.handleSetCoordinatorId(res.CoordinatorId)

                if (UseAIPerfDataTypes.includes(res.Type)) {
                    // AI性能数据处理
                    aiPerfDataEvent.handleSetData(res)
                    return
                }

                if (UseYakExecResultTypes.includes(res.Type)) {
                    // 执行过程中插件输出的卡片
                    yakExecResultEvent.handleSetData(res)
                    return
                }

                if (res.Type === "structured") {
                    const obj = JSON.parse(ipcContent) || ""
                    if (!obj || typeof obj !== "object") return

                    if (obj.level) {
                        // 执行日志信息
                        const data = obj as AIChatMessage.Log
                        pushLog(data)
                    } else {
                        // 特殊情况，新逻辑兼容老 UI 临时开发的代码块
                        if (res.NodeId === "stream-finished") {
                            casualChatEvent.handleSetData(res)
                            taskChatEvent.handleSetData(res)
                            return
                        }

                        if (planCoordinatorId.current === res.CoordinatorId) {
                            taskChatEvent.handleSetData(res)
                        } else {
                            casualChatEvent.handleSetData(res)
                        }
                    }
                    return
                }

                if (UseCasualChatTypes.includes(res.Type)) {
                    // 专属自由对话类型的流数据
                    if (!!planCoordinatorId.current && planCoordinatorId.current === res.CoordinatorId) {
                        handleGrpcDataPushLog({type: "error", info: res, pushLog: pushLog})
                        return
                    }
                    casualChatEvent.handleSetData(res)
                    return
                }

                if (UseTaskChatTypes.includes(res.Type)) {
                    // 专属任务规划类型的流数据
                    if (!planCoordinatorId.current || planCoordinatorId.current !== res.CoordinatorId) {
                        handleGrpcDataPushLog({type: "error", info: res, pushLog: pushLog})
                        return
                    }
                    taskChatEvent.handleSetData(res)
                    return
                }

                // 特殊情况，新逻辑兼容老 UI 临时开发的代码块
                if (res.Type === "stream") {
                    if (planCoordinatorId.current === res.CoordinatorId && !!res.TaskIndex) {
                        taskChatEvent.handleSetData(res)
                    } else {
                        casualChatEvent.handleSetData(res)
                    }
                    return
                }

                if (UseCasualAndTaskTypes.includes(res.Type)) {
                    // 自由对话和任务规划共用的类型
                    if (planCoordinatorId.current === res.CoordinatorId) {
                        taskChatEvent.handleSetData(res)
                    } else {
                        casualChatEvent.handleSetData(res)
                    }
                    return
                }

                console.log("unkown---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)
                setLogs((pre) => pre.concat([{id: uuidv4(), level: "info", message: ipcContent}]))
            } catch (error) {
                handleGrpcDataPushLog({type: "error", info: res, pushLog})
            }
        })
        ipcRenderer.on(`${token}-end`, (e, res: any) => {
            console.log("end", res)
            taskChatEvent.handleCloseGrpc()
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
            yakitNotify("info", "useChatIPC AI 任务已取消")
        }
    })

    useEffect(() => {
        return () => {
            if (getExecute() && chatID.current) {
                onClose(chatID.current)
                onReset()
            }
        }
    }, [])

    return [
        {execute, logs, yakExecResult, aiPerfData, casualChat, taskChat},
        {fetchToken, fetchRequest, onStart, onSend, onClose, onReset}
    ] as const
}

export default useChatIPC
