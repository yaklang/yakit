import React, { useEffect, useState } from 'react'
import type { AIExecutionStrategy } from '@/pages/ai-re-act/hooks/grpcApi'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { buildGoalCondition, getGoalConditionKind, type GoalConditionKind } from './goalStrategy'
import styles from './AIRunModeSelect.module.scss'

export const GoalConditionEditor: React.FC<{
  strategy: AIExecutionStrategy
  onApply: (next: AIExecutionStrategy) => boolean
}> = ({ strategy, onApply }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const sessionId = useCurrentSessionId()
  const [kind, setKind] = useState<GoalConditionKind>(() => getGoalConditionKind(strategy))
  const [iterations, setIterations] = useState<number | null>(Math.max(1, strategy.GoalMinIterations || 1))
  const [seconds, setSeconds] = useState<number | null>(strategy.GoalDurationSeconds || 600)
  const [criteria, setCriteria] = useState(strategy.GoalAcceptanceCriteria || '')
  const [rejected, setRejected] = useState(false)

  useEffect(() => {
    setKind(getGoalConditionKind(strategy))
    setIterations(Math.max(1, strategy.GoalMinIterations || 1))
    setSeconds(strategy.GoalDurationSeconds || 600)
    setCriteria(strategy.GoalAcceptanceCriteria || '')
    setRejected(false)
  }, [sessionId, strategy.GoalMinIterations, strategy.GoalDurationSeconds, strategy.GoalAcceptanceCriteria])

  const value = kind === 'acceptance' ? criteria : kind === 'duration' ? seconds : iterations
  const next = value === null ? undefined : buildGoalCondition(kind, value)

  return (
    <div
      className={styles['goal-editor']}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className={styles['goal-editor-label']}>{t('AIRunModeSelect.goalCondition')}</div>
      <YakitRadioButtons
        size="small"
        value={kind}
        options={(['iterations', 'duration', 'acceptance'] as const).map((mode) => ({
          value: mode,
          label: t(`AIRunModeSelect.${mode}`),
        }))}
        onChange={(event) => {
          setKind(event.target.value)
          setRejected(false)
        }}
      />
      {kind === 'iterations' && (
        <label className={styles['goal-field']}>
          <span>{t('AIRunModeSelect.minimumIterations')}</span>
          <YakitInputNumber
            aria-label={t('AIRunModeSelect.minimumIterations')}
            min={1}
            max={Number.MAX_SAFE_INTEGER}
            precision={0}
            value={iterations}
            onChange={(value) => setIterations(value === null ? null : Number(value))}
          />
        </label>
      )}
      {kind === 'duration' && (
        <>
          <label className={styles['goal-field']}>
            <span>{t('AIRunModeSelect.minimumDuration')}</span>
            <YakitInputNumber
              aria-label={t('AIRunModeSelect.minimumDuration')}
              min={1}
              max={Number.MAX_SAFE_INTEGER}
              precision={0}
              addonAfter={t('AIRunModeSelect.seconds')}
              disabled={seconds === -1}
              value={seconds === -1 ? null : seconds}
              onChange={(value) => setSeconds(value === null ? null : Number(value))}
            />
          </label>
          <label className={styles['goal-field']}>
            <span>{t('AIRunModeSelect.continuous')}</span>
            <YakitSwitch checked={seconds === -1} onChange={(checked) => setSeconds(checked ? -1 : 600)} />
          </label>
          <p className={styles['goal-help']}>{t('AIRunModeSelect.durationHelp')}</p>
        </>
      )}
      {kind === 'acceptance' && (
        <YakitInput.TextArea
          aria-label={t('AIRunModeSelect.acceptanceCriteria')}
          rows={3}
          isShowResize={false}
          value={criteria}
          placeholder={t('AIRunModeSelect.acceptancePlaceholder')}
          onChange={(event) => setCriteria(event.target.value)}
        />
      )}
      <p className={styles['goal-help']}>{t('AIRunModeSelect.exclusiveHelp')}</p>
      {rejected && (
        <p role="alert" className={styles['goal-help']}>
          {t('AIRunModeSelect.updateRejected')}
        </p>
      )}
      <YakitButton
        size="small"
        disabled={!next}
        onClick={() => {
          if (next) setRejected(!onApply(next))
        }}
      >
        {t('AIRunModeSelect.applyCondition')}
      </YakitButton>
    </div>
  )
}
