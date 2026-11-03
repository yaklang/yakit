import { useMemoizedFn } from 'ahooks'
import { useStore } from 'zustand'
import useAIAgentStore from '../useContext/useStore'
import useAIAgentDispatcher from '../useContext/useDispatcher'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import {
  type AIExecutionStrategy,
  type AIStartParams,
  AIInputEventHotPatchTypeEnum,
} from '@/pages/ai-re-act/hooks/grpcApi'
import emiter from '@/utils/eventBus/eventBus'
import { mergeAISessionUpdates } from '../historyChat/sessionUpdates'
import { ModeOptionList, type ModeOptionKey } from './aiRunModeConstants'
import { clearGoalStrategy, normalizeExecutionStrategy } from './goalStrategy'

/** 对照官方模式 hook，保留现有入口；只有发送被接受时才更新运行会话配置。 */
export function useAIRunMode() {
  const { setting, activeChat } = useAIAgentStore()
  const { getSetting, setSetting, setActiveChat, onSend } = useAIAgentDispatcher()
  const store = useCurrentStore()
  const sessionId = useCurrentSessionId()
  const execute = useStore(store, (state) => state.execute)
  const strategy = normalizeExecutionStrategy(setting.Strategy)
  const enablePlan = !!setting.EnablePlan
  const enableMultiAgent = !!strategy.EnableMultiAgent
  const enableGoalMode = !!strategy.EnableGoalMode

  const applyConfig = useMemoizedFn((type: AIInputEventHotPatchTypeEnum, params: AIStartParams): boolean => {
    const targetId = activeChat?.SessionID
    if (targetId && targetId !== sessionId) return false
    if (store.getState().execute) {
      if (!sessionId || !targetId) return false
      if (
        !onSend({ token: sessionId, type: '', params: { IsConfigHotpatch: true, HotpatchType: type, Params: params } })
      ) {
        return false
      }
    }
    setSetting((old) => ({ ...old, ...params }))
    if (targetId) {
      setActiveChat((current) =>
        current?.SessionID === targetId ? mergeAISessionUpdates(current, { StartParams: params }) : current,
      )
      emiter.emit(
        'sessionData',
        JSON.stringify({ type: 'updateSession', sessionId: targetId, updates: { StartParams: params } }),
      )
    }
    return true
  })

  const onSetStrategy = useMemoizedFn((next: AIExecutionStrategy) =>
    applyConfig(AIInputEventHotPatchTypeEnum.HotPatchType_Strategy, {
      Strategy: normalizeExecutionStrategy({ ...getSetting().Strategy, ...next }),
    }),
  )
  const onSetPlan = useMemoizedFn((enabled: boolean) =>
    applyConfig(AIInputEventHotPatchTypeEnum.HotPatchType_EnablePlan, { EnablePlan: enabled }),
  )
  const isModeSelected = (key: ModeOptionKey) =>
    key === 'plan' ? enablePlan : key === 'multiAgent' ? enableMultiAgent : enableGoalMode
  const onToggleMode = useMemoizedFn((key: ModeOptionKey) => {
    if (key === 'plan') return onSetPlan(!getSetting().EnablePlan)
    if (key === 'multiAgent') {
      const current = getSetting().Strategy
      return onSetStrategy({
        EnableMultiAgent: !current?.EnableMultiAgent,
        MaxSubAgents: current?.EnableMultiAgent ? 0 : (current?.MaxSubAgents ?? 0),
      })
    }
    return onSetStrategy(getSetting().Strategy?.EnableGoalMode ? clearGoalStrategy() : { EnableGoalMode: true })
  })

  return {
    execute,
    enablePlan,
    enableMultiAgent,
    enableGoalMode,
    strategy,
    goalMinIterations: strategy.GoalMinIterations ?? 0,
    goalDurationSeconds: strategy.GoalDurationSeconds ?? 0,
    goalAcceptanceCriteria: strategy.GoalAcceptanceCriteria ?? '',
    maxSubAgents: strategy.MaxSubAgents ?? 0,
    selectedModes: ModeOptionList.filter((item) => isModeSelected(item.key)),
    isModeSelected,
    onToggleMode,
    onSetStrategy,
  }
}
