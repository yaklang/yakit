import React, { memo, useState } from 'react'
import { Dropdown, Tooltip } from 'antd'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { OutlineCheckIcon, OutlineChevrondownIcon } from '@/assets/icon/outline'
import { SolidCheckIcon } from '@/assets/icon/solid'
import { OutlineViewGridIcon } from '@/components/yakChat/icon'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useAIRunMode } from './useAIRunMode'
import { ModeOptionList } from './aiRunModeConstants'
import { GoalConditionEditor } from './GoalConditionEditor'
import styles from './AIRunModeSelect.module.scss'
import {
  requestModeSlashReopen,
  goalDurationSecondsToKey,
} from '../components/aiMilkdownInput/aiMilkdownModeSlash/store'

const AIRunModeSelect: React.FC = memo(() => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const {
    enableMultiAgent,
    enableGoalMode,
    strategy,
    maxSubAgents,
    selectedModes,
    isModeSelected,
    onToggleMode,
    onSetStrategy,
  } = useAIRunMode()
  const [modeVisible, setModeVisible] = useState(false)
  const TriggerIcon =
    selectedModes.length === 1 ? selectedModes[0].icon : selectedModes.length ? OutlineCheckIcon : OutlineViewGridIcon
  const label =
    selectedModes.length === 1
      ? selectedModes[0].label
      : t(selectedModes.length ? 'AIRunModeSelect.multiMode' : 'AIRunModeSelect.mode')

  const editGoal = (target: Element) => {
    const seconds = strategy.GoalDurationSeconds || 0
    requestModeSlashReopen(
      strategy.GoalAcceptanceCriteria?.trim()
        ? { kind: 'goalAcceptance', text: strategy.GoalAcceptanceCriteria }
        : seconds
          ? { kind: 'goalDuration', durationKey: goalDurationSecondsToKey(seconds) || undefined }
          : strategy.GoalMinIterations
            ? { kind: 'goalIterations', iterations: strategy.GoalMinIterations }
            : { kind: 'goalModes' },
      target,
    )
  }
  return (
    <>
      <Dropdown
        trigger={['click']}
        visible={modeVisible}
        onVisibleChange={setModeVisible}
        overlayClassName={styles['mode-dropdown']}
        overlay={
          <div className={styles['mode-menu']} onKeyDown={(event) => event.stopPropagation()}>
            <div className={styles['mode-menu-hint']}>{t('AIRunModeSelect.settingsHint')}</div>
            <div className={styles['mode-list']} role="menu" aria-label={t('AIRunModeSelect.mode')}>
              {ModeOptionList.map((item) => {
                const Icon = item.icon
                const checked = isModeSelected(item.key)
                return (
                  <button
                    type="button"
                    key={item.key}
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    className={styles['mode-option']}
                    onClick={() => onToggleMode(item.key)}
                  >
                    <span className={styles['mode-option-left']}>
                      <span className={styles['mode-option-icon']}>
                        <Icon />
                      </span>
                      <span className={styles['mode-option-label']}>{item.label}</span>
                    </span>
                    {checked ? (
                      <SolidCheckIcon className={styles['mode-option-check']} />
                    ) : (
                      <span className={styles['mode-option-check-placeholder']} />
                    )}
                  </button>
                )
              })}
            </div>
            {(enableMultiAgent || enableGoalMode) && <div className={styles['mode-panel-divider']} />}
            {enableMultiAgent && (
              <div className={styles['mode-goal-iter']}>
                <label htmlFor="mode-max-sub-agents" className={styles['mode-goal-iter-label']}>
                  {t('AIRunModeSelect.maxSubAgents')}
                </label>
                <Tooltip title={t('AIRunModeSelect.maxSubAgentsHelp')}>
                  <YakitInputNumber
                    id="mode-max-sub-agents"
                    type="horizontal"
                    size="small"
                    min={0}
                    max={20}
                    precision={0}
                    value={maxSubAgents}
                    onChange={(value) => onSetStrategy({ MaxSubAgents: Number(value) || 0 })}
                    className={styles['mode-goal-iter-input']}
                  />
                </Tooltip>
              </div>
            )}
            {enableGoalMode && <GoalConditionEditor strategy={strategy} onApply={onSetStrategy} />}
          </div>
        }
      >
        <YakitButton
          type="outline2"
          radius="28px"
          isHover={modeVisible}
          icon={<TriggerIcon />}
          onClick={(event) => event.stopPropagation()}
          className={styles['mode-btn']}
        >
          <span className={styles['mode-btn-label']}>{label}</span>
          <OutlineChevrondownIcon className={styles['mode-btn-arrow']} />
        </YakitButton>
      </Dropdown>
      {enableGoalMode && (
        <YakitButton
          className={styles['mode-tag']}
          type="text2"
          onClick={(e) => {
            e.stopPropagation()
            editGoal(e.currentTarget)
          }}
        >
          {t('AIMilkdownModeSlash.goal')} ·{' '}
          {strategy.GoalAcceptanceCriteria ||
            (strategy.GoalDurationSeconds === -1
              ? t('AIMilkdownModeSlash.durationNever')
              : strategy.GoalDurationSeconds
                ? `${strategy.GoalDurationSeconds}s`
                : strategy.GoalMinIterations || t('AIMilkdownModeSlash.minIterations'))}
        </YakitButton>
      )}
      {enableMultiAgent && (
        <YakitButton
          type="text2"
          onClick={(e) => {
            e.stopPropagation()
            requestModeSlashReopen({ kind: 'multiAgentConfig', subAgents: maxSubAgents }, e.currentTarget)
          }}
        >
          Multi-Agent · {maxSubAgents}
        </YakitButton>
      )}
    </>
  )
})

export default AIRunModeSelect
