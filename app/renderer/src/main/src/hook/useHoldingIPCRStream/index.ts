import { useState, useCallback, useRef } from "react"
import {
    ExecResultLog,
    ExecResultMessage,
    ExecResultProgress
} from "../../pages/invoker/batch/ExecMessageViewer"
import { ExecResult } from "../../pages/invoker/schema"
import { StatusCardProps } from "../../pages/yakitStore/viewers/base"
import { writeExecResultXTerm } from "../../utils/xtermUtils"
import { failed, info } from "../../utils/notification"
import { useGetState } from "ahooks"

const { ipcRenderer } = window.require("electron")

interface InfoState {
    messageSate: ExecResultLog[]
    processState: ExecResultProgress[]
    statusState: StatusCardProps[]
}

export default function useHoldingIPCRStream(
    taskName: string,
    apiKey: string,
    token: string,
    onEnd?: () => any,
    onListened?: () => any
) {
    const [infoState, setInfoState] = useState<InfoState>({
        messageSate: [],
        processState: [],
        statusState: []
    })
    const [xtermRef, setXtermRef, getXtermRef] = useGetState<any>(null)

    let messages = useRef<ExecResultMessage[]>([])
    let processKVPair = useRef<Map<string, number>>(new Map<string, number>())
    let statusKVPair = useRef<Map<string, StatusCardProps>>(new Map<string, StatusCardProps>())

    const syncResults = useCallback(() => {
        let results = messages.current
            .filter((i) => i.type === "log")
            .map((i) => i.content as ExecResultLog)

        const processes: ExecResultProgress[] = []
        processKVPair.current.forEach((value, id) => {
            processes.push({ id: id, progress: value })
        })

        const statusCards: StatusCardProps[] = []
        statusKVPair.current.forEach((value) => {
            statusCards.push(value)
        })

        setInfoState({
            messageSate: results,
            processState: processes.sort((a, b) => a.id.localeCompare(b.id)),
            statusState: statusCards.sort((a, b) => a.Id.localeCompare(b.Id))
        })
    }, [])
    // 定时器变量
    var time: any = null

    const start = useCallback(() => {
        ipcRenderer.on(`${token}-data`, async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let obj: ExecResultMessage = JSON.parse(
                        Buffer.from(data.Message).toString("utf8")
                    )

                    // 处理 Process KVPair
                    if (obj.type === "process") {
                        const processData = obj.content as ExecResultProgress
                        if (processData && processData.id) {
                            processKVPair.current.set(
                                processData.id,
                                Math.max(
                                    processKVPair.current.get(processData.id) || 0,
                                    processData.progress
                                )
                            )
                        }
                        return
                    }

                    // 处理 log feature-status-card-data
                    const logData = obj.content as ExecResultLog
                    if (obj.type === "log" && logData.level === "feature-status-card-data") {
                        try {
                            const obj = JSON.parse(logData.data)
                            const { id, data } = obj
                            const { timestamp } = logData
                            const originData = statusKVPair.current.get(id)
                            if (originData && originData.Timestamp > timestamp) {
                                return
                            }
                            statusKVPair.current.set(id, {
                                Id: id,
                                Data: data,
                                Timestamp: timestamp
                            })
                        } catch (e) {}
                        return
                    }
                    messages.current.unshift(obj)

                    // 只缓存 100 条结果（日志类型 + 数据类型）
                    if (messages.current.length > 100) {
                        messages.current.pop()
                    }
                } catch (e) {}
            }
            writeExecResultXTerm(getXtermRef(), data)
        })
        ipcRenderer.on(`${token}-error`, (e, error) => {
            failed(`[Mod] ${taskName} error: ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e, data) => {
            info(`[Mod] ${taskName} finished`)
            syncResults()
            if (onEnd) {
                onEnd()
            }
            remove()
        })

        syncResults()
        time = setInterval(() => syncResults(), 500)

        if (onListened) onListened()
    }, [])

    const remove = () => {
        if (time) clearInterval(time)
        ipcRenderer.invoke(`cancel-${apiKey}`, token)
        ipcRenderer.removeAllListeners(`${token}-data`)
        ipcRenderer.removeAllListeners(`${token}-error`)
        ipcRenderer.removeAllListeners(`${token}-end`)
    }

    const reset = () => {
        messages.current = []
        processKVPair.current = new Map<string, number>()
        statusKVPair.current = new Map<string, StatusCardProps>()
        setInfoState({ messageSate: [], processState: [], statusState: [] })
    }

    return [infoState, { start, reset, setXtermRef }, xtermRef] as const
}
