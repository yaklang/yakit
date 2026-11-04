import React from 'react'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { AITaskBoard } from './AITaskBoard'
import { groupTaskBoardItems } from './boardUtils'
import { AIDeleteNodeIcon, AIDoingNodeIcon, AIDoneNodeIcon, AIPendingNodeIcon } from '../icon'
import { TODO_STATUS_TO_FILTER_KEY, type TodoStatusFilterKey } from '../taskStatusUtils'
import type { TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'

/** 核心任务详情与数字员工任务区共用同一只读看板。 */
export const AITaskBoardView: React.FC<{
  items: TodoListCardData['items']
  statusOrder?: readonly TodoStatusFilterKey[]
}> = ({ items, statusOrder }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const grouped = groupTaskBoardItems(items)
  const icons = [<AIPendingNodeIcon />, <AIDoingNodeIcon />, <AIDoneNodeIcon />, <AIDeleteNodeIcon />]
  const entries = Object.entries(grouped)
  const statusRank = (key: TodoStatusFilterKey) => {
    const index = statusOrder?.indexOf(key) ?? -1
    return index < 0 ? statusOrder?.length || 0 : index
  }
  const rank = (key: string) => {
    if (!statusOrder) return 0
    if (key === 'SKIPPED_DELETED')
      return Math.min(...['skipped', 'deleted'].map((status) => statusRank(status as TodoStatusFilterKey)))
    return statusRank(TODO_STATUS_TO_FILTER_KEY[key])
  }
  const columns = entries
    .map(([key, list], index) => ({
      key: key === 'DOING' ? 'doing' : key.toLowerCase(),
      title: t(`AITaskBoard.${key}`),
      icon: icons[index] || <AIPendingNodeIcon />,
      items: list,
      rank: rank(key),
    }))
    .sort((a, b) => a.rank - b.rank)
  return <AITaskBoard columns={columns} />
}
