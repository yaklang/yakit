import type { FC } from 'react'
import { useImperativeHandle, useState } from 'react'
import GoalStopConditionFields from '@/pages/ai-agent/aiRunModeSelect/GoalStopConditionFields/GoalStopConditionFields'
import type { GoalCondition } from '@/pages/ai-agent/aiRunModeSelect/GoalStopConditionFields/type'
import { buildStrategyHotpatch, syncRunModeStrategy } from '@/pages/ai-agent/aiRunModeSelect/syncRunModeStrategy'
import { goalDurationKeyToSeconds } from '@/pages/ai-agent/components/aiMilkdownInput/constants'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { useCurrentRawData } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { AIGoalTimeAction } from '@/pages/ai-re-act/hooks/grpcApi'
import type { RunningGoalConditionsProps } from './type'

const RunningGoalConditions: FC<RunningGoalConditionsProps> = ({ sessionId, ref }) => {
  const { onSend, setSetting } = useAIAgentDispatcher()
  const rawData = useCurrentRawData()
  const goal = rawData.agentPolicySnapshot?.goal
  const [condition, setCondition] = useState<GoalCondition>('duration')
  const [iterations, setIterations] = useState(Math.max(1, goal?.min_iterations ?? 1))
  const [acceptance, setAcceptance] = useState(goal?.acceptance_criteria ?? '')
  const [customDuration, setCustomDuration] = useState(false)
  const [durationSeconds, setDurationSeconds] = useState(-1)

  /** 弹窗关闭时，将有效的停止条件应用到仍处于「永不停止」模式的当前会话。 */
  const applyCondition = () => {
    const policy = rawData.agentPolicySnapshot
    if (!sessionId || policy?.goal.time_limit.mode !== 'never_ending') return
    const timed = condition === 'duration'
    if (timed && (!Number.isSafeInteger(durationSeconds) || durationSeconds < 60)) return
    if (condition === 'acceptance' && !acceptance.trim()) return
    // 三种停止条件互斥，发送 ExecutionStrategy 时只保留选中的条件。
    const strategy = {
      EnableGoalMode: true,
      GoalMinIterations: condition === 'iterations' ? iterations : 0,
      GoalAcceptanceCriteria: condition === 'acceptance' ? acceptance.trim() : '',
      GoalDurationSeconds: timed ? durationSeconds : 0,
    }
    const params = buildStrategyHotpatch(
      {
        EnableMultiAgent: policy.multi_agent?.enabled,
        MaxSubAgents: policy.multi_agent?.max_concurrency,
        ...strategy,
      },
      strategy.GoalDurationSeconds,
      rawData,
    )
    if (!timed) {
      params.GoalTimePatch = { Action: AIGoalTimeAction.Disable }
    }
    if (onSend({ token: sessionId, type: '', params }) === false) return
    rawData.pendingGoalDurationSeconds = strategy.GoalDurationSeconds
    syncRunModeStrategy(setSetting, strategy, sessionId)
  }
  useImperativeHandle(ref, () => applyCondition)

  const pickDuration = (key: string) => {
    if (key === 'custom') {
      setCustomDuration(true)
      if (durationSeconds < 0) setDurationSeconds(3600)
    } else {
      setCustomDuration(false)
      setDurationSeconds(goalDurationKeyToSeconds(key))
    }
  }

  return (
    <GoalStopConditionFields
      condition={condition}
      onConditionChange={setCondition}
      iterations={iterations}
      onIterationsChange={setIterations}
      acceptance={acceptance}
      onAcceptanceChange={setAcceptance}
      durationSeconds={durationSeconds}
      customDuration={customDuration}
      onDurationPick={pickDuration}
      onCustomDurationChange={setDurationSeconds}
      minDurationSeconds={0}
    />
  )
}

export default RunningGoalConditions
