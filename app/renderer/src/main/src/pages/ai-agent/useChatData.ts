import {useEffect, useRef, useState} from "react"
import {yakitNotify} from "@/utils/notification"
import {useMemoizedFn} from "ahooks"
import {AIChatTask, AIInputEvent, AIOutputEvent} from "./type/aiChat"
import {Uint8ArrayToString} from "@/utils/str"

const {ipcRenderer} = window.require("electron")

function useChatData() {
    const chatID = useRef<string>("")
    const isExecute = useRef(false)

    const [systemStream, setSystemStream] = useState<string[]>([])
    const [reasonStream, setReasonStream] = useState<string[]>([])
    const [stream, setStream] = useState<string[]>([])

    const [tasks, setTasks] = useState<AIChatTask[]>([])
    const [logs, setLogs] = useState<string[]>([])

    const onStart = useMemoizedFn((token: string, params: AIInputEvent) => {
        let content = ""
        chatID.current = token
        ipcRenderer.on(`${token}-data`, (e, res: AIOutputEvent) => {
            if (res.Type === "structured") {
            }
            if (res.Type === "stream") {
                content += Uint8ArrayToString(res.Content) || ""
                content += Uint8ArrayToString(res.StreamDelta) || ""
            }
            if (res.Type !== "stream") {
                console.log(
                    "data---\n",
                    // `${}`,
                    `${res.Type}\n`,
                    `Content: ${Uint8ArrayToString(res.Content)}\n`,
                    `StreamDelta: ${Uint8ArrayToString(res.StreamDelta)}\n`
                )
            }
        })
        ipcRenderer.on(`${token}-end`, (e, res: any) => {
            console.log("end", res)
        })
        ipcRenderer.on(`${token}-error`, (e, err: any) => {
            console.log("error", err)
        })
        ipcRenderer.invoke("start-ai-agent-chat", token, params)
    })

    const onClose = useMemoizedFn((token: string) => {
        ipcRenderer.invoke("cancel-ai-agent-chat", token).catch(() => {})
    })

    const onRemove = useMemoizedFn((token: string) => {
        // setStrs([])
        ipcRenderer.removeAllListeners(`${token}-data`)
        ipcRenderer.removeAllListeners(`${token}-end`)
        ipcRenderer.removeAllListeners(`${token}-error`)
        onClose(token)
    })

    useEffect(() => {
        return () => {
            onRemove(chatID.current)
        }
    }, [])

    return [[], {onStart, onClose, onRemove}] as const
}

export default useChatData
