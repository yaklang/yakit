import type React from 'react'
import { memo } from 'react'
import { useStore } from 'zustand'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import styles from './HistoryTaskTree.module.scss'
import { HistoryTaskTree } from './HistoryTaskTree'
import { SubAgentList } from './SubAgentList'
import { useHasTaskTree } from './useHasTaskTree'

/** 任务列表面板：任务列表 + 子 Agent */
export const TaskListPane: React.FC = memo(() => {
  const store = useCurrentStore()
  const hasTaskTree = useHasTaskTree()
  const hasHistoryTasks = useStore(store, (state) =>
    (state.planHistoryList?.records ?? []).some(
      (item) => item.coordinator_id !== (state.currentChatStatus.coordinatorId ?? ''),
    ),
  )

  return (
    <div className={styles['history-task-tree-container']}>
      {hasTaskTree || hasHistoryTasks ? (
        <>
          <HistoryTaskTree />
          <SubAgentList />
        </>
      ) : (
        <YakitEmpty />
      )}
    </div>
  )
})
