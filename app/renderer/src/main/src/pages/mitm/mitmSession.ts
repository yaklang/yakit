import { ipc, type GrpcInput, type GrpcOutput, type StreamTask } from '@/services/ipc'
import { randomString } from '@/utils/randomUtil'

type Api = 'MITM' | 'MITMV2'
type Events = {
  start: undefined
  error: string
  loading: boolean
  notification: Uint8Array
  message: NonNullable<GrpcOutput<'MITMV2'>['Message']>
  hooks: GrpcOutput<'MITMV2'>['Hooks']
  filter: NonNullable<GrpcOutput<'MITMV2'>['FilterData']>
  replacers: GrpcOutput<'MITMV2'>['Replacers']
  hijacked: GrpcOutput<'MITM'> | GrpcOutput<'MITMV2'>
  pipeline: GrpcOutput<'MITMV2'>['PipelineStats']
}

function createMITMSession(api: Api) {
  const listeners = new Map<keyof Events, Set<(data: unknown) => void>>()
  let active: { controller: AbortController; opening: Promise<StreamTask<Api>> } | undefined
  let generation = 0
  const emit = <K extends keyof Events>(name: K, data: Events[K]) => {
    for (const listener of [...(listeners.get(name) ?? [])]) listener(data)
  }
  const open = async (params: GrpcInput<Api>, resume = false) => {
    if (active) {
      await active.opening
      return null
    }
    generation++
    const controller = new AbortController()
    let first = true
    const ended = (error?: unknown) => {
      if (controller.signal.aborted) return
      if (active?.controller === controller) active = undefined
      emit('pipeline', null)
      emit('error', error ? `${error}` : '')
    }
    const opening = ipc.openStream('grpc', api, params, {
      token: randomString(40),
      signal: controller.signal,
      resume,
      onData(data) {
        if (controller.signal.aborted) return
        if (first) {
          first = false
          emit('start', undefined)
        }
        if ('request' in data) {
          if (data.haveLoadingSetter) emit('loading', data.loadingFlag)
          if (data.haveNotification) emit('notification', data.notificationContent)
          if (data.replacers.length || data.justContentReplacer) emit('replacers', data.replacers)
          if (data.haveMessage) {
            if (data.message) emit('message', data.message)
            return
          }
          if (data.getCurrentHook) {
            emit('hooks', data.hooks)
            return
          }
          if (data.justFilter) {
            if (data.FilterData) emit('filter', data.FilterData)
            return
          }
          if (data.id !== '0' || data.responseId !== '0') emit('hijacked', data)
        } else {
          if (data.HaveLoadingSetter) emit('loading', data.LoadingFlag)
          if (data.HaveNotification) emit('notification', data.NotificationContent)
          if (data.PipelineStats) emit('pipeline', data.PipelineStats)
          if (data.Replacers.length || data.JustContentReplacer) emit('replacers', data.Replacers)
          if (data.HaveMessage) {
            if (data.Message) emit('message', data.Message)
            return
          }
          if (data.GetCurrentHook) {
            emit('hooks', data.Hooks)
            return
          }
          if (data.JustFilter) {
            if (data.FilterData) emit('filter', data.FilterData)
            return
          }
          if (data.ManualHijackListAction) emit('hijacked', data)
        }
      },
      onError: ended,
      onEnd: () => ended(),
    })
    const session = { controller, opening }
    active = session
    try {
      await opening
      return null
    } catch (error) {
      if (active === session) active = undefined
      throw error
    }
  }
  return {
    on<K extends keyof Events>(name: K, callback: (data: Events[K]) => void) {
      const bucket = listeners.get(name) ?? new Set()
      const listener = callback as (data: unknown) => void
      bucket.add(listener)
      listeners.set(name, bucket)
      return () => {
        bucket.delete(listener)
        if (!bucket.size) listeners.delete(name)
      }
    },
    open,
    async status() {
      const before = generation
      const status = await ipc.invoke('local', 'GetMITMSession', { api })
      if (status.haveStream && !active && before === generation) await open({}, true)
      return status
    },
    async write(params: GrpcInput<Api>) {
      const session = active
      if (!session) throw new Error('MITM session is not running')
      const task = await session.opening
      if (active !== session || session.controller.signal.aborted) throw new Error('MITM session changed')
      await task.write(params)
      return null
    },
    async recover() {
      if (!active) return null
      return this.write(api === 'MITM' ? { recover: true } : { RecoverContext: true })
    },
    async stop() {
      generation++
      const session = active
      active = undefined
      session?.controller.abort()
      emit('pipeline', null)
      return null
    },
    async upload(
      params: { TaskID: string; FilePath: string; ReplaceBody?: boolean; PartIndex?: number },
      signal?: AbortSignal,
    ) {
      const session = active
      if (!session || api !== 'MITMV2') throw new Error('MITMV2 session is not running')
      const task = await session.opening
      if (active !== session || session.controller.signal.aborted) throw new Error('MITMV2 session changed')
      const controller = new AbortController()
      const abort = () => controller.abort()
      session.controller.signal.addEventListener('abort', abort, { once: true })
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted || session.controller.signal.aborted) abort()
      try {
        return await ipc.invoke(
          'local',
          'ReplaceMITMRequestFile',
          { ...params, token: task.token, instanceId: task.instanceId },
          { signal: controller.signal },
        )
      } finally {
        session.controller.signal.removeEventListener('abort', abort)
        signal?.removeEventListener('abort', abort)
      }
    },
  }
}

// MITM 是窗口级代理服务。其余页面流仍由各自组件持有。
export const mitmSession = createMITMSession('MITM')
export const mitmV2Session = createMITMSession('MITMV2')
export const getMITMSession = (version: string) => (version === 'V2' ? mitmV2Session : mitmSession)
export const writeMITM = (version: string, v1: GrpcInput<'MITM'>, v2: GrpcInput<'MITMV2'>) =>
  version === 'V2' ? mitmV2Session.write(v2) : mitmSession.write(v1)
