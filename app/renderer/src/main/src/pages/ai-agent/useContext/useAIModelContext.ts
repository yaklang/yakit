import { useLayoutEffect } from 'react'
import { useStore } from 'zustand'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import {
  clearModelContextSaveTimer,
  currentPrimaryModel,
  DEFAULT_MINIMUM_THRESHOLD_TOKENS,
  sameModel,
} from '@/pages/ai-re-act/hooks/modelContext'
import type { AIModelContextSource } from '@/pages/ai-re-act/hooks/aiRender'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useSaveModelContext } from '../template/AIContextUsage/useSaveModelContext'
import { useRefreshModelContext } from './useRefreshModelContext'

/** 只有当前可见的输入区需要随主模型切换而清空本会话的旧设置。 */
export const useCurrentModelContextReset = (visible: boolean) => {
  const rawData = useCurrentRawData()
  const store = useCurrentStore()
  useLayoutEffect(() => {
    if (!visible) return
    return useAIGlobalConfigStore.subscribe((next, previous) => {
      const before = currentPrimaryModel(previous)
      if (sameModel(before, currentPrimaryModel(next))) return
      const state = rawData.modelContext
      // 首次取到主模型配置时，让仍在等待该配置的查询或保存继续完成。
      if (!before && !previous.persistedAiGlobalConfig && !state.context && !state.saved && !state.runtime) return
      clearModelContextSaveTimer(state.pending)
      rawData.modelContext = { status: 'idle', generation: state.generation + 1 }
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
  const snapshot = streamOnly ? runtime : state.context
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
    enabled: streamOnly ? !!runtime : status !== 'unsupported' && status !== 'unbound',
    thresholdTokens: snapshot?.threshold_tokens,
    minimumThresholdTokens: editorSnapshot?.minimum_threshold_tokens ?? DEFAULT_MINIMUM_THRESHOLD_TOKENS,
    editorThresholdTokens:
      pending?.queuedPatch?.threshold_tokens ?? pending?.patch.threshold_tokens ?? editorSnapshot?.threshold_tokens,
    editorDisableAutoAdjust:
      pending?.queuedPatch?.disable_auto_adjust ??
      pending?.patch.disable_auto_adjust ??
      editorSnapshot?.disable_auto_adjust ??
      false,
    waitingForContext: execute && (status === 'idle' || !!state.pending),
    promptTokens: runtime?.prompt_tokens,
    disableAutoAdjust: snapshot?.disable_auto_adjust ?? false,
    loading: !streamOnly && status === 'loading',
    saving: !!state.pending,
    error: translateError(streamOnly && !state.failedPatch ? undefined : state.error),
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
