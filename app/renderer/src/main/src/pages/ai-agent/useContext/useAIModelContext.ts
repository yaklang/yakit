import { useLayoutEffect } from 'react'
import { useStore } from 'zustand'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import {
  clearModelContextSaveTimer,
  currentPrimaryModel,
  DEFAULT_MINIMUM_THRESHOLD_TOKENS,
  getStreamModelContext,
  sameModel,
  toModelContextSnapshot,
  updateModelContextState,
} from '@/pages/ai-re-act/hooks/modelContext'
import type { AIModelContextSource } from '@/pages/ai-re-act/hooks/aiRender'
import { getCanonicalAIGlobalConfig } from '@/pages/ai-re-act/hooks/useAIGlobalConfig'
import { grpcGetAIModelContext } from '../grpc'
import type { AIModelConfig } from '../aiModelList/utils'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useSaveModelContext } from '../template/AIContextUsage/useSaveModelContext'
import { useRefreshModelContext } from './useRefreshModelContext'

/** 切换时的设置查询和同名模型身份校验共用一次读取。 */
const createModelContextReader = (selected: AIModelConfig, waitForSave: boolean) => {
  const read = async () => {
    const config = waitForSave ? (await getCanonicalAIGlobalConfig()).IntelligentModels[0] : selected
    if (!sameModel(selected, config)) return
    return grpcGetAIModelContext({ Config: config }, true)
  }
  let request: ReturnType<typeof read> | undefined
  return () =>
    (request ??= read().catch((error) => {
      request = undefined
      throw error
    }))
}

/** 可见会话切换主模型时更新设置，继续展示本会话最近测得的用量。 */
export const useCurrentModelContextReset = (visible: boolean) => {
  const rawData = useCurrentRawData()
  const store = useCurrentStore()
  useLayoutEffect(() => {
    if (!visible) return
    return useAIGlobalConfigStore.subscribe((next, previous) => {
      const before = currentPrimaryModel(previous)
      const after = currentPrimaryModel(next)
      if (sameModel(before, after)) return
      const state = rawData.modelContext
      // 首次取到主模型配置时，让仍在等待该配置的查询或保存继续完成。
      if (!before && !previous.persistedAiGlobalConfig && !state.context && !state.saved && !state.runtime) return
      clearModelContextSaveTimer(state.pending)
      rawData.modelContext = { status: 'idle', generation: state.generation + 1 }
      if (after?.Provider?.Type && after.ModelName) {
        const provider = after.Provider.Type
        const model = after.ModelName
        const config = next.configSavePending
          ? next.aiGlobalConfig
          : (next.persistedAiGlobalConfig ?? next.aiGlobalConfig)
        const ambiguous = [before, ...config.IntelligentModels.slice(1)].some(
          (other) => other?.ModelName === model && other.Provider?.Type === provider,
        )
        const read = createModelContextReader(after, next.configSavePending && !after.ContextOwnerId)
        const expectedModel = {
          provider,
          model,
          resolveKey: ambiguous ? async () => (await read())?.ContextKey ?? '' : undefined,
        }
        rawData.modelContext.expectedModel = expectedModel
        const promptTokens = state.runtime?.prompt_tokens ?? state.promptTokens
        const threshold = getStreamModelContext(state)?.threshold_tokens ?? state.retainedThresholdTokens
        const { execute, initLoading } = store.getState()
        if (promptTokens !== undefined && threshold !== undefined && execute && !initLoading) {
          rawData.modelContext.promptTokens = promptTokens
          rawData.modelContext.retainedThresholdTokens = threshold
          rawData.modelContext.status = 'loading'
          const awaitingSettings = () => {
            const latest = rawData.modelContext
            return latest.expectedModel === expectedModel && !latest.saved && !latest.runtime && !latest.pending
          }
          void read()
            .then((response) => {
              if (!response || !awaitingSettings()) return
              const saved = toModelContextSnapshot(response)
              if (!saved.context_key || saved.provider !== provider || saved.model !== model) {
                throw new Error('AIContextUsage.loadFailed')
              }
              updateModelContextState({ rawData, store }, { saved, context: saved, status: 'ready', error: undefined })
            })
            .catch((error) => {
              if (!awaitingSettings()) return
              updateModelContextState(
                { rawData, store },
                { status: 'error', error: error instanceof Error ? error.message : 'AIContextUsage.loadFailed' },
              )
            })
        }
      }
      store.getState().updateStateCount('modelContextUpdate')
    })
  }, [visible, rawData, store])
}

