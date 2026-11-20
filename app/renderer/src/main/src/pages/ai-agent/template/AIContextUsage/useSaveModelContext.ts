import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { AIInputEventHotPatchTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { useCurrentRawData, useCurrentRequest, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { getCanonicalAIGlobalConfig } from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import {
  DEFAULT_MINIMUM_THRESHOLD_TOKENS,
  enqueueModelContextSave,
  getStreamModelContext,
  sameModelContextIdentity,
  toModelContextSnapshot,
  updateModelContextState,
} from '@/pages/ai-re-act/hooks/modelContext'
import type {
  AIModelContextSource,
  ModelContextPatch,
  PendingModelContextChange,
} from '@/pages/ai-re-act/hooks/aiRender'
import { grpcSetAIModelContext } from '../../grpc'
import type { GetAIModelContextRequest } from '../../type/modelContext'

export const useSaveModelContext = (source: AIModelContextSource) => {
  const rawData = useCurrentRawData()
  const store = useCurrentStore()
  const request = useCurrentRequest()
  const activeSessionId = useCurrentSessionId()
  const sessionId = request.TimelineSessionID || activeSessionId
  const session = { rawData, store }
  const { t } = useI18nNamespaces(['aiAgent'])

  const submit = (patch: ModelContextPatch): boolean => {
    const current = rawData.modelContext
    const { execute } = store.getState()
    const streamOnly = source === 'stream'
    if (!sessionId || (streamOnly && !execute)) {
      updateModelContextState(session, { failedPatch: patch, error: 'AIContextUsage.sessionUnavailable' })
      yakitNotify('error', t('AIContextUsage.sessionUnavailable'))
      return false
    }
    // 后台会话可能保留旧主模型；设置查询确认前，离线保存由当前 Config 定位目标。
    const baseline = streamOnly
      ? getStreamModelContext(current)
      : current.status === 'ready'
        ? (current.saved ?? current.runtime)
        : undefined
    if (execute && !baseline?.context_key) {
      updateModelContextState(session, { failedPatch: patch, error: 'AIContextUsage.missingContextKey' })
      yakitNotify('error', t('AIContextUsage.missingContextKey'))
      return false
    }
    if (enqueueModelContextSave(session, patch, submit)) return true
    if (
      (patch.threshold_tokens === undefined || patch.threshold_tokens === baseline?.threshold_tokens) &&
      (patch.disable_auto_adjust === undefined || patch.disable_auto_adjust === baseline?.disable_auto_adjust)
    )
      return false
    if (
      patch.threshold_tokens !== undefined &&
      (!Number.isSafeInteger(patch.threshold_tokens) ||
        patch.threshold_tokens < (baseline?.minimum_threshold_tokens ?? DEFAULT_MINIMUM_THRESHOLD_TOKENS) ||
        patch.threshold_tokens > 1000000)
    )
      return false

    const generation = execute ? current.generation : current.generation + 1
    const pending: PendingModelContextChange = { patch, baseline }
    const fail = (error: unknown) => {
      if (rawData.modelContext.pending !== pending) return
      const latest = rawData.modelContext
      const previous = baseline && (latest.saved ?? baseline)
      updateModelContextState(session, {
        status: previous ? latest.status : 'error',
        pending: undefined,
        failedPatch: patch,
        context: previous && { ...previous, prompt_tokens: latest.runtime?.prompt_tokens },
        error: error instanceof Error ? error.message : String(error),
      })
    }
    updateModelContextState(session, {
      pending,
      generation,
      context: baseline && { ...baseline, ...patch },
      error: undefined,
      failedPatch: undefined,
    })
    pending.timer = setTimeout(() => fail('AIContextUsage.saveTimeout'), 10000)
    const configState = useAIGlobalConfigStore.getState()
    // 保存绑定提交时的会话，弹窗关闭或切换会话后仍由原会话接收结果。
    const send = async () => {
      try {
        if (rawData.modelContext.pending !== pending) return
        if (execute && baseline) {
          const accepted = globalSessionEngine.handleSendMessage({
            token: sessionId,
            type: 'casual',
            params: {
              IsConfigHotpatch: true,
              HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_RuntimeContextSizeLimit,
              Params: {
                ModelContextKey: baseline.context_key,
                RuntimeContextSizeLimit: patch.threshold_tokens ?? 0,
                ...(patch.disable_auto_adjust === undefined
                  ? {}
                  : { DisableContextAutoAdjust: patch.disable_auto_adjust }),
              },
            },
            onSendError: fail,
          })
          if (!accepted) fail('AIContextUsage.sessionUnavailable')
          return
        }
        let target: GetAIModelContextRequest
        if (baseline?.context_key) {
          target = { Provider: baseline.provider, Model: baseline.model, ContextKey: baseline.context_key }
        } else {
          const config =
            configState.persistedAiGlobalConfig && !configState.configSavePending
              ? configState.persistedAiGlobalConfig
              : await getCanonicalAIGlobalConfig()
          const model = config.IntelligentModels?.[0]
          if (!model?.Provider?.Type || !model.ModelName || rawData.modelContext.pending !== pending) {
            throw new Error('AIContextUsage.sessionUnavailable')
          }
          target = { Config: model }
        }
        const saved = toModelContextSnapshot(
          await grpcSetAIModelContext(
            {
              ...target,
              ThresholdTokens: patch.threshold_tokens ?? 0,
              ...(patch.disable_auto_adjust === undefined ? {} : { DisableAutoAdjust: patch.disable_auto_adjust }),
            },
            true,
          ),
        )
        if (rawData.modelContext.pending !== pending) return
        if (baseline?.context_key && !sameModelContextIdentity(baseline, saved)) return
        updateModelContextState(session, {
          status: 'ready',
          pending: undefined,
          saved,
          context: saved,
          error: undefined,
        })
      } catch (error) {
        fail(error)
      }
    }
    void Promise.resolve().then(send)
    return true
  }

  return submit
}
