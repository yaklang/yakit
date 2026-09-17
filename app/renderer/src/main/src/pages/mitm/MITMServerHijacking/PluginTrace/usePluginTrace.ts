import { useEffect, useRef, useState } from 'react'
import type { PluginExecutionTrace, PluginTraceParams, PluginTraceStats } from './type'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { yakitNotify } from '@/utils/notification'
import { Uint8ArrayToString } from '@/utils/str'
import { useCreation, useMemoizedFn } from 'ahooks'
import { ipc, type GrpcOutput, type StreamTask } from '@/services/ipc'
import { randomString } from '@/utils/randomUtil'
import { int64ToSafeNumber } from '@/utils/int64'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

function usePluginTrace(params: PluginTraceParams) {
  const { pluginTraceRefFun, onStart, onError, onEnd } = params
  const { t, i18n } = useI18nNamespaces(['mitm'])
  const [isInitTrace, setIsInitTrace] = useState<boolean>(true) // 是否显示初始追踪界面
  const [startLoading, setStartLoading] = useState<boolean>(false) // 开始按钮loading
  const [tracing, setTracing, getTracing] = useGetSetState<boolean>(false) // 是否正在追踪
  const [stopLoading, setStopLoading] = useState<boolean>(false) // 停止按钮loading
  const pluginTraceStatsRef = useRef<PluginTraceStats>({
    TotalTraces: 0,
    RunningTraces: 0,
    FailedTraces: 0,
    CompletedTraces: 0,
    CancelledTraces: 0,
  })
  const tracesRef = useRef<PluginExecutionTrace[]>([])
  const cancelTracesIdRef = useRef<string[]>([])
  const resetRef = useRef<boolean>(false)

  const sessionRef = useRef<{ controller: AbortController; opening?: Promise<StreamTask<'PluginTrace'>> }>()
  const onTraceStart = useMemoizedFn(() => {
    onStart()
    setStartLoading(false)
    setIsInitTrace(false)
    setTracing(true)
    pluginTraceStatsRef.current = {
      TotalTraces: 0,
      RunningTraces: 0,
      FailedTraces: 0,
      CompletedTraces: 0,
      CancelledTraces: 0,
    }
    tracesRef.current = []
    cancelTracesIdRef.current = []
    pluginTraceRefFun().noDetailFun()
    pluginTraceRefFun().refreshAndScrollNow()
    yakitNotify('info', t('PluginTrace.plugin_trace_started'))
  })
  const onTraceError = useMemoizedFn((err: unknown) => {
    onError()
    setStartLoading(false)
    setTracing(false)
    setStopLoading(false)
    pluginTraceRefFun().cancelTracesToState()
    pluginTraceRefFun().refreshFlush()
    yakitNotify('error', `${err}`)
  })
  const onTraceEnd = useMemoizedFn(() => {
    onEnd()
    setStartLoading(false)
    setTracing(false)
    setStopLoading(false)
    pluginTraceRefFun().cancelTracesToState()
    pluginTraceRefFun().refreshFlush()
    yakitNotify('info', t('PluginTrace.plugin_trace_stopped'))
  })
  const onStats = useMemoizedFn((data: GrpcOutput<'PluginTrace'>) => {
    if (data.Stats) {
      pluginTraceStatsRef.current = {
        TotalTraces: int64ToSafeNumber(data.Stats.TotalTraces),
        RunningTraces: int64ToSafeNumber(data.Stats.RunningTraces),
        FailedTraces: int64ToSafeNumber(data.Stats.FailedTraces),
        CompletedTraces: int64ToSafeNumber(data.Stats.CompletedTraces),
        CancelledTraces: int64ToSafeNumber(data.Stats.CancelledTraces),
      }
    }
  })
  const onTraces = useMemoizedFn((data: GrpcOutput<'PluginTrace'>) => {
    if (data.Traces.length > 0) {
      const newTraces = tracesRef.current.slice()
      data.Traces.forEach((raw) => {
        const status = raw.Status
        if (!['pending', 'running', 'completed', 'failed', 'cancelled'].includes(status))
          throw new Error(`Unknown trace status: ${status}`)
        const trace: PluginExecutionTrace = {
          ...raw,
          Index: 0,
          Status: status as PluginExecutionTrace['Status'],
          StartTime: int64ToSafeNumber(raw.StartTime),
          EndTime: int64ToSafeNumber(raw.EndTime),
          DurationMs: int64ToSafeNumber(raw.DurationMs),
        }
        const index = newTraces.findIndex((t) => t.TraceID === trace.TraceID)

        if (trace.Status === 'completed') {
          // completed状态的trace从列表中移除
          if (index >= 0) {
            newTraces.splice(index, 1)
          }
        } else {
          // running, failed, cancelled状态的trace更新或添加
          if (index >= 0) {
            newTraces[index] = {
              ...trace,
              ExecutionArgsStr: Uint8ArrayToString(trace.ExecutionArgs || new Uint8Array()),
              ExecutionArgs: new Uint8Array(),
            }
            if (trace.Status === 'cancelled' && cancelTracesIdRef.current.includes(trace.TraceID)) {
              const arr = cancelTracesIdRef.current.slice()
              cancelTracesIdRef.current = arr.filter((traceID) => traceID !== trace.TraceID)
              pluginTraceRefFun().refreshFlush()
            }
          } else {
            newTraces.unshift({
              ...trace,
              ExecutionArgsStr: Uint8ArrayToString(trace.ExecutionArgs || new Uint8Array()),
              ExecutionArgs: new Uint8Array(),
            }) // 新trace添加到开头
          }
        }
      })

      // 排序：running状态优先显示
      const sortedTraces = newTraces.sort((a, b) => {
        if (a.Status === 'running' && b.Status !== 'running') return -1
        if (a.Status !== 'running' && b.Status === 'running') return 1
        return b.StartTime - a.StartTime // 其他情况按时间倒序
      })

      tracesRef.current = sortedTraces.map((item, i) => ({ ...item, Index: i + 1 }))
    } else {
      tracesRef.current = []
    }
    if (!resetRef.current) {
      pluginTraceRefFun().syncTracesToState()
    }
  })
  useEffect(() => () => sessionRef.current?.controller.abort(), [])
  const startPluginTrace = useMemoizedFn(() => {
    if (tracing || startLoading) return
    sessionRef.current?.controller.abort()
    const session = {
      controller: new AbortController(),
      opening: undefined as Promise<StreamTask<'PluginTrace'>> | undefined,
    }
    sessionRef.current = session
    setStartLoading(true)
    let first = true
    const error = (err: unknown) => {
      if (!session.controller.signal.aborted) onTraceError(err)
    }
    session.opening = ipc.openStream(
      'grpc',
      'PluginTrace',
      { ControlMode: 'start_stream', EnableTracing: true },
      {
        token: randomString(40),
        signal: session.controller.signal,
        onData(data) {
          if (session.controller.signal.aborted) return
          if (data.ResponseType === 'control_result') {
            if (data.Success && first) {
              first = false
              onTraceStart()
            } else if (!data.Success && data.Message) error(data.Message)
          } else if (data.ResponseType === 'stats_update') onStats(data)
          else if (data.ResponseType === 'trace_update') onTraces(data)
        },
        onError: error,
        onEnd() {
          if (!session.controller.signal.aborted) onTraceEnd()
        },
      },
    )
    void session.opening.catch(error)
  })

  const resetPluginTrace = useMemoizedFn(() => {
    resetRef.current = true
    tracesRef.current = []
    cancelTracesIdRef.current = []
    setTimeout(() => {
      resetRef.current = false
    }, 500)
  })

  const stopPluginTrace = useMemoizedFn(() => {
    setStopLoading(true)
    sessionRef.current?.controller.abort()
    sessionRef.current = undefined
    onTraceEnd()
  })

  const cancelPluginTraceById = useMemoizedFn((traceID) => {
    cancelTracesIdRef.current.push(traceID)
    const session = sessionRef.current
    void session?.opening
      ?.then((task) => {
        if (!session.controller.signal.aborted) return task.write({ ControlMode: 'cancel_trace', TraceID: traceID })
      })
      .catch(onTraceError)
  })

  const pluginTraceStats = useMemoizedFn(() => {
    return pluginTraceStatsRef.current
  })

  const pluginTraceList = useMemoizedFn(() => {
    return tracesRef.current
  })

  const state = useCreation(
    () => ({
      isInitTrace,
      startLoading,
      tracing,
      stopLoading,
    }),
    [isInitTrace, startLoading, tracing, stopLoading],
  )

  const actions = useCreation(
    () => ({
      startPluginTrace,
      resetPluginTrace,
      stopPluginTrace,
      cancelPluginTraceById,
      pluginTraceStats,
      pluginTraceList,
    }),
    [startPluginTrace, resetPluginTrace, stopPluginTrace, cancelPluginTraceById, pluginTraceStats, pluginTraceList],
  )

  return [state, actions] as const
}

export default usePluginTrace
