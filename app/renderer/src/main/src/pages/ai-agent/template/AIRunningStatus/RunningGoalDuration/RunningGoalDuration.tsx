import type { FC } from 'react'
import { useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import GoalDurationInputs from '@/pages/ai-agent/aiRunModeSelect/GoalDurationInputs/GoalDurationInputs'
import {
  GOAL_DURATION_OPTIONS,
  getGoalDurationDisplayLabel,
  goalDurationKeyToSeconds,
} from '@/pages/ai-agent/components/aiMilkdownInput/constants'
import type { RunningGoalDurationProps } from './type'
import styles from './RunningGoalDuration.module.scss'

const RunningGoalDuration: FC<RunningGoalDurationProps> = ({ loading, neverEnding, onSetDuration }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [selected, setSelected] = useState<(typeof GOAL_DURATION_OPTIONS)[number] | null>(neverEnding ? 'never' : null)
  const [customSeconds, setCustomSeconds] = useState(3600)

  return (
    <>
      <div className={styles.hint}>{t('AIRunningStatus.resetDurationHint')}</div>
      <div className={styles.panel}>
        <div className={styles.row}>
          <span>{t('AIMilkdownModeSlash.duration')}</span>
          <div className={styles.options} role="group" aria-label={t('AIMilkdownModeSlash.duration')}>
            {GOAL_DURATION_OPTIONS.map((key) => (
              <YakitButton
                key={key}
                type={selected === key ? 'primary' : 'secondary2'}
                radius="9999px"
                aria-pressed={selected === key}
                disabled={loading}
                onClick={() => {
                  setSelected(key)
                  if (key !== 'custom' && !(key === 'never' && neverEnding)) {
                    onSetDuration(goalDurationKeyToSeconds(key))
                  }
                }}
              >
                {getGoalDurationDisplayLabel(key, t)}
              </YakitButton>
            ))}
          </div>
        </div>
        {selected === 'custom' && (
          <div className={styles.customRow} role="group" aria-label={t('AIRunModeSelect.customDuration')}>
            <GoalDurationInputs seconds={customSeconds} onChange={setCustomSeconds} />
            <YakitButton
              radius={9999}
              type="secondary2"
              disabled={loading}
              onClick={() => onSetDuration(customSeconds)}
            >
              {t('YakitButton.apply')}
            </YakitButton>
          </div>
        )}
      </div>
    </>
  )
}

export default RunningGoalDuration
