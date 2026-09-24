import { useCreation, useDebounceFn, useInViewport, useKeyPress, useMemoizedFn } from 'ahooks'
import type { RefObject } from 'react'
import {
  resolveMentionArrowScroll,
  resolveMentionArrowSelect,
  resolveMentionVirtualScrollTop,
  shouldInterceptMentionEnter,
} from './mentionKeyboard'

function useSwitchSelectByKeyboard<T>(
  ref: RefObject<HTMLDivElement | null> | null,
  params: {
    data: T[]
    selected?: T
    rowKey: string | ((v: T) => string)
    onSelectNumber: (m: number, isScroll: boolean) => void
    onEnter: () => void
    /** 固定行高；目标 DOM 未挂载（虚拟列表）时用于估算 scrollTop */
    defItemHeight?: number
    getContainer?: () => HTMLElement | null
    /** 面板关闭时必须为 false，否则会一直拦截编辑器 Enter */
    enabled?: boolean
  },
): void {
  const { data, selected, rowKey, onSelectNumber, onEnter, getContainer, enabled = true } = params

  const defItemHeight = useCreation(() => params.defItemHeight ?? 32, [params.defItemHeight])

  const [inViewport = true] = useInViewport(ref)
  const active = enabled && inViewport

  const getRowKey = useMemoizedFn((item: T) => {
    if (typeof rowKey === 'string') {
      return rowKey
    }
    return rowKey(item)
  })

  useKeyPress(
    active ? 'uparrow' : () => false,
    (e) => {
      e.stopPropagation()
      e.preventDefault()
      onUpArrow()
    },
    {
      target: getContainer ? getContainer() : undefined,
      exactMatch: true,
      useCapture: true,
    },
  )
  useKeyPress(
    active ? 'downarrow' : () => false,
    (e) => {
      e.stopPropagation()
      e.preventDefault()
      onDownArrow()
    },
    {
      target: getContainer ? getContainer() : undefined,
      exactMatch: true,
      useCapture: true,
    },
  )
  useKeyPress(
    active ? 'enter' : () => false,
    (e) => {
      if (
        !shouldInterceptMentionEnter({
          enabled,
          inViewport,
          dataLength: data.length,
          hasSelected: selected != null,
        })
      ) {
        return
      }
      e.stopPropagation()
      e.preventDefault()
      onEnterKey()
    },
    {
      target: getContainer ? getContainer() : undefined,
      exactMatch: true,
      useCapture: true,
    },
  )

  const applyArrowSelect = useMemoizedFn((direction: 'up' | 'down') => {
    if (!active) return
    if (!selected) {
      onSelectNumber(0, true)
      return
    }
    const currentRowKey = getRowKey(selected)
    const currentIndex = data.findIndex((item) => getRowKey(item) === currentRowKey)
    const nextIndex = resolveMentionArrowSelect({ currentIndex, dataLength: data.length, direction })
    if (nextIndex == null) return

    const id = data[nextIndex] ? getRowKey(data[nextIndex]) : ''
    const container = ref?.current
    const el = id ? document.getElementById(id) : null

    // 已挂载：在可视区内移动不高亮滚动；进入顶部/底部一个 item 缓冲区后再滚
    if (el && container) {
      const scroll = resolveMentionArrowScroll({
        direction,
        containerRect: container.getBoundingClientRect(),
        itemRect: el.getBoundingClientRect(),
      })
      if (scroll.shouldScroll) {
        container.scrollTop += scroll.delta
      }
      onSelectNumber(nextIndex, false)
      return
    }

    // 虚拟列表未挂载目标行：按固定行高估算，避免 scrollTo(index) 把项顶到顶部
    if (container && defItemHeight > 0) {
      container.scrollTop = resolveMentionVirtualScrollTop({
        nextIndex,
        clientHeight: container.clientHeight,
        itemHeight: defItemHeight,
        direction,
      })
      onSelectNumber(nextIndex, false)
      return
    }

    onSelectNumber(nextIndex, true)
  })

  const onUpArrow = useDebounceFn(() => applyArrowSelect('up'), { wait: 100, leading: true }).run
  const onDownArrow = useDebounceFn(() => applyArrowSelect('down'), { wait: 100, leading: true }).run

  const onEnterKey = useDebounceFn(
    () => {
      if (active) onEnter()
    },
    { wait: 200, leading: true },
  ).run
}

export default useSwitchSelectByKeyboard
