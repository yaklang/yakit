import {useEffect, useRef} from "react"
import {yakitNotify} from "@/utils/notification"
import {useMemoizedFn} from "ahooks"
import {AIOutputEvent, AIStartParams, AITriageInputEvent} from "./type/aiChat"
import {Uint8ArrayToString} from "@/utils/str"
import cloneDeep from "lodash/cloneDeep"
import useGetSetState from "../pluginHub/hooks/useGetSetState"

const {ipcRenderer} = window.require("electron")

export interface AITriageChatContentInfo {
    type: "answer" | "forges" | "finish"
    content: string
}

export interface UseChatTriageParams {
    onChatContent?: (res: AITriageChatContentInfo) => void
}

function useChatTriage(params?: UseChatTriageParams) {
    const {onChatContent} = params || {}

    const chatID = useRef<string>("")
    const fetchToken = useMemoizedFn(() => {
        return chatID.current
    })
    const chatRequest = useRef<AIStartParams>()
    const [execute, setExecute, getExecute] = useGetSetState(false)

    /** 重置所有数据 */
    const handleReset = useMemoizedFn(() => {
        chatID.current = ""
        chatRequest.current = undefined
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

            if (res.Type === "stream") {
                console.log("stream---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)

                const nodeID = res.NodeId
                const timestamp = res.Timestamp

                if (nodeID === "triage_log") {
                    console.log("triage_log---\n", {nodeID, timestamp}, ipcContent)
                    onChatContent && onChatContent({type: "answer", content: ipcContent})
                }

                if (nodeID === "triage_forge_list") {
                    console.log("triage_forge_list---\n", {nodeID, timestamp}, ipcContent)
                    onChatContent && onChatContent({type: "forges", content: ipcContent})
                }

                if (nodeID === "triage_finish") {
                    console.log("triage_finish---\n", {nodeID}, ipcContent)
                    onChatContent && onChatContent({type: "finish", content: ipcContent})
                }

                return
            }

            // console.log("ai-triage---\n", {...res, Content: "", StreamDelta: ""}, ipcContent)
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
            return
        }
        if (!chatID || chatID.current !== token) {
            yakitNotify("warning", "此问题不属于本次triage对话")
            return
        }

        const sendRequest: AITriageInputEvent = {
            IsFreeInput: true,
            FreeInput: content
        }
        console.log("ai-triage-chat-send---\n", token, sendRequest)

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

    return [{execute}, {onStart, onSend, onClose, handleReset, fetchToken}] as const
}

export default useChatTriage
