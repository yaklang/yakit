import type { FC } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  GOAL_DURATION_OPTIONS,
  getGoalDurationDisplayLabel,
  goalDurationSecondsToKey,
  isGoalDurationPresetKey,
} from '../../components/aiMilkdownInput/constants'
import GoalDurationInputs from '../GoalDurationInputs/GoalDurationInputs'
import type { GoalStopConditionFieldsProps } from './type'
import styles from './GoalStopConditionFields.module.scss'

const goalConditions = [
  { value: 'iterations', label: 'AIMilkdownModeSlash.minIterations' },
  { value: 'acceptance', label: 'AIMilkdownModeSlash.acceptance' },
  { value: 'duration', label: 'AIMilkdownModeSlash.duration' },
] as const

const GoalStopConditionFields: FC<GoalStopConditionFieldsProps> = ({
  condition,
  onConditionChange,
  iterations,
  onIterationsChange,
  acceptance,
  onAcceptanceChange,
  durationSeconds,
  customDuration,
  onDurationPick,
  onCustomDurationChange,
  minDurationSeconds,
}) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const durationKey = goalDurationSecondsToKey(durationSeconds)
  const selectedDurationKey =
    customDuration || (durationKey !== null && !isGoalDurationPresetKey(durationKey)) ? 'custom' : durationKey

  return (
    <div className={styles['mode-configuration']}>
      <div className={styles['goal-choice-row']}>
        <span>{t('AIRunModeSelect.stopCondition')}</span>
        <div role="group" aria-label={t('AIRunModeSelect.stopCondition')} className={styles['goal-pills']}>
          {goalConditions.map(({ value, label }) => {
            const selected = value === condition
            return (
              <YakitButton
                key={value}
                type={selected ? 'primary' : 'secondary2'}
                radius="9999px"
                aria-pressed={selected}
                onClick={() => {
                  if (!selected) onConditionChange(value)
                }}
              >
                {t(label)}
              </YakitButton>
            )
          })}
        </div>
      </div>
      <div className={styles['goal-divider']} />
      {condition === 'iterations' && (
        <div className={styles['configuration-row']}>
          <span>{t('AIMilkdownModeSlash.minIterations')}</span>
          <YakitInputNumber
            aria-label={t('AIMilkdownModeSlash.minIterations')}
            className={styles['configuration-control']}
            value={Math.max(1, iterations)}
            min={1}
            precision={0}
            onChange={(value) => {
              if (value !== null) onIterationsChange(Math.max(1, Number(value)))
            }}
          />
        </div>
      )}
      {condition === 'acceptance' && (
        <YakitInput.TextArea
          className={styles['goal-acceptance']}
          aria-label={t('AIMilkdownModeSlash.acceptance')}
          placeholder={t('AIMilkdownModeSlash.acceptancePlaceholder')}
          value={acceptance}
          onChange={(event) => {
            onAcceptanceChange(event.target.value)
          }}
          rows={3}
          isShowResize={false}
        />
      )}
      {condition === 'duration' && (
        <>
          <div className={styles['goal-choice-row']}>
            <span>{t('AIMilkdownModeSlash.duration')}</span>
            <div role="group" aria-label={t('AIMilkdownModeSlash.duration')} className={styles['goal-pills']}>
              {GOAL_DURATION_OPTIONS.map((key) => (
                <YakitButton
                  key={key}
                  type={selectedDurationKey === key ? 'primary' : 'secondary2'}
                  radius="9999px"
                  aria-pressed={selectedDurationKey === key}
                  onClick={() => {
                    if (key !== selectedDurationKey) onDurationPick(key)
                  }}
                >
                  {getGoalDurationDisplayLabel(key, t)}
                </YakitButton>
              ))}
            </div>
          </div>
          {selectedDurationKey === 'custom' && (
            <div className={styles['duration-input-row']}>
              <GoalDurationInputs
                seconds={durationSeconds >= 0 ? durationSeconds : 3600}
                minSeconds={minDurationSeconds}
                onChange={onCustomDurationChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default GoalStopConditionFields
