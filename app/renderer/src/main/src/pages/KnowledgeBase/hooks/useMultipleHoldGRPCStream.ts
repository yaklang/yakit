import {useEffect, useRef, useState} from "react"
import {HoldGRPCStreamInfo, HoldGRPCStreamProps, StreamResult} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {DefaultTabs} from "@/hook/useHoldGRPCStream/constant"
import {yakitFailed, info} from "@/utils/notification"

const {ipcRenderer} = window.require("electron")

// Map 转卡片集合
const convertCardInfo = (maps: Map<string, HoldGRPCStreamProps.CacheCard>) => {
    const cardArr: HoldGRPCStreamProps.InfoCard[] = []
    maps.forEach((value) =>
        cardArr.push({
            Id: value.Id,
            Data: value.Data,
            Timestamp: value.Timestamp,
            Tag: value?.Tags ? value.Tags[0] || "" : ""
        })
    )
    cardArr.sort((a, b) => a.Id.localeCompare(b.Id))
    const cardObj: Record<string, HoldGRPCStreamProps.InfoCards> = {}
    for (const el of cardArr) {
        if (el.Tag) {
            cardObj[el.Tag] = cardObj[el.Tag] || {tag: el.Tag, info: []}
            cardObj[el.Tag].info.push(el)
        } else cardObj[el.Id] = {tag: el.Id, info: [el]}
    }
    return Object.values(cardObj)
}

const checkStreamValidity = (stream: StreamResult.Log) => {
    try {
        const parsed = JSON.parse(stream.data)
        return parsed && parsed !== "null" && parsed !== "undefined" ? parsed : false
    } catch {
        return false
    }
}

export interface HoldGRPCStreamParams {
    taskName: string
    apiKey: string
    token: string
    waitTime?: number
    onEnd?: (
        streamInfo?: HoldGRPCStreamInfo & {
            runtimeId?: string
            loading?: boolean
            requestToken?: string
        }
    ) => any
    onError?: (e: any & {requestToken?: string}) => void
    dataFilter?: (obj: StreamResult.Message, content: StreamResult.Log) => boolean
    setRuntimeId?: (runtimeId: string) => any
}

type InternalStreamStore = {
    params: HoldGRPCStreamParams
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
    info: HoldGRPCStreamInfo
}

