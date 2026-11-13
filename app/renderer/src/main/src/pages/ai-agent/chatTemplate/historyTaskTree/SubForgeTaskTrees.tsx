import React from 'react'
import { useStore } from 'zustand'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import type { SubForgeRun, SubForgeTaskNode } from '@/pages/ai-re-act/hooks/subForgeTaskTree'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './SubForgeTaskTrees.module.scss'

export function SubForgeTaskTrees({
  coordinatorId,
  taskId,
  level,
}: {
  coordinatorId: string
  taskId: string
  level: number
}) {
  const store = useCurrentStore()
  const runs = useStore(store, (state) => state.subForgeRuns)
  const children = Object.values(runs).filter(
    (run) => run.parent_coordinator_id === coordinatorId && run.parent_task_id === taskId,
  )
  if (!children.length) return null
  return (
    <div className={styles.children} style={{ marginLeft: level * 24 }}>
      {children.map((run) => (
        <SubForgeRunTree key={run.child_coordinator_id} run={run} />
      ))}
    </div>
  )
}

/** Read-only display: child IDs must never enter the parent's skip/restart actions. */
export function SubForgeRunTree({ run }: { run: SubForgeRun }) {
  const { t } = useI18nNamespaces(['aiAgent'])
  const status = run.historical && run.status === 'running' ? 'unknown' : run.status
  const renderNode = (node: SubForgeTaskNode, index: number): React.ReactNode => {
    const progress = node.progress === 'processing' && status !== 'running' ? 'unknown' : node.progress || 'pending'
    return (
      <li key={node.task_id || index}>
        <div className={styles.node}>
          <span className={styles.name}>{node.name}</span>
          <span className={styles.status} data-status={progress}>
            {t(`SubForgeTaskTree.${progress}`)}
          </span>
        </div>
        {!!node.subtasks?.length && <ul>{node.subtasks.map(renderNode)}</ul>}
      </li>
    )
  }
  return (
    <details className={styles.run} open>
      <summary>
        <span className={styles.title}>{t('SubForgeTaskTree.title', { name: run.tool_name })}</span>
        <span className={styles.status} data-status={status}>
          {t(`SubForgeTaskTree.${status}`)}
        </span>
      </summary>
      {run.task_tree ? (
        <ul className={styles.tree}>{renderNode(run.task_tree, 0)}</ul>
      ) : (
        <p className={styles.empty}>
          {t(status === 'running' ? 'SubForgeTaskTree.planning' : 'SubForgeTaskTree.noPlan')}
        </p>
      )}
      {status === 'unknown' && <p className={styles.empty}>{t('SubForgeTaskTree.incompleteHistory')}</p>}
    </details>
  )
}
