import React, { useEffect, useState } from 'react'
import classNames from 'classnames'
import {
  GitMergeOutlined,
  CheckOutlined,
  ChevronDownOutlined,
  ExclamationCircleOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import type { ChatCodingWorktree, CodingWorktreeProgress } from '@/pages/ai-re-act/hooks/aiRender'
import useAIAgentStore from '../useContext/useStore'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './CodingWorktreeCard.module.scss'

export const CodingWorktreeCard = ({ item }: { item: ChatCodingWorktree }) => {
  const { pendingChat } = useAIAgentStore()
  const { cancelPendingChat } = useAIAgentDispatcher()
  const pending = pendingChat?.data.rawData.contents.has(item.id) ? pendingChat : undefined
  return (
    <WorktreeProgressCard
      progress={item.data}
      startError={pending?.status === 'failed' && item.data.stage === 'ready' ? pending.error : undefined}
      onRetry={pending?.status === 'failed' ? pending.retry : undefined}
      onCancel={pending ? cancelPendingChat : undefined}
    />
  )
}

export const WorktreeProgressCard = ({
  progress,
  startError,
  onRetry,
  onCancel,
}: {
  progress: CodingWorktreeProgress
  startError?: string
  onRetry?: () => void
  onCancel?: () => void
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const ready = progress.stage === 'ready'
  const failed = progress.stage === 'failed' || !!startError
  const [expanded, setExpanded] = useState(!ready || failed)
  const [details, setDetails] = useState(false)
  useEffect(() => {
    setExpanded(!ready || failed)
  }, [ready, failed])
  const title = t(`CodingWorktreeCard.${startError ? 'startFailed' : failed ? 'failed' : ready ? 'ready' : 'creating'}`)
  const current = progress.stage === 'queued' ? -1 : progress.stage === 'workspace' ? 0 : 1
  const failedStep = progress.failed_stage === 'checkout' ? 1 : 0
  return (
    <section className={classNames(styles.card, { [styles.failed]: failed })} aria-label={title}>
      <button className={styles.header} onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        <span className={styles.icon}>
          <GitMergeOutlined />
        </span>
        <span className={styles.title} role="status" aria-live="polite">
          {title}
        </span>
        {ready && !failed ? (
          <CheckOutlined className={styles.success} />
        ) : failed ? (
          <ExclamationCircleOutlined className={styles.errorIcon} />
        ) : (
          <span className={styles.spinner} />
        )}
        <ChevronDownOutlined className={classNames(styles.chevron, { [styles.expanded]: expanded })} />
      </button>
      {expanded && (
        <div className={styles.body}>
          {progress.stage === 'queued' && <p className={styles.hint}>{t('CodingWorktreeCard.queued')}</p>}
          <ol className={styles.steps}>
            {['workspace', 'checkout'].map((step, index) => {
              const done = ready || (!failed && current > index) || (failed && failedStep > index)
              const active = !ready && !failed && current === index
              const error = !ready && failed && index === failedStep
              return (
                <li key={step} className={classNames({ [styles.muted]: !active && !error })}>
                  {done ? (
                    <CheckOutlined className={styles.success} />
                  ) : error ? (
                    <ExclamationCircleOutlined className={styles.errorIcon} />
                  ) : active ? (
                    <span className={styles.spinner} />
                  ) : (
                    <span className={styles.dot} />
                  )}
                  <span>{t(`CodingWorktreeCard.${step}`)}</span>
                </li>
              )
            })}
          </ol>
          {(progress.base_ref || progress.path) && (
            <div className={styles.metadata}>
              {progress.base_ref && (
                <span>
                  {t('CodingWorktreeCard.base')} <code>{progress.base_ref}</code>
                </span>
              )}
              {progress.path && (
                <span className={styles.path} title={progress.path}>
                  {progress.path}
                </span>
              )}
            </div>
          )}
          {failed && (
            <p className={styles.error} role="alert">
              {startError || progress.error}
            </p>
          )}
          <div className={styles.footer}>
            <button onClick={() => setDetails(!details)} aria-expanded={details}>
              {t('CodingWorktreeCard.details')} <ChevronDownOutlined />
            </button>
            <div>
              {onRetry && (
                <button className={styles.retry} onClick={onRetry}>
                  {t('CodingWorktreeCard.retry')}
                </button>
              )}
              {onCancel && <button onClick={onCancel}>{t('CodingWorktreeCard.cancel')}</button>}
            </div>
          </div>
          {details && (
            <pre className={styles.details}>
              {[
                progress.base_ref && `${t('CodingWorktreeCard.base')}: ${progress.base_ref}`,
                progress.base_commit && `Commit: ${progress.base_commit}`,
                progress.path && `${t('CodingWorktreeCard.location')}: ${progress.path}`,
                startError || progress.error,
              ]
                .filter(Boolean)
                .join('\n') || t('CodingWorktreeCard.waitingDetails')}
            </pre>
          )}
        </div>
      )}
    </section>
  )
}