/** 并发流 Hook - 可立即停止干净版 */
export default function useMultipleHoldGRPCStream() {
    const canceledTokens = useRef<Set<string>>(new Set())
    const [tokens, setTokens] = useState<string[]>([])
    const [streams, setStreams] = useState<
        Record<string, HoldGRPCStreamInfo & {runtimeId?: string; loading?: boolean}>
    >({})
    const storesRef = useRef<Map<string, InternalStreamStore>>(new Map())

    const syncTokens = () => setTokens([...storesRef.current.keys()])

    const setStreamEntry = (token: string, info: HoldGRPCStreamInfo, runtimeId?: string, loading?: boolean) => {
        setStreams((prev) => ({
            ...prev,
            [token]: {...info, ...(runtimeId ? {runtimeId} : {}), ...(typeof loading === "boolean" ? {loading} : {})}
        }))
    }

    const removeStreamEntry = (token: string) =>
        setStreams((prev) => {
            const copy = {...prev}
            delete copy[token]
            return copy
        })

    /** 聚合数据 */
    const handleResultsFor = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return
        const {runTimeId, params} = store

        if (runTimeId.sent !== runTimeId.cache && params.setRuntimeId) {
            params.setRuntimeId(runTimeId.cache)
            runTimeId.sent = runTimeId.cache
        }

        const cacheProgress: StreamResult.Progress[] = []
        store.progressKVPair.forEach((v, id) => cacheProgress.push({id, progress: v}))
        const cacheCard = convertCardInfo(store.cardKVPair)
        const tabs = [...store.topTabs, ...DefaultTabs(), ...store.endTabs]
        const tabsInfo: HoldGRPCStreamInfo["tabsInfoState"] = {}

        if (store.tabWebsite) tabsInfo.website = store.tabWebsite
        store.tabTable.forEach((v, k) => {
            const arr: any[] = []
            v.data.forEach((d) => arr.push(d))
            tabsInfo[k] = {name: v.name, columns: v.columns, data: arr}
        })
        store.tabsText.forEach((value, key) => (tabsInfo[key] = {content: value}))

        store.info = {
            progressState: cacheProgress,
            cardState: cacheCard,
            tabsState: tabs,
            tabsInfoState: tabsInfo,
            riskState: [...store.riskMessages],
            logState: store.messages
                .filter((i) => i.type === "log")
                .map((i) => i.content as StreamResult.Log)
                .filter((i) => i.data !== "null"),
            rulesState: [...store.ruleData]
        }
        setStreamEntry(token, store.info, store.runTimeId.cache, !!store.timeRef)
    }

    /** 附加监听器 */
    const attachListeners = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return
        const {params} = store

        const dataHandler = async (_: any, data: StreamResult.BaseProsp) => {
            if (data?.RuntimeID) {
                store.runTimeId.cache = data.RuntimeID
                params.setRuntimeId?.(data.RuntimeID)
            }
            const isMessage = data.IsMessage || data.ExecResult?.IsMessage
            if (!isMessage) return
            if (canceledTokens.current.has(token)) return
            try {
                const msgArr = data.Message || data.ExecResult?.Message
                const obj: StreamResult.Message = JSON.parse(Buffer.from(msgArr).toString())
                const logData = obj.content as StreamResult.Log

                if (obj.type === "progress") {
                    const p = obj.content as StreamResult.Progress
                    if (p?.id) {
                        store.progressKVPair.set(p.id, Math.max(store.progressKVPair.get(p.id) || 0, p.progress))
                    }
                    return
                }

                if (obj.type === "log" && logData.level === "feature-status-card-data") {
                    const check = checkStreamValidity(logData)
                    if (!check) return
                    const card: StreamResult.Card = check
                    store.cardKVPair.set(card.id, {
                        Id: card.id,
                        Data: card.data,
                        Timestamp: logData.timestamp,
                        Tags: Array.isArray(card.tags) ? card.tags : []
                    })
                    return
                }

                if (obj.type === "log" && logData.level === "json-risk") {
                    const risk = checkStreamValidity(logData)
                    if (risk) store.riskMessages.unshift(risk)
                    return
                }

                if (params.dataFilter && params.dataFilter(obj, logData)) return
                store.messages.unshift(obj)
                if (store.messages.length > 100) store.messages.pop()
            } catch {}
        }

        const errorHandler = (error: string) => {
            yakitFailed(`[Mod] ${store.params.taskName} error: ${error}`, true)
            params?.onError && params.onError({error, requestToken: token})
        }

        const endHandler = () => {
            handleResultsFor(token)
            const infoParams = {
                ...store.info,
                runtimeId: store.runTimeId.cache,
                loading: !!store.timeRef,
                requestToken: token
            }
            ipcRenderer.emit(`${token}-end-client`, null, infoParams)
            params.onEnd?.(infoParams)
            info(`[Mod] ${store.params.taskName} finished`)
        }

        ipcRenderer.on(`${token}-data`, dataHandler)
        ipcRenderer.on(`${token}-error`, (_, error) => errorHandler(error))
        ipcRenderer.on(`${token}-end`, endHandler)
        ;(store as any)._handlers = {dataHandler, errorHandler, endHandler}
    }

    /** 移除监听并立即清理 */
    const detachListeners = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return
        const h = (store as any)._handlers
        if (h) {
            ipcRenderer.removeListener(`${token}-data`, h.dataHandler)
            ipcRenderer.removeListener(`${token}-error`, h.errorHandler)
            ipcRenderer.removeListener(`${token}-end`, h.endHandler)
        }
        if (store.timeRef) {
            clearInterval(store.timeRef)
            store.timeRef = null
        }
    }

    /** 创建流 */
    const createStream = (token: string, params: HoldGRPCStreamParams) => {
        if (storesRef.current.has(token)) return
        const store: InternalStreamStore = {
            params,
            timeRef: null,
            runTimeId: {cache: "", sent: ""},
            progressKVPair: new Map(),
            cardKVPair: new Map(),
            topTabs: [],
            endTabs: [],
            tabWebsite: undefined,
            tabTable: new Map(),
            tabsText: new Map(),
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
                rulesState: []
            }
        }
        storesRef.current.set(token, store)
        attachListeners(token)
        setStreamEntry(token, store.info, store.runTimeId.cache, true)
        const wt = params.waitTime ?? 500
        store.timeRef = setInterval(() => handleResultsFor(token), wt)
        syncTokens()
    }

    /** 立即停止并清理某个流 */
    const removeStream = (token: string) => {
        const store = storesRef.current.get(token)
        if (!store) return

        canceledTokens.current.add(token)
        detachListeners(token)

        storesRef.current.delete(token)
        removeStreamEntry(token)
        syncTokens()

        ipcRenderer.invoke(`cancel-${store.params.apiKey}`, token).catch(() => {})
    }

    /** 立即停止并清理所有流 */
    const clearAllStreams = () => {
        canceledTokens.current = new Set(tokens)
        storesRef.current.forEach((_, token) => detachListeners(token))
        storesRef.current.clear()
        setTokens([])
        setStreams({})

        // 异步通知主进程全部取消（不等待）
        tokens.forEach((token) => {
            const store = storesRef.current.get(token)
            if (store) ipcRenderer.invoke(`cancel-${store.params.apiKey}`, token).catch(() => {})
        })
    }

    useEffect(() => () => clearAllStreams(), [])

    // 提供一个方法让外部调用
    const markCanceled = (token: string) => {
        canceledTokens.current.add(token)
    }

    return [
        streams,
        {
            createStream,
            removeStream,
            clearAllStreams,
            markCanceled,
            tokens
        } as const
    ] as const
}
