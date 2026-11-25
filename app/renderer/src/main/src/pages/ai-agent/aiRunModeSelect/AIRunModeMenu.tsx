import type { FC } from 'react'
import { Fragment, useLayoutEffect, useState } from 'react'
import { Tooltip } from 'antd'
import { useMemoizedFn, useUpdateEffect } from 'ahooks'
import {
  AtomOutlined,
  InformationCircleOutlined,
  ListTodoOutlined,
  QuestionMarkCircleOutlined,
  RotateCcwOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { MODE_LABEL_KEY, ModeOptionList } from './aiRunModeConstants'
import { useAIRunMode } from './useAIRunMode'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { clearGoalStrategy } from '../defaultConstant'
import {
  goalDurationKeyToSeconds,
  goalDurationSecondsToKey,
  isGoalDurationPresetKey,
} from '../components/aiMilkdownInput/constants'
import { deriveGoalTagFromStrategy } from '../components/aiMilkdownInput/aiMilkdownModeSlash/store/goalTag'
import GoalStopConditionFields from './GoalStopConditionFields/GoalStopConditionFields'
import type { GoalCondition } from './GoalStopConditionFields/type'
import styles from './AIRunModeSelect.module.scss'

export type AIRunModeMenuProps = {
  open?: boolean
  /** 嵌入输入框弹层时铺满容器宽度 */
  fullWidth?: boolean
}

/** Plan / Multi-Agent / Goal 菜单体：按钮下拉与输入框 / 弹层复用 */
export const AIRunModeMenu: FC<AIRunModeMenuProps> = ({ fullWidth, open = true }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const {
    isModeSelected,
    onToggleMode,
    onSetStrategy,
    maxSubAgents,
    enableGoalMode,
    goalMinIterations,
    goalDurationSeconds,
    goalAcceptanceCriteria,
    sessionId,
  } = useAIRunMode()
  const [acceptanceSelected, setAcceptanceSelected] = useState(false)
  const [acceptanceDraft, setAcceptanceDraft] = useState<string>()
  const [customDuration, setCustomDuration] = useState(false)
  const storedGoalMode = deriveGoalTagFromStrategy({
    EnableGoalMode: enableGoalMode,
    GoalMinIterations: goalMinIterations,
    GoalDurationSeconds: goalDurationSeconds,
    GoalAcceptanceCriteria: goalAcceptanceCriteria,
  }).kind
  const goalMode = acceptanceSelected ? 'acceptance' : (storedGoalMode ?? (enableGoalMode ? 'iterations' : null))
  const saveAcceptance = useMemoizedFn((owner: typeof sessionId) => {
    if (
      owner === sessionId &&
      enableGoalMode &&
      goalMode === 'acceptance' &&
      acceptanceDraft !== undefined &&
      acceptanceDraft !== goalAcceptanceCriteria
    ) {
      onSetStrategy({ GoalAcceptanceCriteria: acceptanceDraft }, true)
    }
  })
  useLayoutEffect(() => {
    if (open) {
      return () => {
        saveAcceptance(sessionId)
        setAcceptanceDraft(undefined)
      }
    }
  }, [open, sessionId])
  const durationKey = goalDurationSecondsToKey(goalDurationSeconds) ?? '1h'
  const showCustomDuration = customDuration || !isGoalDurationPresetKey(durationKey)
  const selectedDurationKey = showCustomDuration ? 'custom' : durationKey

  useUpdateEffect(() => {
    if (!enableGoalMode || goalMinIterations > 0 || goalDurationSeconds !== 0) {
      setAcceptanceSelected(false)
      setAcceptanceDraft(undefined)
    }
  }, [enableGoalMode, goalMinIterations, goalDurationSeconds])
  useUpdateEffect(() => {
    if (goalMode !== 'duration') setCustomDuration(false)
  }, [goalMode])
  const hasConfiguration =
    ModeOptionList.some((item) => isModeSelected(item.key)) ||
    maxSubAgents !== 0 ||
    goalMinIterations !== 0 ||
    goalDurationSeconds !== 0 ||
    !!goalAcceptanceCriteria

  const applyGoalMode = (mode: GoalCondition) => {
    setAcceptanceDraft(undefined)
    setCustomDuration(false)
    setAcceptanceSelected(mode === 'acceptance')
    onSetStrategy(
      {
        EnableGoalMode: true,
        GoalMinIterations: mode === 'iterations' ? Math.max(1, goalMinIterations) : 0,
        GoalDurationSeconds: mode === 'duration' ? goalDurationSeconds || 3600 : 0,
        GoalAcceptanceCriteria: mode === 'acceptance' ? goalAcceptanceCriteria : '',
      },
      true,
    )
  }
  const onReset = useMemoizedFn(() => {
    setAcceptanceDraft(undefined)
    if (isModeSelected('plan')) onToggleMode('plan')
    onSetStrategy({ EnableMultiAgent: false, MaxSubAgents: 0, ...clearGoalStrategy() })
    setAcceptanceSelected(false)
    setCustomDuration(false)
  })

  const onPickDuration = (value: string) => {
    if (value === selectedDurationKey) return
    const custom = value === 'custom'
    setCustomDuration(custom)
    if (custom && goalDurationSeconds > 0) return
    onSetStrategy({ GoalDurationSeconds: custom ? 3600 : goalDurationKeyToSeconds(value) }, true)
  }


  return (
    <div
      className={classNames(styles['mode-menu'], { [styles['mode-menu-panel']]: fullWidth })}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className={styles['mode-header']}>
        <div className={styles['mode-title']}>
          <AtomOutlined size={16} color="currentColor" />
          <span>{t('AIRunModeSelect.configuration')}</span>
          <Tooltip title={t('AIRunModeSelect.configurationTip')}>
            <InformationCircleOutlined size={12} color="currentColor" className={styles['mode-info']} />
          </Tooltip>
        </div>
        <YakitButton type="text2" size="small" disabled={!hasConfiguration} onClick={onReset}>
          {t('YakitButton.reset')}
          <RotateCcwOutlined size={16} color="currentColor" />
        </YakitButton>
      </div>
      <div className={styles['mode-list']}>
        {ModeOptionList.map((item) => {
          const Icon = item.key === 'plan' ? ListTodoOutlined : item.icon
          const checked = isModeSelected(item.key)
          const modeTip =
            item.key === 'plan'
              ? t('AIRunModeSelect.planTip')
              : item.key === 'multiAgent'
                ? t('AIRunModeSelect.multiAgentTip')
                : undefined
          return (
            <Fragment key={item.key}>
              <div className={styles['mode-option']}>
                <div className={styles['mode-option-left']}>
                  <Icon size={16} color="currentColor" />
                  <span>{t(MODE_LABEL_KEY[item.key])}</span>
                  {modeTip && (
                    <Tooltip title={modeTip} trigger={['hover', 'focus']}>
                      <QuestionMarkCircleOutlined
                        size={12}
                        color="var(--Colors-Use-Neutral-Text-3-Secondary)"
                        tabIndex={0}
                        aria-label={modeTip}
                      />
                    </Tooltip>
                  )}
                </div>
                <YakitSwitch
                  aria-label={t(MODE_LABEL_KEY[item.key])}
                  checked={checked}
                  onChange={() => {
                    if (item.key === 'goal' && checked) {
                      setAcceptanceDraft(undefined)
                      setAcceptanceSelected(false)
                      setCustomDuration(false)
                    }
                    onToggleMode(item.key)
                  }}
                  wrapperClassName={styles['mode-switch']}
                />
              </div>
              {checked && item.key === 'multiAgent' && (
                <div className={styles['mode-configuration']}>
                  <div className={styles['configuration-row']}>
                    <span>{t('AIMilkdownModeSlash.subAgentCount')}</span>
                    <YakitInputNumber
                      aria-label={t('AIMilkdownModeSlash.subAgentCount')}
                      className={styles['configuration-control']}
                      value={maxSubAgents}
                      min={0}
                      max={20}
                      precision={0}
                      onChange={(value) => {
                        if (value !== null) onSetStrategy({ MaxSubAgents: Math.min(20, Math.max(0, Number(value))) })
                      }}
                    />
                  </div>
                </div>
              )}
              {checked && item.key === 'goal' && (
                <GoalStopConditionFields
                  condition={goalMode}
                  onConditionChange={applyGoalMode}
                  iterations={goalMinIterations}
                  onIterationsChange={(value) => onSetStrategy({ GoalMinIterations: value })}
                  acceptance={acceptanceDraft ?? goalAcceptanceCriteria}
                  onAcceptanceChange={(value) => {
                    setAcceptanceSelected(true)
                    setAcceptanceDraft(value)
                  }}
                  durationSeconds={goalDurationSeconds}
                  customDuration={showCustomDuration}
                  onDurationPick={onPickDuration}
                  onCustomDurationChange={(seconds) => onSetStrategy({ GoalDurationSeconds: seconds }, true)}
                />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
