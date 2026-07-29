import { useMemoizedFn } from 'ahooks'
import { useEffect, useRef } from 'react'
import type { ListRange } from 'react-virtuoso'
import { globalSessionEngine } from './ChatMultiSessionController'
import { useCurrentStore, useCurrentRawData } from './useCurrentDataBySession'
import useCurrentSessionId from './useCurrentSessionId'
import type { ChatListRenderType } from './aiRender'

/** 向上/向下固定预取条数 */
const LOAD_AHEAD = 10
/** 向后保留条数（已滚过的不立即淘汰，保留 5 条缓冲） */
const KEEP_BEHIND = 5
/** 强制保留最新尾部条数（人在中间看历史时，底部流式输出不丢展示） */
const TAIL_KEEP = 30

/**
 * 上滑加载更旧历史 + 视窗内存回收（casual / task 通用）。
 *
 * 触发机制：rangeChanged（视窗变化驱动一切）。
 * elements 全量常驻，contents 按需缓存。
 *
 * onRangeChange 一次回调做四件事：
 * 1. 可见区 [start,end] 缺正文 → 立即 hydrate（IDB → 内存 + bump renderNum）
 * 2. 按方向额外预取 LOAD_AHEAD 条
 * 3. 触顶(startIndex===0)且可见区全齐且 grpcOffset>0 → requestRecoveryHistory（gRPC 兜底）
 * 4. 淘汰：keep = 视窗 + 向前 LOAD_AHEAD + 向后 KEEP_BEHIND + 最新尾部 TAIL_KEEP；
 *    contents 里不在 keep 的删除
 *
 * @param chatType 'reAct'（casual 空闲对话）/ 'task'（任务对话）
 */
