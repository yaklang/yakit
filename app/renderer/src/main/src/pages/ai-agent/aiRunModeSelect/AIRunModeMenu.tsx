import type { FC } from 'react'
import { Fragment, useState } from 'react'
import { Radio, Tooltip } from 'antd'
import { useMemoizedFn, useUpdateEffect } from 'ahooks'
import {
  AtomOutlined,
  InformationCircleOutlined,
  IntentionOutlined,
  PencilAltOutlined,
  RotateCcwOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
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
} from '../components/aiMilkdownInput/constants'
import { deriveGoalTagFromStrategy } from '../components/aiMilkdownInput/aiMilkdownModeSlash/store/goalTag'
import styles from './AIRunModeSelect.module.scss'

export type AIRunModeMenuProps = {
  /** 嵌入输入框弹层时铺满容器宽度 */
  fullWidth?: boolean
}

/** Plan / Multi-Agent / Goal 菜单体：按钮下拉与输入框 / 弹层复用 */
export const AIRunModeMenu: FC<AIRunModeMenuProps> = ({ fullWidth }) => {
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
  } = useAIRunMode()
  const [acceptanceOpen, setAcceptanceOpen] = useState(false)
  const [acceptanceSelected, setAcceptanceSelected] = useState(false)
  const [draftAcceptance, setDraftAcceptance] = useState('')
  const [pendingGoalMode, setPendingGoalMode] = useState<string | null>(null)
  const storedGoalMode = deriveGoalTagFromStrategy({
    EnableGoalMode: enableGoalMode,
    GoalMinIterations: goalMinIterations,
    GoalDurationSeconds: goalDurationSeconds,
    GoalAcceptanceCriteria: goalAcceptanceCriteria,
  }).kind
  const goalMode = acceptanceSelected ? 'acceptance' : (storedGoalMode ?? (enableGoalMode ? 'iterations' : null))

  useUpdateEffect(() => {
    if (!enableGoalMode || goalMinIterations > 0 || goalDurationSeconds !== 0) setAcceptanceSelected(false)
    if (!enableGoalMode) setPendingGoalMode(null)
  }, [enableGoalMode, goalMinIterations, goalDurationSeconds])
  const hasConfiguration =
    ModeOptionList.some((item) => isModeSelected(item.key)) ||
    maxSubAgents !== 0 ||
    goalMinIterations !== 0 ||
    goalDurationSeconds !== 0 ||
    !!goalAcceptanceCriteria

  const onAcceptanceOpenChange = useMemoizedFn((open: boolean) => {
    if (open && goalMode !== 'acceptance') return
    if (open) setDraftAcceptance(goalAcceptanceCriteria)
    setAcceptanceOpen(open)
  })
  const onSaveAcceptance = useMemoizedFn(() => {
    const text = draftAcceptance.trim()
    if (!text) return
    onSetStrategy({ EnableGoalMode: true, GoalMinIterations: 0, GoalDurationSeconds: 0, GoalAcceptanceCriteria: text })
    setAcceptanceOpen(false)
  })
  const applyGoalMode = useMemoizedFn((mode: string) => {
    setAcceptanceOpen(false)
    setAcceptanceSelected(mode === 'acceptance')
    if (mode === 'acceptance') {
      onSetStrategy({
        EnableGoalMode: true,
        GoalMinIterations: 0,
        GoalDurationSeconds: 0,
        GoalAcceptanceCriteria: goalAcceptanceCriteria,
      })
    } else if (mode === 'iterations') {
      onSetStrategy({
        EnableGoalMode: true,
        GoalMinIterations: Math.max(1, goalMinIterations),
        GoalDurationSeconds: 0,
        GoalAcceptanceCriteria: '',
      })
    } else if (mode === 'duration') {
      onSetStrategy({
        EnableGoalMode: true,
        GoalMinIterations: 0,
        GoalDurationSeconds: goalDurationSeconds || 3600,
        GoalAcceptanceCriteria: '',
      })
    }
  })
  const onPickGoalMode = useMemoizedFn((mode: string) => {
    if (mode === goalMode) return
    setPendingGoalMode(mode)
  })
  const onReset = useMemoizedFn(() => {
    if (isModeSelected('plan')) onToggleMode('plan')
    onSetStrategy({ EnableMultiAgent: false, MaxSubAgents: 0, ...clearGoalStrategy() })
    setAcceptanceOpen(false)
    setAcceptanceSelected(false)
    setPendingGoalMode(null)
  })

  const renderGoalOption = (mode: string, label: string) => (
    <YakitPopconfirm
      title={t('AIRunModeSelect.switchGoalModeContent')}
      placement="topLeft"
      open={pendingGoalMode === mode}
      disabled={mode === goalMode}
      onOpenChange={(open) => {
        if (!open) setPendingGoalMode(null)
      }}
      onConfirm={() => {
        applyGoalMode(mode)
        setPendingGoalMode(null)
      }}
      onCancel={() => setPendingGoalMode(null)}
      getPopupContainer={(trigger) => trigger.parentElement!}
      destroyOnHidden
    >
      <Radio value={mode}>{label}</Radio>
    </YakitPopconfirm>
  )

  const renderGoalConfiguration = () => (
    <div className={styles['mode-configuration']}>
      <div className={styles['configuration-hint']}>{t('AIRunModeSelect.goalHint')}</div>
      <Radio.Group
        value={goalMode}
        onChange={(event) => onPickGoalMode(event.target.value)}
        className={styles['goal-options']}
      >
        <div className={styles['configuration-row']}>
          {renderGoalOption('iterations', t('AIMilkdownModeSlash.minIterations'))}
          <YakitInputNumber
            aria-label={t('AIMilkdownModeSlash.minIterations')}
            className={styles['configuration-control']}
            value={Math.max(1, goalMinIterations)}
            min={1}
            precision={0}
            disabled={goalMode !== 'iterations'}
            onChange={(value) => {
              if (value !== null) onSetStrategy({ GoalMinIterations: Math.max(1, Number(value)) })
            }}
          />
        </div>
        <div className={styles['configuration-row']}>
          {renderGoalOption('acceptance', t('AIMilkdownModeSlash.acceptance'))}
          <YakitPopover
            arrow={false}
            trigger="click"
            placement="bottomRight"
            open={acceptanceOpen}
            onOpenChange={onAcceptanceOpenChange}
            destroyOnHidden
            classNames={{ root: styles['acceptance-popover'] }}
            content={
              <div className={styles['acceptance-editor']} onKeyDown={(event) => event.stopPropagation()}>
                <div className={styles['acceptance-title']}>{t('AIMilkdownModeSlash.acceptance')}</div>
                <YakitInput.TextArea
                  aria-label={t('AIMilkdownModeSlash.acceptance')}
                  placeholder={t('AIMilkdownModeSlash.acceptancePlaceholder')}
                  value={draftAcceptance}
                  onChange={(event) => setDraftAcceptance(event.target.value)}
                  autoSize={{ minRows: 3, maxRows: 8 }}
                />
                <div className={styles['acceptance-actions']}>
                  <YakitButton type="outline2" onClick={() => setAcceptanceOpen(false)}>
                    {t('YakitButton.cancel')}
                  </YakitButton>
                  <YakitButton disabled={!draftAcceptance.trim()} onClick={onSaveAcceptance}>
                    {t('YakitButton.save')}
                  </YakitButton>
                </div>
              </div>
            }
          >
            <YakitButton
              type="text2"
              size="small"
              className={classNames(styles['acceptance-trigger'], {
                [styles['acceptance-empty']]: !goalAcceptanceCriteria,
              })}
              aria-label={t('AIRunModeSelect.editAcceptance')}
              title={goalAcceptanceCriteria}
              disabled={goalMode !== 'acceptance'}
            >
              <span className={styles['acceptance-text']}>
                {goalAcceptanceCriteria || t('AIRunModeSelect.noAcceptance')}
              </span>
              <PencilAltOutlined
                size={12}
                color="currentColor"
                svgProps={
                  goalMode === 'acceptance' ? { style: { color: 'var(--Colors-Use-Main-Primary)' } } : undefined
                }
              />
            </YakitButton>
          </YakitPopover>
        </div>
        <div className={styles['configuration-row']}>
          <div className={styles['duration-label']}>
            {renderGoalOption('duration', t('AIMilkdownModeSlash.duration'))}
            <div className={styles['duration-hint']}>{t('AIRunModeSelect.durationHint')}</div>
          </div>
          <YakitSelect
            aria-label={t('AIMilkdownModeSlash.duration')}
            wrapperClassName={styles['configuration-control']}
            disabled={goalMode !== 'duration'}
            value={goalDurationSecondsToKey(goalDurationSeconds) || '1h'}
            onChange={(value) => onSetStrategy({ GoalDurationSeconds: goalDurationKeyToSeconds(String(value)) })}
            options={GOAL_DURATION_PRESETS.map((item) => ({
              value: item.key,
              label: getGoalDurationDisplayLabel(item.key, t),
            }))}
            getPopupContainer={(trigger) => trigger.parentElement!}
          />
        </div>
      </Radio.Group>
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
          const Icon = item.key === 'plan' ? IntentionOutlined : item.icon
          const checked = isModeSelected(item.key)
          return (
            <Fragment key={item.key}>
              <div className={styles['mode-option']}>
                <div className={styles['mode-option-left']}>
                  <Icon size={16} color="currentColor" />
                  <span>{t(MODE_LABEL_KEY[item.key])}</span>
                </div>
                <YakitSwitch
                  aria-label={t(MODE_LABEL_KEY[item.key])}
                  checked={checked}
                  onChange={() => {
                    if (item.key === 'goal' && checked) {
                      setAcceptanceOpen(false)
                      setAcceptanceSelected(false)
                      setPendingGoalMode(null)
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
