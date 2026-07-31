import { type FC, memo } from 'react'
import type { AIChildWindowStreamCardProps } from './type'
import { AIStreamCard } from '../../aiChatListItem/StreamingChatContent/StreamingChatContent'
import useCreation from 'ahooks/lib/useCreation'
import { ChatStream } from '@/pages/ai-re-act/hooks/aiRender'
import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'

const AIChildWindowStreamCard: FC<AIChildWindowStreamCardProps> = memo((props) => {
  const { itemData, renderNum } = props
  const { session } = useAIConcurrentStreamStore()
  const data: ChatStream = useCreation(() => {
    return {
      ...itemData,
      data: {
        ...itemData.data,
        status: 'end',
      },
    }
  }, [renderNum])
  return <AIStreamCard itemData={data} renderNum={renderNum} sessionId={session ?? ''} />
})

export default AIChildWindowStreamCard
