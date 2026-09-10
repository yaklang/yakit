import cloneDeep from 'lodash/cloneDeep'
import { omit } from 'lodash'
import { AISourceEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import emiter from '@/utils/eventBus/eventBus'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import type { AIAgentSetting } from '../aiAgentType'
import { AIAgentSettingDefault } from '../defaultConstant'

const omitPersistKeys = ['AIService', 'AIModelName'] as const
const omitSessionRuntimeKeys = ['EnablePlan', 'SyncPerceptionTrigger', 'Source'] as const

export const stripAIAgentChatSettingForPersist = (setting: Partial<AIAgentSetting>): Partial<AIAgentSetting> => {
  const data = omit(setting, [...omitPersistKeys, ...omitSessionRuntimeKeys]) as Partial<AIAgentSetting>
  if (data.Strategy) {
    data.Strategy = omit(data.Strategy, ['EnableMultiAgent', 'EnableGoalMode'])
  }
  return data
}

export const serializeAIAgentChatSetting = (setting: AIAgentSetting) => {
  return JSON.stringify(stripAIAgentChatSettingForPersist(setting))
}

export const applyAIAgentChatSettingBroadcast = (
  current: AIAgentSetting,
  incoming: Partial<AIAgentSetting>,
): AIAgentSetting => {
  const patch = stripAIAgentChatSettingForPersist(incoming)
  return {
    ...current,
    ...patch,
    EnablePlan: current.EnablePlan,
    SyncPerceptionTrigger: current.SyncPerceptionTrigger,
    Source: current.Source,
    Strategy: {
      ...current.Strategy,
      ...patch.Strategy,
      EnableMultiAgent: current.Strategy?.EnableMultiAgent,
      EnableGoalMode: current.Strategy?.EnableGoalMode,
    },
  }
}

/** 与 AIAgent 页读取远端缓存时的合并规则保持一致 */
export const mergeAIAgentChatSettingCache = (cache: Partial<AIAgentSetting>): AIAgentSetting => {
  const newCache = omit(cache, omitPersistKeys)
  return {
    ...cloneDeep(AIAgentSettingDefault),
    ...newCache,
    SyncPerceptionTrigger: false,
    EnablePlan: false,
    DisableMemoryTriage: AIAgentSettingDefault.DisableMemoryTriage,
    Strategy: {
      EnableMultiAgent: false,
      EnableGoalMode: false,
      GoalMinIterations: AIAgentSettingDefault.Strategy?.GoalMinIterations,
      MaxSubAgents: AIAgentSettingDefault.Strategy?.MaxSubAgents,
    },
    Source: AISourceEnum.aiAgent,
  }
}

export const loadAIAgentChatSetting = async (): Promise<AIAgentSetting | undefined> => {
  try {
    const res = await getRemoteValue(RemoteAIAgentGV.AIAgentChatSetting)
    if (!res) return undefined
    const cache = JSON.parse(res) as AIAgentSetting
    if (typeof cache !== 'object' || !cache) return undefined
    return mergeAIAgentChatSettingCache(cache)
  } catch (_) {
    return undefined
  }
}

export const persistAIAgentChatSetting = (setting: AIAgentSetting, emit = true) => {
  const payload = serializeAIAgentChatSetting(setting)
  setRemoteValue(RemoteAIAgentGV.AIAgentChatSetting, payload)
  if (emit) emiter.emit('onAIAgentChatSettingChange', payload)
}
