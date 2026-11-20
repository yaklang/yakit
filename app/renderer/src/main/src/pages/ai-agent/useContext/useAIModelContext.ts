import { useLayoutEffect } from 'react'
import { useStore } from 'zustand'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { useAIGlobalConfigStore } from '@/store/aiGlobalConfig'
import {
  currentPrimaryModel,
  DEFAULT_MINIMUM_THRESHOLD_TOKENS,
  syncModelContextModel,
} from '@/pages/ai-re-act/hooks/modelContext'
import type { AIModelContextSource, ModelContextPatch } from '@/pages/ai-re-act/hooks/aiRender'
import { useCurrentRawData, useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useSaveModelContext } from '../template/AIContextUsage/useSaveModelContext'
import { useRefreshModelContext } from './useRefreshModelContext'

/** 可见会话切换主模型后重新查询配置，保留本会话最近测得的用量。 */
export const useCurrentModelContextReset = (visible: boolean) => {
  const rawData = useCurrentRawData()
  const store = useCurrentStore()
  useLayoutEffect(() => {
    if (!visible) return
    const sync = (state = useAIGlobalConfigStore.getState()) =>
      syncModelContextModel({ rawData, store }, currentPrimaryModel(state))
    sync()
    return useAIGlobalConfigStore.subscribe(sync)
  }, [visible, rawData, store])
}

const useAIModelContext = (source: AIModelContextSource = 'settings', open?: boolean) => {
  const store = useCurrentStore()
  const rawData = useCurrentRawData()
  const state = useStore(store, () => rawData.modelContext)
  const execute = useStore(store, (state) => state.execute)
  const streamReady = useStore(store, (state) => state.execute && !state.initLoading)
  const { status, saved, pending } = state
  const { t } = useI18nNamespaces(['aiAgent'])
  const refresh = useRefreshModelContext(source, open)
  const submit = useSaveModelContext()
  const promptTokens = streamReady ? state.promptTokens : undefined

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
    enabled: source === 'stream' ? promptTokens !== undefined : status !== 'unsupported' && status !== 'unbound',
    thresholdTokens: saved?.threshold_tokens,
    minimumThresholdTokens: saved?.minimum_threshold_tokens ?? DEFAULT_MINIMUM_THRESHOLD_TOKENS,
    editorThresholdTokens:
      pending?.queuedPatch?.threshold_tokens ?? pending?.patch.threshold_tokens ?? saved?.threshold_tokens,
    editorDisableAutoAdjust:
      pending?.queuedPatch?.disable_auto_adjust ??
      pending?.patch.disable_auto_adjust ??
      saved?.disable_auto_adjust ??
      false,
    waitingForContext: execute && (status === 'idle' || status === 'loading' || !!pending),
    promptTokens,
    loading: status === 'loading',
    error: translateError(state.error),
    save: submit,
    retry: (displayed?: ModelContextPatch) => {
      const { failedPatch } = rawData.modelContext
      if (failedPatch) return submit(displayed ?? failedPatch, true)
      void refresh()
    },
  }
}

export default useAIModelContext
