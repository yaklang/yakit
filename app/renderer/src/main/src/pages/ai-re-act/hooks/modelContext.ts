import isEqual from 'lodash/isEqual'
import omit from 'lodash/omit'
import type { AIModelContextResponse } from '@/pages/ai-agent/type/modelContext'
import type { AIModelConfig } from '@/pages/ai-agent/aiModelList/utils'
import type { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import type { ModelContextSnapshot, ModelContextState, PendingModelContextChange } from './aiRender'
import type { AIMessageHandlerParams } from './type'

/** 首次 GET 返回前，编辑器使用的默认下限，单位为 token。 */
export const DEFAULT_MINIMUM_THRESHOLD_TOKENS = 100000

/** 将 GET 结果转为设置快照，并校验可能以字符串返回的 int64 阈值。 */
export const toModelContextSnapshot = (value: AIModelContextResponse): ModelContextSnapshot => {
  if (!value.ContextKey) throw new Error('AIContextUsage.missingContextKey')
  const threshold = Number(value.ThresholdTokens)
  const minimum = Number(value.MinimumThresholdTokens)
  if (!Number.isSafeInteger(threshold) || threshold <= 0 || !Number.isSafeInteger(minimum) || minimum < 0) {
    throw new Error('Invalid model context token count')
  }
  return {
    provider: value.Provider,
    model: value.Model,
    context_key: value.ContextKey,
    threshold_tokens: threshold,
    minimum_threshold_tokens: minimum,
    disable_auto_adjust: value.DisableAutoAdjust,
  }
}

/** 回读配置必须与本次提交指向同一个模型。 */
export const sameModelContextIdentity = (a: ModelContextSnapshot, b: ModelContextSnapshot) =>
  a.context_key === b.context_key && a.provider === b.provider && a.model === b.model

/** 比较前后两份主模型配置，判断当前会话的设置是否需要重新读取。 */
export const sameModel = (first?: AIModelConfig, second?: AIModelConfig) => {
  // 引擎首次补齐归属 ID 时，继续使用正在读取的同一主模型。
  if (first && second && !first.ContextOwnerId && second.ContextOwnerId) {
    return isEqual(omit(first, 'ContextOwnerId'), omit(second, 'ContextOwnerId'))
  }
  return isEqual(first, second)
}

export const getConfirmedAIConfig = (state: ReturnType<typeof useAIGlobalConfigStore.getState>) =>
  state.configSavePending ? undefined : state.persistedAiGlobalConfig

/** 保存配置期间跟随界面选中的主模型，其余时间优先使用引擎已确认的配置。 */
export const currentPrimaryModel = (state: ReturnType<typeof useAIGlobalConfigStore.getState>) =>
  (getConfirmedAIConfig(state) ?? state.aiGlobalConfig)?.IntelligentModels?.[0]

type ModelContextSession = {
  rawData: AIMessageHandlerParams['rawData']
  store: Pick<AIMessageHandlerParams['store'], 'getState'>
}

/** 合并会话状态并通知订阅者。替换或结束待确认的保存时，一并清除它的超时定时器。 */
export const updateModelContextState = ({ rawData, store }: ModelContextSession, patch: Partial<ModelContextState>) => {
  if ('pending' in patch && patch.pending !== rawData.modelContext.pending) {
    clearModelContextSaveTimer(rawData.modelContext.pending)
  }
  rawData.modelContext = { ...rawData.modelContext, ...patch }
  store.getState().updateStateCount('modelContextUpdate')
}

/** 取消本次保存的超时回调，防止旧回调在会话清理后触发回滚。 */
export const clearModelContextSaveTimer = (pending?: PendingModelContextChange) => {
  if (pending?.timer) clearTimeout(pending.timer)
}