const useLoadOlder = (chatType: ChatListRenderType) => {
  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()
  const rawData = useCurrentRawData()

  /** 上次 startIndex，用于判断滚动方向 */
  const lastStartIndexRef = useRef(-1)

  /** 置/关 loading（gRPC recovery 异步等待时给 Header 转圈提示） */
  const setLoading = useMemoizedFn((on: boolean) => {
    const state = store.getState()
    const key = chatType === 'reAct' ? 'casualLoadMoreLoading' : 'taskLoadMoreLoading'
    store.getState().updateState({
      requestHistoryState: { ...state.requestHistoryState, [key]: on },
    })
  })

  // 切会话时重置方向跟踪 + 清空旧 contents（旧 session Map 占内存）
  useEffect(() => {
    lastStartIndexRef.current = -1
    // 清空旧 session 的 contents 视窗（保留 IDB，可恢复）
    if (sessionId && rawData.contents.size > 0) {
      const tokens = [...rawData.contents.keys()]
      globalSessionEngine.removeContentsFromMemory(sessionId, tokens)
    }
  }, [sessionId])

  /** 取当前 chatType 的 elements */
  const getElements = useMemoizedFn(() => {
    const state = store.getState()
    return chatType === 'reAct' ? state.casualChat.elements : state.taskChat.elements
  })

  /**
   * 展开 element 为 token 列表（含 group/task 的 children，最多两层：task→group→item）。
   * 真实结构：group 的 children 是叶子 item；task 的 children 可能是 group 或 item，
   * group 下不再嵌套 group，所以固定两层展开即可，不需要通用递归。
   */
  const expandTokens = useMemoizedFn((el: { kind: string; token: string }): string[] => {
    const state = store.getState()
    const tokens = [el.token]
    if (el.kind === 'group') {
      const children = state.groups[el.token]?.childrenTokens || []
      tokens.push(...children)
    } else if (el.kind === 'task') {
      const children = state.tasks[el.token]?.childrenTokens || []
      for (const childToken of children) {
        tokens.push(childToken)
        // task 的 child 可能是 group，再展开一层 group 的 children（叶子 item）
        const childGroup = state.groups[childToken]
        if (childGroup?.childrenTokens?.length) {
          tokens.push(...childGroup.childrenTokens)
        }
      }
    }
    return tokens
  })

  /** 收集指定 index 区间内"树里有、contents 缺正文"的 token */
  const collectMissingByRange = useMemoizedFn((startIndex: number, endIndex: number): string[] => {
    const elements = getElements()
    const lo = Math.max(0, startIndex)
    const hi = Math.min(elements.length - 1, endIndex)
    const missing: string[] = []
    for (let i = lo; i <= hi; i++) {
      const el = elements[i]
      if (!el) continue
      for (const tok of expandTokens(el)) {
        if (!rawData.contents.has(tok)) missing.push(tok)
      }
    }
    return missing
  })

  /** 按 token 列表从 IDB 补灌 + 灌内存 + bump renderNum（按 kind） */
  const hydrateTokens = useMemoizedFn(async (tokens: string[]) => {
    if (!tokens.length || !sessionId) return
    const rows = await globalSessionEngine.persistGetSessionContents(sessionId, tokens)
    const state = store.getState()
    for (const row of rows) {
      rawData.contents.set(row.token, row.content)
      // 按 kind bump renderNum：item→items，group→groups，task→tasks
      if (state.items[row.token]) {
        store.getState().incrementNodeVersion(row.token, 'item')
      } else if (state.groups[row.token]) {
        store.getState().incrementNodeVersion(row.token, 'group')
      } else if (state.tasks[row.token]) {
        store.getState().incrementNodeVersion(row.token, 'task')
      } else {
        store.getState().incrementNodeVersion(row.token, 'item')
      }
    }
    // IDB 仍缺的 token 不在此触发 gRPC——recovery_history 是前插更旧事件，不是按 token 补正文。
    // 树外更旧历史由 onRangeChange 里的"触顶 + grpcOffset>0"分支专门处理。
  })

  /** 计算 keep 集合（视窗 + 向前 LOAD_AHEAD + 向后 KEEP_BEHIND + 最新尾部 TAIL_KEEP） */
  const computeKeepTokens = useMemoizedFn((startIndex: number, endIndex: number): Set<string> => {
    const elements = getElements()
    if (!elements.length) return new Set()

    const keep = new Set<string>()
    // 视窗 + 向前预取(LOAD_AHEAD) + 向后保留(KEEP_BEHIND)
    const lo = Math.max(0, startIndex - LOAD_AHEAD)
    const hi = Math.min(elements.length - 1, endIndex + KEEP_BEHIND)
    for (let i = lo; i <= hi; i++) {
      const el = elements[i]
      if (!el) continue
      for (const tok of expandTokens(el)) keep.add(tok)
    }
    // 强制保留最新尾部
    const tailStart = Math.max(0, elements.length - TAIL_KEEP)
    for (let i = tailStart; i < elements.length; i++) {
      const el = elements[i]
      if (!el) continue
      for (const tok of expandTokens(el)) keep.add(tok)
    }
    return keep
  })

  /** 淘汰视窗外 contents */
  const evictOutsideViewport = useMemoizedFn((startIndex: number, endIndex: number) => {
    if (!sessionId) return
    const keep = computeKeepTokens(startIndex, endIndex)
    const toEvict: string[] = []
    for (const token of rawData.contents.keys()) {
      if (!keep.has(token)) toEvict.push(token)
    }
    if (toEvict.length) {
      globalSessionEngine.removeContentsFromMemory(sessionId, toEvict)
    }
  })

  /**
   * 视窗变化驱动加载 + 淘汰（接 Virtuoso rangeChanged）。
   */
  const onRangeChange = useMemoizedFn(({ startIndex, endIndex }: ListRange) => {
    if (!sessionId) return
    const elements = getElements()
    if (!elements.length) return

    // 跟踪滚动方向（startIndex 变小 = 向上滚）
    let direction: 'up' | 'down' | 'none' = 'none'
    if (lastStartIndexRef.current >= 0) {
      if (startIndex < lastStartIndexRef.current) {
        direction = 'up'
      } else if (startIndex > lastStartIndexRef.current) {
        direction = 'down'
      }
    }
    lastStartIndexRef.current = startIndex

    // 1. 可见区缺正文 → 立即 hydrate（保证不空白）
    const visibleMissing = collectMissingByRange(startIndex, endIndex)
    if (visibleMissing.length) {
      void hydrateTokens(visibleMissing)
    }

    // 2. 方向侧预取 LOAD_AHEAD 条
    let prefetchTokens: string[] = []
    if (direction === 'up') {
      const preLo = Math.max(0, startIndex - LOAD_AHEAD)
      const preHi = startIndex - 1
      if (preLo <= preHi) {
        prefetchTokens = collectMissingByRange(preLo, preHi)
      }
    } else if (direction === 'down') {
      const preLo = endIndex + 1
      const preHi = Math.min(elements.length - 1, endIndex + LOAD_AHEAD)
      if (preLo <= preHi) {
        prefetchTokens = collectMissingByRange(preLo, preHi)
      }
    }
    if (prefetchTokens.length > LOAD_AHEAD) {
      prefetchTokens = prefetchTokens.slice(0, LOAD_AHEAD)
    }
    if (prefetchTokens.length) {
      void hydrateTokens(prefetchTokens)
    }

    // 3. 触顶 + 可见区全齐 + 树外还有更旧 → gRPC recovery_history
    if (startIndex === 0 && direction === 'up' && rawData.grpcOffset > 0) {
      if (visibleMissing.length === 0) {
        setLoading(true)
        globalSessionEngine.requestRecoveryHistory(sessionId)
        setTimeout(() => setLoading(false), 3000)
      }
    }

    // 4. 淘汰视窗外
    evictOutsideViewport(startIndex, endIndex)
  })

  return { onRangeChange }
}

export default useLoadOlder
