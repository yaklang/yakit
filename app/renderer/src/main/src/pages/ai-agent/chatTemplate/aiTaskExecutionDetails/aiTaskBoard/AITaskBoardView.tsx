import React from 'react'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { AITaskBoard } from './AITaskBoard'
import { groupTaskBoardItems } from './boardUtils'
import { AIDeleteNodeIcon, AIDoingNodeIcon, AIDoneNodeIcon, AIPendingNodeIcon } from '../icon'
import type { TodoListCardData } from '@/pages/ai-re-act/hooks/aiRender'

/** 核心任务详情与数字员工任务区共用同一只读看板。 */
export const AITaskBoardView: React.FC<{ items: TodoListCardData['items'] }> = ({ items }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const grouped = groupTaskBoardItems(items)
  const icons = [<AIPendingNodeIcon />, <AIDoingNodeIcon />, <AIDoneNodeIcon />, <AIDeleteNodeIcon />]
  return (
    <AITaskBoard
      columns={Object.entries(grouped).map(([key, list], index) => ({
        key: key === 'DOING' ? 'doing' : key.toLowerCase(),
        title: t(`AITaskBoard.${key}`),
        icon: icons[index] || <AIPendingNodeIcon />,
        items: list,
      }))}
    />
  )
}
