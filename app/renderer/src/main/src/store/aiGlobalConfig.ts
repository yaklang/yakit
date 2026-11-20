/**
 * @description ai 全局命令
 */

import type { AIGlobalConfig } from '@/pages/ai-agent/aiModelList/utils'
import { defaultAIGlobalConfig } from '@/pages/ai-agent/defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import { createWithEqualityFn } from 'zustand/traditional'

interface AIGlobalConfigStoreProps {
  aiGlobalConfig: AIGlobalConfig
  /** 已由引擎回读确认的配置，包含引擎分配的模型归属。 */
  persistedAiGlobalConfig?: AIGlobalConfig
  configSavePending: boolean
  isInit: boolean
  queryLoading: boolean
  setAIGlobalConfig: (v: AIGlobalConfig) => void
  setIsInit: (v: boolean) => void
  getAIGlobalConfig: () => void
  setQueryLoading: (v: boolean) => void
}

export const useAIGlobalConfigStore = createWithEqualityFn<AIGlobalConfigStoreProps>(
  (set, get) => ({
    aiGlobalConfig: cloneDeep(defaultAIGlobalConfig),
    persistedAiGlobalConfig: undefined,
    configSavePending: false,
    isInit: true,
    queryLoading: false,
    setQueryLoading: (queryLoading) => {
      const s = get()
      set({ ...s, queryLoading })
    },
    setAIGlobalConfig: (info) => {
      const s = get()
      set({ ...s, aiGlobalConfig: info })
    },
    setIsInit: (isInit) => {
      const s = get()
      set({ ...s, isInit })
    },
    getAIGlobalConfig: () => get().aiGlobalConfig,
  }),
  Object.is,
)
