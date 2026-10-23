import { useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'

/**
 * 文件内容搜索高亮清理：重搜结束 / 关闭搜索面板时调用 onClear。
 * AI / yakRunner 各自传入清空预览高亮的实现即可复用。
 */
export const useClearFileSearchHighlights = (active: boolean, onClear: () => void) => {
  const clearHighlights = useMemoizedFn(onClear)

  const onSearchSettled = useMemoizedFn(() => {
    clearHighlights()
  })

  const wasActiveRef = useRef(false)
  useEffect(() => {
    if (active) {
      wasActiveRef.current = true
      return
    }
    if (!wasActiveRef.current) return
    wasActiveRef.current = false
    clearHighlights()
  }, [active, clearHighlights])

  return { onSearchSettled }
}
