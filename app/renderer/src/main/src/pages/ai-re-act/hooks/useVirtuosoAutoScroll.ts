import { useMemoizedFn, useThrottleFn } from 'ahooks'
import { useEffect, useRef } from 'react'
import type React from 'react'
import type { VirtuosoHandle } from 'react-virtuoso'

interface UseVirtuosoAutoScrollProps {
  total?: number
  isPrependingRef?: React.MutableRefObject<boolean>
}

const AT_BOTTOM_THRESHOLD = 100

const useVirtuosoAutoScroll = ({ total, isPrependingRef }: UseVirtuosoAutoScrollProps) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const isAtBottomRef = useRef(true)
  /** 用户正在主动滚动（wheel / touch / keyboard） */
  const userScrollingRef = useRef(false)
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const scrollerElRef = useRef<HTMLElement | null>(null)
  const detachListenersRef = useRef<(() => void) | null>(null)

  const syncAtBottomFromScroller = useMemoizedFn((el: HTMLElement) => {
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    isAtBottomRef.current = distance <= AT_BOTTOM_THRESHOLD
  })

  const markUserScrolling = useMemoizedFn((direction?: 'up' | 'down') => {
    userScrollingRef.current = true
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

  const handleScroll = useMemoizedFn(() => {
    const el = scrollerElRef.current
    if (!el) return
    syncAtBottomFromScroller(el)
  })

  /** 检测鼠标拖拽滚动条：mousedown 在滚动条区域（clientX 超出 contentWidth） */
  const handleMouseDown = useMemoizedFn((e: MouseEvent) => {
    const el = scrollerElRef.current
    if (!el) return
    if (e.offsetX >= el.clientWidth || e.offsetY >= el.clientHeight) {
      markUserScrolling()
      const onMouseUp = () => {
        userScrollTimerRef.current = setTimeout(() => {
          userScrollingRef.current = false
        }, 200)
        document.removeEventListener('mouseup', onMouseUp)
      }
      document.addEventListener('mouseup', onMouseUp)
    }
  })

  const detachScrollerListeners = useMemoizedFn(() => {
    detachListenersRef.current?.()
    detachListenersRef.current = null
  })

  const attachScrollerListeners = useMemoizedFn((el: HTMLElement) => {
    detachScrollerListeners()

    const onWheel = (e: WheelEvent) => handleWheel(e)
    const onTouchMove = () => handleTouchMove()
    const onKeyDown = (e: KeyboardEvent) => handleKeyDown(e)
    const onMouseDown = (e: MouseEvent) => handleMouseDown(e)
    const onScroll = () => handleScroll()

    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('keydown', onKeyDown)
    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('scroll', onScroll, { passive: true })

    detachListenersRef.current = () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('keydown', onKeyDown)
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('scroll', onScroll)
    }

    syncAtBottomFromScroller(el)
  })

  /** 传给 Virtuoso 的 scrollerRef，自动挂载 wheel/touchmove/keydown 监听 */
  const setScrollerRef = useMemoizedFn((ref: HTMLElement | Window | null) => {
    const el = ref instanceof HTMLElement ? ref : null
    if (scrollerElRef.current === el) return
    scrollerElRef.current = el
    if (el) {
      attachScrollerListeners(el)
    } else {
      detachScrollerListeners()
    }
  })

  useEffect(() => {
    const el = scrollerElRef.current
    if (el) {
      attachScrollerListeners(el)
    }
    return () => {
      if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current)
      detachScrollerListeners()
    }
  }, [attachScrollerListeners, detachScrollerListeners])

  const scrollToIndex = useMemoizedFn((index: 'LAST' | number, behavior?: 'auto' | 'smooth') => {
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
      isAtBottomRef.current = true
    } else if (userScrollingRef.current) {
      isAtBottomRef.current = false
    }
  })

  const { run: handleTotalListHeightChanged } = useThrottleFn(
    () => {
      if (isPrependingRef?.current) return
      const el = scrollerElRef.current
      if (el) {
        syncAtBottomFromScroller(el)
      }
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
