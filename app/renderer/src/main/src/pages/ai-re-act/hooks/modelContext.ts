import isEqual from 'lodash/isEqual'
import omit from 'lodash/omit'
import type { AIModelContextResponse } from '@/pages/ai-agent/type/modelContext'
import type { AIModelConfig } from '@/pages/ai-agent/aiModelList/utils'
import type { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import type { ModelContextPatch, ModelContextSnapshot, ModelContextState, PendingModelContextChange } from './aiRender'
import type { AIMessageHandlerParams } from './type'

/** 引擎未返回最低阈值时，手动设置压缩阈值使用的下限，单位为 token。 */
export const DEFAULT_MINIMUM_THRESHOLD_TOKENS = 100000

/** 切换模型后可先使用引擎确认的配置，收到实时事件后沿用实时快照。 */
export const getStreamModelContext = (state: ModelContextState) =>
  state.runtime ?? (state.retainedThresholdTokens !== undefined ? state.saved : undefined)

/** 将引擎查询或保存的结果转为已确认的快照，并校验可能以字符串返回的 int64 阈值。 */
export const toModelContextSnapshot = (value: AIModelContextResponse): ModelContextSnapshot => {
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
    source: value.Source,
    pending: false,
    disable_auto_adjust: value.DisableAutoAdjust,
  }
}

/** 只有上下文键、提供方和模型名均匹配，查询结果才能与流事件的用量合并。 */
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

/** 保存配置期间跟随界面选中的主模型，其余时间优先使用引擎已确认的配置。 */
export const currentPrimaryModel = (state: ReturnType<typeof useAIGlobalConfigStore.getState>) =>
  (state.configSavePending ? state.aiGlobalConfig : (state.persistedAiGlobalConfig ?? state.aiGlobalConfig))
    ?.IntelligentModels?.[0]

type ModelContextSession = {
  rawData: AIMessageHandlerParams['rawData']
  store: Pick<AIMessageHandlerParams['store'], 'getState' | 'subscribe'>
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

/** 有保存正在进行时，按字段合并后续修改并返回 true；返回 false 时由调用方直接提交。 */
export const enqueueModelContextSave = (
  session: ModelContextSession,
  patch: ModelContextPatch,
  submit: (patch: ModelContextPatch) => void,
): boolean => {
  const { rawData, store } = session
  const { pending, generation } = rawData.modelContext
  if (!pending) return false
  if (!pending.queuedPatch) {
    // 首次入队时订阅一次；同一轮保存期间的后续编辑只更新 queuedPatch。
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.modelContextUpdate === previous.modelContextUpdate) return
      const current = rawData.modelContext
      if (current.pending === pending && current.generation === generation) return
      unsubscribe()
      const key = pending.baseline?.context_key
      // 会话已重置或模型已切换时，丢弃属于旧上下文的修改。
      if (current.generation !== generation || (key && key !== current.context?.context_key)) return
      if (pending.queuedPatch) submit(pending.queuedPatch)
    })
  }
  pending.queuedPatch = { ...pending.queuedPatch, ...patch }
  updateModelContextState(session, { pending })
  return true
}
