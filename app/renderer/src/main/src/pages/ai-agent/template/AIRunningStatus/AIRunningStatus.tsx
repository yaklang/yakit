import type { FC, KeyboardEvent } from 'react'
import { useRef, useState } from 'react'
import { useCountDown, useCreation, useInterval } from 'ahooks'
import { useStore } from 'zustand'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import YakitStripedProgress from '@/components/YakitStripedProgress/YakitStripedProgress'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import GoalTimeAdjustments from './GoalTimeAdjustments/GoalTimeAdjustments'
import RunningGoalConditions from './RunningGoalConditions/RunningGoalConditions'
import type { AIAgentChatData } from '@/pages/ai-agent/type/aiChat'
import type { AIRunningStatusProps } from './type'
import panelStyles from '../AIContextUsage/AIContextUsage.module.scss'
import styles from './AIRunningStatus.module.scss'

const formatDuration = (seconds?: number) => {
  if (seconds === undefined) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  const rest = seconds % 60
  return [hours && `${hours}h`, minutes && `${minutes}m`, rest && `${rest}s`].filter(Boolean).join('') || '0s'
}

const formatTimerValue = (seconds?: number) => {
  if (seconds === undefined) return '—'
  const minutes = Math.floor(seconds / 60)
  if (seconds > 3600) return `${Math.floor(minutes / 60)}h${minutes % 60}m${seconds % 60}s`
  return minutes ? `${minutes}m${seconds % 60}s` : `${seconds}s`
}

const readGoalTiming = ({ agentPolicySnapshot, agentPolicySnapshotReceivedAt }: AIAgentChatData) => {
  const timeLimit = agentPolicySnapshot?.goal.time_limit
  const limit = timeLimit?.configured_duration_seconds
  const mode = timeLimit?.mode
  if (
    !agentPolicySnapshot?.goal.effective ||
    timeLimit?.mode !== 'deadline' ||
    !(timeLimit.deadline_at > 0 && agentPolicySnapshot.server_time > 0) ||
    agentPolicySnapshotReceivedAt === undefined
  ) {
    return { limit, mode }
  }

  const remainingAtReceipt = timeLimit.deadline_at - agentPolicySnapshot.server_time
  return {
    limit,
    mode,
    targetDate: (agentPolicySnapshotReceivedAt + remainingAtReceipt) * 1000,
  }
}

const AIRunningStatus: FC<AIRunningStatusProps> = ({ className }) => {
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const execution = useStore(store, (state) => state.sessionSnapshot?.execution)
  const round = useStore(store, (state) => state.sessionSnapshot?.current_round) ?? '—'
  const agentPolicySnapshotUpdate = useStore(store, (state) => state.agentPolicySnapshotUpdate)
  const timing = useCreation(() => readGoalTiming(rawData), [rawData, agentPolicySnapshotUpdate])
  const hideForMode = timing.mode === 'not_started' || timing.mode === 'disabled'
  if (execution?.status !== 'processing' || timing.limit === 0 || hideForMode) return null

  return (
    <RunningStatusButton
      className={className}
      timing={timing}
      round={round}
      executionSeconds={execution.execution_seconds}
    />
  )
}

const RunningStatusButton = ({
  className,
  timing,
  round,
  executionSeconds,
}: AIRunningStatusProps & {
  timing: ReturnType<typeof readGoalTiming>
  round: number | string
  executionSeconds?: number
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const sessionId = useCurrentSessionId()
  const [open, setOpen] = useState(false)
  const submitConditions = useRef<(() => void) | null>(null)
  const { limit, mode, targetDate } = timing
  const hasLimit = limit !== undefined && limit > 0
  const [remainingMs] = useCountDown({ targetDate })
  const remaining = targetDate === undefined ? undefined : Math.ceil(remainingMs / 1000)
  // 倒计时归零后，已用时间时仅在展示继续刷新超时秒数。
  const [nowMs, setNowMs] = useState(0)
  const trackOvertime = remaining === 0 && hasLimit
  useInterval(() => setNowMs(Date.now()), trackOvertime ? 1000 : undefined, { immediate: true })
  const overtime = trackOvertime && targetDate !== undefined ? Math.max(0, Math.floor((nowMs - targetDate) / 1000)) : 0
  const used = remaining !== undefined && hasLimit ? Math.max(0, limit - remaining + overtime) : executionSeconds
  const unlimited = limit === -1
  const duration = unlimited ? '∞' : formatDuration(limit)
  const elapsed = formatTimerValue(used)
  const remainingTime = formatTimerValue(remaining)
  const usedLabel = t('AIRunningStatus.used')
  const remainingLabel = t('AIRunningStatus.remaining')
  const roundLabel = t('AIRunningStatus.round', { round })
  const label = t('AIRunningStatus.label', { round, elapsed, duration })
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && open) {
      submitConditions.current?.()
      submitConditions.current = null
    }
    setOpen(nextOpen)
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation()
    if (event.key === 'Escape') handleOpenChange(false)
  }
  return (
    <span role="status" aria-label={label} className={className}>
      <YakitPopover
        trigger="click"
        placement="top"
        arrow={false}
        open={open}
        onOpenChange={handleOpenChange}
        destroyOnHidden
        classNames={{ root: panelStyles.popoverRoot }}
        content={
          <div className={panelStyles.panel} onClick={(event) => event.stopPropagation()} onKeyDown={handleKeyDown}>
            <div className={panelStyles.header}>
              <span>{t('AIRunningStatus.title')}</span>
              <span>{roundLabel}</span>
            </div>
            <div className={panelStyles.usage}>
              <div>
                <span>{usedLabel}</span> <span>{elapsed}</span>
                {mode === 'deadline' && (
                  <>
                    {' · '}
                    <span>{remainingLabel}</span> <span>{remainingTime}</span>
                    {hasLimit && (
                      <span className={panelStyles.limit}>
                        {' '}
                        ({t('AIRunningStatus.limit')} {duration})
                      </span>
                    )}
                  </>
                )}
                {mode === 'never_ending' && <> · {t('AIRunningStatus.infinite')}</>}
              </div>
              {remaining !== undefined && hasLimit && used !== undefined && (
                <YakitStripedProgress
                  percent={(used * 100) / limit}
                  color="var(--Colors-Use-Success-Primary)"
                  label={t('AIRunningStatus.title')}
                  valueText={`${usedLabel} ${elapsed} · ${remainingLabel} ${remainingTime}`}
                />
              )}
            </div>
            <div className={panelStyles.settings}>
              {mode === 'never_ending' ? (
                open && <RunningGoalConditions key={sessionId} ref={submitConditions} sessionId={sessionId} />
              ) : (
                <GoalTimeAdjustments sessionId={sessionId} />
              )}
            </div>
          </div>
        }
      >
        <YakitButton
          type="text2"
          radius={9999}
          style={{ background: 'var(--Colors-Use-Success-Bg)' }}
          className={styles.badge}
          aria-label={label}
          aria-expanded={open}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.label}>{t('AIRunningStatus.state')}</span>
          <span>{roundLabel}</span>
          <span className={styles.time}>
            · {elapsed} / {duration}
          </span>
          <ChevronDownOutlined
            className={styles.chevron}
            size={12}
            color="var(--Colors-Use-Neutral-Text-3-Secondary)"
            aria-hidden="true"
          />
        </YakitButton>
      </YakitPopover>
    </span>
  )
}

export default AIRunningStatus
