import type { FC, Ref } from 'react'
import { Fragment, useImperativeHandle, useState } from 'react'
import { Tooltip } from 'antd'
import { useCreation, useMemoizedFn, useUpdateEffect } from 'ahooks'
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
import { getToggledStrategy } from './syncRunModeStrategy'
import type { AIExecutionStrategy } from '@/pages/ai-re-act/hooks/grpcApi'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { clearGoalStrategy } from '../defaultConstant'
import { goalDurationKeyToSeconds } from '../components/aiMilkdownInput/constants'
import { deriveGoalTagFromStrategy } from '../components/aiMilkdownInput/aiMilkdownModeSlash/store/goalTag'
import GoalStopConditionFields from './GoalStopConditionFields/GoalStopConditionFields'
import type { GoalCondition } from './GoalStopConditionFields/type'
import styles from './AIRunModeSelect.module.scss'

export type AIRunModeMenuProps = {
  ref?: Ref<() => void>
  /** 嵌入输入框弹层时铺满容器宽度 */
  fullWidth?: boolean
}

/** 返回草稿中与已保存策略不同的字段及其新值。全部改回原值时返回空对象，关闭弹窗时即可跳过策略提交。 */
const changedStrategyFields = (draft: AIExecutionStrategy, saved: AIExecutionStrategy): AIExecutionStrategy =>
  Object.fromEntries(Object.entries(draft).filter(([key, value]) => value !== saved[key as keyof AIExecutionStrategy]))

/** Plan / Multi-Agent / Goal 菜单体：按钮下拉与输入框 / 弹层复用 */
export const AIRunModeMenu: FC<AIRunModeMenuProps> = ({ fullWidth, ref }) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const mode = useAIRunMode()
  const { onSetPlan, onSetStrategy } = mode
  const savedStrategy = useCreation(
    () => ({
      EnableMultiAgent: mode.enableMultiAgent,
      MaxSubAgents: mode.maxSubAgents,
      EnableGoalMode: mode.enableGoalMode,
      GoalMinIterations: mode.goalMinIterations,
      GoalDurationSeconds: mode.goalDurationSeconds,
      GoalAcceptanceCriteria: mode.goalAcceptanceCriteria,
    }),
    [
      mode.enableMultiAgent,
      mode.maxSubAgents,
      mode.enableGoalMode,
      mode.goalMinIterations,
      mode.goalDurationSeconds,
      mode.goalAcceptanceCriteria,
    ],
  )
  const [planDraft, setPlanDraft] = useState<boolean>()
  const [strategyDraft, setStrategyDraft] = useState<AIExecutionStrategy>({})
  const strategy = useCreation(() => ({ ...savedStrategy, ...strategyDraft }), [savedStrategy, strategyDraft])
  const {
    MaxSubAgents: maxSubAgents,
    EnableGoalMode: enableGoalMode,
    GoalMinIterations: goalMinIterations,
    GoalDurationSeconds: goalDurationSeconds,
    GoalAcceptanceCriteria: goalAcceptanceCriteria,
  } = strategy
  const selected = useCreation(
    () => ({ plan: planDraft ?? mode.enablePlan, multiAgent: strategy.EnableMultiAgent, goal: enableGoalMode }),
    [planDraft, mode.enablePlan, strategy.EnableMultiAgent, enableGoalMode],
  )
  const editStrategy = (patch: AIExecutionStrategy) => {
    setStrategyDraft((current) => changedStrategyFields({ ...current, ...patch }, savedStrategy))
  }
  const [acceptanceSelected, setAcceptanceSelected] = useState(false)
  const [customDuration, setCustomDuration] = useState(false)
  const goalMode = useCreation<GoalCondition | null>(() => {
    if (acceptanceSelected) return 'acceptance'
    return deriveGoalTagFromStrategy(strategy).kind ?? (strategy.EnableGoalMode ? 'iterations' : null)
  }, [acceptanceSelected, strategy])
  const submitDraft = () => {
    if (selected.plan !== mode.enablePlan) onSetPlan(selected.plan)
    const changes = changedStrategyFields(strategyDraft, savedStrategy)
    if (Object.keys(changes).length) onSetStrategy(changes, true)
  }
  useImperativeHandle(ref, () => submitDraft)

  useUpdateEffect(() => {
    if (!enableGoalMode || goalMinIterations > 0 || goalDurationSeconds !== 0) {
      setAcceptanceSelected(false)
    }
  }, [enableGoalMode, goalMinIterations, goalDurationSeconds])
  useUpdateEffect(() => {
    if (goalMode !== 'duration') setCustomDuration(false)
  }, [goalMode])
  const hasConfiguration =
    ModeOptionList.some((item) => selected[item.key]) ||
    maxSubAgents !== 0 ||
    goalMinIterations !== 0 ||
    goalDurationSeconds !== 0 ||
    !!goalAcceptanceCriteria

  const applyGoalMode = (mode: GoalCondition) => {
    setCustomDuration(false)
    setAcceptanceSelected(mode === 'acceptance')
    editStrategy({
      EnableGoalMode: true,
      GoalMinIterations: mode === 'iterations' ? Math.max(1, goalMinIterations) : 0,
      GoalDurationSeconds: mode === 'duration' ? goalDurationSeconds || 3600 : 0,
      GoalAcceptanceCriteria: mode === 'acceptance' ? goalAcceptanceCriteria : '',
    })
  }
  const onReset = useMemoizedFn(() => {
    setPlanDraft(false)
    editStrategy({ EnableMultiAgent: false, MaxSubAgents: 0, ...clearGoalStrategy() })
    setAcceptanceSelected(false)
    setCustomDuration(false)
  })

  const onPickDuration = (value: string) => {
    const custom = value === 'custom'
    setCustomDuration(custom)
    if (custom && goalDurationSeconds > 0) return
    editStrategy({ GoalDurationSeconds: custom ? 3600 : goalDurationKeyToSeconds(value) })
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
          const checked = selected[item.key]
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
                  onChange={(nextChecked) => {
                    if (item.key === 'goal' && checked) {
                      setAcceptanceSelected(false)
                      setCustomDuration(false)
                    }
                    if (item.key === 'plan') setPlanDraft(nextChecked === mode.enablePlan ? undefined : nextChecked)
                    else editStrategy(getToggledStrategy(item.key, strategy))
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
                        if (value !== null) editStrategy({ MaxSubAgents: Math.min(20, Math.max(0, Number(value))) })
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
                  onIterationsChange={(value) => editStrategy({ GoalMinIterations: value })}
                  acceptance={goalAcceptanceCriteria}
                  onAcceptanceChange={(value) => {
                    setAcceptanceSelected(true)
                    editStrategy({ GoalAcceptanceCriteria: value })
                  }}
                  durationSeconds={goalDurationSeconds}
                  customDuration={customDuration}
                  onDurationPick={onPickDuration}
                  onCustomDurationChange={(seconds) => editStrategy({ GoalDurationSeconds: seconds })}
                />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
