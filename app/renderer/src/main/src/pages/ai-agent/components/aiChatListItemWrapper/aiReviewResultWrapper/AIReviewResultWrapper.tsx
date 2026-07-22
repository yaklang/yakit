import { FC, memo } from 'react'
import type { AIReviewResultWrapperProps } from './type'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import { AIReviewResult } from '../../aiReviewResult/AIReviewResult'

const AIReviewResultWrapper: FC<AIReviewResultWrapperProps> = memo((props) => {
  const { itemData, renderNum } = props
  const store = useCurrentStore()
  const taskLength = useStore(store, (state) => state.taskChat.elements.length)
  const casualLength = useStore(store, (state) => state.casualChat.elements.length)
  return <AIReviewResult info={itemData} renderNum={renderNum} taskLength={taskLength} casualLength={casualLength} />
})

export default AIReviewResultWrapper
