import { useCallback, useEffect, useLayoutEffect, useSyncExternalStore } from 'react'

/** WebFuzzer 二级页签后台最多保留 6 个闲置实例，超出立即卸掉最久没点的 */
export const SUB_PAGE_MAX_IDLE = 6

/** 序列/并发组后台最多保留 2 个闲置实例 */
export const SEQUENCE_GROUP_MAX_IDLE = 2

type Listener = () => void

interface KeepAlivePool {
  mounted: Set<string>
  active: Set<string>
  /** 隐藏且未加锁的页签（Set 按插入顺序排，第一个就是最久没用的） */
  idle: Set<string>
  maxIdle: number
}

export interface UseSubPageKeepAliveOptions {
  scope: string
  id: string
  active: boolean
  maxIdle?: number
}

const pools = new Map<string, KeepAlivePool>()
const scopeById = new Map<string, string>()
const pinCounts = new Map<string, number>()
const listenersById = new Map<string, Set<Listener>>()

const useBrowserLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

const notify = (id: string) => {
  listenersById.get(id)?.forEach((fn) => fn())
}

const getPool = (scope: string, maxIdle: number): KeepAlivePool => {
  let pool = pools.get(scope)
  if (!pool) {
    pool = { mounted: new Set(), active: new Set(), idle: new Set(), maxIdle }
    pools.set(scope, pool)
  }
  pool.maxIdle = maxIdle
  return pool
}

/** 闲置数超过上限时，淘汰最久没访问的页签 */
const evictOverflow = (pool: KeepAlivePool) => {
  while (pool.idle.size > pool.maxIdle) {
    const oldestId = pool.idle.values().next().value
    if (!oldestId) break
    pool.idle.delete(oldestId)
    pool.mounted.delete(oldestId)
    notify(oldestId)
  }
}

const subscribe = (id: string, listener: Listener): (() => void) => {
  if (!id) return () => {}
  const set = listenersById.get(id) ?? new Set<Listener>()
  set.add(listener)
  listenersById.set(id, set)
  return () => {
    set.delete(listener)
    if (set.size === 0) listenersById.delete(id)
  }
}

const syncActive = (scope: string, id: string, active: boolean, maxIdle: number) => {
  if (!id) return
  const pool = getPool(scope, maxIdle)
  scopeById.set(id, scope)

  if (active) {
    pool.active.add(id)
    pool.idle.delete(id)
    if (!pool.mounted.has(id)) {
      pool.mounted.add(id)
      notify(id)
    }
    return
  }

  pool.active.delete(id)
  if (!pool.mounted.has(id)) return

  if ((pinCounts.get(id) || 0) > 0) {
    pool.idle.delete(id)
    return
  }

  pool.idle.delete(id)
  pool.idle.add(id)
  evictOverflow(pool)
}

const removeTab = (scope: string, id: string) => {
  const pool = pools.get(scope)
  if (!pool || !id) return
  pool.mounted.delete(id)
  pool.active.delete(id)
  pool.idle.delete(id)
  if (scopeById.get(id) === scope) scopeById.delete(id)
}

/** 任务运行中锁住页签，避免在后台被淘汰；返回幂等解锁函数 */
export const pinSubPageKeepAlive = (id: string): (() => void) => {
  if (!id) return () => {}
  pinCounts.set(id, (pinCounts.get(id) || 0) + 1)

  const scope = scopeById.get(id)
  if (scope) pools.get(scope)?.idle.delete(id)

  let released = false
  return () => {
    if (released) return
    released = true

    const remain = (pinCounts.get(id) || 1) - 1
    if (remain > 0) {
      pinCounts.set(id, remain)
      return
    }
    pinCounts.delete(id)

    const targetScope = scopeById.get(id)
    const pool = targetScope ? pools.get(targetScope) : undefined
    if (pool && pool.mounted.has(id) && !pool.active.has(id)) {
      pool.idle.delete(id)
      pool.idle.add(id)
      evictOverflow(pool)
    }
  }
}

/** 控制二级页签保活：前台与加锁页签常驻，其余后台闲置页签只留最近 maxIdle 个 */
export const useSubPageKeepAlive = ({
  scope,
  id,
  active,
  maxIdle = SUB_PAGE_MAX_IDLE,
}: UseSubPageKeepAliveOptions): boolean => {
  const subscribeTab = useCallback((listener: Listener) => subscribe(id, listener), [id])
  const mounted = useSyncExternalStore(
    subscribeTab,
    () => Boolean(id && pools.get(scope)?.mounted.has(id)),
    () => false,
  )

  useBrowserLayoutEffect(() => {
    syncActive(scope, id, active, maxIdle)
  }, [scope, id, active, maxIdle])

  useEffect(() => () => removeTab(scope, id), [scope, id])

  return active || mounted
}

/** 仅用于单元测试重置状态 */
export const resetSubPageKeepAliveForTests = () => {
  const ids = new Set<string>()
  pools.forEach((pool) => pool.mounted.forEach((id) => ids.add(id)))
  pools.clear()
  scopeById.clear()
  pinCounts.clear()
  ids.forEach(notify)
}
