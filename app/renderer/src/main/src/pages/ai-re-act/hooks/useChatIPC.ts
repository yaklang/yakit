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
import {UseTaskChatTypes} from "./useTaskChat"
import {handleGrpcDataPushLog} from "./utils"
import {UseChatIPCEvents, UseChatIPCParams, UseChatIPCState} from "./type"

const {ipcRenderer} = window.require("electron")

/** 任务规划和自由对话共用的类型 */
const UseCasualAndTaskTypes = [
    "tool_use_review_require",
    "require_user_interactive",
    "review_release",
    "stream",
    "tool_call_start",
    "tool_call_user_cancel",
    "tool_call_done",
    "tool_call_error",
    "tool_call_watcher",
    "tool_call_summary"
]

function useChatIPC(params?: UseChatIPCParams): [UseChatIPCState, UseChatIPCEvents]

function useChatIPC(params?: UseChatIPCParams) {
    const {onReviewRelease, onEnd} = params || {}

    const handleCasualReviewRelease = useMemoizedFn((id: string) => {
        onReviewRelease && onReviewRelease("casual", id)
    })
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
    const [card, cardEvent] = useExecCard({pushLog: pushLog})

    // 设置任务规划的标识ID
    const planCoordinatorId = useRef<string>("")

    // 自由对话相关数据和逻辑
    const [casualChat, casualChatEvent] = useCasualChat({
        getRequest: fetchRequest,
        pushLog,
        onReviewRelease: handleCasualReviewRelease
    })

    // #endregion

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
    const onReset = useMemoizedFn(() => {
        chatID.current = ""
        chatRequest.current = undefined
        setExecute(false)
        setLogs([])
        aiPerfDataEvent.handleResetData()
        cardEvent.handleResetData()
        planCoordinatorId.current = ""
        casualChatEvent.handleResetData()
    })

    const onStart = useMemoizedFn((token: string, params: AIInputEvent) => {
        if (execute) {
            yakitNotify("warning", "AI任务正在执行中，请稍后再试！")
            return
        }
        onReset()
        setExecute(true)
        chatID.current = token
        chatRequest.current = cloneDeep(params.Params)
        ipcRenderer.on(`${token}-data`, (e, res: AIOutputEvent) => {
            console.log("onStart-res", res)
            try {
                let ipcContent = Uint8ArrayToString(res.Content) || ""

                if (res.Type === "start_plan_and_execution") {
                    // 触发任务规划，并传出任务规划流的标识 coordinator_id
                    const startInfo = JSON.parse(ipcContent) as AIChatMessage.AIStartPlanAndExecution
                    if (planCoordinatorId.current !== startInfo.coordinator_id) {
                    }
                    return
                }

                casualChatEvent.handleSetCoordinatorId(res.CoordinatorId)

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

                if (res.Type === "structured") {
                    const obj = JSON.parse(ipcContent) || ""
                    if (!obj || typeof obj !== "object") return

                    if (obj.level) {
                        // 执行日志信息
                        const data = obj as AIChatMessage.Log
                        setLogs((pre) => pre.concat([{...data, id: uuidv4()}]))
                    } else {
                        if (planCoordinatorId.current === res.CoordinatorId) {
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
                    // taskChatEvent.handleSetData(res)
                    return
                }

                if (UseCasualAndTaskTypes.includes(res.Type)) {
                    // 自由对话和任务规划共用的类型
                    if (planCoordinatorId.current === res.CoordinatorId) {
                    } else {
                        casualChatEvent.handleSetData(res)
                    }
                    return
                }

                console.log("unkown---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)
                setLogs((pre) => pre.concat([{id: uuidv4(), level: "info", message: `task_execute : ${ipcContent}`}]))
            } catch (error) {
                handleGrpcDataPushLog({type: "error", info: res, pushLog})
            }
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
                onReset()
            }
        }
    }, [])

    return [
        {execute, logs, card, aiPerfData, casualChat},
        {fetchToken, fetchRequest, onStart, onSend, onClose, onReset}
    ] as const
}

export default useChatIPC
