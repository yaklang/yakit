import { useState, useRef, useEffect } from 'react'
import type { ExecResultLog, ExecResultMessage, ExecResultProgress } from '../pages/invoker/batch/ExecMessageViewer'
import type { ExecResult } from '../pages/invoker/schema'
import type { StatusCardInfoProps, StatusCardProps } from '../pages/yakitStore/viewers/base'
import { writeExecResultXTerm } from '../utils/xtermUtils'
import { failed, info } from '../utils/notification'
import { useGetState, useMemoizedFn } from 'ahooks'
import type { Risk } from '@/pages/risks/schema'
import { isEnpriTraceAgent } from '@/utils/envfile'
import { JSONParseLog } from '@/utils/tool'
import { ipc, type GrpcInput, type GrpcOutput, type StreamTask } from '@/services/ipc'
type StreamApi = 'Exec' | 'FetchPortAssetFromSpaceEngine' | 'ExecuteChaosMakerRule' | 'ExecutePacketYakScript'

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

export default function useHoldingIPCRStream<A extends StreamApi>(
  taskName: string,
  apiKey: A,
  token: string,
  onEnd?: () => any,
  onListened?: (open: (params: GrpcInput<A>) => Promise<void>) => unknown,
  dataFilter?: (obj: ExecResultMessage, content: ExecResultLog) => boolean,
  onRuntimeId?: (runtimeId: string) => any,
) {
  const [infoState, setInfoState] = useState<InfoState>({
    messageState: [],
    processState: [],
    statusState: [],
    riskState: [],
    featureMessageState: [],
    featureTypeState: [],
  })
  const [xtermRef, setXtermRef, getXtermRef] = useGetState<any>(null)

  const messages = useRef<ExecResultMessage[]>([])
  const featureMessages = useRef<ExecResultMessage[]>([])
  const featureTypes = useRef<ExecResultMessage[]>([])
  const riskMessages = useRef<Risk[]>([])
  const processKVPair = useRef<Map<string, number>>(new Map<string, number>())
  const statusKVPair = useRef<Map<string, CacheStatusCardProps>>(new Map<string, CacheStatusCardProps>())

  const active = useRef<{ controller: AbortController; opening?: Promise<StreamTask<A>> }>()
  const callbacks = useRef<{
    data(data: GrpcOutput<A>): Promise<void>
    error(error: unknown): void
    start(): void
    stop(): void
    end(): void
  }>()
  const cancel = useMemoizedFn(async () => {
    callbacks.current?.stop()
    const previous = active.current
    active.current = undefined
    previous?.controller.abort()
    if (previous?.opening)
      await previous.opening.then(
        (task) => task.cancel(),
        () => {},
      )
  })
  const open = useMemoizedFn(async (params: GrpcInput<A>) => {
    const previous = active.current
    previous?.controller.abort()
    const session: { controller: AbortController; opening?: Promise<StreamTask<A>> } = {
      controller: new AbortController(),
    }
    active.current = session
    if (previous?.opening)
      await previous.opening.then(
        (task) => task.cancel(),
        () => {},
      )
    if (active.current !== session) return
    callbacks.current?.start()
    session.opening = ipc.openStream('grpc', apiKey, params, {
      token,
      signal: session.controller.signal,
      async onData(data) {
        if (active.current === session) await callbacks.current?.data(data)
      },
      onError(error) {
        if (active.current !== session) return
        active.current = undefined
        callbacks.current?.error(error)
      },
      onEnd() {
        if (active.current !== session) return
        active.current = undefined
        callbacks.current?.end()
      },
    })
    try {
      await session.opening
    } catch (error) {
      if (active.current === session) {
        active.current = undefined
        if (!session.controller.signal.aborted) callbacks.current?.error(error)
      }
      throw error
    }
  })

  useEffect(() => {
    const syncResults = () => {
      const results = messages.current.filter((i) => i.type === 'log').map((i) => i.content as ExecResultLog)

      const featureResults = featureMessages.current
        .filter((i) => i.type === 'log')
        .map((i) => i.content as ExecResultLog)
        .filter((i) => i.data !== 'null')

      let featureTypeResults = featureTypes.current
        .filter((i) => i.type === 'log')
        .map((i) => i.content as ExecResultLog)
        .filter((i) => i.data !== 'null')

      const riskResults = riskMessages.current.filter((i) => !!i)

      const featureTypeFilter = featureTypeResults.map((item) => item.data)
      featureTypeResults = featureTypeResults.filter((item, index) => featureTypeFilter.indexOf(item.data) === index)

      const processes: ExecResultProgress[] = []
      processKVPair.current.forEach((value, id) => {
        processes.push({ id: id, progress: value })
      })

      const cacheStatusKVPair: { [x: string]: StatusCardInfoProps } = {}
      const statusCards: StatusCardProps[] = []
      statusKVPair.current.forEach((value) => {
        const item = JSON.parse(JSON.stringify(value))
        item.Tag = item.Tags[0] || ''
        delete item.Tags
        statusCards.push(item)
      })
      statusCards.sort((a, b) => a.Id.localeCompare(b.Id))
      for (const item of statusCards) {
        if (item.Tag) {
          if (cacheStatusKVPair[item.Tag]) {
            cacheStatusKVPair[item.Tag].info.push(item)
          } else {
            cacheStatusKVPair[item.Tag] = { tag: item.Tag, info: [item] }
          }
        } else {
          cacheStatusKVPair[item.Id] = { tag: item.Id, info: [item] }
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
          featureTypeState: featureTypeResults,
        })
      ) {
        setInfoState({
          messageState: results,
          featureMessageState: featureResults,
          riskState: riskResults,
          processState: processes.sort((a, b) => a.id.localeCompare(b.id)),
          statusState: Object.values(cacheStatusKVPair),
          featureTypeState: featureTypeResults,
        })
      }
    }

    let runtimeId = ''
    const onData = async (data: GrpcOutput<A>) => {
      if (runtimeId === '' && !!data?.RuntimeID && runtimeId != data.RuntimeID) {
        runtimeId = data.RuntimeID
        if (onRuntimeId) {
          onRuntimeId(runtimeId)
        }
      }

      if (data.IsMessage) {
        try {
          const obj: ExecResultMessage = JSONParseLog(Buffer.from(data.Message).toString(), {
            page: 'useHoldingIPCRStream',
          })

          // 处理 Process KVPair
          if (obj.type === 'progress') {
            const processData = obj.content as ExecResultProgress
            if (processData && processData.id) {
              processKVPair.current.set(
                processData.id,
                Math.max(processKVPair.current.get(processData.id) || 0, processData.progress),
              )
            }
            return
          }

          const logData = obj.content as ExecResultLog

          // 处理 log feature-status-card-data
          if (obj.type === 'log' && logData.level === 'feature-status-card-data') {
            try {
              const obj = JSONParseLog(logData.data, { page: 'useHoldingIPCRStream' })
              const { id, data, tags } = obj
              const { timestamp } = logData
              const originData = statusKVPair.current.get(id)
              if (originData && originData.Timestamp > timestamp) {
                return
              }
              statusKVPair.current.set(id, {
                Id: id,
                Data: data,
                Timestamp: timestamp,
                Tags: Array.isArray(tags) ? tags : [],
              })
            } catch (e) {}
            return
          }

          if (obj.type === 'log' && logData.level === 'json-feature') {
            try {
              featureTypes.current.unshift(obj)
            } catch (e) {}
            return
          }

          if (obj.type === 'log' && logData.level === 'feature-table-data') {
            try {
              featureMessages.current.unshift(obj)
            } catch (e) {}
            return
          }

          if (obj.type === 'log' && logData.level === 'json-risk') {
            try {
              const risk = JSONParseLog(logData.data, { page: 'useHoldingIPCRStream' }) as Risk
              riskMessages.current.unshift(risk)
              if (isEnpriTraceAgent()) riskMessages.current = riskMessages.current.slice(0, 10)
            } catch (e) {}
          }

          // 第三方数据过滤方法
          if (dataFilter) if (dataFilter(obj, logData)) return

          messages.current.unshift(obj)

          // 只缓存 100 条结果（日志类型 + 数据类型）
          if (messages.current.length > 100) {
            messages.current.pop()
          }
        } catch (e) {}
      }
      writeExecResultXTerm(getXtermRef(), data)
    }
    let time: ReturnType<typeof setInterval> | undefined
    const handleEnd = () => {
      clearInterval(time)
      info(`[Mod] ${taskName} finished`)
      syncResults()
      if (onEnd) {
        onEnd()
      }
    }

    callbacks.current = {
      data: onData,
      start() {
        clearInterval(time)
        time = setInterval(syncResults, 500)
      },
      stop() {
        clearInterval(time)
      },
      end: handleEnd,
      error(error) {
        failed(`[Mod] ${taskName} error: ${error instanceof Error ? error.message : String(error)}`)
        clearInterval(time)
        syncResults()
        onEnd?.()
      },
    }

    syncResults()

    if (onListened) onListened(open)

    return () => {
      if (time) clearInterval(time)
      void cancel()
      callbacks.current = undefined
    }
  }, [apiKey, token])

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
      featureTypeState: [],
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
      featureTypeState: [],
    })
  }

  return [infoState, { reset, setXtermRef, resetAll, open, cancel }, xtermRef] as const
}
