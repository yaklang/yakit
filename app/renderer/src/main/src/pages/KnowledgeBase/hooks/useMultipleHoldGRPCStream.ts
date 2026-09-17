import { useEffect, useRef, useState } from 'react'
import type {
  HoldGRPCStreamInfo,
  HoldGRPCStreamProps,
  StreamResult,
} from '@/hook/useHoldGRPCStream/useHoldGRPCStreamType'
import { DefaultTabs } from '@/hook/useHoldGRPCStream/constant'
import { yakitFailed, info } from '@/utils/notification'

import { ipc, type GrpcOutput, type StreamOptions, type BridgeError } from '@/services/ipc'
import { apiDebugPlugin } from '@/pages/plugins/utils'

/* ======================== utils ======================== */

const convertCardInfo = (maps: Map<string, HoldGRPCStreamProps.CacheCard>) => {
  const cardArr: HoldGRPCStreamProps.InfoCard[] = []
  maps.forEach((value) =>
    cardArr.push({
      Id: value.Id,
      Data: value.Data,
      Timestamp: value.Timestamp,
      Tag: value?.Tags ? value.Tags[0] || '' : '',
    }),
  )
  cardArr.sort((a, b) => a.Id.localeCompare(b.Id))
  const cardObj: Record<string, HoldGRPCStreamProps.InfoCards> = {}
  for (const el of cardArr) {
    if (el.Tag) {
      cardObj[el.Tag] = cardObj[el.Tag] || { tag: el.Tag, info: [] }
      cardObj[el.Tag].info.push(el)
    } else cardObj[el.Id] = { tag: el.Id, info: [el] }
  }
  return Object.values(cardObj)
}

const checkStreamValidity = (stream: StreamResult.Log) => {
  try {
    const parsed = JSON.parse(stream.data)
    return parsed && parsed !== 'null' && parsed !== 'undefined' ? parsed : false
  } catch {
    return false
  }
}

/* ======================== types ======================== */

export interface HoldGRPCStreamParams {
  taskName: string
  apiKey: 'DebugPlugin'
  request: Omit<Parameters<typeof apiDebugPlugin>[0], 'open'>
  token: string
  waitTime?: number

  /** ✅ 新增：结束后是否自动清理，默认 true */
  autoClear?: boolean

  onEnd?: (
    streamInfo?: HoldGRPCStreamInfo & {
      runtimeId?: string
      loading?: boolean
      requestToken?: string
    },
  ) => any
  onError?: (e: { error: BridgeError | Error; requestToken: string }) => void
  dataFilter?: (obj: StreamResult.Message, content: StreamResult.Log) => boolean
  setRuntimeId?: (runtimeId: string) => any
}

