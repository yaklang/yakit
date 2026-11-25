import { AIGoalTimeAction, AIInputEventHotPatchTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIExecutionStrategy, AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import type { AIAgentChatData } from '../type/aiChat'
import emiter from '@/utils/eventBus/eventBus'
import type { AIAgentContextDispatcher } from '../useContext/AIAgentContext'

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
    const now = Date.now() / 1000
    const serverTime = rawData.agentPolicySnapshot?.server_time
    const receivedAt = rawData.agentPolicySnapshotReceivedAt
    const serverNow =
      serverTime !== undefined && serverTime > 0 && receivedAt !== undefined ? serverTime + (now - receivedAt) : now
    event.GoalTimePatch = { Action: AIGoalTimeAction.SetDeadline, DeadlineUnix: Math.floor(serverNow) + editedDuration }
  }
  return event
}

export const syncRunModeStrategy = (
  setSetting: AIAgentContextDispatcher['setSetting'],
  strategy: AIExecutionStrategy,
  sessionId?: string,
) => {
  setSetting?.((current) => ({ ...current, Strategy: { ...current.Strategy, ...strategy } }))
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
