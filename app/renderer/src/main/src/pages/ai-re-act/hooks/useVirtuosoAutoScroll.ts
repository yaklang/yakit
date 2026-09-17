import { useMemoizedFn, useThrottleFn } from 'ahooks'
import { useEffect, useLayoutEffect, useRef } from 'react'
import type React from 'react'
import type { VirtuosoHandle } from 'react-virtuoso'

interface UseVirtuosoAutoScrollProps {
  total?: number
  isPrependingRef?: React.MutableRefObject<boolean>
  /** 历史批次处理期间记录阅读位置，提交后按同一条消息校正实际高度差。 */
  historyLoading?: boolean
}
const useVirtuosoAutoScroll = ({ total, isPrependingRef, historyLoading }: UseVirtuosoAutoScrollProps) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const isAtBottomRef = useRef(true)
  /** 用户正在主动滚动（wheel / touch / keyboard） */
  const userScrollingRef = useRef(false)
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const scrollerElRef = useRef<HTMLElement | null>(null)
  /** 用户当前阅读的消息及其相对视口位置；新的用户操作会取消旧位置校正。 */
  const historyAnchorRef = useRef<{ token: string; offset: number } | null>(null)

  /** 按稳定消息 token 记录位置，避免前插后数组下标变化导致定位到另一条消息。 */
  const captureHistoryAnchor = useMemoizedFn(() => {
    // 首屏自动补满仍应跟随底部；仅为用户回看历史保留阅读位置。
    if (isAtBottomRef.current) return
    const el = scrollerElRef.current
    if (!el || el.scrollHeight <= el.clientHeight) return
    const top = el.getBoundingClientRect().top
    const item = Array.from(el.querySelectorAll<HTMLElement>('[data-chat-token]')).find(
      (node) => node.getBoundingClientRect().bottom > top,
    )
    if (item)
      historyAnchorRef.current = { token: item.dataset.chatToken!, offset: item.getBoundingClientRect().top - top }
  })

  /** 只修正实际测量后的偏差；用户操作后立即停止，不与主动滚动争夺位置。 */
  const restoreHistoryAnchor = useMemoizedFn(() => {
    const el = scrollerElRef.current
    const anchor = historyAnchorRef.current
    if (!el || !anchor || historyLoading) return
    const item = Array.from(el.querySelectorAll<HTMLElement>('[data-chat-token]')).find(
      (node) => node.dataset.chatToken === anchor.token,
    )
    if (!item) return
    const diff = item.getBoundingClientRect().top - el.getBoundingClientRect().top - anchor.offset
    if (Math.abs(diff) > 1) el.scrollTop += diff
  })

  const handleScroll = useMemoizedFn(() => {
    if (historyLoading) captureHistoryAnchor()
    else restoreHistoryAnchor()
  })

  useLayoutEffect(() => {
    if (historyLoading) captureHistoryAnchor()
    else restoreHistoryAnchor()
  }, [historyLoading, captureHistoryAnchor, restoreHistoryAnchor])

  useEffect(() => {
    const list = scrollerElRef.current?.querySelector('[data-testid="virtuoso-item-list"]')
    if (!list) return
    const observer = new ResizeObserver(restoreHistoryAnchor)
    observer.observe(list)
    return () => observer.disconnect()
  }, [historyLoading, total, restoreHistoryAnchor])

  const markUserScrolling = useMemoizedFn((direction?: 'up' | 'down') => {
    historyAnchorRef.current = null
    userScrollingRef.current = true
    // 用户主动向上滚动，立即关闭自动滚动，无需等 atBottomStateChange
    if (direction === 'up') {
      isAtBottomRef.current = false
    }
    if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current)
    userScrollTimerRef.current = setTimeout(() => {
      userScrollingRef.current = false
    }, 200)
  })

  const upScrollKeys = useRef(new Set(['ArrowUp', 'PageUp', 'Home']))
  const scrollKeys = useRef(new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Space']))
  const handleKeyDown = useMemoizedFn((e: KeyboardEvent) => {
    if (scrollKeys.current.has(e.key) || (e.key === ' ' && !e.shiftKey)) {
      markUserScrolling(upScrollKeys.current.has(e.key) ? 'up' : 'down')
    }
  })

  const handleWheel = useMemoizedFn((e: WheelEvent) => {
    markUserScrolling(e.deltaY < 0 ? 'up' : 'down')
  })

  const handleTouchMove = useMemoizedFn(() => {
    markUserScrolling('up')
  })

  /** 检测鼠标拖拽滚动条：mousedown 在滚动条区域（clientX 超出 contentWidth） */
  const handleMouseDown = useMemoizedFn((e: MouseEvent) => {
    const el = scrollerElRef.current
    if (!el) return
    // 点击位置在内容区域右侧 = 点在滚动条上
    if (e.offsetX >= el.clientWidth || e.offsetY >= el.clientHeight) {
      markUserScrolling()
      const onMouseUp = () => {
        // mouseup 后延迟一段时间再取消标记，避免惯性滚动
        userScrollTimerRef.current = setTimeout(() => {
          userScrollingRef.current = false
        }, 200)
        document.removeEventListener('mouseup', onMouseUp)
      }
      document.addEventListener('mouseup', onMouseUp)
    }
  })

  // 卸载时清理 timer 和事件监听
  useEffect(() => {
    return () => {
      if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current)
      if (scrollerElRef.current) {
        scrollerElRef.current.removeEventListener('wheel', handleWheel)
        scrollerElRef.current.removeEventListener('touchmove', handleTouchMove)
        scrollerElRef.current.removeEventListener('keydown', handleKeyDown)
        scrollerElRef.current.removeEventListener('mousedown', handleMouseDown)
        scrollerElRef.current.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  /** 传给 Virtuoso 的 scrollerRef，自动挂载 wheel/touchmove/keydown 监听 */
  const setScrollerRef = useMemoizedFn((ref: HTMLElement | Window | null) => {
    const el = ref instanceof HTMLElement ? ref : null

    if (scrollerElRef.current) {
      scrollerElRef.current.removeEventListener('wheel', handleWheel)
      scrollerElRef.current.removeEventListener('touchmove', handleTouchMove)
      scrollerElRef.current.removeEventListener('keydown', handleKeyDown)
      scrollerElRef.current.removeEventListener('mousedown', handleMouseDown)
      scrollerElRef.current.removeEventListener('scroll', handleScroll)
    }

    scrollerElRef.current = el

    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: true })
      el.addEventListener('touchmove', handleTouchMove, { passive: true })
      el.addEventListener('keydown', handleKeyDown)
      el.addEventListener('mousedown', handleMouseDown)
      el.addEventListener('scroll', handleScroll, { passive: true })
    }
  })

  const scrollToIndex = useMemoizedFn((index: 'LAST' | number, behavior?: 'auto' | 'smooth') => {
    historyAnchorRef.current = null
    const isLast = index === 'LAST' || (total != null && index === total - 1)
    isAtBottomRef.current = isLast
    requestIdleCallback(() => {
      virtuosoRef.current?.scrollToIndex({
        index,
        align: isLast ? 'end' : 'start',
        behavior: behavior || 'smooth',
        offset: isLast ? 0 : -100,
      })
    })
  })

  const smartScrollToBottom = useMemoizedFn(() => {
    requestAnimationFrame(() => {
      if (!isAtBottomRef.current || userScrollingRef.current) return
      virtuosoRef.current?.scrollToIndex({
        index: 'LAST',
        align: 'end',
        behavior: 'auto',
        offset: 0,
      })
    })
  })

  const setIsAtBottomRef = useMemoizedFn((flag: boolean) => {
    if (flag) {
      // 滚到底部了，恢复自动滚动
      isAtBottomRef.current = true
    } else {
      // 只有用户主动滚动才关闭自动滚动
      // 内容突然增大导致的 atBottomStateChange(false) 不应中断自动滚动
      if (userScrollingRef.current) {
        isAtBottomRef.current = false
      }
    }
  })

  const { run: handleTotalListHeightChanged } = useThrottleFn(
    () => {
      // 向上加载历史数据时高度变化，不应触发滚动到底部
      if (isPrependingRef?.current) return
      if (isAtBottomRef.current && !userScrollingRef.current) {
        smartScrollToBottom()
      }
    },
    { wait: 150 },
  )

  const scrollToItemIndex = useMemoizedFn((arrayIndex: number, behavior: 'auto' | 'smooth' = 'auto') => {
    historyAnchorRef.current = null
    isAtBottomRef.current = false
    requestAnimationFrame(() => {
      virtuosoRef.current?.scrollToIndex({
        index: arrayIndex,
        align: 'center',
        behavior,
      })
    })
  })

  return {
    virtuosoRef,
    setScrollerRef,
    setIsAtBottomRef,
    scrollToIndex,
    scrollToItemIndex,
    handleTotalListHeightChanged,
    isAtBottomRef,
  }
}

export default useVirtuosoAutoScroll
