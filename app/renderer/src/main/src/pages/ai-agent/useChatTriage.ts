import {useEffect, useRef} from "react"
import {yakitNotify} from "@/utils/notification"
import {useMemoizedFn} from "ahooks"
import {AIChatMessage, AIOutputEvent, AIStartParams, AITriageInputEvent} from "./type/aiChat"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import useGetSetState from "../pluginHub/hooks/useGetSetState"

const {ipcRenderer} = window.require("electron")

export interface UseChatTriageParams {}

function useChatTriage(params?: UseChatTriageParams) {
    const {} = params || {}

    const chatID = useRef<string>("")
    const fetchToken = useMemoizedFn(() => {
        return chatID.current
    })
    const chatRequest = useRef<AIStartParams>()
    const [execute, setExecute, getExecute] = useGetSetState(false)

    // ai-triage 建议的 froge 列表
    const [aiTriageForges, setAITriageForges] = useGetSetState<string[]>([])

    /** 重置所有数据 */
    const handleReset = useMemoizedFn(() => {
        chatID.current = ""
        chatRequest.current = undefined
        setAITriageForges([])
        setExecute(false)
    })

    const onStart = useMemoizedFn((token: string, params: AITriageInputEvent) => {
        if (execute) {
            yakitNotify("warning", "AI-Triage正在监听中...")
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

            if (res.Type === "require_user_interactive") {
                try {
                    if (!res.IsJson) return
                    const data = JSON.parse(ipcContent) as AIChatMessage.AIReviewRequire
                    const ops = data?.options || []
                    if (ops.length > 0) {
                        setAITriageForges(ops.map((item) => item?.prompt_title || "").filter(Boolean))
                    } else {
                        setAITriageForges([])
                    }
                    return
                } catch (error) {}
                return
            }

            console.log("ai-triage---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)
        })
        ipcRenderer.on(`${token}-end`, (e, res: any) => {
            console.log("end", res)
            setExecute(false)
            onClose(token)
        })
        ipcRenderer.on(`${token}-error`, (e, err: any) => {
            console.log("error", err)
            yakitNotify("error", `AI-Triage失败: ${err}`)
        })
        console.log("start-ai-triage", token, params)
        ipcRenderer.invoke("start-ai-triage", token, params)
    })

    /** review 界面选项触发事件 */
    const onSend = useMemoizedFn((token: string, content: string) => {
        if (!execute) {
            yakitNotify("warning", "AI 未执行任务，无法发送选项")
            return
        }
        if (!chatID || chatID.current !== token) {
            yakitNotify("warning", "该选项非本次 AI 执行的回答选项")
            return
        }

        console.log("send-ai---\n", token, content)

        const sendRequest: AITriageInputEvent = {
            IsFreeInput: true,
            FreeInput: content
        }

        ipcRenderer.invoke("send-ai-triage", token, sendRequest)
    })

    const onClose = useMemoizedFn((token: string) => {
        ipcRenderer.invoke("cancel-ai-triage", token).catch(() => {})
        yakitNotify("info", "AI-Triage 已取消")
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
        {execute, aiTriageForges},
        {onStart, onSend, onClose, handleReset, fetchToken}
    ] as const
}

export default useChatTriage