type InternalStreamStore = {
  params: HoldGRPCStreamParams
  timeRef?: ReturnType<typeof setInterval>
  controller: AbortController
  opening?: Promise<{ cancel(): Promise<void> }>
  runTimeId: { cache: string; sent: string }
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

/* ======================== hook ======================== */

export default function useMultipleHoldGRPCStream() {
  const mounted = useRef(true)
  const storesRef = useRef<Map<string, InternalStreamStore>>(new Map())

  const [tokens, setTokens] = useState<string[]>([])
  const [streams, setStreams] = useState<
    Record<string, HoldGRPCStreamInfo & { runtimeId?: string; loading?: boolean }>
  >({})

  const syncTokens = () => setTokens([...storesRef.current.keys()])

  const setStreamEntry = (token: string, info: HoldGRPCStreamInfo, runtimeId?: string, loading?: boolean) => {
    setStreams((prev) => ({
      ...prev,
      [token]: { ...info, ...(runtimeId ? { runtimeId } : {}), ...(typeof loading === 'boolean' ? { loading } : {}) },
    }))
  }

  const removeStreamEntry = (token: string) =>
    setStreams((prev) => {
      const copy = { ...prev }
      delete copy[token]
      return copy
    })

  /* ======================== 聚合 ======================== */

  const handleResultsFor = (token: string) => {
    const store = storesRef.current.get(token)
    if (!store) return

    const { runTimeId, params } = store

    if (runTimeId.sent !== runTimeId.cache && params.setRuntimeId) {
      params.setRuntimeId(runTimeId.cache)
      runTimeId.sent = runTimeId.cache
    }

    const cacheProgress: StreamResult.Progress[] = []
    store.progressKVPair.forEach((v, id) => cacheProgress.push({ id, progress: v }))

    const cacheCard = convertCardInfo(store.cardKVPair)
    const tabs = [...store.topTabs, ...DefaultTabs(), ...store.endTabs]
    const tabsInfo: HoldGRPCStreamInfo['tabsInfoState'] = {}

    if (store.tabWebsite) tabsInfo.website = store.tabWebsite

    store.tabTable.forEach((v, k) => {
      tabsInfo[k] = {
        name: v.name,
        columns: v.columns,
        data: Array.from(v.data.values()),
      }
    })

    store.tabsText.forEach((value, key) => (tabsInfo[key] = { content: value }))

    store.info = {
      progressState: cacheProgress,
      cardState: cacheCard,
      tabsState: tabs,
      tabsInfoState: tabsInfo,
      riskState: [...store.riskMessages],
      logState: store.messages
        .filter((i) => i.type === 'log')
        .map((i) => i.content as StreamResult.Log)
        .filter((i) => i.data !== 'null'),
      rulesState: [...store.ruleData],
    }

    setStreamEntry(token, store.info, store.runTimeId.cache, !!store.timeRef)
  }

  /* ======================== listeners ======================== */

  const streamOptions = (token: string): StreamOptions<GrpcOutput<'DebugPlugin'>> => {
    const store = storesRef.current.get(token)
    if (!store) throw new Error('Unknown stream')
    const { params } = store

    const dataHandler = (data: GrpcOutput<'DebugPlugin'>) => {
      if (storesRef.current.get(token) !== store || store.controller.signal.aborted) return

      if (data?.RuntimeID) {
        store.runTimeId.cache = data.RuntimeID
        params.setRuntimeId?.(data.RuntimeID)
      }

      const isMessage = data.IsMessage
      if (!isMessage) return

      try {
        const obj: StreamResult.Message = JSON.parse(Buffer.from(data.Message).toString())
        const logData = obj.content as StreamResult.Log

        if (obj.type === 'progress') {
          const p = obj.content as StreamResult.Progress
          if (p?.id) {
            store.progressKVPair.set(p.id, Math.max(store.progressKVPair.get(p.id) || 0, p.progress))
          }
          return
        }

        if (obj.type === 'log' && logData.level === 'feature-status-card-data') {
          const card = checkStreamValidity(logData)
          if (!card) return
          store.cardKVPair.set(card.id, {
            Id: card.id,
            Data: card.data,
            Timestamp: logData.timestamp,
            Tags: Array.isArray(card.tags) ? card.tags : [],
          })
          return
        }

        if (obj.type === 'log' && logData.level === 'json-risk') {
          const risk = checkStreamValidity(logData)
          if (risk) store.riskMessages.unshift(risk)
          return
        }

        if (params.dataFilter?.(obj, logData)) return

        store.messages.unshift(obj)
        if (store.messages.length > 100) store.messages.pop()
      } catch {}
    }

    const errorHandler = (error: BridgeError | Error) => {
      if (storesRef.current.get(token) !== store) return
      clearInterval(store.timeRef)
      store.timeRef = undefined
      handleResultsFor(token)
      yakitFailed(`[Mod] ${params.taskName} error: ${error}`, true)
      params.onError?.({ error, requestToken: token })
      if (storesRef.current.get(token) === store && params.autoClear !== false) removeStream(token)
    }

    const endHandler = () => {
      if (storesRef.current.get(token) !== store) return
      clearInterval(store.timeRef)
      store.timeRef = undefined
      handleResultsFor(token)

      const infoParams = {
        ...store.info,
        runtimeId: store.runTimeId.cache,
        loading: !!store.timeRef,
        requestToken: token,
      }

      params.onEnd?.(infoParams)
      info(`[Mod] ${params.taskName} finished`)

      /** ✅ 核心：是否自动清理 */
      if (storesRef.current.get(token) === store && params.autoClear !== false) {
        removeStream(token)
      }
    }

    return { token, signal: store.controller.signal, onData: dataHandler, onError: errorHandler, onEnd: endHandler }
  }

  /* ======================== API ======================== */

  const createStream = async (token: string, params: HoldGRPCStreamParams): Promise<void> => {
    if (!mounted.current) throw new Error('Stream owner unmounted')
    if (storesRef.current.has(token)) throw new Error('Duplicate stream token')

    const store: InternalStreamStore = {
      params,
      controller: new AbortController(),
      runTimeId: { cache: '', sent: '' },
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
        rulesState: [],
      },
    }

    storesRef.current.set(token, store)
    setStreamEntry(token, store.info, '', true)

    store.timeRef = setInterval(() => handleResultsFor(token), params.waitTime ?? 500)
    syncTokens()
    const options = streamOptions(token)
    try {
      await apiDebugPlugin({
        ...params.request,
        open: async (request) => {
          store.opening = ipc.openStream('grpc', 'DebugPlugin', request, options)
          await store.opening
        },
      })
    } catch (error) {
      if (storesRef.current.get(token) === store) {
        clearInterval(store.timeRef)
        store.timeRef = undefined
        handleResultsFor(token)
        params.onError?.({ error: error instanceof Error ? error : new Error(String(error)), requestToken: token })
        if (storesRef.current.get(token) === store) removeStream(token)
      }
      throw error
    }
  }

  const removeStream = (token: string) => {
    const store = storesRef.current.get(token)
    if (!store) return

    clearInterval(store.timeRef)
    store.timeRef = undefined
    store.controller.abort()

    storesRef.current.delete(token)
    removeStreamEntry(token)
    syncTokens()
  }

  const clearAllStreams = () => {
    storesRef.current.forEach((store) => {
      clearInterval(store.timeRef)
      store.controller.abort()
    })
    storesRef.current.clear()
    setTokens([])
    setStreams({})
  }

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      storesRef.current.forEach((store) => {
        clearInterval(store.timeRef)
        store.controller.abort()
      })
      storesRef.current.clear()
    }
  }, [])

  return [
    streams,
    {
      createStream,
      removeStream,
      clearAllStreams,
      tokens,
    },
  ] as const
}
