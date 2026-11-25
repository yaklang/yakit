import type { FC } from 'react'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { GoalDurationInputsProps } from './type'
import styles from './GoalDurationInputs.module.scss'

const GoalDurationInputs: FC<GoalDurationInputsProps> = ({ seconds, onChange, minSeconds = 60 }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const updateDuration = (nextHours: number, nextMinutes: number) => {
    const nextSeconds = Math.max(minSeconds, nextHours * 3600 + nextMinutes * 60)
    if (Number.isSafeInteger(nextSeconds)) onChange(nextSeconds)
  }

  return (
    <div className={styles.inputs}>
      <YakitInputNumber
        aria-label={t('AIRunModeSelect.durationHours')}
        value={hours}
        min={0}
        precision={0}
        onChange={(value) => {
          if (value !== null) updateDuration(Math.max(0, Number(value)), minutes)
        }}
      />
      <span>{t('AIRunModeSelect.hourUnit')}</span>
      <YakitInputNumber
        aria-label={t('AIRunModeSelect.durationMinutes')}
        value={minutes}
        min={0}
        max={59}
        precision={0}
        onChange={(value) => {
          if (value !== null) updateDuration(hours, Math.min(59, Math.max(0, Number(value))))
        }}
      />
      <span>{t('AIRunModeSelect.minuteUnit')}</span>
    </div>
  )
}

export default GoalDurationInputs