const useAIModelContext = (source: AIModelContextSource = 'settings', open?: boolean) => {
  const streamOnly = source === 'stream'
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const state = useStore(store, () => rawData.modelContext)
  const execute = useStore(store, (state) => state.execute)
  const streamReady = useStore(store, (state) => state.execute && !state.initLoading)
  const { status } = state
  const { t } = useI18nNamespaces(['aiAgent'])
  const refresh = useRefreshModelContext(source, open)
  const submit = useSaveModelContext(source)

  const runtime = streamReady ? state.runtime : undefined
  const retainedThreshold = streamReady ? state.retainedThresholdTokens : undefined
  const switchingWithUsage = retainedThreshold !== undefined
  const snapshot = streamOnly ? (streamReady ? getStreamModelContext(state) : undefined) : state.context
  // 用量统计只使用流事件；编辑器在回执到达前继续显示已提交的修改。
  const pending =
    !streamOnly || (execute && state.pending?.baseline?.context_key === snapshot?.context_key)
      ? state.pending
      : undefined

  const editorSnapshot = state.failedPatch ? (state.saved ?? state.context) : snapshot

  const translateError = (error?: string) => {
    if (!error) return undefined
    if (error === 'AIContextUsage.loadFailed') return t('AIContextUsage.loadFailed')
    if (error === 'AIContextUsage.saveTimeout') return t('AIContextUsage.saveTimeout')
    if (error === 'AIContextUsage.missingContextKey') return t('AIContextUsage.missingContextKey')
    if (error === 'AIContextUsage.sessionUnavailable') return t('AIContextUsage.sessionUnavailable')
    if (error.startsWith('AIContextUsage.')) return t('AIContextUsage.saveFailed')
    return error
  }
  return {
    enabled: streamOnly ? !!runtime || switchingWithUsage : status !== 'unsupported' && status !== 'unbound',
    thresholdTokens: snapshot?.threshold_tokens ?? (streamOnly ? retainedThreshold : undefined),
    minimumThresholdTokens: editorSnapshot?.minimum_threshold_tokens ?? DEFAULT_MINIMUM_THRESHOLD_TOKENS,
    editorThresholdTokens:
      pending?.queuedPatch?.threshold_tokens ?? pending?.patch.threshold_tokens ?? editorSnapshot?.threshold_tokens,
    editorDisableAutoAdjust:
      pending?.queuedPatch?.disable_auto_adjust ??
      pending?.patch.disable_auto_adjust ??
      editorSnapshot?.disable_auto_adjust ??
      false,
    waitingForContext:
      execute && (status === 'idle' || (status === 'loading' && switchingWithUsage) || !!state.pending),
    promptTokens: runtime?.prompt_tokens ?? (switchingWithUsage ? state.promptTokens : undefined),
    disableAutoAdjust: snapshot?.disable_auto_adjust ?? false,
    loading: !streamOnly && status === 'loading',
    saving: !!state.pending,
    error: translateError(streamOnly && !state.failedPatch && !switchingWithUsage ? undefined : state.error),
    refresh,
    save: submit,
    setThreshold: (tokens: number) => submit({ threshold_tokens: tokens }),
    setAutoAdjust: (enabled: boolean) => submit({ disable_auto_adjust: !enabled }),
    retry: () => {
      const { failedPatch } = rawData.modelContext
      if (failedPatch) submit(failedPatch)
      else void refresh()
    },
  }
}

export default useAIModelContext
