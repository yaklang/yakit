import { AIGoalTimeAction, AIInputEventHotPatchTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIExecutionStrategy, AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIAgentChatData } from '../type/aiChat'
import emiter from '@/utils/eventBus/eventBus'
import type { AIAgentContextDispatcher } from '../useContext/AIAgentContext'
import { clearGoalStrategy } from '../defaultConstant'
import type { ModeOptionKey } from './aiRunModeConstants'

/**
 * 返回切换指定模式时，需要合并到当前策略的字段。
 * Multi-Agent 开启时沿用子 Agent 数量上限（默认 0），关闭时将上限清零。
 * Goal 开启时若未设置验收条件和持续时间，最小迭代次数至少为 1；关闭时清空停止条件。
 */
export const getToggledStrategy = (
  mode: Exclude<ModeOptionKey, 'plan'>,
  strategy: AIExecutionStrategy = {},
): AIExecutionStrategy => {
  if (mode === 'multiAgent') {
    return {
      EnableMultiAgent: !strategy.EnableMultiAgent,
      MaxSubAgents: strategy.EnableMultiAgent ? 0 : (strategy.MaxSubAgents ?? 0),
    }
  }
  if (strategy.EnableGoalMode) return clearGoalStrategy()
  return {
    EnableGoalMode: true,
    ...(!strategy.GoalAcceptanceCriteria?.trim() && !strategy.GoalDurationSeconds
      ? { GoalMinIterations: Math.max(1, strategy.GoalMinIterations ?? 0) }
      : {}),
  }
}

export const buildStrategyHotpatch = (
  strategy: AIExecutionStrategy,
  editedDuration: number | undefined,
  rawData: AIAgentChatData,
): AIInputEvent => {
  const event: AIInputEvent = {
    IsConfigHotpatch: true,
    HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_Strategy,
    Params: { Strategy: strategy },
  }
  if (editedDuration !== undefined && Number.isSafeInteger(editedDuration) && editedDuration > 0) {
    const serverTime = rawData.agentPolicySnapshot?.server_time
    const receivedAtMs = rawData.agentPolicySnapshotReceivedAtMs
    const serverNow =
      serverTime !== undefined && serverTime > 0 && receivedAtMs !== undefined
        ? serverTime + (performance.now() - receivedAtMs) / 1000
        : Date.now() / 1000
    event.GoalTimePatch = { Action: AIGoalTimeAction.SetDeadline, DeadlineUnix: Math.floor(serverNow) + editedDuration }
  }
  return event
}

export const syncRunModeStrategy = (
  setSetting: AIAgentContextDispatcher['setSetting'],
  strategy: AIExecutionStrategy,
  sessionId?: string,
) => {
  setSetting((current) => ({ ...current, Strategy: { ...current.Strategy, ...strategy } }))
  if (sessionId) {
    emiter.emit(
      'sessionData',
      JSON.stringify({
        type: 'updateSession',
        sessionId,
        updates: { StartParams: { Strategy: strategy } },
      }),
    )
  }
}
