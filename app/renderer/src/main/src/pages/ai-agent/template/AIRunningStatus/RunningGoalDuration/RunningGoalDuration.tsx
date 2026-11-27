import type { FC } from 'react'
import { useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import GoalDurationInputs from '@/pages/ai-agent/aiRunModeSelect/GoalDurationInputs/GoalDurationInputs'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { RunningGoalDurationProps } from './type'
import styles from '../GoalTimeAdjustments/GoalTimeAdjustments.module.scss'

const DURATION_OPTIONS = [
  { label: '30m', seconds: 1800 },
  { label: '1h', seconds: 3600 },
  { label: '2h', seconds: 7200 },
  { label: '3h', seconds: 10800 },
] as const

const RunningGoalDuration: FC<RunningGoalDurationProps> = ({ loading, onSetDuration }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [customOpen, setCustomOpen] = useState(false)
  const [customSeconds, setCustomSeconds] = useState(3600)

  const applyDuration = (seconds: number) => {
    if (loading || !Number.isSafeInteger(seconds) || seconds < 60) return
    onSetDuration(seconds)
  }

  return (
    <div className={styles.adjustments}>
      <div className={styles.hint}>{t('AIRunningStatus.resetDurationHint')}</div>
      <div className={styles.row} role="group" aria-label={t('AIMilkdownModeSlash.duration')}>
        <span>{t('AIMilkdownModeSlash.duration')}</span>
        <div className={styles.options}>
          {DURATION_OPTIONS.map(({ label, seconds }) => (
            <YakitButton
              key={label}
              type="secondary2"
              radius={9999}
              className={styles.option}
              disabled={loading}
              onClick={() => {
                setCustomOpen(false)
                applyDuration(seconds)
              }}
            >
              {label}
            </YakitButton>
          ))}
          <YakitButton
            type={customOpen ? 'primary' : 'secondary2'}
            radius={9999}
            className={styles.option}
            disabled={loading}
            onClick={() => setCustomOpen(true)}
          >
            {t('AIRunModeSelect.customDuration')}
          </YakitButton>
        </div>
      </div>
      {customOpen && (
        <div className={styles.row} role="group" aria-label={t('AIRunModeSelect.customDuration')}>
          <span>{t('AIRunModeSelect.customDuration')}</span>
          <div className={styles.customDuration}>
            <GoalDurationInputs seconds={customSeconds} onChange={setCustomSeconds} />
            <YakitButton
              type="primary"
              radius={9999}
              className={styles.option}
              disabled={loading}
              onClick={() => applyDuration(customSeconds)}
            >
              {t('YakitButton.apply')}
            </YakitButton>
          </div>
        </div>
      )}
    </div>
  )
}

export default RunningGoalDuration
