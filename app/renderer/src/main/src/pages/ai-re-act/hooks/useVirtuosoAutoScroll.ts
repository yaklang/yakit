import { useMemoizedFn, useThrottleFn } from 'ahooks'
import { useEffect, useRef } from 'react'
import type { VirtuosoHandle } from 'react-virtuoso'

const useVirtuosoAutoScroll = () => {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const isAtBottomRef = useRef(true)
  /** 用户正在主动滚动（wheel / touch / keyboard） */
  const userScrollingRef = useRef(false)
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const scrollerElRef = useRef<HTMLElement | null>(null)

  const markUserScrolling = useMemoizedFn((direction?: 'up' | 'down') => {
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
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 传给 Virtuoso 的 scrollerRef，自动挂载 wheel/touchmove/keydown 监听 */
  const setScrollerRef = useMemoizedFn((ref: HTMLElement | Window | null) => {
    const el = ref instanceof HTMLElement ? ref : null

    if (scrollerElRef.current) {
      scrollerElRef.current.removeEventListener('wheel', handleWheel)
      scrollerElRef.current.removeEventListener('touchmove', handleTouchMove)
      scrollerElRef.current.removeEventListener('keydown', handleKeyDown)
      scrollerElRef.current.removeEventListener('mousedown', handleMouseDown)
    }

    scrollerElRef.current = el

    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: true })
      el.addEventListener('touchmove', handleTouchMove, { passive: true })
      el.addEventListener('keydown', handleKeyDown)
      el.addEventListener('mousedown', handleMouseDown)
    }
  })

  const scrollToIndex = useMemoizedFn((index: 'LAST' | number, behavior?: 'auto' | 'smooth') => {
    requestIdleCallback(() => {
      virtuosoRef.current?.scrollToIndex({
        index,
        align: index === 'LAST' ? 'end' : 'start',
        behavior: behavior || 'smooth',
        offset: index === 'LAST' ? 0 : -100,
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
      if (isAtBottomRef.current && !userScrollingRef.current) {
        smartScrollToBottom()
      }
    },
    { wait: 150 },
  )

  return {
    virtuosoRef,
    setScrollerRef,
    setIsAtBottomRef,
    scrollToIndex,
    handleTotalListHeightChanged,
    isAtBottomRef,
  }
}

export default useVirtuosoAutoScroll
