import { useEffect, useRef, useState } from 'react'

/** 判断事件是否发生在容器内部（含嵌套子组件、Shadow DOM） */
function isEventInside(container: HTMLElement, event: Event): boolean {
  if (typeof event.composedPath === 'function') {
    const path = event.composedPath()
    if (path.includes(container)) return true
    return path.some((node) => node instanceof Node && container.contains(node))
  }

  const target = event.target as Node | null
  return !!target && container.contains(target)
}

/**
 * 点击容器获得焦点，点击容器外失去焦点
 * 用于控制滚动条显隐、边框高亮等需要「点击激活、失焦还原」的场景
 */
function useClickFocus<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null)
  const [isFocus, setIsFocus] = useState(false)

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const el = ref.current
      if (!el) return

      setIsFocus(isEventInside(el, event))
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
    }
  }, [])

  return { ref, isFocus }
}

export default useClickFocus
