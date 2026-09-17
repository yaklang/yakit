import { useEffect, useRef } from 'react'
import { ipc, type GrpcInput, type GrpcOutput } from '@/services/ipc'

type DownloadApi = 'DownloadRAGs' | 'InstallThirdPartyBinary'
type DownloadOptions = { key: string; onData?: (data: GrpcOutput<DownloadApi>) => void }
const abortError = () => Object.assign(new Error('Download aborted'), { code: 'ABORTED' })

/** One collection per mounted page; terminal events and cancellation always settle callers. */
export function createDownloadTasks() {
  const active = new Map<string, { controller: AbortController; promise: Promise<void> }>()
  let disposed = false
  return {
    activate() {
      disposed = false
    },
    run<Api extends DownloadApi>(api: Api, params: GrpcInput<Api>, options: DownloadOptions): Promise<void> {
      if (disposed) return Promise.reject(abortError())
      const key = `${api}:${options.key}`
      const previous = active.get(key)
      if (previous) return previous.promise
      const controller = new AbortController()
      let resolve!: () => void
      let reject!: (error: unknown) => void
      const promise = new Promise<void>((yes, no) => {
        resolve = yes
        reject = no
      })
      const entry = { controller, promise }
      active.set(key, entry)
      let settled = false
      const finish = (error?: unknown) => {
        if (settled) return
        settled = true
        controller.signal.removeEventListener('abort', abort)
        if (active.get(key) === entry) active.delete(key)
        if (error) reject(error)
        else resolve()
      }
      const abort = () => finish(abortError())
      controller.signal.addEventListener('abort', abort, { once: true })
      try {
        void ipc
          .openStream('grpc', api, params, {
            signal: controller.signal,
            onData: (data) => {
              if (!settled) options.onData?.(data)
            },
            onError: finish,
            onEnd: () => finish(),
          })
          .catch(finish)
      } catch (error) {
        finish(error)
      }
      return promise
    },
    dispose() {
      disposed = true
      for (const entry of [...active.values()]) entry.controller.abort()
      active.clear()
    },
  }
}

export function useDownloadTasks() {
  const ref = useRef<ReturnType<typeof createDownloadTasks> | null>(null)
  if (!ref.current) ref.current = createDownloadTasks()
  const tasks = ref.current
  useEffect(() => {
    tasks.activate()
    return () => tasks.dispose()
  }, [tasks])
  return tasks
}
