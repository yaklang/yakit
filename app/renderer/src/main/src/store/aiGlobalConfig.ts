/**
 * @description ai 全局命令
 */

import { AIGlobalConfig } from '@/pages/ai-agent/aiModelList/utils'
import { defaultAIGlobalConfig } from '@/pages/ai-agent/defaultConstant'
import cloneDeep from 'lodash/cloneDeep'
import { create } from 'zustand'
import { createWithEqualityFn } from 'zustand/traditional'

interface AIGlobalConfigStoreProps {
  aiGlobalConfig: AIGlobalConfig
  isInit: boolean
  setAIGlobalConfig: (v: AIGlobalConfig) => void
  setIsInit: (v: boolean) => void
  getAIGlobalConfig: () => void
}

export const useAIGlobalConfigStore = createWithEqualityFn<AIGlobalConfigStoreProps>(
  (set, get) => ({
    aiGlobalConfig: cloneDeep(defaultAIGlobalConfig),
    isInit: true,
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
