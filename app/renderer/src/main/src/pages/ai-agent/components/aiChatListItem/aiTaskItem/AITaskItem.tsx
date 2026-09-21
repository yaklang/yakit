import React from 'react'
import type { AITaskItemProps } from './type'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import ConcurrentStreamCard from '../../ConcurrentStreamCard/ConcurrentStreamCard'

const AITaskItem: React.FC<AITaskItemProps> = React.memo((props) => {
  const { token } = props
  const store = useCurrentStore()

  const type = useStore(store, (state) => state.tasks[token].type)
  switch (type) {
    case AIChatQSDataTypeEnum.TASK_NODE_GROUP:
      return <ConcurrentStreamCard token={token} />
    default:
      return <></>
  }
})

export default AITaskItem
