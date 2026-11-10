import { useCreation, useDebounceFn, useMemoizedFn } from 'ahooks'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { AIInputEventHotPatchTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIExecutionStrategy, AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import emiter from '@/utils/eventBus/eventBus'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import { ModeOptionList } from './aiRunModeConstants'
import type { ModeOptionKey } from './aiRunModeConstants'
import { clearGoalStrategy } from '../defaultConstant'
import { isChatSession } from '../utils/isChatSession'

/** Plan / Multi-Agent / Goal 开关与子配置（按钮下拉与 / 弹层共用） */
export const useAIRunMode = () => {
  const { setting, activeChat } = useAIAgentStore()
  const { setSetting, onSend } = useAIAgentDispatcher()
  const store = useCurrentStore()
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
      // pending 的 execute 也为 true；绑定正式会话后才允许发送热补丁。
      if (execute && isChatSession(activeChat)) {
        const info: AIInputEvent = {
          IsConfigHotpatch: true,
          HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_EnablePlan,
          Params: {
            EnablePlan: checked,
          },
        }
        onSend({ token: activeChat.SessionID, type: '', params: info })
      }
      setSetting?.((v) => ({
        ...v,
        EnablePlan: checked,
      }))
      if (isChatSession(activeChat)) {
        emiter.emit(
          'sessionData',
          JSON.stringify({
            type: 'updateSession',
            sessionId: activeChat.SessionID,
            updates: {
              StartParams: {
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
      if (execute && isChatSession(activeChat)) {
        const info: AIInputEvent = {
          IsConfigHotpatch: true,
          HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_Strategy,
          Params: {
            Strategy: merged,
          },
        }
        onSend({ token: activeChat.SessionID, type: '', params: info })
      }
      setSetting?.((v) => ({
        ...v,
        Strategy: { ...v.Strategy, ...next },
      }))
      if (isChatSession(activeChat)) {
        emiter.emit(
          'sessionData',
          JSON.stringify({
            type: 'updateSession',
            sessionId: activeChat.SessionID,
            updates: {
              StartParams: {
                Strategy: next,
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
          onSetStrategy({
            EnableGoalMode: true,
            ...(!goalAcceptanceCriteria.trim() && goalDurationSeconds === 0
              ? { GoalMinIterations: Math.max(1, goalMinIterations) }
              : {}),
          })
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
