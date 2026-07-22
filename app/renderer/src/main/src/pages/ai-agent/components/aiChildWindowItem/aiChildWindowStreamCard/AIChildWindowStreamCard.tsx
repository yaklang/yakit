import { type FC, memo } from 'react'
import type { AIChildWindowStreamCardProps } from './type'
import { AIStreamCard } from '../../aiChatListItem/StreamingChatContent/StreamingChatContent'
import useCreation from 'ahooks/lib/useCreation'
import { ChatStream } from '@/pages/ai-re-act/hooks/aiRender'

const AIChildWindowStreamCard: FC<AIChildWindowStreamCardProps> = memo((props) => {
  const { itemData, renderNum } = props
  const data: ChatStream = useCreation(() => {
    return {
      ...itemData,
      data: {
        ...itemData.data,
        status: 'end',
      },
    }
  }, [renderNum])
  return <AIStreamCard itemData={data} renderNum={renderNum} />
})

export default AIChildWindowStreamCard
