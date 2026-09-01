import type React from 'react'
import { ReloadOutlined, SelectOutlined } from '@ant-design/icons'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  BROWSER_CRYPTO_TASK_STAGES,
  type BrowserCryptoTaskState,
  type BrowserCryptoTaskStatus,
} from './browserCryptoTaskState'
import styles from './BrowserExtension.module.scss'

interface BrowserCryptoTaskProgressProps {
  task: BrowserCryptoTaskState
  onRetry: () => void
  onReselectTarget: () => void
}

const STATUS_LABELS: Record<BrowserCryptoTaskStatus, string> = {
  running: 'Agent 正在工作',
  'waiting-user': '等待你的操作',
  blocked: '浏览器连接中断',
  failed: '当前步骤失败',
  cancelled: '任务已停止',
  completed: '已载入工作区',
}

export const BrowserCryptoTaskProgress: React.FC<BrowserCryptoTaskProgressProps> = ({
  task,
  onRetry,
  onReselectTarget,
}) => {
  const currentIndex = BROWSER_CRYPTO_TASK_STAGES.findIndex((stage) => stage.id === task.stage)
  const showRetry = (task.status === 'failed' || task.status === 'cancelled') && task.failure?.recoverable !== false
  const showReselect = task.failure?.recoverable === false
  const boundaryActionLabel = task.failure?.kind === 'authorization' ? '重新授权' : '重新选择页面'

  return (
    <section className={`${styles['browser-ai-task']} ${styles[`task-${task.status}`] || ''}`} aria-live="polite">
      <header>
        <span className={styles['task-state-dot']} />
        <strong>{STATUS_LABELS[task.status]}</strong>
        <small>
          {currentIndex + 1}/{BROWSER_CRYPTO_TASK_STAGES.length}
        </small>
      </header>
      <ol className={styles['task-stage-rail']}>
        {BROWSER_CRYPTO_TASK_STAGES.map((stage, index) => {
          const completed = task.completedStages.includes(stage.id)
          const active = task.status !== 'completed' && stage.id === task.stage
          const skipped = !completed && !active && index < currentIndex
          return (
            <li
              className={[completed ? styles.completed : '', active ? styles.active : '', skipped ? styles.skipped : '']
                .filter(Boolean)
                .join(' ')}
              key={stage.id}
              aria-current={active ? 'step' : undefined}
            >
              <i>{completed ? '✓' : index + 1}</i>
              <span>{stage.label}</span>
            </li>
          )
        })}
      </ol>
      <footer>
        <span>{task.message}</span>
        {showRetry && (
          <YakitButton type="text2" size="small" icon={<ReloadOutlined />} onClick={onRetry}>
            继续
          </YakitButton>
        )}
        {showReselect && (
          <YakitButton type="text2" size="small" icon={<SelectOutlined />} onClick={onReselectTarget}>
            {boundaryActionLabel}
          </YakitButton>
        )}
      </footer>
    </section>
  )
}
