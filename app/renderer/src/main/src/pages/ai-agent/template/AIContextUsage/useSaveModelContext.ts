import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'
import { AIInputEventHotPatchTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { useCurrentRawData, useCurrentRequest, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useCurrentSessionId from '@/pages/ai-re-act/hooks/useCurrentSessionId'
import { getCanonicalAIGlobalConfig } from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import {
  getConfirmedAIConfig,
  sameModelContextIdentity,
  toModelContextSnapshot,
  updateModelContextState,
} from '@/pages/ai-re-act/hooks/modelContext'
import type {
  ModelContextPatch,
  ModelContextSnapshot,
  ModelContextState,
  PendingModelContextChange,
} from '@/pages/ai-re-act/hooks/aiRender'
import { grpcGetAIModelContext, grpcSetAIModelContext } from '../../grpc'
import type { GetAIModelContextRequest } from '../../type/modelContext'

const matchesPatch = (saved: ModelContextSnapshot, patch: ModelContextPatch) =>
  (patch.threshold_tokens === undefined || patch.threshold_tokens === saved.threshold_tokens) &&
  (patch.disable_auto_adjust === undefined || patch.disable_auto_adjust === saved.disable_auto_adjust)

const modelTarget = ({ provider, model, context_key }: ModelContextSnapshot): GetAIModelContextRequest => ({
  Provider: provider,
  Model: model,
  ContextKey: context_key,
})

export const useSaveModelContext = () => {
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
    if (execute && !sessionId) {
      updateModelContextState(session, { failedPatch: patch, error: 'AIContextUsage.sessionUnavailable' })
      yakitNotify('error', t('AIContextUsage.sessionUnavailable'))
      return false
    }
    if (current.pending) {
      current.pending.queuedPatch = { ...current.pending.queuedPatch, ...patch }
      updateModelContextState(session, { pending: current.pending })
      return true
    }
    const baseline = current.status === 'ready' && current.saved?.context_key ? current.saved : undefined
    if (!Object.keys(patch).length || (baseline && matchesPatch(baseline, patch))) return false
    if (
      patch.threshold_tokens !== undefined &&
      (!Number.isSafeInteger(patch.threshold_tokens) ||
        patch.threshold_tokens < (baseline?.minimum_threshold_tokens ?? 0) ||
        patch.threshold_tokens > 1000000)
    )
      return false

    const pending: PendingModelContextChange = { patch, baseline }
    const generation = current.generation + 1
    const isPending = () => rawData.modelContext.pending === pending
    const settle = (result: Partial<ModelContextState>) => {
      if (!isPending()) return
      updateModelContextState(session, { ...result, pending: undefined })
      const latest = rawData.modelContext
      const key = pending.baseline?.context_key
      if (latest.generation !== generation || latest.pending || (key && key !== latest.saved?.context_key)) return
      if (pending.queuedPatch) submit(pending.queuedPatch)
    }
    const fail = (error: unknown) => {
      settle({
        status: pending.baseline ? 'ready' : 'error',
        saved: pending.baseline,
        failedPatch: patch,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    const finish = (saved: ModelContextSnapshot) => settle({ status: 'ready', saved, error: undefined })
    pending.timer = setTimeout(() => fail('AIContextUsage.saveTimeout'), 10000)
    updateModelContextState(session, {
      generation,
      pending,
      error: undefined,
      failedPatch: undefined,
    })

    const send = async () => {
      try {
        if (!isPending()) return
        let target: GetAIModelContextRequest
        if (baseline) {
          target = modelTarget(baseline)
        } else {
          const config = getConfirmedAIConfig(useAIGlobalConfigStore.getState()) ?? (await getCanonicalAIGlobalConfig())
          if (!isPending()) return
          const model = config.IntelligentModels?.[0]
          if (!model?.Provider?.Type || !model.ModelName) throw new Error('AIContextUsage.sessionUnavailable')
          target = { Config: model }
        }

        if (!execute) {
          await grpcSetAIModelContext(
            {
              ...target,
              ThresholdTokens: patch.threshold_tokens ?? 0,
              ...(patch.disable_auto_adjust === undefined ? {} : { DisableAutoAdjust: patch.disable_auto_adjust }),
            },
            true,
          )
        } else {
          const saved = baseline ?? toModelContextSnapshot(await grpcGetAIModelContext(target, true))
          if (!isPending()) return
          pending.baseline = saved
          target = modelTarget(saved)
          if (patch.threshold_tokens !== undefined && patch.threshold_tokens < saved.minimum_threshold_tokens) {
            throw new Error('AIContextUsage.saveFailed')
          }
          if (matchesPatch(saved, patch)) {
            finish(saved)
            return
          }
          pending.onHotpatchError = fail
          const accepted = globalSessionEngine.handleSendMessage({
            token: sessionId,
            type: 'casual',
            params: {
              IsConfigHotpatch: true,
              HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_RuntimeContextSizeLimit,
              Params: {
                ModelContextKey: saved.context_key,
                RuntimeContextSizeLimit: patch.threshold_tokens ?? 0,
                ...(patch.disable_auto_adjust === undefined
                  ? {}
                  : { DisableContextAutoAdjust: patch.disable_auto_adjust }),
              },
            },
            onSendError: fail,
          })
          if (!accepted) throw new Error('AIContextUsage.sessionUnavailable')
        }

        // 热更新异步生效；在保存超时前回读同一模型，避免把发送成功当作配置已生效。
        while (isPending()) {
          const saved = toModelContextSnapshot(await grpcGetAIModelContext(target, true))
          if (!isPending()) return
          if (pending.baseline && !sameModelContextIdentity(pending.baseline, saved)) {
            throw new Error('AIContextUsage.loadFailed')
          }
          if (!execute || matchesPatch(saved, patch)) {
            finish(saved)
            return
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 300))
        }
      } catch (error) {
        fail(error)
      }
    }
    void Promise.resolve().then(send)
    return true
  }

  return submit
}
