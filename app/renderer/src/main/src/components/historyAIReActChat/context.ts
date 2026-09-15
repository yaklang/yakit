import { createContext, useContext } from 'react'
import type { HistoryAIReActChatContextValue } from '../withHistoryAIReActChat'

// 独立于 Provider 的组件模块，避免其热更新时重新创建 Context。
export const HistoryAIReActChatContext = createContext<HistoryAIReActChatContextValue | null>(null)

export function useHistoryAIReActChat(): HistoryAIReActChatContextValue {
  const ctx = useContext(HistoryAIReActChatContext)
  if (!ctx) {
    throw new Error('useHistoryAIReActChat 必须在 HistoryAIReActChatProvider 内使用')
  }
  return ctx
}
