/**
 * react-resize-detector v6 在 React 19 下不可用（内部 findDOMNode 已移除）。
 * 用 ResizeObserver 对齐 v6 语义：
 * - 传 targetRef 时观测 targetRef.current；
 * - 有 children 时原位渲染（v6 为 cloneElement 不包 wrapper），观测锚点 div 的父元素——
 *   仓库唯一 children 用法（YakEditor）的子树以 100%×100% 撑满父级，量值与 v6 观测子节点本身一致；
 * - 无 children 时同样观测锚点 div 的父元素。
 */
import type React from 'react'
import { useEffect, useRef } from 'react'

export interface Props {
  onResize?: (width?: number, height?: number) => void
  handleWidth?: boolean
  handleHeight?: boolean
  refreshMode?: 'debounce'
  refreshRate?: number
  targetRef?: React.RefObject<HTMLElement | null>
  children?: React.ReactNode
}

type PatchedHandler = ((entries: ResizeObserverEntry[]) => void) & { cancel?: () => void }

function createDebounce(cb: (entries: ResizeObserverEntry[]) => void, wait: number): PatchedHandler {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = (entries: ResizeObserverEntry[]) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => cb(entries), wait)
  }
  debounced.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  return debounced
}

const ReactResizeDetector: React.FC<Props> = ({
  onResize,
  handleWidth = true,
  handleHeight = true,
  refreshMode,
  refreshRate = 1000,
  targetRef,
  children,
}) => {
  const anchorRef = useRef<HTMLDivElement>(null)
  // onResize 经 ref 取最新值，回调变化不必重建 observer；写入放 effect，render 期写 ref 会触发 react-hooks/refs
  const onResizeRef = useRef(onResize)
  useEffect(() => {
    onResizeRef.current = onResize
  })

  useEffect(() => {
    const target = targetRef?.current ?? anchorRef.current?.parentElement
    if (!target) return

    let lastWidth: number | undefined
    let lastHeight: number | undefined

    const raw = (entries: ResizeObserverEntry[]) => {
      entries.forEach((entry) => {
        const { width, height } = entry.contentRect
        if (lastWidth === width && lastHeight === height) return
        if ((lastWidth === width && !handleHeight) || (lastHeight === height && !handleWidth)) return
        lastWidth = width
        lastHeight = height
        onResizeRef.current?.(width, height)
      })
    }
    const handler: PatchedHandler = refreshMode === 'debounce' ? createDebounce(raw, refreshRate) : raw
    const observer = new ResizeObserver(handler)
    observer.observe(target)
    return () => {
      observer.disconnect()
      handler.cancel?.()
    }
  }, [refreshMode, refreshRate, handleWidth, handleHeight, targetRef])

  return (
    <>
      {children}
      <div ref={anchorRef} />
    </>
  )
}

export default ReactResizeDetector
