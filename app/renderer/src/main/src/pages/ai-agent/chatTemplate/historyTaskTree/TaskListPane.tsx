import type React from 'react'
import { memo } from 'react'
import styles from './HistoryTaskTree.module.scss'
import { HistoryTaskTree } from './HistoryTaskTree'
import { SubAgentList } from './SubAgentList'

/** 任务列表面板：任务列表 + 子 Agent */
export const TaskListPane: React.FC = memo(() => {
  return (
    <div className={styles['history-task-tree-container']}>
      <HistoryTaskTree />
      <SubAgentList />
    </div>
  )
})
