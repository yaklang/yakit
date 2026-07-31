import { type FC, memo, useEffect, useState } from 'react'
import type { AIStreamCardWrapperProps } from './type'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useRafInterval from 'ahooks/lib/useRafInterval'
import { AIStreamCard } from '../../aiChatListItem/StreamingChatContent/StreamingChatContent'
import { AIChatQSDataTypeEnum, type ChatStream } from '@/pages/ai-re-act/hooks/aiRender'
import { useStore } from 'zustand'
import useMemoizedFn from 'ahooks/lib/useMemoizedFn'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'

const AIStreamCardWrapper: FC<AIStreamCardWrapperProps> = memo((props) => {
  const { token } = props
  const [interval, setInterval] = useState<number | undefined>(1000)
  const [itemData, setItemData] = useState<ChatStream>()

  const store = useCurrentStore()
  const renderNum = useStore(store, (state) => state.items[token]?.renderNum)
  const rawData = useCurrentRawData()
  const sessionId = useCurrentSessionId()
  useRafInterval(() => {
    syncData()
  }, interval)

  useEffect(() => {
    syncData()
  }, [token, renderNum])

  /** TODO - 需要区分历史数据，历史数据没有打字机效果 */
  const syncData = useMemoizedFn(() => {
    const item = rawData?.contents.get(token)
    if (item?.type === AIChatQSDataTypeEnum.STREAM) {
      setItemData(item)
      if (item.data.status === 'end') {
        setInterval(undefined)
      } else if (item.data.status === 'start') {
        setInterval(1000)
      }
    }
  })

  if (!itemData) return null
  return <AIStreamCard itemData={itemData} renderNum={renderNum} sessionId={sessionId} />
})

export default AIStreamCardWrapper
