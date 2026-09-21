import { useMemoizedFn } from 'ahooks'
import { useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import type { ListRange } from 'react-virtuoso'
import { globalSessionEngine } from './ChatMultiSessionController'
import { useCurrentStore, useCurrentRawData } from './useCurrentDataBySession'
import useCurrentSessionId from './useCurrentSessionId'
import { AITaskStatus } from './grpcApi'
import { type ChatListRenderType } from './aiRender'
import { applyHydratedStageSettled } from './persist/contentPersistHelper'
import { collectEvictableContentTokens } from './contentEvict'

/** 向上/向下固定预取条数 */
const LOAD_AHEAD = 10
/** 向后保留条数（已滚过的不立即淘汰，贴底回看时减少空壳灌内容撑高） */
const KEEP_BEHIND = 15
/** 强制保留最新尾部条数（人在中间看历史时，底部流式输出不丢展示） */
const TAIL_KEEP = 30
/** firstItemIndex 起始偏移 */
const PREPEND_OFFSET = 1000000

/**
 * 上滑加载更旧历史 + 视窗内存回收（casual / task 通用）。
 *
 * - Virtuoso startReached 触发 handleLoadMore，grpcOffset>0 时发 recovery_history 前插更旧事件
 * - firstItemIndex 前插补偿：数据前插时视口不跳动
 * - loading（grpcLoadMoreLoading）期间请求排队，结束后补发；atTop 兜底探针
 * - 互斥防后端表死锁：消息处理中（casualLoading / taskStatus.status=processing）禁止 gRPC
 *   向上加载（排队等处理结束补发）；反向由 handleSendMessage 拦 grpcLoadMoreLoading 期间的发送
 *
 * 内存回收由 rangeChanged 驱动（elements 全量常驻，contents 按需缓存）：
 * 1. 可见区缺正文 → 立即 hydrate（IDB → 内存 + bump renderNum）
 * 2. 按方向额外预取 LOAD_AHEAD 条
 * 3. 淘汰：keep = 视窗 + 向前 LOAD_AHEAD + 向后 KEEP_BEHIND + 最新尾部 TAIL_KEEP；
 *    contents 里不在 keep 的删除
 *
 * @param chatType 'reAct'（casual 空闲对话）/ 'task'（任务对话）
 */
const useLoadOlder = (chatType: ChatListRenderType) => {
  const sessionId = useCurrentSessionId()
  const store = useCurrentStore()
  const rawData = useCurrentRawData()

  /** recovery_history 在途状态（真实 gRPC loading，由 ChatMultiSessionController 置/关） */
  const loading = useStore(store, (s) => s.grpcLoadMoreLoading)
  const dataLength = useStore(store, (s) => s.chatElements.length)
  /**
   * 消息处理中（currentChatStatus.status=processing）。
   * 处理中禁止 gRPC 向上加载，避免与流式写入并发导致后端表死锁（IDB hydrate 不受影响）。
   */
  const processing = useStore(store, (s) => s.currentChatStatus.status === AITaskStatus.inProgress)

  /** 上次 startIndex（数组下标），用于判断滚动方向 */
  const lastStartIndexRef = useRef(-1)

  // #region 向上加载（与官方 useLoadHistory 一致：startReached + firstItemIndex 前插补偿 + 排队锁）
  const [firstItemIndex, setFirstItemIndex] = useState(PREPEND_OFFSET)

  const isPrependingRef = useRef(false)
  const atTopRef = useRef(false)
  const wasLoadingRef = useRef(false)
  const wasProcessingRef = useRef(false)

  // 排队锁
  const pendingRequestRef = useRef(false)

  // 【核心机制：Render 阶段状态派生】
  const [prevDataLength, setPrevDataLength] = useState(dataLength)
  const [prevSessionID, setPrevSessionID] = useState(sessionId)

  if (sessionId !== prevSessionID) {
    setFirstItemIndex(PREPEND_OFFSET)
    setPrevDataLength(dataLength)
    setPrevSessionID(sessionId)
    pendingRequestRef.current = false // 切换会话清空排队
  } else if (dataLength !== prevDataLength) {
    const diff = dataLength - prevDataLength
    if (diff > 0 && isPrependingRef.current) {
      setFirstItemIndex((prev) => Math.max(0, prev - diff))
    }
    setPrevDataLength(dataLength)
  }

  /** 树外（gRPC）是否还有更旧历史 */
  const fetchHasMore = useMemoizedFn(() => !!sessionId && rawData.grpcOffset > 0)

  const loadMore = useMemoizedFn(() => {
    if (sessionId) globalSessionEngine.requestRecoveryHistory(sessionId)
  })

  const handleLoadMore = useMemoizedFn(() => {
    if (!fetchHasMore() || !sessionId) return

    // gRPC 加载中或消息处理中：排队等结束，防后端表死锁
    if (loading || processing) {
      pendingRequestRef.current = true
      return
    }

    isPrependingRef.current = true
    loadMore()
  })

  const handleAtTopStateChange = useMemoizedFn((atTop: boolean) => {
    atTopRef.current = atTop
    if (atTop) {
      handleLoadMore()
    } else {
      // 离开顶部，清空排队
      pendingRequestRef.current = false
    }
  })

  // 统一处理加载完成后的副作用
  useEffect(() => {
    // 判定条件：刚结束加载（之前是 true，现在是 false）
    if (wasLoadingRef.current && !loading) {
      // 在 DOM Commit 后安全释放向上插入的标记
      isPrependingRef.current = false

      // 释放后立刻检查，刚才 loading 期间是不是有被拦截的请求
      if (pendingRequestRef.current) {
        pendingRequestRef.current = false
        handleLoadMore()
      }
      // 兜底补拉：延迟探针，loading 结束后仍停在顶部则再拉一次
      else if (atTopRef.current) {
        setTimeout(() => {
          if (atTopRef.current && fetchHasMore()) {
            handleLoadMore()
          }
        }, 50)
      }
    }
    wasLoadingRef.current = loading
  }, [loading, handleLoadMore, fetchHasMore])

  // 消息处理结束（processing true→false）后，补发排队中的向上加载
  useEffect(() => {
    if (wasProcessingRef.current && !processing && pendingRequestRef.current) {
      pendingRequestRef.current = false
      handleLoadMore()
    }
    wasProcessingRef.current = processing
  }, [processing, handleLoadMore])
  // #endregion

  // 切会话：cleanup 清旧会话；执行中不清。不要在切进来时清空当前 session。
  useEffect(() => {
    lastStartIndexRef.current = -1
    wasLoadingRef.current = false
    wasProcessingRef.current = false
    isPrependingRef.current = false
    atTopRef.current = false
    pendingRequestRef.current = false
    const leavingId = sessionId
    return () => {
      if (!leavingId) return
      if (globalSessionEngine.getSessionExecute(leavingId)) return
      globalSessionEngine.removeContentsFromMemory(leavingId)
    }
  }, [sessionId])

  /** 取当前 chatType 的 elements */
  const getElements = useMemoizedFn(() => {
    const state = store.getState()
    return state.chatElements
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
      applyHydratedStageSettled(row.content)
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
    // 树外更旧历史由 startReached → handleLoadMore（grpcOffset>0）专门处理。
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
    const currentReviewDetail = store.getState().currentReviewDetail
    if (currentReviewDetail.token) keep.add(currentReviewDetail.token)
    const toEvict = collectEvictableContentTokens(
      rawData.contents,
      keep,
      globalSessionEngine.getSessionExecute(sessionId),
    )
    if (toEvict.length) {
      globalSessionEngine.removeContentsFromMemory(sessionId, toEvict)
    }
  })

  /**
   * 视窗变化驱动 hydrate + 淘汰（接 Virtuoso rangeChanged）。
   * 向上加载（gRPC recovery_history）不走这里，由 startReached → handleLoadMore 承担。
   */
  const onRangeChange = useMemoizedFn(({ startIndex, endIndex }: ListRange) => {
    if (!sessionId) return
    const elements = getElements()
    if (!elements.length) return

    // rangeChanged 的 index 是绝对 index（含 firstItemIndex 偏移），换算为数组下标
    const start = startIndex - firstItemIndex
    const end = endIndex - firstItemIndex

    // 跟踪滚动方向（startIndex 变小 = 向上滚）
    let direction: 'up' | 'down' | 'none' = 'none'
    if (lastStartIndexRef.current >= 0) {
      if (start < lastStartIndexRef.current) {
        direction = 'up'
      } else if (start > lastStartIndexRef.current) {
        direction = 'down'
      }
    }
    lastStartIndexRef.current = start

    // 1. 可见区缺正文 → 立即 hydrate（保证不空白）
    const visibleMissing = collectMissingByRange(start, end)
    if (visibleMissing.length) {
      void hydrateTokens(visibleMissing)
    }

    // 2. 方向侧预取 LOAD_AHEAD 条
    let prefetchTokens: string[] = []
    if (direction === 'up') {
      const preLo = Math.max(0, start - LOAD_AHEAD)
      const preHi = start - 1
      if (preLo <= preHi) {
        prefetchTokens = collectMissingByRange(preLo, preHi)
      }
    } else if (direction === 'down') {
      const preLo = end + 1
      const preHi = Math.min(elements.length - 1, end + LOAD_AHEAD)
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

    // 3. 淘汰视窗外
    evictOutsideViewport(start, end)
  })

  return { onRangeChange, firstItemIndex, handleLoadMore, handleAtTopStateChange, isPrependingRef }
}

export default useLoadOlder
