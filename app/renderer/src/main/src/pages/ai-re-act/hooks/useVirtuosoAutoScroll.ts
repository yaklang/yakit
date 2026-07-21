import { useMemoizedFn, useThrottleFn } from 'ahooks'
import { useEffect, useRef } from 'react'
import type React from 'react'
import type { VirtuosoHandle } from 'react-virtuoso'

/** easeOutCubic：先快后慢，滚底落点更柔 */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

interface UseVirtuosoAutoScrollProps {
  total?: number
  isPrependingRef?: React.MutableRefObject<boolean>
  /** 与消费方 Virtuoso 的 atBottomThreshold 对齐，用于判断是否贴底 */
  atBottomThreshold?: number
}
const useVirtuosoAutoScroll = ({ total, isPrependingRef, atBottomThreshold = 50 }: UseVirtuosoAutoScrollProps) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  /**
   * 是否跟随底部（用户意图）。
   * 与 Virtuoso 的 atBottom 解耦：上滑后锁定为 false，只有用户主动回到底部才恢复。
   */
  const isAtBottomRef = useRef(true)
  /** 用户正在主动滚动（wheel / touch / keyboard） */
  const userScrollingRef = useRef(false)
  const userScrollTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const scrollerElRef = useRef<HTMLElement | null>(null)
  /** 自定义滚底动画 raf，可随时取消（不用 CSS smooth，避免延迟竞争） */
  const autoScrollRafRef = useRef<number>()
  /** 正在程序化改 scrollTop，期间忽略 atBottomStateChange(true)，防止把上滑意图冲掉 */
  const isProgrammaticScrollRef = useRef(false)
  /** 上滑锁定后的一小段时间内忽略 atBottom=true（防止动画尾帧/阈值误报把跟随又打开） */
  const ignoreAtBottomTrueUntilRef = useRef(0)

  const cancelAutoScrollAnim = useMemoizedFn(() => {
    if (autoScrollRafRef.current != null) {
      cancelAnimationFrame(autoScrollRafRef.current)
      autoScrollRafRef.current = undefined
    }
    isProgrammaticScrollRef.current = false
  })

  const getDistanceFromBottom = useMemoizedFn(() => {
    const el = scrollerElRef.current
    if (!el) return Number.POSITIVE_INFINITY
    return el.scrollHeight - el.clientHeight - el.scrollTop
  })

  /** 用户主动离开底部：锁定不跟随，直到再次贴底 */
  const unpinFromBottom = useMemoizedFn(() => {
    isAtBottomRef.current = false
    cancelAutoScrollAnim()
    // 忽略随后可能到来的过期 atBottom=true
    ignoreAtBottomTrueUntilRef.current = Date.now() + 300
  })

  /** 用户主动回到底部：恢复跟随 */
  const pinToBottom = useMemoizedFn(() => {
    isAtBottomRef.current = true
    ignoreAtBottomTrueUntilRef.current = 0
  })

  const markUserScrolling = useMemoizedFn((direction?: 'up' | 'down') => {
    userScrollingRef.current = true
    if (direction === 'up') {
      // 上滑：立刻锁定，后续生成增高也不再自动滚底
      unpinFromBottom()
    } else if (direction === 'down') {
      // wheel 时位置可能尚未更新，下一帧再判断是否贴底
      requestAnimationFrame(() => {
        if (getDistanceFromBottom() <= atBottomThreshold) {
          pinToBottom()
        }
      })
    } else {
      // 拖拽滚动条等未知方向：根据当前位置决定
      if (getDistanceFromBottom() > atBottomThreshold) {
        unpinFromBottom()
      }
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
      if (e.key === 'End') {
        pinToBottom()
        markUserScrolling('down')
        return
      }
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
        // 松手后再看一次位置，拖离底部则锁定
        if (getDistanceFromBottom() > atBottomThreshold) {
          unpinFromBottom()
        } else {
          pinToBottom()
        }
        // mouseup 后延迟一段时间再取消标记，避免惯性滚动
        userScrollTimerRef.current = setTimeout(() => {
          userScrollingRef.current = false
        }, 200)
        document.removeEventListener('mouseup', onMouseUp)
      }
      document.addEventListener('mouseup', onMouseUp)
    }
  })

  // 卸载时清理 timer / raf 和事件监听
  useEffect(() => {
    return () => {
      if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current)
      cancelAutoScrollAnim()
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
    cancelAutoScrollAnim()

    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: true })
      el.addEventListener('touchmove', handleTouchMove, { passive: true })
      el.addEventListener('keydown', handleKeyDown)
      el.addEventListener('mousedown', handleMouseDown)
    }
  })

  const scrollToIndex = useMemoizedFn((index: 'LAST' | number, behavior?: 'auto' | 'smooth') => {
    const isLast = index === 'LAST' || (total != null && index === total - 1)
    if (isLast) {
      pinToBottom()
    } else {
      unpinFromBottom()
    }
    requestIdleCallback(() => {
      virtuosoRef.current?.scrollToIndex({
        index,
        align: isLast ? 'end' : 'start',
        behavior: behavior || 'smooth',
        offset: isLast ? 0 : -100,
      })
    })
  })

  /**
   * 自研滚底动画（非 CSS smooth）：easeOutCubic 先快后慢。
   * 每帧追真实底部；用户上滑后 isAtBottomRef 锁死为 false，不会再开动画。
   */
  const smartScrollToBottom = useMemoizedFn(() => {
    const el = scrollerElRef.current
    if (!el) return
    if (!isAtBottomRef.current || userScrollingRef.current) return
    // 已在动画中：tick 会每帧追最新底部，打断重开会一直停在起步的「快」段
    if (autoScrollRafRef.current != null) return

    const start = el.scrollTop
    const getTarget = () => el.scrollHeight - el.clientHeight
    const distance = getTarget() - start
    if (distance <= 1) return

    // 距离越大略拉长，控制在 180~320ms，保证有动画感又不拖沓
    const duration = Math.min(320, Math.max(180, 160 + distance * 0.35))
    let startTs: number | undefined
    isProgrammaticScrollRef.current = true

    const tick = (ts: number) => {
      if (!isAtBottomRef.current || userScrollingRef.current) {
        autoScrollRafRef.current = undefined
        isProgrammaticScrollRef.current = false
        return
      }
      if (startTs == null) startTs = ts
      const t = Math.min(1, (ts - startTs) / duration)
      const eased = easeOutCubic(t)
      // 动画中内容继续长高时，每帧追最新底部
      const target = getTarget()
      el.scrollTop = start + (target - start) * eased

      if (t < 1) {
        autoScrollRafRef.current = requestAnimationFrame(tick)
      } else {
        el.scrollTop = getTarget()
        autoScrollRafRef.current = undefined
        isProgrammaticScrollRef.current = false
        // 收尾时若内容又长高了，接着开一轮，把剩余距离再 ease 一次
        if (isAtBottomRef.current && !userScrollingRef.current) {
          const remain = getTarget() - el.scrollTop
          if (remain > 1) smartScrollToBottom()
        }
      }
    }

    autoScrollRafRef.current = requestAnimationFrame(tick)
  })

  const setIsAtBottomRef = useMemoizedFn((flag: boolean) => {
    if (flag) {
      // 程序化滚底期间的 atBottom=true：忽略，否则会把用户上滑锁定冲掉
      if (isProgrammaticScrollRef.current) return
      // 上滑后短时间内的过期 atBottom=true：忽略
      if (Date.now() < ignoreAtBottomTrueUntilRef.current) return
      pinToBottom()
    } else {
      // 内容突然增大导致的 atBottomStateChange(false) 不应中断跟随
      // 只有用户主动滚动离开时才锁定
      if (userScrollingRef.current) {
        unpinFromBottom()
      }
    }
  })

  const { run: handleTotalListHeightChanged } = useThrottleFn(
    () => {
      // 向上加载历史数据时高度变化，不应触发滚动到底部
      if (isPrependingRef?.current) return
      // 用户已上滑锁定后，生成再长高也不跟随
      if (isAtBottomRef.current && !userScrollingRef.current) {
        smartScrollToBottom()
      }
    },
    { wait: 100 },
  )

  const scrollToItemIndex = useMemoizedFn((arrayIndex: number, behavior: 'auto' | 'smooth' = 'auto') => {
    unpinFromBottom()
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
