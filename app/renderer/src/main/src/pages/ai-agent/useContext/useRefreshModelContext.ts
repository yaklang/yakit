import { useEffect, useRef } from 'react'
import { useStore } from 'zustand'
import { useMemoizedFn } from 'ahooks'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import { useCurrentMeta, useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { getCanonicalAIGlobalConfig } from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import type { AIModelContextSource } from '@/pages/ai-re-act/hooks/aiRender'
import {
  currentPrimaryModel,
  getConfirmedAIConfig,
  sameModel,
  syncModelContextModel,
  toModelContextSnapshot,
  updateModelContextState,
} from '@/pages/ai-re-act/hooks/modelContext'
import { grpcGetAIModelContext } from '../grpc'

export const useRefreshModelContext = (source: AIModelContextSource, open?: boolean) => {
  const rawData = useCurrentRawData()
  const store = useCurrentStore()
  const meta = useCurrentMeta()
  const session = { rawData, store }
  const primaryModel = useAIGlobalConfigStore(currentPrimaryModel, sameModel)
  const state = useStore(store, () => rawData.modelContext)
  const streamReady = useStore(store, (state) => state.execute && !state.initLoading)
  const queryRef = useRef<{ generation: number } | undefined>(undefined)
  const releaseQuery = (query: typeof queryRef.current) => {
    if (!query || queryRef.current !== query) return
    queryRef.current = undefined
    const state = rawData.modelContext
    if (state.generation === query.generation && state.status === 'loading' && !state.pending) {
      updateModelContextState(session, { status: 'idle' })
    }
  }
  const refresh = useMemoizedFn(async () => {
    syncModelContextModel(session, currentPrimaryModel(useAIGlobalConfigStore.getState()))
    const previous = rawData.modelContext
    if (previous.pending || previous.status === 'loading') return
    const lifecycle = meta.lifecycle
    const current = lifecycle.current
    const closing = lifecycle.closing
    const generation = previous.generation + 1
    const query = { generation }
    queryRef.current = query
    updateModelContextState(session, { generation, status: 'loading' })
    const canApply = () =>
      queryRef.current === query &&
      rawData.modelContext.generation === generation &&
      !rawData.modelContext.pending &&
      meta.lifecycle === lifecycle &&
      lifecycle.current === current &&
      lifecycle.closing === closing
    try {
      const config = getConfirmedAIConfig(useAIGlobalConfigStore.getState()) ?? (await getCanonicalAIGlobalConfig())
      if (!canApply()) return
      const model = config.IntelligentModels?.[0]
      rawData.modelContext.primaryModel = model
      if (!model?.Provider?.Type || !model.ModelName) {
        updateModelContextState(session, { saved: undefined, refreshThreshold: undefined, status: 'unbound' })
        return
      }
      const saved = toModelContextSnapshot(await grpcGetAIModelContext({ Config: model }, true))
      if (!canApply()) return
      // 查询期间若收到不同的新阈值，且本次 GET 尚未反映该值，再查询一次。
      const latestThreshold = rawData.modelContext.refreshThreshold
      updateModelContextState(session, {
        saved,
        refreshThreshold:
          latestThreshold !== previous.refreshThreshold && latestThreshold !== saved.threshold_tokens
            ? latestThreshold
            : undefined,
        status: 'ready',
        error: rawData.modelContext.failedPatch ? rawData.modelContext.error : undefined,
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
      updateModelContextState(session, {
        status: unsupported ? 'unsupported' : 'error',
        refreshThreshold: undefined,
        error:
          (rawData.modelContext.failedPatch && rawData.modelContext.error) || message || 'AIContextUsage.loadFailed',
      })
    } finally {
      releaseQuery(query)
    }
  })
  useEffect(() => {
    if (open) void refresh()
    return () => releaseQuery(queryRef.current)
  }, [open, source, rawData, primaryModel, meta.lifecycle, meta.lifecycle.current, meta.lifecycle.closing])

  const needsInitialSettings =
    source === 'stream' && state.promptTokens !== undefined && !state.saved && state.status === 'idle'
  const thresholdChanged =
    state.refreshThreshold !== undefined && state.refreshThreshold !== state.saved?.threshold_tokens
  useEffect(() => {
    if (
      streamReady &&
      !state.pending &&
      state.status !== 'loading' &&
      (needsInitialSettings || ((source === 'stream' || open) && thresholdChanged))
    ) {
      void refresh()
    }
  }, [source, open, streamReady, needsInitialSettings, thresholdChanged, state.pending, state.status, rawData])

  return refresh
}
