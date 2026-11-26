import type { FC, KeyboardEvent } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useCreation } from 'ahooks'
import { useStore } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import moment from 'moment'
import { ChevronDownOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { CheckCircleSolid } from '@yakit-libs/yakit-ui-icons/solid'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { AIInputEventHotPatchTypeEnum, AIInputEventSyncTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIGoalTimePatch } from '@/pages/ai-re-act/hooks/grpcApi'
import { useSyncLoadingState } from '@/pages/ai-re-act/hooks/useSyncLoadingState'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import GoalTimeAdjustments from './GoalTimeAdjustments/GoalTimeAdjustments'
import RunningGoalConditions from './RunningGoalConditions/RunningGoalConditions'
import type { AIAgentChatData } from '@/pages/ai-agent/type/aiChat'
import type { AIRunningStatusProps } from './type'
import panelStyles from '../AIContextUsage/AIContextUsage.module.scss'
import styles from './AIRunningStatus.module.scss'

const formatTimerValue = (seconds?: number) => {
  if (seconds === undefined) return '—'
  const minutes = Math.floor(seconds / 60)
  if (seconds > 3600) return `${Math.floor(minutes / 60)}h${minutes % 60}m${seconds % 60}s`
  return minutes ? `${minutes}m${seconds % 60}s` : `${seconds}s`
}

const formatWorkDuration = (seconds?: number, maxUnits?: number) => {
  if (seconds === undefined) return '—'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor(seconds / 3600) % 24
  const minutes = Math.floor(seconds / 60) % 60
  const parts = [`${seconds % 60}s`]
  if (days || hours || minutes) parts.unshift(`${minutes}m`)
  if (days || hours) parts.unshift(`${hours}h`)
  if (days) parts.unshift(`${days}d`)
  return parts.slice(0, maxUnits).join('')
}

const readGoalTiming = ({ agentPolicySnapshot, agentPolicySnapshotReceivedAtMs }: AIAgentChatData) => {
  const timeLimit = agentPolicySnapshot?.goal.time_limit
  const mode = timeLimit?.mode
  const hidden = timeLimit?.configured_duration_seconds === 0 || mode === 'disabled'
  if (
    !agentPolicySnapshot?.goal.effective ||
    timeLimit?.mode !== 'deadline' ||
    !(timeLimit.deadline_at > 0 && agentPolicySnapshot.server_time > 0) ||
    agentPolicySnapshotReceivedAtMs === undefined
  ) {
    return { hidden, mode }
  }

  const remainingAtReceipt = timeLimit.deadline_at - agentPolicySnapshot.server_time
  return {
    hidden,
    mode,
    deadlineAt: timeLimit.deadline_at,
    deadlineMs: agentPolicySnapshotReceivedAtMs + remainingAtReceipt * 1000,
  }
}

const AIRunningStatus: FC<AIRunningStatusProps> = ({ className }) => {
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const execution = useStore(store, (state) => state.sessionSnapshot?.execution)
  const round = useStore(store, (state) => state.sessionSnapshot?.current_round) ?? '—'
  const agentPolicySnapshotUpdate = useStore(store, (state) => state.agentPolicySnapshotUpdate)
  const timing = useCreation(() => readGoalTiming(rawData), [rawData, agentPolicySnapshotUpdate])
  if (execution?.status !== 'processing' || timing.hidden) return null

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
  const { onSend } = useAIAgentDispatcher()
  const { loading, markSending } = useSyncLoadingState()
  const adjustGoalTime = (patch: AIGoalTimePatch) => {
    if (!sessionId || loading) return
    const sent = onSend({
      token: sessionId,
      type: '',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_GoalTime,
        GoalTimePatch: patch,
      },
    })
    if (!sent) return
    // GoalTime 的推送不带 SyncID，单独拉取策略快照以获取本次同步的回执。
    const syncId = uuidv4()
    markSending(syncId)
    onSend({
      token: sessionId,
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_AGENT_POLICY_SNAPSHOT_SYNC,
        SyncID: syncId,
      },
    })
  }
  const store = useCurrentStore()
  const receivedAtMs = useStore(store, (state) => state.sessionSnapshotReceivedAtMs)
  const [open, setOpen] = useState(false)
  const submitConditions = useRef<(() => void) | null>(null)
  const { mode, deadlineMs, deadlineAt } = timing
  const [remaining, setRemaining] = useState<number>()
  useLayoutEffect(() => {
    if (deadlineMs === undefined) {
      setRemaining(undefined)
      return
    }
    let timer: number
    const tick = () => {
      const ms = Math.max(0, deadlineMs - performance.now())
      const seconds = Math.ceil(ms / 1000)
      setRemaining(seconds)
      if (seconds > 0) timer = window.setTimeout(tick, Math.ceil(ms - (seconds - 1) * 1000))
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [deadlineMs])
  const [nowMs, setNowMs] = useState(Date.now) // 让已用时间在两次后端快照之间也能每秒刷新
  useEffect(() => {
    if (receivedAtMs === undefined || executionSeconds === undefined) return
    let timer: number
    const tick = () => {
      const now = Date.now()
      setNowMs(now)
      timer = window.setTimeout(tick, 1000 - (Math.max(0, now - receivedAtMs) % 1000))
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [receivedAtMs, executionSeconds])
  const secondsSinceSnapshot = receivedAtMs === undefined ? 0 : Math.max(0, Math.floor((nowMs - receivedAtMs) / 1000))
  const used = executionSeconds === undefined ? undefined : executionSeconds + secondsSinceSnapshot
  const badgeElapsed = formatWorkDuration(used, 2)
  const remainingTime = formatWorkDuration(remaining)
  const usedLabel = t('AIRunningStatus.used')
  const remainingLabel = t('AIRunningStatus.remaining')
  const roundLabel = t('AIRunningStatus.round', { round })
  const label = t('AIRunningStatus.label', { round, time: badgeElapsed })
  const renderUsage = () => {
    if (remaining === undefined || deadlineAt === undefined) {
      return (
        <div>
          <span>{usedLabel}</span> <span>{formatTimerValue(used)}</span>
          {mode === 'never_ending' && <> · {t('AIRunningStatus.infinite')}</>}
          {mode === 'deadline' && (
            <>
              {' '}
              · <span>{remainingLabel}</span> <span>{remainingTime}</span>
            </>
          )}
        </div>
      )
    }
    if (remaining === 0) {
      return (
        <div className={styles.targetReached}>
          {t('AIRunningStatus.targetReached')}
          <CheckCircleSolid aria-hidden="true" size={16} color="var(--Colors-Use-Success-Primary)" />
        </div>
      )
    }
    const deadline = moment.unix(deadlineAt)
    const today = moment.unix(deadlineAt - remaining).startOf('day')
    const daysAhead = deadline.clone().startOf('day').diff(today, 'days')
    let deadlineText = deadline.format('HH:mm')
    if (daysAhead === 1 || daysAhead === 2) {
      deadlineText = t(daysAhead === 1 ? 'AIRunningStatus.tomorrow' : 'AIRunningStatus.dayAfterTomorrow', {
        time: deadline.format('HH：mm：ss'),
      })
    } else if (daysAhead > 2) {
      deadlineText = t('AIRunningStatus.monthDay', { month: deadline.month() + 1, day: deadline.date() })
    }
    if (remaining > 5 * 3600) return t('AIRunningStatus.workUntil', { deadline: deadlineText })
    return t('AIRunningStatus.workSchedule', { deadline: deadlineText, remaining: remainingTime })
  }
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
          <YakitSpin spinning={loading}>
            <div
              aria-busy={loading}
              className={panelStyles.panel}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={handleKeyDown}
            >
              <div className={panelStyles.header}>
                <span>{t('AIRunningStatus.title')}</span>
                <span>{roundLabel}</span>
              </div>
              <div className={panelStyles.usage}>{renderUsage()}</div>
              <div className={panelStyles.settings}>
                {mode === 'never_ending' ? (
                  open && <RunningGoalConditions key={sessionId} ref={submitConditions} sessionId={sessionId} />
                ) : (
                  <GoalTimeAdjustments loading={loading} expired={remaining === 0} onAdjust={adjustGoalTime} />
                )}
              </div>
            </div>
          </YakitSpin>
        }
      >
        <YakitButton
          data-ai-running-status
          type="text2"
          radius={9999}
          style={{ background: 'var(--ai-running-status-bg, var(--Colors-Use-Success-Bg))' }}
          className={styles.badge}
          aria-label={label}
          aria-expanded={open}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.label}>{t('AIRunningStatus.state')}</span>
          <span>{roundLabel}</span>
          <span className={styles.time}>· {badgeElapsed}</span>
          <span className={styles.chevron} aria-hidden="true">
            <ChevronDownOutlined size={12} color="var(--Colors-Use-Neutral-Text-3-Secondary)" />
          </span>
        </YakitButton>
      </YakitPopover>
    </span>
  )
}

export default AIRunningStatus
