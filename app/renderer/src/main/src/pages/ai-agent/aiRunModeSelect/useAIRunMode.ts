import { useCreation, useDebounceFn, useMemoizedFn } from 'ahooks'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import {
  type AIExecutionStrategy,
  type AIInputEvent,
  AIInputEventHotPatchTypeEnum,
} from '@/pages/ai-re-act/hooks/grpcApi'
import emiter from '@/utils/eventBus/eventBus'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { type ModeOptionKey, ModeOptionList } from './aiRunModeConstants'
import { clearGoalStrategy } from '../defaultConstant'

/** Plan / Multi-Agent / Goal 开关与子配置（按钮下拉与 / 弹层共用） */
export function useAIRunMode() {
  const { setting, activeChat } = useAIAgentStore()
  const { setSetting, onSend } = useAIAgentDispatcher()
  const store = useCurrentStore()
  const sessionId = useCurrentSessionId()
  const execute = useStore(store, (state) => state.execute)

  const enablePlan = useCreation(() => !!setting?.EnablePlan, [setting?.EnablePlan])
  const enableMultiAgent = useCreation(
    () => !!setting?.Strategy?.EnableMultiAgent,
    [setting?.Strategy?.EnableMultiAgent],
  )
  const enableGoalMode = useCreation(() => !!setting?.Strategy?.EnableGoalMode, [setting?.Strategy?.EnableGoalMode])
  const goalMinIterations = useCreation(
    () => setting?.Strategy?.GoalMinIterations ?? 0,
    [setting?.Strategy?.GoalMinIterations],
  )
  const goalDurationSeconds = useCreation(
    () => setting?.Strategy?.GoalDurationSeconds ?? 0,
    [setting?.Strategy?.GoalDurationSeconds],
  )
  const goalAcceptanceCriteria = useCreation(
    () => setting?.Strategy?.GoalAcceptanceCriteria ?? '',
    [setting?.Strategy?.GoalAcceptanceCriteria],
  )
  const strategy = useCreation(() => setting?.Strategy, [setting?.Strategy])
  const maxSubAgents = useCreation(() => setting?.Strategy?.MaxSubAgents ?? 0, [setting?.Strategy?.MaxSubAgents])

  const onSetPlan = useDebounceFn(
    useMemoizedFn((checked: boolean) => {
      if (execute) {
        const info: AIInputEvent = {
          IsConfigHotpatch: true,
          HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_EnablePlan,
          Params: {
            EnablePlan: checked,
          },
        }
        onSend({ token: sessionId, type: '', params: info })
      }
      setSetting?.((v) => ({
        ...v,
        EnablePlan: checked,
      }))
      if (activeChat?.SessionID) {
        emiter.emit(
          'sessionData',
          JSON.stringify({
            type: 'updateSession',
            sessionId: activeChat.SessionID,
            updates: {
              StartParams: {
                ...(activeChat.StartParams || {}),
                EnablePlan: checked,
              },
            },
          }),
        )
      }
    }),
    { wait: 200, leading: true },
  ).run

  const onSetStrategy = useDebounceFn(
    useMemoizedFn((next: AIExecutionStrategy) => {
      const merged: AIExecutionStrategy = { ...(setting?.Strategy || {}), ...next }
      if (execute) {
        const info: AIInputEvent = {
          IsConfigHotpatch: true,
          HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_Strategy,
          Params: {
            Strategy: merged,
          },
        }
        onSend({ token: sessionId, type: '', params: info })
      }
      setSetting?.((v) => ({
        ...v,
        Strategy: { ...v.Strategy, ...next },
      }))
      if (activeChat?.SessionID) {
        emiter.emit(
          'sessionData',
          JSON.stringify({
            type: 'updateSession',
            sessionId: activeChat.SessionID,
            updates: {
              StartParams: {
                ...(activeChat.StartParams || {}),
                Strategy: { ...(activeChat.StartParams?.Strategy || {}), ...next },
              },
            },
          }),
        )
      }
    }),
    { wait: 200, leading: true },
  ).run

  const isModeSelected = useMemoizedFn((key: ModeOptionKey) => {
    switch (key) {
      case 'plan':
        return enablePlan
      case 'multiAgent':
        return enableMultiAgent
      case 'goal':
        return enableGoalMode
      default:
        return false
    }
  })

  const selectedModes = useCreation(() => {
    return ModeOptionList.filter((item) => isModeSelected(item.key))
  }, [enablePlan, enableMultiAgent, enableGoalMode])

  const onToggleMode = useMemoizedFn((key: ModeOptionKey) => {
    switch (key) {
      case 'plan':
        onSetPlan(!enablePlan)
        break
      case 'multiAgent':
        onSetStrategy({ EnableMultiAgent: !enableMultiAgent, MaxSubAgents: enableMultiAgent ? 0 : maxSubAgents })
        break
      case 'goal':
        if (enableGoalMode) {
          // 关闭 Goal：一并清掉验收/时长/最小迭代，避免残留 gate
          onSetStrategy(clearGoalStrategy())
        } else {
          onSetStrategy({ EnableGoalMode: true })
        }
        break
      default:
        break
    }
  })

  return {
    execute,
    enablePlan,
    enableMultiAgent,
    enableGoalMode,
    goalMinIterations,
    goalDurationSeconds,
    goalAcceptanceCriteria,
    strategy,
    maxSubAgents,
    selectedModes,
    isModeSelected,
    onToggleMode,
    onSetStrategy,
  }
}
