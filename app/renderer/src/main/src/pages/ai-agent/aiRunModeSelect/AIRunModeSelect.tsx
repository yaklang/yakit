import type React from 'react'
import { useRef } from 'react'
import { useControllableValue } from 'ahooks'
import { Tooltip } from 'antd'
import classNames from 'classnames'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { AtomOutlined, ChevronDownOutlined, ListTodoOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { getGoalDurationDisplayLabel } from '../components/aiMilkdownInput/constants'
import { deriveGoalTagFromStrategy } from '../components/aiMilkdownInput/aiMilkdownModeSlash/store/goalTag'
import styles from './AIRunModeSelect.module.scss'
import { AIRunModeMenu } from './AIRunModeMenu'
import { MODE_LABEL_KEY } from './aiRunModeConstants'
import { useAIRunMode } from './useAIRunMode'

interface AIRunModeSelectProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const AIRunModeSelect: React.FC<AIRunModeSelectProps> = (props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { selectedModes, strategy, goalMinIterations, sessionId } = useAIRunMode()
  const submitDraft = useRef<(() => void) | null>(null)
  const modeCount = selectedModes.length
  const hasModes = modeCount > 0
  const [firstMode] = selectedModes
  const singleModeLabelKey = firstMode ? MODE_LABEL_KEY[firstMode.key] : 'AIRunModeSelect.executionMode'
  const label = modeCount > 1 ? t('AIRunModeSelect.modeCount', { count: modeCount }) : t(singleModeLabelKey)

  const goal = deriveGoalTagFromStrategy(strategy)
  const detail =
    goal.acceptanceText ??
    (goal.kind === 'duration' ? getGoalDurationDisplayLabel(goal.durationKey, t) : null) ??
    (goal.kind === 'iterations' ? t('AIRunModeSelect.iterationCount', { count: goalMinIterations }) : null)
  const [open, setOpen] = useControllableValue<boolean>(props, {
    defaultValue: false,
    valuePropName: 'open',
    trigger: 'onOpenChange',
  })

  return (
    <div className={styles['run-mode-trigger']} data-goal-kind={goal.kind ?? undefined}>
      <YakitPopover
        content={<>{open && <AIRunModeMenu key={sessionId} ref={submitDraft} />}</>}
        fresh
        trigger="click"
        placement="topLeft"
        arrow={false}
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            submitDraft.current?.()
            submitDraft.current = null
          }
          setOpen(nextOpen)
        }}
        destroyOnHidden
        classNames={{ root: styles['mode-popover'] }}
      >
        <YakitButton
          type="outline2"
          className={classNames(styles['run-mode-select'], { [styles['run-mode-select-active']]: hasModes })}
          isActive={hasModes}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <span className={styles['mode-icons']} aria-hidden="true">
            {hasModes ? (
              selectedModes.map(({ key, icon }) => {
                const Icon = key === 'plan' ? ListTodoOutlined : icon
                return <Icon key={key} size={16} color="currentColor" />
              })
            ) : (
              <AtomOutlined size={16} color="currentColor" />
            )}
          </span>
          <span className={classNames(styles['mode-label'], modeCount > 1 && styles['mode-count-full'])}>{label}</span>
          {modeCount > 1 && (
            <span className={styles['mode-count-short']}>
              {t('AIRunModeSelect.modeCountShort', { count: modeCount })}
            </span>
          )}
          {detail && (
            <span className={styles['mode-goal-detail']}>
              <span aria-hidden="true">·</span>
              {goal.acceptanceText ? (
                <Tooltip title={<span className={styles['criteria-tooltip']}>{goal.acceptanceText}</span>}>
                  <span className={styles['mode-detail']}>{goal.acceptanceText}</span>
                </Tooltip>
              ) : (
                <span className={styles['mode-detail']}>{detail}</span>
              )}
            </span>
          )}
          <span className={styles['mode-chevron']} aria-hidden="true">
            <ChevronDownOutlined
              size={16}
              svgProps={{ style: { color: 'var(--Colors-Use-Neutral-Text-3-Secondary)' } }}
            />
          </span>
        </YakitButton>
      </YakitPopover>
    </div>
  )
}

export default AIRunModeSelect
