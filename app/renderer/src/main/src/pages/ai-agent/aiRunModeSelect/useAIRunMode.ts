import { useCreation, useDebounceFn, useMemoizedFn } from 'ahooks'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { AIInputEventHotPatchTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIExecutionStrategy, AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import emiter from '@/utils/eventBus/eventBus'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import { ModeOptionList } from './aiRunModeConstants'
import { buildStrategyHotpatch, getToggledStrategy, syncRunModeStrategy } from './syncRunModeStrategy'
import type { ModeOptionKey } from './aiRunModeConstants'
import { isChatSession } from '../utils/isChatSession'

/** Plan / Multi-Agent / Goal 开关与子配置（按钮下拉与 / 弹层共用） */
export const useAIRunMode = () => {
  const { setting, activeChat } = useAIAgentStore()
  const { setSetting, onSend } = useAIAgentDispatcher()
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const execute = useStore(store, (state) => state.execute)

  const strategy = useCreation(() => setting.Strategy, [setting.Strategy])
  const enablePlan = useCreation(() => !!setting.EnablePlan, [setting.EnablePlan])
  const enableMultiAgent = useCreation(() => !!strategy?.EnableMultiAgent, [strategy?.EnableMultiAgent])
  const enableGoalMode = useCreation(() => !!strategy?.EnableGoalMode, [strategy?.EnableGoalMode])
  const goalMinIterations = useCreation(() => strategy?.GoalMinIterations ?? 0, [strategy?.GoalMinIterations])
  const goalDurationSeconds = useCreation(() => strategy?.GoalDurationSeconds ?? 0, [strategy?.GoalDurationSeconds])
  const goalAcceptanceCriteria = useCreation(
    () => strategy?.GoalAcceptanceCriteria ?? '',
    [strategy?.GoalAcceptanceCriteria],
  )
  const maxSubAgents = useCreation(() => strategy?.MaxSubAgents ?? 0, [strategy?.MaxSubAgents])
  const chatSessionId = isChatSession(activeChat) ? activeChat.SessionID : undefined

  const onSetPlan = useMemoizedFn((checked: boolean) => {
    // pending 的 execute 也为 true；绑定正式会话后才允许发送热补丁。
    if (execute && chatSessionId) {
      const info: AIInputEvent = {
        IsConfigHotpatch: true,
        HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_EnablePlan,
        Params: {
          EnablePlan: checked,
        },
      }
      onSend({ token: chatSessionId, type: '', params: info })
    }
    setSetting((v) => ({
      ...v,
      EnablePlan: checked,
    }))
    if (chatSessionId) {
      emiter.emit(
        'sessionData',
        JSON.stringify({
          type: 'updateSession',
          sessionId: chatSessionId,
          updates: {
            StartParams: {
              EnablePlan: checked,
            },
          },
        }),
      )
    }
  })
  const togglePlan = useDebounceFn(onSetPlan, { wait: 200, leading: true }).run

  const resolveGoalDuration = (editedDuration?: number) => {
    const confirmedDuration = rawData.agentPolicySnapshot?.goal?.time_limit.configured_duration_seconds
    return editedDuration ?? rawData.pendingGoalDurationSeconds ?? confirmedDuration ?? strategy?.GoalDurationSeconds
  }

  const strategyUpdate = useDebounceFn(
    (next: AIExecutionStrategy) => {
      if (execute && chatSessionId) {
        const merged = { ...strategy, ...next, GoalDurationSeconds: resolveGoalDuration(next.GoalDurationSeconds) }
        const info = buildStrategyHotpatch(merged, next.GoalDurationSeconds, rawData)
        if (onSend({ token: chatSessionId, type: '', params: info }) === false) return
        if (next.GoalDurationSeconds !== undefined) rawData.pendingGoalDurationSeconds = next.GoalDurationSeconds
      }
      syncRunModeStrategy(setSetting, next, chatSessionId)
    },
    { wait: 200, leading: true },
  )

  const onSetStrategy = useMemoizedFn((next: AIExecutionStrategy, immediate = false) => {
    strategyUpdate.run(next)
    if (immediate) strategyUpdate.flush()
  })

  const selected = useCreation(
    () => ({ plan: enablePlan, multiAgent: enableMultiAgent, goal: enableGoalMode }),
    [enablePlan, enableMultiAgent, enableGoalMode],
  )
  const isModeSelected = useMemoizedFn((key: ModeOptionKey) => selected[key])

  const selectedModes = useCreation(() => ModeOptionList.filter((item) => selected[item.key]), [selected])

  const onToggleMode = useMemoizedFn((key: ModeOptionKey) => {
    if (key === 'plan') togglePlan(!enablePlan)
    else onSetStrategy(getToggledStrategy(key, strategy))
  })

  return {
    execute,
    enablePlan,
    enableMultiAgent,
    enableGoalMode,
    goalMinIterations,
    goalDurationSeconds,
    goalAcceptanceCriteria,
    sessionId: activeChat?.SessionID,
    strategy,
    maxSubAgents,
    selectedModes,
    isModeSelected,
    onSetPlan,
    onToggleMode,
    onSetStrategy,
  }
}
