import type { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import { useCurrentStore, useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { FC, memo, ReactNode, useMemo } from 'react'
import { useStore } from 'zustand'

type StaticChatContentProps = {
  token: string
  render?: (contentItem: AIChatQSData) => ReactNode
}

const StaticChatContent: FC<StaticChatContentProps> = ({ token, render }) => {
  const store = useCurrentStore()
  const renderNum = useStore(store, (state) => state.items[token].renderNum)
  const rawData = useCurrentRawData()
  const chatItem = useMemo(() => {
    if (!rawData) return null
    const itemData = rawData.contents.get(token)
    if (!itemData) return null
    if (itemData.data != null && typeof itemData.data === 'object') {
      return { ...itemData, data: Object.assign({}, itemData.data) } as AIChatQSData
    }
    return { ...itemData } as AIChatQSData
  }, [renderNum])

  if (!chatItem) return null
  return <>{render?.(chatItem)}</>
}
export default memo(StaticChatContent)
