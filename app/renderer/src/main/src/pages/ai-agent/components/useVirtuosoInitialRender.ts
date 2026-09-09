import { Children, useEffect, useMemo, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import type { ContextProp, ListProps } from 'react-virtuoso'

export interface VirtuosoReadyContext {
  onReady: () => void
}

interface UseVirtuosoInitialRenderProps {
  dataLength: number
  onHeightChanged: () => void
}

const initialTopMostItemIndex = { index: 'LAST', align: 'end', behavior: 'auto' } as const

/** 管理首屏渲染状态；由调用方的会话 key 在切换会话时重置。 */
export const useVirtuosoInitialRender = ({ dataLength, onHeightChanged }: UseVirtuosoInitialRenderProps) => {
  const [listReady, setListReady] = useState(false)
  const handleListReady = useMemoizedFn(() => setListReady(true))
  const virtuosoContext = useMemo<VirtuosoReadyContext>(() => ({ onReady: handleListReady }), [handleListReady])
  const renderLoading = dataLength > 0 && !listReady

  const handleListHeightChanged = useMemoizedFn(() => {
    // 首次滚动交给 initialTopMostItemIndex，就绪后再跟随内容高度变化。
    if (!listReady) return
    onHeightChanged()
  })

  return { renderLoading, virtuosoContext, handleListHeightChanged, initialTopMostItemIndex }
}

/** 在自定义 List 中使用：列表项已挂载，且 Virtuoso 已完成首次定位时通知就绪。 */
export const useVirtuosoListReady = ({
  children,
  style,
  context,
}: Pick<ListProps, 'children' | 'style'> & ContextProp<VirtuosoReadyContext>) => {
  const hasItems = Children.count(children) > 0
  useEffect(() => {
    // Virtuoso 首次定位期间会隐藏 List，仅挂载列表项还不能结束 loading。
    if (hasItems && style?.visibility !== 'hidden') context.onReady()
  }, [hasItems, style?.visibility, context.onReady])
}
