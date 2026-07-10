import React from 'react'
import { AITaskItemProps } from './type'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import ConcurrentStreamCard from '../../ConcurrentStreamCard/ConcurrentStreamCard'
import AITaskDefaultGroupCard from '../../AITaskDefaultGroupCard/AITaskDefaultGroupCard'

const AITaskItem: React.FC<AITaskItemProps> = React.memo((props) => {
  const { token } = props
  const store = useCurrentStore()

  const type = useStore(store, (state) => state.groups[token].type)
  switch (type) {
    case AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP:
      return <AITaskDefaultGroupCard token={token} isChildWindow={false} />
    case AIChatQSDataTypeEnum.TASK_NODE_GROUP:
      return <ConcurrentStreamCard token={token} />
    default:
      return <></>
  }
})

export default AITaskItem
