import type { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import { useCurrentStore, useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { FC, memo, useMemo } from 'react'
import { useStore } from 'zustand'
import AINodeItem from '../aiNodeItem/AINodeItem'

type StaticChatContentProps = {
  token: string
  /** 组内 0-based 下标，由组列表 map 时透传；非组内场景不传 */
  groupIndex?: number
}

const StaticChatContent: FC<StaticChatContentProps> = ({ token, groupIndex }) => {
  const store = useCurrentStore()
  const renderNum = useStore(store, (state) => state.items[token]?.renderNum)
  const rawData = useCurrentRawData()
  const chatItem = useMemo(() => {
    if (!rawData) return null
    const itemData = rawData.contents.get(token)
    if (!itemData) return null
    if (itemData.data != null && typeof itemData.data === 'object') {
      return { ...itemData, data: Object.assign({}, itemData.data) } as AIChatQSData
    }
    return { ...itemData } as AIChatQSData // 浅拷贝,深层数据更新引用没变，需要依赖renderNum
  }, [token, renderNum])

  if (!chatItem) return null
  return <AINodeItem itemData={chatItem} renderNum={renderNum} groupIndex={groupIndex} />
}
export default memo(StaticChatContent)
