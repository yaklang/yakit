import { useCreation } from 'ahooks'
import { type FC, memo } from 'react'
import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'
import AIChildWindowGroupStreamCard from '../aiChildWindowGroupStreamCard/AIChildWindowGroupStreamCard'
import { AIChatQSDataTypeEnum } from '../../../../ai-re-act/hooks/aiRender'

/** 子窗口版 group item，数据从 rawData Map 获取 */
const AIChildWindowGroupItem: FC<{ token: string }> = memo(({ token }) => {
  const { renderNum, rawData } = useAIConcurrentStreamStore()
  const itemData = useCreation(() => {
    return rawData?.get(token)
  }, [renderNum, token])
  if (!itemData) return null

  switch (itemData.type) {
    case AIChatQSDataTypeEnum.STREAM_GROUP:
      return <AIChildWindowGroupStreamCard token={token} />
    default:
      return null
  }
})
export default AIChildWindowGroupItem
