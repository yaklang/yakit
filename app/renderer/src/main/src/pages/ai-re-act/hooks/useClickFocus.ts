import { useRef, useState } from 'react'
import { useClickAway, useMemoizedFn } from 'ahooks'

/**
 * 点击容器获得焦点，点击容器外失去焦点
 * 用于控制滚动条显隐、边框高亮等需要"点击激活、失焦还原"的场景
 */
function useClickFocus<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null)
  const [isFocus, setIsFocus] = useState(false)

  useClickAway(() => {
    setIsFocus(false)
  }, ref)

  const onClick = useMemoizedFn(() => {
    setIsFocus(true)
  })

  return { ref, isFocus, onClick }
}

export default useClickFocus
