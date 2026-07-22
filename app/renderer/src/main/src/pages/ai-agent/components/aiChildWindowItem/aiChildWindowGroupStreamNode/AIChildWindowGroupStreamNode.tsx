import { FC, memo } from 'react'
import type { AIChildWindowGroupStreamNodeProps } from './type'
import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'
import useCreation from 'ahooks/lib/useCreation'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import { AIGroupStreamNode } from '../../aiGroupStreamCard/AIGroupStreamCard'

const AIChildWindowGroupStreamNode: FC<AIChildWindowGroupStreamNodeProps> = memo((props) => {
  const { itemData, renderNum, groupIndex } = props
  const { rawData } = useAIConcurrentStreamStore()
  // 其余原始字段通过 useCurrentRawData 获取，并订阅 renderNum 驱动重渲染
  const stream = useCreation(() => {
    const rawStream = rawData?.get(itemData.id)
    if (!rawStream) return null
    switch (rawStream.type) {
      case AIChatQSDataTypeEnum.STREAM:
        return rawStream

      default:
        return null
    }
  }, [renderNum])
  // seqNo 直接使用父组件（AIChildWindowGroupStreamCard）在 map 时透传的 groupIndex，
  // 下标由唯一负责排序的父组件决定，与渲染顺序天然一致；未传则不显示序号
  const seqNo = useCreation(() => {
    if (!itemData.parentGroupToken || groupIndex == null) return ''
    return `${groupIndex + 1}. `
  }, [renderNum, groupIndex])
  if (!stream) return null
  return <AIGroupStreamNode itemData={stream} renderNum={renderNum} seqNo={seqNo} />
})

export default AIChildWindowGroupStreamNode
