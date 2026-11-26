import cloneDeep from 'lodash/cloneDeep'
import omit from 'lodash/omit'
import pick from 'lodash/pick'
import { AISourceEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import emiter from '@/utils/eventBus/eventBus'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import type { AIAgentSetting } from '../aiAgentType'
import { AIAgentSettingDefault } from '../defaultConstant'

const omitPersistKeys = ['AIService', 'AIModelName', 'TimelineContentSizeLimit', 'RuntimeContextSizeLimit'] as const
const omitSessionRuntimeKeys = ['EnablePlan', 'SyncPerceptionTrigger', 'SingleModelMode', 'Source'] as const
export const reviewSettingKeys = ['ReviewPolicy', 'AIReviewRiskControlScore'] as const

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
    SingleModelMode: false,
    Source: AISourceEnum.aiAgent,
    Strategy: {
      ...setting.Strategy,
      EnableMultiAgent: false,
      EnableGoalMode: false,
    },
  }
}

export type LoadAIAgentChatSettingResult =
  | { status: 'success'; setting: AIAgentSetting }
  | { status: 'empty' }
  | { status: 'error' }

const readAIAgentChatSetting = async (): Promise<LoadAIAgentChatSettingResult> => {
  try {
    const res = await getRemoteValue(RemoteAIAgentGV.AIAgentChatSetting)
    if (!res) return { status: 'empty' }
    const cache = JSON.parse(res) as unknown
    if (typeof cache !== 'object' || !cache) return { status: 'error' }
    return { status: 'success', setting: mergeAIAgentChatSettingCache(cache as AIAgentSetting) }
  } catch {
    return { status: 'error' }
  }
}

// 会话只写共享项。与全局设置的写入串行，避免读到旧审核默认值后再覆盖新的全局选择。
let pendingWrite = Promise.resolve()
export const loadAIAgentChatSetting = () => pendingWrite.then(readAIAgentChatSetting)

const queueSettingWrite = (write: () => Promise<unknown>) => {
  pendingWrite = pendingWrite.then(write).then(
    () => undefined,
    () => undefined,
  )
  return pendingWrite
}

export const persistAIAgentChatSetting = (setting: AIAgentSetting, emit = true) => {
  const payload = serializeAIAgentChatSetting(setting)
  const write = queueSettingWrite(() => setRemoteValue(RemoteAIAgentGV.AIAgentChatSetting, payload))
  if (emit) emiter.emit('onAIAgentChatSettingChange', serializeAIAgentChatSetting(omit(setting, reviewSettingKeys)))
  return write
}

export const persistSharedChatSetting = (setting: AIAgentSetting) => {
  const shared = omit(stripAIAgentChatSettingForPersist(setting), reviewSettingKeys)
  const write = queueSettingWrite(async () => {
    const cached = await readAIAgentChatSetting()
    if (cached.status === 'error') return
    const defaults = cached.status === 'success' ? cached.setting : AIAgentSettingDefault
    await setRemoteValue(
      RemoteAIAgentGV.AIAgentChatSetting,
      JSON.stringify({ ...shared, ...pick(defaults, reviewSettingKeys) }),
    )
  })
  emiter.emit('onAIAgentChatSettingChange', JSON.stringify(shared))
  return write
}
