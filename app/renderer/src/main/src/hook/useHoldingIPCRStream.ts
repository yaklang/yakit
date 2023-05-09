import {useState, useCallback, useRef, useEffect} from "react"
import {
    ExecResultLog,
    ExecResultMessage,
    ExecResultProgress
} from "../pages/invoker/batch/ExecMessageViewer"
import {ExecResult} from "../pages/invoker/schema"
import {StatusCardInfoProps, StatusCardProps} from "../pages/yakitStore/viewers/base"
import {writeExecResultXTerm} from "../utils/xtermUtils"
import {failed, info} from "../utils/notification"
import {useGetState} from "ahooks"
import {Risk} from "@/pages/risks/schema";
import {isEnpriTraceAgent} from "@/utils/envfile"

const {ipcRenderer} = window.require("electron")

export interface InfoState {
    messageState: ExecResultLog[]
    processState: ExecResultProgress[]
    statusState: StatusCardInfoProps[]
    riskState: Risk[]
    featureMessageState: ExecResultLog[]
    featureTypeState: ExecResultLog[]
}

export interface CacheStatusCardProps {
    Id: string
    Data: string
    Timestamp: number
    Tags?: string[]
}

export default function useHoldingIPCRStream(
    taskName: string,
    apiKey: string,
    token: string,
    onEnd?: () => any,
    onListened?: () => any,
    dataFilter?: (obj: ExecResultMessage, content: ExecResultLog) => boolean
) {
    const [infoState, setInfoState] = useState<InfoState>({
        messageState: [],
        processState: [],
        statusState: [],
        riskState: [],
        featureMessageState: [],
        featureTypeState: []
    })
    const [xtermRef, setXtermRef, getXtermRef] = useGetState<any>(null)

    let messages = useRef<ExecResultMessage[]>([])
    let featureMessages = useRef<ExecResultMessage[]>([])
    let featureTypes = useRef<ExecResultMessage[]>([])
    let riskMessages = useRef<Risk[]>([])
    let processKVPair = useRef<Map<string, number>>(new Map<string, number>())
    let statusKVPair = useRef<Map<string, CacheStatusCardProps>>(
        new Map<string, CacheStatusCardProps>()
    )

    useEffect(() => {
        const syncResults = () => {
            let results = messages.current
                .filter((i) => i.type === "log")
                .map((i) => i.content as ExecResultLog)

            let featureResults = featureMessages.current
                .filter((i) => i.type === "log")
                .map((i) => i.content as ExecResultLog).filter((i) => i.data !== 'null')

            let featureTypeResults = featureTypes.current
                .filter((i) => i.type === "log")
                .map((i) => i.content as ExecResultLog)
                .filter((i) => i.data !== 'null')

            let riskResults = riskMessages.current.filter(i => !!i);

            const featureTypeFilter = featureTypeResults.map(item => item.data)
            featureTypeResults = featureTypeResults.filter((item, index) => featureTypeFilter.indexOf(item.data) === index)

            const processes: ExecResultProgress[] = []
            processKVPair.current.forEach((value, id) => {
                processes.push({id: id, progress: value})
            })

            const cacheStatusKVPair: { [x: string]: StatusCardInfoProps } = {}
            const statusCards: StatusCardProps[] = []
            statusKVPair.current.forEach((value) => {
                const item = JSON.parse(JSON.stringify(value))
                item.Tag = item.Tags[0] || ""
                delete item.Tags
                statusCards.push(item)
            })
            statusCards.sort((a, b) => a.Id.localeCompare(b.Id))
            for (let item of statusCards) {
                if (item.Tag) {
                    if (cacheStatusKVPair[item.Tag]) {
                        cacheStatusKVPair[item.Tag].info.push(item)
                    } else {
                        cacheStatusKVPair[item.Tag] = {tag: item.Tag, info: [item]}
                    }
                } else {
                    cacheStatusKVPair[item.Id] = {tag: item.Id, info: [item]}
                }
            }

            if (
                JSON.stringify(infoState) !==
                JSON.stringify({
                    messageState: results,
                    featureMessageState: featureResults,
                    riskState: riskResults,
                    processState: processes.sort((a, b) => a.id.localeCompare(b.id)),
                    statusState: Object.values(cacheStatusKVPair),
                    featureTypeState: featureTypeResults
                })
            ) {
                setInfoState({
                    messageState: results,
                    featureMessageState: featureResults,
                    riskState: riskResults,
                    processState: processes.sort((a, b) => a.id.localeCompare(b.id)),
                    statusState: Object.values(cacheStatusKVPair),
                    featureTypeState: featureTypeResults
                })
            }
        }

        ipcRenderer.on(`${token}-data`, async (e: any, data: ExecResult) => {
            if (data.IsMessage) {
                try {
                    let obj: ExecResultMessage = JSON.parse(
                        Buffer.from(data.Message).toString()
                    )

                    // 处理 Process KVPair
                    if (obj.type === "progress") {
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

                    const logData = obj.content as ExecResultLog

                    // 处理 log feature-status-card-data
                    if (obj.type === "log" && logData.level === "feature-status-card-data") {
                        try {
                            const obj = JSON.parse(logData.data)
                            const {id, data, tags} = obj
                            const {timestamp} = logData
                            const originData = statusKVPair.current.get(id)
                            if (originData && originData.Timestamp > timestamp) {
                                return
                            }
                            statusKVPair.current.set(id, {
                                Id: id,
                                Data: data,
                                Timestamp: timestamp,
                                Tags: Array.isArray(tags) ? tags : []
                            })
                        } catch (e) {
                        }
                        return
                    }

                    if (obj.type === "log" && logData.level === "json-feature") {
                        try {
                            featureTypes.current.unshift(obj)
                        } catch (e) {
                        }
                        return
                    }

                    if (obj.type === "log" && logData.level === "feature-table-data") {
                        try {
                            featureMessages.current.unshift(obj)
                        } catch (e) {
                        }
                        return
                    }

                    if (obj.type === "log" && logData.level === "json-risk") {
                        try {
                            const risk = JSON.parse(logData.data) as Risk
                            riskMessages.current.unshift(risk)
                            if (isEnpriTraceAgent()) riskMessages.current = riskMessages.current.slice(0,10)
                        } catch (e) {
                        }
                    }

                    // 第三方数据过滤方法
                    if (dataFilter) if (dataFilter(obj, logData)) return

                    messages.current.unshift(obj)

                    // 只缓存 100 条结果（日志类型 + 数据类型）
                    if (messages.current.length > 100) {
                        messages.current.pop()
                    }
                } catch (e) {
                }
            }
            writeExecResultXTerm(getXtermRef(), data)
        })
        ipcRenderer.on(`${token}-error`, (e: any, error: any) => {
            failed(`[Mod] ${taskName} error: ${error}`)
        })
        ipcRenderer.on(`${token}-end`, (e: any, data: any) => {
            info(`[Mod] ${taskName} finished`)
            syncResults()
            if (onEnd) {
                onEnd()
            }
        })

        syncResults()
        const time = setInterval(() => syncResults(), 500)

        if (onListened) onListened()

        return () => {
            if (time) clearInterval(time)
            ipcRenderer.invoke(`cancel-${apiKey}`, token)
            ipcRenderer.removeAllListeners(`${token}-data`)
            ipcRenderer.removeAllListeners(`${token}-error`)
            ipcRenderer.removeAllListeners(`${token}-end`)
        }
    }, [])

    const reset = () => {
        messages.current = []
        featureMessages.current = []
        featureTypes.current = []
        processKVPair.current = new Map<string, number>()
        statusKVPair.current = new Map<string, CacheStatusCardProps>()
        setInfoState({
            messageState: [],
            processState: [],
            statusState: [],
            riskState: [],
            featureMessageState: [],
            featureTypeState: []
        })
    }

    const resetAll = () => {
        messages.current = []
        featureMessages.current = []
        featureTypes.current = []
        processKVPair.current = new Map<string, number>()
        statusKVPair.current = new Map<string, CacheStatusCardProps>()
        riskMessages.current = []
        setInfoState({
            messageState: [],
            processState: [],
            statusState: [],
            riskState: [],
            featureMessageState: [],
            featureTypeState: []
        })
    }

    return [infoState, {reset, setXtermRef,resetAll}, xtermRef] as const
}
