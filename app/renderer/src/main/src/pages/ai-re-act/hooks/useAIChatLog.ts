import {useRef} from "react"
import {useMemoizedFn} from "ahooks"
import {AIChatLogData, AIChatLogToStream, UseAIChatLogEvents} from "./type"
import {formatTimestamp} from "@/utils/timeUtil"
import cloneDeep from "lodash/cloneDeep"

const {ipcRenderer} = window.require("electron")

function useAIChatLog(): UseAIChatLogEvents

function useAIChatLog() {
    const streamInfo = useRef<Map<string, AIChatLogToStream>>(new Map())

    const pushLog = useMemoizedFn((info: AIChatLogData) => {
        if (info.type === "log") {
            const logInfo = info.data
            const sendData = {
                level: logInfo.level,
                message: logInfo.message,
                timestamp: formatTimestamp(info.Timestamp)
            }
            ipcRenderer.invoke("forward-ai-chat-log-data", sendData)
        }
        if (info.type === "stream") {
            const {EventUUID, content} = info.data
            const stream = streamInfo.current.get(EventUUID)
            if (!!stream) {
                stream.data.content += content
                streamInfo.current.set(EventUUID, cloneDeep(stream))
            } else {
                streamInfo.current.set(EventUUID, cloneDeep(info))
            }
        }
    })

    const sendStreamLog = useMemoizedFn((uuid: string) => {
        const stream = streamInfo.current.get(uuid)
        if (!stream) return
        const sendData = {
            level: stream.data.NodeId,
            message: stream.data.content,
            timestamp: formatTimestamp(stream.Timestamp)
        }
        streamInfo.current.delete(uuid)
        ipcRenderer.invoke("forward-ai-chat-log-data", sendData)
    })

    const clearLogs = useMemoizedFn(() => {
        streamInfo.current.clear()
        // 发送ipc通信通知另一个页面清空展示的所有内容
        ipcRenderer.invoke("clear-ai-chat-log-data")
    })

    const cancelLogsWin = useMemoizedFn(() => {
        clearLogs()
        // ipc 发送关闭页面的通知
        ipcRenderer.send("close-ai-chat-window")
    })

    return {pushLog, sendStreamLog, clearLogs, cancelLogsWin}
}

export default useAIChatLog
