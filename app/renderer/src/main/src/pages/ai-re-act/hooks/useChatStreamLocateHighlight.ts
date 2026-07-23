import { useEffect, useRef } from 'react'
import type React from 'react'
import { useMemoizedFn } from 'ahooks'
import highlightStyles from './aiChatItemHighlight.module.scss'

interface UseChatStreamLocateHighlightProps {
  scrollToIndex: (index: number, behavior?: 'auto' | 'smooth') => void
  /** 列表根节点，缩小 data-index 查询范围，避免命中同页其他 Virtuoso（如时间线） */
  listRootRef?: React.RefObject<HTMLElement | null>
}

const HIGHLIGHT_CLASS = highlightStyles['item-wrapper-highlighted']
const HIGHLIGHT_DURATION = 1600

/**
 * 对话流定位并高亮。
 * 高亮通过 DOM classList 施加，避免 React state 变更导致 Virtuoso Item 重建、列表项 remount，
 * 从而把 ConcurrentStreamCard 等本地展开状态冲掉。
 */
const useChatStreamLocateHighlight = ({ scrollToIndex, listRootRef }: UseChatStreamLocateHighlightProps) => {
  const highlightRafRef = useRef(0)
  const highlightObserverRef = useRef<IntersectionObserver | null>(null)
  const highlightedElRef = useRef<Element | null>(null)
  const highlightClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHighlight = useMemoizedFn(() => {
    if (highlightClearTimerRef.current != null) {
      clearTimeout(highlightClearTimerRef.current)
      highlightClearTimerRef.current = null
    }
    highlightedElRef.current?.classList.remove(HIGHLIGHT_CLASS)
    highlightedElRef.current = null
  })

  const cleanupHighlightWatcher = useMemoizedFn(() => {
    if (highlightRafRef.current) {
      cancelAnimationFrame(highlightRafRef.current)
      highlightRafRef.current = 0
    }
    highlightObserverRef.current?.disconnect()
    highlightObserverRef.current = null
  })

  const queryItemEl = useMemoizedFn((targetIndex: number) => {
    const root = listRootRef?.current
    if (!root) return null
    // 限定在当前列表容器内查找，避免同页多个 Virtuoso 的 data-index 撞车
    return root.querySelector(`[data-index="${targetIndex}"]`)
  })

  const isListVisible = useMemoizedFn(() => {
    const root = listRootRef?.current
    const rect = root?.getBoundingClientRect()
    return !!root && root.offsetParent !== null && !!rect && rect.width > 0 && rect.height > 0
  })

  /** 等列表恢复可见并完成滚动后再高亮 */
  const waitAndHighlight = useMemoizedFn(
    (targetIndex: number, behavior: 'auto' | 'smooth', retryScrollWhenVisible: boolean) => {
      cleanupHighlightWatcher()
      clearHighlight()

      let attempts = 0
      let retriedScroll = false
      const tryObserve = () => {
        if (++attempts > 120) return
        // listRootRef 未挂载或列表 display:none 时，等下一帧再试
        if (!isListVisible()) {
          highlightRafRef.current = requestAnimationFrame(tryObserve)
          return
        }
        // 列表刚恢复可见：display:none 期间的 scrollToIndex 无效，补滚一次
        if (retryScrollWhenVisible && !retriedScroll) {
          retriedScroll = true
          scrollToIndex(targetIndex, behavior)
          highlightRafRef.current = requestAnimationFrame(tryObserve)
          return
        }
        // Virtuoso Item 的 data-index 是 originalIndex（相对下标）
        const el = queryItemEl(targetIndex)
        if (!el) {
          // scrollToIndex 后 Virtuoso 异步渲染，元素还没出来；首次找不到时补滚一次
          if (!retriedScroll) {
            retriedScroll = true
            scrollToIndex(targetIndex, behavior)
          }
          highlightRafRef.current = requestAnimationFrame(tryObserve)
          return
        }
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              clearHighlight()
              el.classList.add(HIGHLIGHT_CLASS)
              highlightedElRef.current = el
              highlightClearTimerRef.current = setTimeout(() => {
                clearHighlight()
              }, HIGHLIGHT_DURATION)
              observer.disconnect()
              highlightObserverRef.current = null
            }
          },
          { threshold: 0.1 },
        )
        observer.observe(el)
        highlightObserverRef.current = observer
      }
      highlightRafRef.current = requestAnimationFrame(tryObserve)
    },
  )

  useEffect(() => {
    return () => {
      cleanupHighlightWatcher()
      clearHighlight()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 按数组下标滚动并高亮 */
  const locateToIndex = useMemoizedFn((arrayIndex: number, behavior: 'auto' | 'smooth' = 'auto') => {
    if (arrayIndex < 0) return
    const retryScrollWhenVisible = !isListVisible()
    scrollToIndex(arrayIndex, behavior)
    waitAndHighlight(arrayIndex, behavior, retryScrollWhenVisible)
  })

  return {
    locateToIndex,
  }
}

export default useChatStreamLocateHighlight
