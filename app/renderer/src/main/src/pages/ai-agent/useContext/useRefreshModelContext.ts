import { useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { useCurrentMeta, useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { getCanonicalAIGlobalConfig } from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import type { AIModelContextSource } from '@/pages/ai-re-act/hooks/aiRender'
import {
  currentPrimaryModel,
  sameModel,
  sameModelContextIdentity,
  toModelContextSnapshot,
  updateModelContextState,
} from '@/pages/ai-re-act/hooks/modelContext'
import { grpcGetAIModelContext } from '../grpc'

export const useRefreshModelContext = (source: AIModelContextSource, open?: boolean) => {
  const rawData = useCurrentRawData()
  const store = useCurrentStore()
  const meta = useCurrentMeta()
  const session = { rawData, store }
  const primaryModel = useAIGlobalConfigStore(
    (state) => (source === 'settings' ? currentPrimaryModel(state) : undefined),
    sameModel,
  )
  const queryRef = useRef<{ generation: number; unsubscribe?: () => void } | undefined>(undefined)
  const refresh = useMemoizedFn(async () => {
    const previous = rawData.modelContext
    const retrySwitch =
      previous.retainedThresholdTokens !== undefined &&
      (previous.status === 'error' || previous.status === 'unsupported')
    if ((source === 'stream' && !retrySwitch) || previous.pending) return
    const lifecycle = meta.lifecycle
    const current = lifecycle.current
    const closing = lifecycle.closing
    const generation = previous.generation + 1
    queryRef.current?.unsubscribe?.()
    const query = { generation, unsubscribe: undefined as (() => void) | undefined }
    queryRef.current = query
    updateModelContextState(session, { generation, status: 'loading' })
    const isCurrent = () =>
      queryRef.current === query &&
      rawData.modelContext.generation === generation &&
      meta.lifecycle === lifecycle &&
      lifecycle.current === current &&
      lifecycle.closing === closing
    const canApply = () => {
      if (!isCurrent()) return false
      if (!rawData.modelContext.pending) return true
      // 热更新先于查询返回时，等本次保存结束后重新读取，避免覆盖已提交的值。
      query.unsubscribe = session.store.subscribe(() => {
        if (!isCurrent()) {
          query.unsubscribe?.()
          return
        }
        if (rawData.modelContext.pending) return
        query.unsubscribe?.()
        void refresh()
      })
      return false
    }
    try {
      const configState = useAIGlobalConfigStore.getState()
      const config =
        configState.persistedAiGlobalConfig && !configState.configSavePending
          ? configState.persistedAiGlobalConfig
          : await getCanonicalAIGlobalConfig()
      if (!canApply()) return
      const model = config.IntelligentModels?.[0]
      if (!model?.Provider?.Type || !model.ModelName) {
        updateModelContextState(session, { status: 'unbound' })
        return
      }
      const saved = toModelContextSnapshot(await grpcGetAIModelContext({ Config: model }, true))
      if (!canApply()) return
      const state = rawData.modelContext
      const runtime =
        state.runtime && sameModelContextIdentity(state.runtime, saved)
          ? { ...state.runtime, minimum_threshold_tokens: saved.minimum_threshold_tokens }
          : undefined
      const newer = state.runtime !== previous.runtime ? runtime : undefined
      updateModelContextState(session, {
        saved: newer && !newer.pending && !newer.error ? newer : saved,
        runtime,
        context: newer ?? saved,
        promptTokens:
          runtime?.prompt_tokens ??
          (state.retainedThresholdTokens !== undefined || (state.saved && sameModelContextIdentity(state.saved, saved))
            ? state.promptTokens
            : undefined),
        status: 'ready',
        error: state.failedPatch ? state.error : undefined,
      })
    } catch (error) {
      if (!canApply()) return
      const message = typeof error === 'string' ? error : error instanceof Error ? error.message : undefined
      const unsupported =
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code === 12
          : /^(?:Error invoking remote method 'GetAIModelContext': )?(?:Error: )?12 UNIMPLEMENTED(?::|$)/.test(
              message ?? '',
            )
      const state = rawData.modelContext
      updateModelContextState(session, {
        status: unsupported ? 'unsupported' : 'error',
        error: (state.failedPatch && state.error) || message || 'AIContextUsage.loadFailed',
      })
    }
  })
  useEffect(() => {
    if (open) void refresh()
    return () => {
      const query = queryRef.current
      query?.unsubscribe?.()
      queryRef.current = undefined
      if (query?.generation === rawData.modelContext.generation && rawData.modelContext.status === 'loading') {
        updateModelContextState(session, { status: 'idle' })
      }
    }
  }, [open, source, rawData, primaryModel])

  return refresh
}
