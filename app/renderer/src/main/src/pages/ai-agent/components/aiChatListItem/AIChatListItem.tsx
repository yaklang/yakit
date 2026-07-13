import React from 'react'
import type { AIChatListItemProps } from './type'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import AIGroupItem from './aiGroupItem/AIGroupItem'
import AITaskItem from './aiTaskItem/AITaskItem'
import StaticChatContent from './StaticChatContent/StaticChatContent'

export const AIChatListItem: React.FC<AIChatListItemProps> = React.memo((props) => {
  const { item } = props

  const store = useCurrentStore()

  // 防止没有数据的时候出错,所以没从item中取kind
  const kind = useStore(store, (state) => {
    if (state.items[item.token]) return 'item'
    if (state.groups[item.token]) return 'group'
    if (state.tasks[item.token]) return 'task'
    return null
  })

  const renderContent = useMemoizedFn(() => {
    switch (kind) {
      case 'item':
        return <StaticChatContent token={item.token} />
      case 'group':
        return <AIGroupItem token={item.token} />
      case 'task':
        return <AITaskItem token={item.token} />
      default:
        return null
    }
  })
  return <React.Fragment key={item.token}>{renderContent()}</React.Fragment>
})
