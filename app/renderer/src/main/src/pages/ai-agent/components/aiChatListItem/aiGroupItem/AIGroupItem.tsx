import React from 'react'
import { AIGroupItemProps } from './type'
import AIGroupStreamCard from '../../aiGroupStreamCard/AIGroupStreamCard'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'

const AIGroupItem: React.FC<AIGroupItemProps> = React.memo((props) => {
  const { token } = props

  const store = useCurrentStore()
  const type = useStore(store, (state) => state.groups[token]?.type)

  switch (type) {
    case AIChatQSDataTypeEnum.STREAM_GROUP:
      return <AIGroupStreamCard token={token} />

    default:
      return <></>
  }
})

export default AIGroupItem
