import { useCallback } from 'react'
import { aiChatDataStore } from '../../store/ChatDataStore'
import useChatIPCDispatcher from '@/pages/ai-agent/useContext/ChatIPCContent/useDispatcher'
import { AIChatData } from '../../type/aiChat'

export const CONTEXT_PERF_POLL_INTERVAL = 2000

export interface ContextPerfPanelProps {
  session?: string
  execute: boolean
}

/** 读取当前 session 的性能数据 */
export function useContextPerfStore(session?: string) {
  const { chatIPCEvents } = useChatIPCDispatcher()
  return useCallback((): AIChatData['aiPerfData'] | null => {
    const store = chatIPCEvents.fetchChatDataStore?.() ?? aiChatDataStore
    return store?.get(session ?? '')?.aiPerfData ?? null
  }, [session, chatIPCEvents])
}
