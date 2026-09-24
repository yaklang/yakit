import type React from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { BoxesOutlined, Goal2Outlined, PencilAltOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { XCircleSolid } from '@yakit-libs/yakit-ui-icons/solid'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useAIRunMode } from '../aiRunModeSelect/useAIRunMode'
import { clearGoalStrategy } from '../defaultConstant'
import {
  deriveGoalTagFromStrategy,
  getGoalDurationDisplayLabel,
  requestModeSlashReopen,
} from '../components/aiMilkdownInput/aiMilkdownModeSlash/store'
import styles from './template.module.scss'

type StrategyTagShellProps = {
  icon: React.ReactNode
  title: string
  onOpen: (event?: React.MouseEvent) => void
  onClose: (event: React.MouseEvent) => void
  children: React.ReactNode
}

const StrategyTagShell: React.FC<StrategyTagShellProps> = (props) => {
  const { icon, title, onOpen, onClose, children } = props
  return (
    <div
      className={classNames(styles['http-flow-reference'], styles['strategy-setup-tag'])}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onOpen}
      style={{ cursor: 'pointer' }}
    >
      <span className={styles['strategy-setup-leading']} onClick={onClose} onMouseDown={(e) => e.stopPropagation()}>
        {icon}
        <XCircleSolid className={styles['strategy-setup-close-icon']} size={16} />
      </span>
      <span
        className={classNames(styles['http-flow-reference-label'], styles['strategy-reference-label'])}
        title={title}
      >
        {children}
      </span>
      <PencilAltOutlined
        className={styles['strategy-setup-edit-icon']}
        size={16}
        onClick={(e) => {
          e.stopPropagation()
          onOpen(e)
        }}
      />
    </div>
  )
}

const goalIcon = (
  <Goal2Outlined
    className={classNames(styles['http-flow-reference-icon'], styles['strategy-setup-type-icon'])}
    size={16}
  />
)

const subAgentIcon = (
  <BoxesOutlined
    className={classNames(styles['http-flow-reference-icon'], styles['strategy-setup-type-icon'])}
    size={16}
  />
)

export const useHasStrategySetupTags = (): boolean => {
  const { enableMultiAgent, enableGoalMode, strategy } = useAIRunMode()
  const goalTagState = deriveGoalTagFromStrategy(strategy)
  return goalTagState.kind != null || enableGoalMode || enableMultiAgent
}

/** 输入框上方 Goal / Multi-Agent 策略标签：点击编辑重开 / 面板，关闭则清策略 */
export const StrategySetupTags: React.FC = () => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { enableMultiAgent, enableGoalMode, goalMinIterations, maxSubAgents, onSetStrategy, strategy } = useAIRunMode()
  const goalTagState = deriveGoalTagFromStrategy(strategy)

  const onDurationClick = useMemoizedFn((event?: React.MouseEvent) => {
    event?.stopPropagation()
    event?.preventDefault()
    if (goalTagState.kind !== 'duration' || !goalTagState.durationKey) return
    requestModeSlashReopen({ kind: 'goalDuration', durationKey: goalTagState.durationKey })
  })
  const onIterationsClick = useMemoizedFn((event?: React.MouseEvent) => {
    event?.stopPropagation()
    event?.preventDefault()
    requestModeSlashReopen({ kind: 'goalIterations', iterations: goalMinIterations })
  })
  const onAcceptanceClick = useMemoizedFn((event?: React.MouseEvent) => {
    event?.stopPropagation()
    event?.preventDefault()
    if (goalTagState.kind !== 'acceptance' || !goalTagState.acceptanceText) return
    requestModeSlashReopen({ kind: 'goalAcceptance', text: goalTagState.acceptanceText })
  })
  const onGoalSetupClick = useMemoizedFn((event?: React.MouseEvent) => {
    event?.stopPropagation()
    event?.preventDefault()
    requestModeSlashReopen({ kind: 'goalModes' })
  })
  const onSubAgentClick = useMemoizedFn((event?: React.MouseEvent) => {
    event?.stopPropagation()
    event?.preventDefault()
    requestModeSlashReopen({ kind: 'multiAgentConfig', subAgents: maxSubAgents })
  })
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
        onOpen={onGoalSetupClick}
        onClose={onCloseGoal}
      >
        {t('AIMilkdownModeSlash.setGoal')}
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
        onOpen={onDurationClick}
        onClose={onCloseGoal}
      >
        {t('AIMilkdownModeSlash.duration')}: <span>{label}</span>
      </StrategyTagShell>,
    )
  }

  if (goalTagState.kind === 'iterations') {
    tags.push(
      <StrategyTagShell
        key="strategy-iterations"
        icon={goalIcon}
        title={t('AIMilkdownModeSlash.minIterationsPrefix', { value: goalMinIterations })}
        onOpen={onIterationsClick}
        onClose={onCloseGoal}
      >
        {t('AIMilkdownModeSlash.minIterations')}: <span>{goalMinIterations}</span>
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
        onOpen={onAcceptanceClick}
        onClose={onCloseGoal}
      >
        {t('AIMilkdownModeSlash.acceptance')}: <span>{text}</span>
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
        onOpen={onSubAgentClick}
        onClose={onCloseSubAgent}
      >
        {isSetup ? (
          t('AIMilkdownModeSlash.setSubAgentCount')
        ) : (
          <>
            {t('AIMilkdownModeSlash.subAgentCount')}: <span>{maxSubAgents}</span>
          </>
        )}
      </StrategyTagShell>,
    )
  }

  return <>{tags}</>
}
