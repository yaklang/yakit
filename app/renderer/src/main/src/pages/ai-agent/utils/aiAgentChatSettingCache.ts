import cloneDeep from 'lodash/cloneDeep'
import omit from 'lodash/omit'
import isEqual from 'lodash/isEqual'
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

const changedFields = <T extends object>(before: T, after: T): Partial<T> => {
  const patch: Partial<T> = {}
  for (const key of Object.keys(after) as (keyof T)[]) {
    if (!isEqual(before[key], after[key])) patch[key] = after[key]
  }
  return patch
}

export const getChatSettingPatch = (current: AIAgentSetting, next: AIAgentSetting): Partial<AIAgentSetting> => {
  const { Strategy: previousStrategy, ...before } = stripAIAgentChatSettingForPersist(current)
  const { Strategy: nextStrategy, ...after } = stripAIAgentChatSettingForPersist(next)
  const patch = changedFields(before, after)
  const strategy = changedFields(previousStrategy ?? {}, nextStrategy ?? {})
  return Object.keys(strategy).length ? { ...patch, Strategy: strategy } : patch
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

const readAIAgentChatSetting = async (): Promise<Exclude<LoadAIAgentChatSettingResult, { status: 'error' }>> => {
  const res = await getRemoteValue(RemoteAIAgentGV.AIAgentChatSetting)
  if (!res) return { status: 'empty' }
  const cache = JSON.parse(res) as unknown
  if (typeof cache !== 'object' || !cache) throw new Error('Invalid AI chat settings')
  return { status: 'success', setting: mergeAIAgentChatSettingCache(cache as AIAgentSetting) }
}

// 会话只写共享项。与全局设置的写入串行，避免读到旧审核默认值后再覆盖新的全局选择。
let pendingWrite: Promise<unknown> = Promise.resolve()
export const loadAIAgentChatSetting = async (): Promise<LoadAIAgentChatSettingResult> => {
  const writesBeforeRead = pendingWrite
  const result = await writesBeforeRead.then(readAIAgentChatSetting).catch(() => ({ status: 'error' }) as const)
  // 读取期间又有全局配置写入，恢复草稿前以最后一次写入后的值为准。
  return writesBeforeRead === pendingWrite ? result : loadAIAgentChatSetting()
}

const queueSettingWrite = <T>(write: () => Promise<T>) => {
  const result = pendingWrite.then(write)
  pendingWrite = result.catch(() => undefined)
  return result
}

/** 全局设置按字段合并到队列执行时的最新配置；省略 patch 表示重置全部。 */
export const persistAIAgentChatSetting = (patch?: Partial<AIAgentSetting>) =>
  queueSettingWrite(async () => {
    let saved = AIAgentSettingDefault
    if (patch) {
      const cached = await readAIAgentChatSetting()
      saved = applyAIAgentChatSettingBroadcast(cached.status === 'success' ? cached.setting : saved, patch)
    }
    await setRemoteValue(RemoteAIAgentGV.AIAgentChatSetting, serializeAIAgentChatSetting(saved))
    emiter.emit('onAIAgentChatSettingChange', serializeAIAgentChatSetting(patch ?? saved))
    return saved
  })
