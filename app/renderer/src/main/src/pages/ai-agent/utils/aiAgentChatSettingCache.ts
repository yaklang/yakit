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
    Strategy: {
      ...current.Strategy,
      ...patch.Strategy,
    },
  }
}

/** 读已保存设置：只铺默认值、去掉模型字段，不改会话开关 */
export const mergeAIAgentChatSettingCache = (cache: Partial<AIAgentSetting>): AIAgentSetting => {
  const saved = omit(cache, omitPersistKeys) as Partial<AIAgentSetting>
  return {
    ...cloneDeep(AIAgentSettingDefault),
    ...saved,
    Strategy: {
      ...cloneDeep(AIAgentSettingDefault.Strategy),
      ...saved.Strategy,
    },
  }
}

export const applyAIAgentChatSettingSessionDefaults = (setting: AIAgentSetting): AIAgentSetting => {
  return {
    ...setting,
    SyncPerceptionTrigger: false,
    EnablePlan: false,
    Source: AISourceEnum.aiAgent,
    Strategy: {
      ...setting.Strategy,
      EnableMultiAgent: false,
      EnableGoalMode: false,
    },
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
