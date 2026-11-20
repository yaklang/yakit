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
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { MODE_LABEL_KEY, ModeOptionList } from './aiRunModeConstants'
import { useAIRunMode } from './useAIRunMode'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { clearGoalStrategy } from '../defaultConstant'
import {
  GOAL_DURATION_PRESETS,
  getGoalDurationDisplayLabel,
  goalDurationKeyToSeconds,
  goalDurationSecondsToKey,
  isGoalDurationPresetKey,
} from '../components/aiMilkdownInput/constants'
import { deriveGoalTagFromStrategy } from '../components/aiMilkdownInput/aiMilkdownModeSlash/store/goalTag'
import styles from './AIRunModeSelect.module.scss'

export type AIRunModeMenuProps = {
  open?: boolean
  /** 嵌入输入框弹层时铺满容器宽度 */
  fullWidth?: boolean
}

const goalConditions = [
  { value: 'iterations', label: 'AIMilkdownModeSlash.minIterations' },
  { value: 'acceptance', label: 'AIMilkdownModeSlash.acceptance' },
  { value: 'duration', label: 'AIMilkdownModeSlash.duration' },
] as const

type GoalCondition = (typeof goalConditions)[number]['value']

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
  const hours = Math.floor(Math.max(0, goalDurationSeconds) / 3600)
  const minutes = Math.floor((Math.max(0, goalDurationSeconds) % 3600) / 60)

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

  const onChangeCustomDuration = (nextHours: number, nextMinutes: number) => {
    const seconds = Math.max(60, nextHours * 3600 + nextMinutes * 60)
    if (Number.isSafeInteger(seconds)) onSetStrategy({ GoalDurationSeconds: seconds }, true)
  }

  const renderGoalConfiguration = () => (
    <div className={styles['mode-configuration']}>
      <div className={styles['goal-choice-row']}>
        <span>{t('AIRunModeSelect.stopCondition')}</span>
        <div role="group" aria-label={t('AIRunModeSelect.stopCondition')} className={styles['goal-pills']}>
          {goalConditions.map(({ value, label }) => {
            const selected = value === goalMode
            return (
              <YakitButton
                key={value}
                type={selected ? 'primary' : 'secondary2'}
                radius="9999px"
                aria-pressed={selected}
                onClick={() => {
                  if (!selected) applyGoalMode(value)
                }}
              >
                {t(label)}
              </YakitButton>
            )
          })}
        </div>
      </div>
      <div className={styles['goal-divider']} />
      {goalMode === 'iterations' && (
        <div className={styles['configuration-row']}>
          <span>{t('AIMilkdownModeSlash.minIterations')}</span>
          <YakitInputNumber
            aria-label={t('AIMilkdownModeSlash.minIterations')}
            className={styles['configuration-control']}
            value={Math.max(1, goalMinIterations)}
            min={1}
            precision={0}
            onChange={(value) => {
              if (value !== null) onSetStrategy({ GoalMinIterations: Math.max(1, Number(value)) })
            }}
          />
        </div>
      )}
      {goalMode === 'acceptance' && (
        <YakitInput.TextArea
          className={styles['goal-acceptance']}
          aria-label={t('AIMilkdownModeSlash.acceptance')}
          placeholder={t('AIMilkdownModeSlash.acceptancePlaceholder')}
          value={acceptanceDraft ?? goalAcceptanceCriteria}
          onChange={(event) => {
            setAcceptanceSelected(true)
            setAcceptanceDraft(event.target.value)
          }}
          rows={3}
          isShowResize={false}
        />
      )}
      {goalMode === 'duration' && (
        <>
          <div className={styles['goal-choice-row']}>
            <span>{t('AIMilkdownModeSlash.duration')}</span>
            <div role="group" aria-label={t('AIMilkdownModeSlash.duration')} className={styles['goal-pills']}>
              {GOAL_DURATION_PRESETS.filter(({ key }) => key !== 'never' || durationKey === 'never').map(({ key }) => (
                <YakitButton
                  key={key}
                  type={selectedDurationKey === key ? 'primary' : 'secondary2'}
                  radius="9999px"
                  aria-pressed={selectedDurationKey === key}
                  onClick={() => onPickDuration(key)}
                >
                  {getGoalDurationDisplayLabel(key, t)}
                </YakitButton>
              ))}
              <YakitButton
                type={showCustomDuration ? 'primary' : 'secondary2'}
                radius="9999px"
                aria-pressed={showCustomDuration}
                onClick={() => onPickDuration('custom')}
              >
                {t('AIRunModeSelect.customDuration')}
              </YakitButton>
            </div>
          </div>
          {showCustomDuration && (
            <div className={styles['custom-duration']}>
              <YakitInputNumber
                aria-label={t('AIRunModeSelect.durationHours')}
                value={hours}
                min={0}
                precision={0}
                onChange={(value) => {
                  if (value !== null) onChangeCustomDuration(Math.max(0, Number(value)), minutes)
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
                  if (value !== null) onChangeCustomDuration(hours, Math.min(59, Math.max(0, Number(value))))
                }}
              />
              <span>{t('AIRunModeSelect.minuteUnit')}</span>
            </div>
          )}
        </>
      )}
    </div>
  )

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
              {checked && item.key === 'goal' && renderGoalConfiguration()}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
