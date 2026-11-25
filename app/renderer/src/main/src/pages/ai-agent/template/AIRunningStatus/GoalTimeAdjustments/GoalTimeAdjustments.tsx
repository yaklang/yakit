import type { FC } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { AIGoalTimeAction, AIInputEventHotPatchTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIGoalTimePatch } from '@/pages/ai-re-act/hooks/grpcApi'
import type { GoalTimeAdjustmentsProps } from './type'
import styles from './GoalTimeAdjustments.module.scss'

const GoalTimeAdjustments: FC<GoalTimeAdjustmentsProps> = ({ sessionId }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { onSend } = useAIAgentDispatcher()
  const sendGoalTimePatch = (patch: AIGoalTimePatch) => {
    if (!sessionId) return
    onSend({
      token: sessionId,
      type: '',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_GoalTime,
        GoalTimePatch: patch,
      },
    })
  }
  const adjustments = [
    {
      label: t('AIRunningStatus.extend'),
      options: [
        { label: '+15m', patch: { Action: AIGoalTimeAction.Extend, ExtendSeconds: 900 } },
        { label: '+30m', patch: { Action: AIGoalTimeAction.Extend, ExtendSeconds: 1800 } },
        { label: '+1h', patch: { Action: AIGoalTimeAction.Extend, ExtendSeconds: 3600 } },
        { label: t('AIRunningStatus.unlimited'), patch: { Action: AIGoalTimeAction.NeverEnding } },
      ],
    },
    {
      label: t('AIRunningStatus.shorten'),
      options: [
        { label: '-15m', patch: { Action: AIGoalTimeAction.Extend, ExtendSeconds: -900 } },
        { label: t('AIRunningStatus.stopAfterRound'), patch: { Action: AIGoalTimeAction.Disable } },
      ],
    },
  ]

  return (
    <div className={styles.adjustments}>
      <div className={styles.hint}>{t('AIRunningStatus.adjustmentHint')}</div>
      {adjustments.map((group) => (
        <div className={styles.row} role="group" aria-label={group.label} key={group.label}>
          <span>{group.label}</span>
          <div className={styles.options}>
            {group.options.map(({ label, patch }) => (
              <YakitButton
                key={label}
                type="secondary2"
                radius={9999}
                className={styles.option}
                onClick={() => sendGoalTimePatch(patch)}
              >
                {label}
              </YakitButton>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default GoalTimeAdjustments
