import { useMemoizedFn, useThrottleFn } from 'ahooks'
import { useEffect, useRef } from 'react'
import type { VirtuosoHandle } from 'react-virtuoso'

interface UseVirtuosoAutoScrollOptions {
  atBottomThreshold?: number
  total?: number
}

const useVirtuosoAutoScroll = (options: UseVirtuosoAutoScrollOptions) => {
  const { atBottomThreshold = 80, total } = options
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const isAtBottomRef = useRef(true)
  const scrollerRef = useRef<HTMLElement | Window | null>(null)
  const prevScrollTopRef = useRef<number>(0) // 上一次 scrollTop，用于检测滚动方向
  const rafIdRef = useRef<number>(0) // 当前 rAF ID，用于取消挂起的自动滚动

  // 检查是否接近底部
  const checkIsAtBottom = useMemoizedFn(() => {
    const scroller = scrollerRef.current
    if (scroller instanceof HTMLElement) {
      const distanceToBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
      return distanceToBottom <= atBottomThreshold
    }
    return true
  })

  // scroll 事件处理 —— 通过 scrollTop 变化检测方向，不依赖 wheel 事件
  const { run: onScroll } = useThrottleFn(
    () => {
      const scroller = scrollerRef.current
      if (!(scroller instanceof HTMLElement)) return

      const currentScrollTop = scroller.scrollTop
      const prev = prevScrollTopRef.current
      prevScrollTopRef.current = currentScrollTop

      // scrollTop 减小 → 用户往上滚了（容差 2px 过滤抖动）
      if (currentScrollTop < prev - 2) {
        isAtBottomRef.current = false
        cancelAnimationFrame(rafIdRef.current)
      } else if (currentScrollTop > prev) {
        // scrollTop 增大 → 用户往下滚了，检查是否到底
        isAtBottomRef.current = checkIsAtBottom()
      }
    },
    { wait: 30 },
  )

  // 键盘事件处理
  const onKeyDown = useMemoizedFn((e: KeyboardEvent) => {
    if (e.key === 'PageDown' || e.key === 'End' || e.key === 'ArrowDown') {
      // 延迟检查，等滚动完成
      setTimeout(() => {
        isAtBottomRef.current = checkIsAtBottom()
      }, 50)
    } else if (e.key === 'PageUp' || e.key === 'Home' || e.key === 'ArrowUp') {
      isAtBottomRef.current = false
    }
  })

  // 触摸事件处理
  const touchStartY = useRef<number>(0)
  const onTouchStart = useMemoizedFn((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  })

  const onTouchMove = useMemoizedFn((e: TouchEvent) => {
    const deltaY = touchStartY.current - e.touches[0].clientY
    if (deltaY < 0) {
      isAtBottomRef.current = false
    } else if (deltaY > 0) {
      isAtBottomRef.current = checkIsAtBottom()
    }
    touchStartY.current = e.touches[0].clientY
  })

  const setScrollerRef = useMemoizedFn((ref: HTMLElement | Window | null) => {
    // 解绑旧的事件
    if (scrollerRef.current && scrollerRef.current instanceof HTMLElement) {
      scrollerRef.current.removeEventListener('scroll', onScroll)
      scrollerRef.current.removeEventListener('keydown', onKeyDown)
      scrollerRef.current.removeEventListener('touchstart', onTouchStart)
      scrollerRef.current.removeEventListener('touchmove', onTouchMove)
    }
    scrollerRef.current = ref
    // 绑定新的事件
    if (ref && ref instanceof HTMLElement) {
      ref.addEventListener('scroll', onScroll, { passive: true })
      ref.addEventListener('keydown', onKeyDown)
      ref.addEventListener('touchstart', onTouchStart, { passive: true })
      ref.addEventListener('touchmove', onTouchMove, { passive: true })
    }
  })

  // 组件卸载时清理事件
  useEffect(() => {
    return () => {
      if (scrollerRef.current && scrollerRef.current instanceof HTMLElement) {
        scrollerRef.current.removeEventListener('scroll', onScroll)
        scrollerRef.current.removeEventListener('keydown', onKeyDown)
        scrollerRef.current.removeEventListener('touchstart', onTouchStart)
        scrollerRef.current.removeEventListener('touchmove', onTouchMove)
      }
      cancelAnimationFrame(rafIdRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const smartScrollToBottom = () => {
    cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = requestAnimationFrame(() => {
      if (!isAtBottomRef.current) return
      const scroller = scrollerRef.current
      if (scroller instanceof HTMLElement) {
        scroller.scrollTop = scroller.scrollHeight
      }
    })
  }

  const { run: handleTotalListHeightChanged } = useThrottleFn(
    () => {
      if (isAtBottomRef.current && total && total > 0) {
        smartScrollToBottom()
      }
    },
    { wait: 150 },
  )

  return { virtuosoRef, setScrollerRef, scrollToIndex, handleTotalListHeightChanged }
}

export default useVirtuosoAutoScroll
