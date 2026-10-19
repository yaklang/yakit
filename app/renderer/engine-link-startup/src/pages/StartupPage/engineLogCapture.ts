import { yakitLogs } from '@/utils/electronBridge'

export type EngineLogChunk = { kind: 'stdio' | 'log'; text: string }

type Listener = (chunk: EngineLogChunk) => void

const buffer: EngineLogChunk[] = []
const listeners = new Set<Listener>()
let stopIpc: Array<() => void> = []

const push = (chunk: EngineLogChunk) => {
  if (listeners.size === 0) {
    buffer.push(chunk)
    return
  }
  listeners.forEach((listener) => listener(chunk))
}

/** 工作空间确认后立刻订阅。EngineLog 是 lazy 的，IPC 没有回放。 */
export const startEngineLogCapture = () => {
  if (stopIpc.length) return
  stopIpc = [
    yakitLogs.onLiveEngineStdio((stdout) => push({ kind: 'stdio', text: stdout })),
    yakitLogs.onLiveEngineLog((stdout) => push({ kind: 'log', text: stdout })),
  ]
}

export const subscribeEngineLog = (listener: Listener) => {
  buffer.splice(0, buffer.length).forEach(listener)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const resetEngineLogCaptureForTest = () => {
  stopIpc.forEach((stop) => stop())
  stopIpc = []
  buffer.length = 0
  listeners.clear()
}
