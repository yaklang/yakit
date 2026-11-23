import type React from 'react'
import { Tooltip } from 'antd'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { BoxesOutlined, Goal2Outlined, XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useAIRunMode } from '../aiRunModeSelect/useAIRunMode'
import { clearGoalStrategy } from '../defaultConstant'
import type { ModeSlashReopenPayload } from '../components/aiMilkdownInput/aiMilkdownModeSlash/store'
import {
  deriveGoalTagFromStrategy,
  getGoalDurationDisplayLabel,
  requestModeSlashReopen,
} from '../components/aiMilkdownInput/aiMilkdownModeSlash/store'
import styles from './aiAddMaterialsPopover/materialSummary/MaterialSummary.module.scss'

type StrategyTagShellProps = {
  icon: React.ReactNode
  title: string
  reopen: ModeSlashReopenPayload
  onClose: (event: React.MouseEvent) => void
  children: React.ReactNode
}

const StrategyTagShell: React.FC<StrategyTagShellProps> = (props) => {
  const { icon, title, reopen, onClose, children } = props
  return (
    <div data-ai-summary-tag className={styles['summary-tag']} title={title}>
      <Tooltip title={title} trigger={['hover', 'focus']}>
        <YakitButton
          type="text2"
          size="small"
          htmlType="button"
          className={styles['summary-open']}
          aria-label={title}
          onClick={(event) => {
            event.stopPropagation()
            event.preventDefault()
            requestModeSlashReopen(event.currentTarget, reopen)
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <span className={styles['summary-icon']}>{icon}</span>
          {children}
        </YakitButton>
      </Tooltip>
      <YakitButton
        type="text2"
        size="small"
        htmlType="button"
        className={styles['summary-close']}
        aria-label={title + ' ×'}
        onClick={onClose}
      >
        <XOutlined size={12} />
      </YakitButton>
    </div>
  )
}

const goalIcon = <Goal2Outlined size={14} />
const subAgentIcon = <BoxesOutlined size={14} />

/** 输入框上方 Goal / Multi-Agent 策略标签：点击编辑重开 / 面板，关闭则清策略 */
export const useStrategySetupTags = () => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { enableMultiAgent, enableGoalMode, goalMinIterations, maxSubAgents, onSetStrategy, strategy } = useAIRunMode()
  const goalTagState = deriveGoalTagFromStrategy(strategy)

  const onCloseGoal = useMemoizedFn((event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    onSetStrategy(clearGoalStrategy())
  })
  const onCloseSubAgent = useMemoizedFn((event: React.MouseEvent) => {
    event.stopPropagation()
    onSetStrategy({ EnableMultiAgent: false, MaxSubAgents: 0 })
  })

  const tags: React.ReactNode[] = []

  if (enableGoalMode && goalTagState.kind == null) {
    tags.push(
      <StrategyTagShell
        key="strategy-goal-setup"
        icon={goalIcon}
        title={t('AIMilkdownModeSlash.setGoal')}
        reopen={{ kind: 'goalModes' }}
        onClose={onCloseGoal}
      >
        <span data-ai-summary-label>{t('AIMilkdownModeSlash.setGoal')}</span>
      </StrategyTagShell>,
    )
  }

  if (goalTagState.kind === 'duration' && goalTagState.durationKey) {
    const label = getGoalDurationDisplayLabel(goalTagState.durationKey, t)
    tags.push(
      <StrategyTagShell
        key="strategy-duration"
        icon={goalIcon}
        title={t('AIMilkdownModeSlash.durationPrefix', { value: label })}
        reopen={{ kind: 'goalDuration', durationKey: goalTagState.durationKey }}
        onClose={onCloseGoal}
      >
        <span data-ai-summary-label>{t('AIMilkdownModeSlash.goalTag')} · </span>
        <span>{label}</span>
      </StrategyTagShell>,
    )
  }

  if (goalTagState.kind === 'iterations') {
    tags.push(
      <StrategyTagShell
        key="strategy-iterations"
        icon={goalIcon}
        title={t('AIMilkdownModeSlash.minIterationsPrefix', { value: goalMinIterations })}
        reopen={{ kind: 'goalIterations', iterations: goalMinIterations }}
        onClose={onCloseGoal}
      >
        <span data-ai-summary-label>{t('AIMilkdownModeSlash.goalTag')} · </span>
        <span>{goalMinIterations}</span>
      </StrategyTagShell>,
    )
  }

  if (goalTagState.kind === 'acceptance' && goalTagState.acceptanceText) {
    const text = goalTagState.acceptanceText
    tags.push(
      <StrategyTagShell
        key="strategy-acceptance"
        icon={goalIcon}
        title={t('AIMilkdownModeSlash.acceptancePrefix', { value: text })}
        reopen={{ kind: 'goalAcceptance', text }}
        onClose={onCloseGoal}
      >
        <span data-ai-summary-label>{t('AIMilkdownModeSlash.goalTag')} · </span>
        <span data-ai-summary-label className={styles['summary-value']}>
          {text}
        </span>
      </StrategyTagShell>,
    )
  }

  if (enableMultiAgent) {
    const isSetup = maxSubAgents <= 0
    tags.push(
      <StrategyTagShell
        key="strategy-sub-agent"
        icon={subAgentIcon}
        title={
          isSetup
            ? t('AIMilkdownModeSlash.setSubAgentCount')
            : t('AIMilkdownModeSlash.subAgentCountPrefix', { value: maxSubAgents })
        }
        reopen={{ kind: 'multiAgentConfig', subAgents: maxSubAgents }}
        onClose={onCloseSubAgent}
      >
        {isSetup ? (
          <span data-ai-summary-label>{t('AIMilkdownModeSlash.setSubAgentCount')}</span>
        ) : (
          <>
            <span data-ai-summary-label>{t('AIMilkdownModeSlash.subAgentTag')} · </span>
            <span>{maxSubAgents}</span>
          </>
        )}
      </StrategyTagShell>,
    )
  }

  return tags
}
