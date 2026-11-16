import type React from 'react'
import { TaskSuccessIcon } from '@yakit-libs/yakit-ui-icons/oldicon/TaskSuccessIcon'
import { TaskErrorIcon } from '@yakit-libs/yakit-ui-icons/oldicon/TaskErrorIcon'
import { TaskSkippedIcon } from '@yakit-libs/yakit-ui-icons/oldicon/TaskSkippedIcon'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { TaskInProgressIndicator } from '../../aiTree/TaskInProgressIndicator'
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
    <div className={styles.children} style={{ marginLeft: Math.max(0, level - 1) * 16 - 8 }}>
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
          <span className={styles.marker} aria-hidden="true">
            <TaskStateIcon status={progress} />
          </span>
          <span className={styles.name} title={node.name}>
            {node.name}
          </span>
          {(!node.subtasks?.length || node.progress) && (
            <span className={styles.status} data-status={progress}>
              {t(`SubForgeTaskTree.${progress}`)}
            </span>
          )}
        </div>
        {!!node.subtasks?.length && <ul>{node.subtasks.map(renderNode)}</ul>}
      </li>
    )
  }
  return (
    <details className={styles.run} open>
      <summary>
        <ChevronDownOutlined className={styles.chevron} aria-hidden="true" />
        <span className={styles.title} title={t('SubForgeTaskTree.title', { name: run.tool_name })}>
          {t('SubForgeTaskTree.title', { name: run.tool_name })}
        </span>
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

function TaskStateIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <TaskSuccessIcon />
    case 'processing':
      return <TaskInProgressIndicator />
    case 'aborted':
      return <TaskErrorIcon />
    case 'skipped':
      return <TaskSkippedIcon />
    default:
      return <span className={styles.pending} />
  }
}
