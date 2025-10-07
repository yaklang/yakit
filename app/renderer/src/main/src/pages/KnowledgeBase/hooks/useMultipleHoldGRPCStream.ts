import {useEffect, useRef, useState} from "react"
import {HoldGRPCStreamInfo, HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {DefaultTabs} from "@/hook/useHoldGRPCStream/constant"
interface HoldGRPCStreamParams {
    /** 执行结果展示的常驻 tab 页合集 */
    tabs?: HoldGRPCStreamProps.InfoTab[]
    /** 任务名称（用于日志/通知） */
    taskName: string
    /** 后端 API key（用于 cancel-<apiKey> 调用） */
    apiKey: string
    /** 数据流 token（用于 ipc channel 名称） */
    token: string
    /** 数据流聚合间隔（ms，默认 500） */
    waitTime?: number
    /** 数据流结束的回调（结束时会传入最终的 HoldGRPCStreamInfo） */
    onEnd?: (streamInfo?: HoldGRPCStreamInfo & {runtimeId?: string; loading?: boolean}) => any
    /** 数据流发生错误的回调 */
    onError?: (e: any) => void
    /** 额外的数据过滤方法：返回 true 表示过滤（丢弃）该条消息 */
    dataFilter?: (obj: StreamResult.Message, content: StreamResult.Log) => boolean
    /** 设置 run-time-id 的回调（收到 runtime id 时调用） */
    setRuntimeId?: (runtimeId: string) => any
    /** 是否显示 error 通知（默认 true） */
    isShowError?: boolean
    /** 是否显示 end 通知（默认 true） */
    isShowEnd?: boolean
    /** 是否限制缓存的日志条数（默认 true，最多 100 条） */
    isLimitLogs?: boolean
}

const {ipcRenderer} = window.require("electron")

/** 与原 hook 相同的工具：将缓冲区 Map 转为卡片集合 */
const convertCardInfo = (maps: Map<string, HoldGRPCStreamProps.CacheCard>) => {
    const cardArr: HoldGRPCStreamProps.InfoCard[] = []
    maps.forEach((value) => {
        let item: HoldGRPCStreamProps.InfoCard = {
            Id: value.Id,
            Data: value.Data,
            Timestamp: value.Timestamp,
            Tag: value?.Tags ? value.Tags[0] || "" : ""
        }
        cardArr.push(item)
    })
    cardArr.sort((a, b) => a.Id.localeCompare(b.Id))
    let cardObj: {[key: string]: HoldGRPCStreamProps.InfoCards} = {}
    for (let el of cardArr) {
        if (el.Tag) {
            if (cardObj[el.Tag]) {
                cardObj[el.Tag].info.push(el)
            } else {
                cardObj[el.Tag] = {tag: el.Tag, info: [el]}
            }
        } else {
            cardObj[el.Id] = {tag: el.Id, info: [el]}
        }
    }
    return Object.values(cardObj)
}

/** 与原 hook 相同的工具：校验 stream 数据 */
const checkStreamValidity = (stream: StreamResult.Log) => {
    try {
        const check = JSON.parse(stream.data)
        if (check === "null" || !check || check === "undefined") return false
        return check
    } catch (e) {
        return false
    }
}

/** per-stream internal store */
export type InternalStreamStore = {
    params: HoldGRPCStreamParams
    // mutable pieces
    timeRef: any
    runTimeId: {cache: string; sent: string}
    progressKVPair: Map<string, number>
    cardKVPair: Map<string, HoldGRPCStreamProps.CacheCard>
    topTabs: HoldGRPCStreamProps.InfoTab[]
    endTabs: HoldGRPCStreamProps.InfoTab[]
    tabWebsite?: StreamResult.WebSite
    tabTable: Map<string, HoldGRPCStreamProps.CacheTable>
    tabsText: Map<string, string>
    riskMessages: StreamResult.Risk[]
    messages: StreamResult.Message[]
    ruleData: StreamResult.RuleData[]
    // current aggregated info (cached to push to react state)
    info: HoldGRPCStreamInfo & {runtimeId?: string; loading?: boolean}
}

/**
 * useMultipleHoldGRPCStream
 * 管理多个 token 流。返回：
 * - streams: Record<token, HoldGRPCStreamInfo & { runtimeId?: string; loading?: boolean }>
 * - api: { createStream, removeStream, start, stop, cancel, reset, getInfo, tokens }
 *
 * 注意：tokens 为一个数组（实时由 hook 更新），不需要调用。
 */
export default function useMultipleHoldGRPCStream() {
    const [streams, setStreams] = useState<
        Record<string, HoldGRPCStreamInfo & {runtimeId?: string; loading?: boolean}>
    >({})

    // 所有 token 的数组（用户要求直接返回数组，而不是函数）
    const [tokens, setTokens] = useState<string[]>([])

    const storesRef = useRef<Map<string, InternalStreamStore>>(new Map())

    // helper to sync tokens state
    const syncTokens = () => {
        setTokens(Array.from(storesRef.current.keys()))
    }

    // helper to push aggregated data to react state
    const pushState = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return
        setStreams((prev) => {
            const next = {
                ...prev,
                [token]: {
                    ...store.info,
                    runtimeId: store.runTimeId.cache || store.info.runtimeId || "",
                    loading: !!store.info.loading
                } as HoldGRPCStreamInfo & {runtimeId?: string; loading?: boolean}
            }
            return next
        })
    }

    // create internal handleResults for a particular token
    const handleResultsFor = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return

        // runtime-id
        if (store.runTimeId.sent !== store.runTimeId.cache && store.params.setRuntimeId) {
            store.params.setRuntimeId(store.runTimeId.cache)
            store.runTimeId.sent = store.runTimeId.cache
        }
        // progress
        const cacheProgress: StreamResult.Progress[] = []
        store.progressKVPair.forEach((value, id) => {
            cacheProgress.push({id: id, progress: value})
        })
        // card
        const cacheCard: HoldGRPCStreamProps.InfoCards[] = convertCardInfo(store.cardKVPair)
        // tabs
        const tabs: HoldGRPCStreamProps.InfoTab[] = store.topTabs.concat(DefaultTabs()).concat(store.endTabs)
        // tabsInfo
        const tabsInfo: HoldGRPCStreamInfo["tabsInfoState"] = {}
        if (store.tabWebsite) {
            tabsInfo["website"] = store.tabWebsite
        }
        if (store.tabTable.size > 0) {
            store.tabTable.forEach((value, key) => {
                const arr: HoldGRPCStreamProps.InfoTable["data"] = []
                value.data.forEach((item) => arr.push(item))
                tabsInfo[key] = {
                    name: value.name,
                    columns: value.columns,
                    data: arr
                } as HoldGRPCStreamProps.InfoTable
            })
        }
        if (store.tabsText.size > 0) {
            store.tabsText.forEach((value, key) => {
                tabsInfo[key] = {
                    content: value
                } as HoldGRPCStreamProps.InfoText
            })
        }
        // risk
        const risks: StreamResult.Risk[] = [...store.riskMessages]
        // logs
        const logs: StreamResult.Log[] = store.messages
            .filter((i) => i.type === "log")
            .map((i) => i.content as StreamResult.Log)
            .filter((i) => i.data !== "null")

        // rules
        const rules: StreamResult.RuleData[] = [...store.ruleData]

        store.info = {
            progressState: cacheProgress,
            cardState: cacheCard,
            tabsState: tabs,
            tabsInfoState: tabsInfo,
            riskState: risks,
            logState: logs,
            rulesState: rules,
            runtimeId: store.info.runtimeId || store.runTimeId.cache || "",
            loading: !!store.info.loading
        }
        pushState(token)
    }

    // internal: create listeners for a token
    const attachListeners = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return

        const params = store.params

        const dataHandler = async (e: any, data: StreamResult.BaseProsp) => {
            if (!!data?.RuntimeID) {
                store.runTimeId.cache = data.RuntimeID
                store.info.runtimeId = data.RuntimeID
                // when runtime id arrives, still consider stream loading
                store.info.loading = true
                pushState(token)
            }
            if (data.RuleData && data.ExtractedContent !== undefined) {
                store.ruleData.push({...data.RuleData, ExtractedContent: data.ExtractedContent})
            }

            const isMessage = data.IsMessage || data.ExecResult?.IsMessage
            if (isMessage) {
                try {
                    const messageArr = data.Message || data.ExecResult?.Message
                    let obj: StreamResult.Message = JSON.parse(Buffer.from(messageArr).toString())

                    if (obj.type === "progress") {
                        const processData = obj.content as StreamResult.Progress
                        if (processData && processData.id) {
                            store.progressKVPair.set(
                                processData.id,
                                Math.max(store.progressKVPair.get(processData.id) || 0, processData.progress)
                            )
                        }
                        return
                    }

                    const logData = obj.content as StreamResult.Log

                    if (obj.type === "log" && logData.level === "feature-status-card-data") {
                        try {
                            const checkInfo = checkStreamValidity(logData)
                            if (!checkInfo) return
                            const cobj: StreamResult.Card = checkInfo
                            const {id, data, tags} = cobj
                            const {timestamp} = logData
                            const originData = store.cardKVPair.get(id)
                            if (originData && originData.Timestamp > timestamp) {
                                return
                            }
                            store.cardKVPair.set(id, {
                                Id: id,
                                Data: data,
                                Timestamp: timestamp,
                                Tags: Array.isArray(tags) ? tags : []
                            })
                        } catch (e) {}
                        return
                    }

                    if (obj.type === "log" && logData.level === "json-feature") {
                        try {
                            const checkInfo = checkStreamValidity(logData)
                            if (!checkInfo) return
                            const info: {feature: string; params: any; [key: string]: any} = checkInfo

                            let tabInfo: HoldGRPCStreamProps.InfoTab = {tabName: "", type: ""}
                            switch (info.feature) {
                                case "website-trees":
                                    store.tabWebsite = info.params as StreamResult.WebSite
                                    break
                                case "fixed-table":
                                    const table = info.params as StreamResult.Table
                                    tabInfo = {tabName: table.table_name, type: "table"}
                                    // place at head if requested
                                    if (!!info.at_head) store.topTabs.unshift(tabInfo)
                                    else store.endTabs.push(tabInfo)

                                    if (store.tabTable.get(table.table_name)) {
                                        store.messages.unshift(obj)
                                        break
                                    }
                                    store.tabTable.set(table.table_name, {
                                        name: table.table_name,
                                        columns: table.columns.map((item) => ({title: item, dataKey: item})),
                                        data: new Map<string, any[]>()
                                    } as HoldGRPCStreamProps.CacheTable)
                                    break
                                case "text":
                                    const text = info.params as StreamResult.Text
                                    tabInfo = {tabName: text.tab_name, type: "text"}
                                    if (!!info.at_head) store.topTabs.unshift(tabInfo)
                                    else store.endTabs.push(tabInfo)

                                    if (store.tabsText.get(text.tab_name)) {
                                        store.messages.unshift(obj)
                                        break
                                    }
                                    store.tabsText.set(text.tab_name, "")
                                    break
                                default:
                                    store.messages.unshift(obj)
                                    break
                            }
                        } catch (e) {}
                        return
                    }

                    if (obj.type === "log" && logData.level === "feature-table-data") {
                        try {
                            const checkInfo = checkStreamValidity(logData)
                            if (!checkInfo) return
                            const tableOpt: StreamResult.TableDataOpt = checkInfo
                            const originTable = store.tabTable.get(tableOpt.table_name)
                            if (!originTable) {
                                store.messages.unshift(obj)
                                return
                            }
                            if (!tableOpt.data.uuid) {
                                store.messages.unshift(obj)
                                return
                            }
                            const datas = originTable?.data || (new Map() as HoldGRPCStreamProps.CacheTable["data"])
                            datas.set(tableOpt.data.uuid, tableOpt.data)
                            store.tabTable.set(tableOpt.table_name, {
                                name: originTable.name,
                                columns: originTable.columns,
                                data: datas
                            })
                        } catch (e) {}
                        return
                    }

                    if (obj.type === "log" && logData.level === "feature-text-data") {
                        try {
                            const checkInfo = checkStreamValidity(logData)
                            if (!checkInfo) return
                            const textData: StreamResult.TextData = checkInfo
                            const content = store.tabsText.get(textData.table_name)
                            if (content === undefined) {
                                store.messages.unshift(obj)
                                return
                            }
                            if (content === textData.data) return
                            store.tabsText.set(textData.table_name, textData.data)
                        } catch (e) {}
                        return
                    }

                    if (obj.type === "log" && logData.level === "json-risk") {
                        try {
                            const checkInfo = checkStreamValidity(logData)
                            if (!checkInfo) return
                            const risk: StreamResult.Risk = checkInfo
                            store.riskMessages.unshift(risk)
                        } catch (e) {}
                        return
                    }

                    if (params.dataFilter && params.dataFilter(obj, logData)) return
                    store.messages.unshift(obj)
                    // limit logs if necessary (same behaviour as single hook)
                    if (params.isLimitLogs !== false && store.messages.length > 100) {
                        store.messages.pop()
                    }
                } catch (e) {}
            }
        }

        const errorHandler = (e: any, error: any) => {
            // mark not loading on error
            store.info.loading = false
            pushState(token)
            if (params.onError) params.onError(error)
        }

        const endHandler = (e: any, data: any) => {
            // if (params.isShowEnd !== false) yakitInfo(`[Mod] ${params.taskName} finished`)
            store.info.loading = false
            handleResultsFor(token)
            pushState(token)
            if (params.onEnd) params.onEnd(store.info)
        }

        ipcRenderer.on(`${token}-data`, dataHandler)
        ipcRenderer.on(`${token}-error`, errorHandler)
        ipcRenderer.on(`${token}-end`, endHandler)

        // save handlers for later removal by storing on the store object
        ;(store as any)._handlers = {dataHandler, errorHandler, endHandler}
    }

    // detach listeners for token
    const detachListeners = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return
        const h = (store as any)._handlers
        if (h) {
            ipcRenderer.removeListener(`${token}-data`, h.dataHandler)
            ipcRenderer.removeListener(`${token}-error`, h.errorHandler)
            ipcRenderer.removeListener(`${token}-end`, h.endHandler)
            delete (store as any)._handlers
        }
    }

    // public API
    const createStream = (token: string, params: HoldGRPCStreamParams) => {
        if (storesRef.current.has(token)) return
        const store: InternalStreamStore = {
            params,
            timeRef: null,
            runTimeId: {cache: "", sent: ""},
            progressKVPair: new Map<string, number>(),
            cardKVPair: new Map<string, HoldGRPCStreamProps.CacheCard>(),
            topTabs: [],
            endTabs: [],
            tabWebsite: undefined,
            tabTable: new Map<string, HoldGRPCStreamProps.CacheTable>(),
            tabsText: new Map<string, string>(),
            riskMessages: [],
            messages: [],
            ruleData: [],
            info: {
                progressState: [],
                cardState: [],
                tabsState: [],
                tabsInfoState: {},
                riskState: [],
                logState: [],
                rulesState: [],
                runtimeId: "",
                loading: true
            }
        }
        storesRef.current.set(token, store)
        attachListeners(token)
        // start periodic aggregator if waitTime > 0
        const wt = params.waitTime ?? 500
        if (wt > 0) {
            if (store.timeRef) clearInterval(store.timeRef)
            store.timeRef = setInterval(() => handleResultsFor(token), wt)
        }
        // ensure initial state entry
        setStreams((prev) => ({...prev, [token]: {...store.info}}))
        // sync tokens list
        syncTokens()
    }

    const removeStream = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return
        // stop interval
        if (store.timeRef) clearInterval(store.timeRef)
        // attempt cancel
        try {
            ipcRenderer.invoke(`cancel-${store.params.apiKey}`, token)
        } catch (e) {}
        detachListeners(token)
        storesRef.current.delete(token)
        setStreams((prev) => {
            const next = {...prev}
            delete next[token]
            return next
        })
        // sync tokens list
        syncTokens()
    }

    const start = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return
        const wt = store.params.waitTime ?? 500
        if (store.timeRef) clearInterval(store.timeRef)
        store.timeRef = setInterval(() => handleResultsFor(token), wt)
        // when starting, consider loading true
        store.info.loading = true
        pushState(token)
    }

    const stop = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return
        if (store.timeRef) {
            clearInterval(store.timeRef)
            store.timeRef = null
        }
        // stopping aggregator doesn't mean stream ended; keep loading state unchanged
    }

    const cancel = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return
        try {
            ipcRenderer.invoke(`cancel-${store.params.apiKey}`, token)
        } catch (e) {}
    }

    const reset = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return
        store.runTimeId = {cache: "", sent: ""}
        store.progressKVPair = new Map<string, number>()
        store.cardKVPair = new Map<string, HoldGRPCStreamProps.CacheCard>()
        store.topTabs = []
        store.endTabs = []
        store.tabWebsite = undefined
        store.tabTable = new Map<string, HoldGRPCStreamProps.CacheTable>()
        store.tabsText = new Map<string, string>()
        store.riskMessages = []
        store.messages = []
        store.ruleData = []
        store.info = {
            progressState: [],
            cardState: [],
            tabsState: [],
            tabsInfoState: {},
            riskState: [],
            logState: [],
            rulesState: [],
            runtimeId: "",
            loading: true
        }
        pushState(token)
    }

    const getInfo = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return undefined
        return {...store.info, runtimeId: store.runTimeId.cache || store.info.runtimeId, loading: !!store.info.loading}
    }

    useEffect(() => {
        return () => {
            // cleanup all on unmount
            storesRef.current.forEach((store, token) => {
                if (store.timeRef) clearInterval(store.timeRef)
                try {
                    ipcRenderer.invoke(`cancel-${store.params.apiKey}`, token)
                } catch (e) {}
                const h = (store as any)._handlers
                if (h) {
                    ipcRenderer.removeListener(`${token}-data`, h.dataHandler)
                    ipcRenderer.removeListener(`${token}-error`, h.errorHandler)
                    ipcRenderer.removeListener(`${token}-end`, h.endHandler)
                }
            })
            storesRef.current.clear()
            setStreams({})
            setTokens([])
        }
    }, [])

    return [
        streams,
        {
            createStream,
            removeStream,
            start,
            stop,
            cancel,
            reset,
            getInfo,
            // 直接返回数组，不需要调用
            tokens
        } as const
    ] as const
}
