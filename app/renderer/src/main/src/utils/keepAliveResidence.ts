import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { YakitRoute } from '@/enums/yakitRoute'

/** display:none 超过此时长后卸载正文；pinKeepAlive 期间不卸。 */
export const KEEP_ALIVE_IDLE_UNLOAD_MS = 8 * 60 * 1000

/** History / MITM / Fuzzer 等重页签：更短闲置即卸，减轻 display:none 期间内存。 */
export const KEEP_ALIVE_HEAVY_IDLE_UNLOAD_MS = 2 * 60 * 1000

const HEAVY_KEEP_ALIVE_ROUTES = new Set<YakitRoute>([
  YakitRoute.HTTPFuzzer,
  YakitRoute.HTTPHacker,
  YakitRoute.MITMHacker,
  YakitRoute.DB_HTTPHistory,
  YakitRoute.DB_HTTPHistoryAnalysis,
])

/** 按路由选闲置卸载时长；未知路由用默认 8 分钟。 */
export function keepAliveIdleMsForRoute(route?: YakitRoute | string): number {
  if (route && HEAVY_KEEP_ALIVE_ROUTES.has(route as YakitRoute)) {
    return KEEP_ALIVE_HEAVY_IDLE_UNLOAD_MS
  }
  return KEEP_ALIVE_IDLE_UNLOAD_MS
}

type Listener = () => void

const pinCounts = new Map<string, number>()
/** Per-id listeners so pin/unpin of one tab does not wake every keepAlive subscriber. */
const listenersById = new Map<string, Set<Listener>>()

const emitPinsForId = (id: string) => {
  const set = listenersById.get(id)
  if (!set) return
  set.forEach((fn) => fn())
}

const emitPinsAll = () => {
  listenersById.forEach((set) => set.forEach((fn) => fn()))
}

/** 任务进行中按住保活页；返回的 unpin 只生效一次。 */
export function pinKeepAlive(id: string): () => void {
  if (!id) return () => {}
  pinCounts.set(id, (pinCounts.get(id) || 0) + 1)
  emitPinsForId(id)
  let released = false
  return () => {
    if (released) return
    released = true
    const next = (pinCounts.get(id) || 1) - 1
    if (next <= 0) pinCounts.delete(id)
    else pinCounts.set(id, next)
    emitPinsForId(id)
  }
}

export function isKeepAlivePinned(id: string): boolean {
  return (pinCounts.get(id) || 0) > 0
}

/** Subscribe to pin changes for one id (useSyncExternalStore). Empty id is a no-op. */
export function subscribeKeepAlivePins(id: string | undefined, listener: Listener): () => void {
  if (!id) return () => {}
  let set = listenersById.get(id)
  if (!set) {
    set = new Set()
    listenersById.set(id, set)
  }
  set.add(listener)
  return () => {
    set!.delete(listener)
    if (set!.size === 0) listenersById.delete(id)
  }
}

export function resetKeepAlivePinsForTests() {
  pinCounts.clear()
  emitPinsAll()
}

export interface KeepAliveMountInput {
  active: boolean
  /** 从未进入的页签保持不挂载。 */
  everMounted: boolean
  pinned: boolean
  hiddenAt: number | null
  now: number
  idleMs?: number
}

export interface KeepAliveMountDecision {
  mounted: boolean
  everMounted: boolean
  hiddenAt: number | null
}

/** 可见 / pin / 隐藏时长 → 是否挂载。 */
export function resolveKeepAliveMounted(input: KeepAliveMountInput): KeepAliveMountDecision {
  const idleMs = input.idleMs ?? KEEP_ALIVE_IDLE_UNLOAD_MS
  if (input.active) {
    return { mounted: true, everMounted: true, hiddenAt: null }
  }
  if (!input.everMounted) {
    return { mounted: false, everMounted: false, hiddenAt: null }
  }
  const hiddenAt = input.hiddenAt ?? input.now
  if (input.pinned || input.now - hiddenAt < idleMs) {
    return { mounted: true, everMounted: true, hiddenAt }
  }
  return { mounted: false, everMounted: true, hiddenAt }
}

/** 隐藏超时卸载；pin 期间不卸；再可见立刻挂回。idleMs 默认 8 分钟，重页签可传更短。 */
export function useKeepAliveMounted(
  active: boolean,
  pinId?: string,
  idleMs: number = KEEP_ALIVE_IDLE_UNLOAD_MS,
): boolean {
  const pinned = useSyncExternalStore(
    (listener) => subscribeKeepAlivePins(pinId, listener),
    () => (pinId ? isKeepAlivePinned(pinId) : false),
    () => false,
  )
  const everRef = useRef(active)
  const hiddenAtRef = useRef<number | null>(null)
  const [mounted, setMounted] = useState(active)
  const [tick, setTick] = useState(0)

  // Active tab must stay mounted in the same render (avoids blank frame after idle remount).
  if (active && !mounted) {
    setMounted(true)
  }

  useEffect(() => {
    const now = Date.now()
    const decision = resolveKeepAliveMounted({
      active,
      everMounted: everRef.current,
      pinned,
      hiddenAt: hiddenAtRef.current,
      now,
      idleMs,
    })
    everRef.current = decision.everMounted
    hiddenAtRef.current = decision.hiddenAt
    setMounted((prev) => (prev === decision.mounted ? prev : decision.mounted))

    if (decision.mounted && decision.hiddenAt != null && !active && !pinned) {
      const wait = Math.max(0, idleMs - (now - decision.hiddenAt))
      const timer = window.setTimeout(() => setTick((n) => n + 1), wait)
      return () => window.clearTimeout(timer)
    }
  }, [active, pinned, tick, pinId, idleMs])

  return active ? true : mounted
}
