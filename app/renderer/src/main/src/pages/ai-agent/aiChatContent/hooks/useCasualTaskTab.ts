import { useEffect, useRef } from 'react'
import { useStore } from 'zustand'
import { useMemoizedFn } from 'ahooks'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import emiter from '@/utils/eventBus/eventBus'
import { AISourceEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export function useCasualTaskTab() {
  const { t } = useI18nNamespaces(['aiAgent'])
  const { activeChat } = useAIAgentStore()
  const { getSetting } = useAIAgentDispatcher()
  const store = useCurrentStore()
  const currentChatStatusQuestionID = useStore(store, (state) => state.currentChatStatus.questionID)
  const sessionRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (sessionRef.current && sessionRef.current !== activeChat?.SessionID) {
      sessionRef.current = undefined
    }
  }, [activeChat?.SessionID])

  useEffect(() => {
    if (!activeChat?.Title || !activeChat?.SessionID) return
    if (sessionRef.current !== activeChat.SessionID) return
    emitTaskContentTab('update', activeChat.Title)
  }, [activeChat?.Title, activeChat?.SessionID, currentChatStatusQuestionID])

  const emitTaskContentTab = useMemoizedFn((type: 'add' | 'update', label?: string) => {
    const sessionId = activeChat?.SessionID
    const taskId = currentChatStatusQuestionID
    if (!taskId || !sessionId) return false
    if (getSetting()?.Source !== AISourceEnum.aiAgent) return false
    emiter.emit(
      'actionAITaskContentTab',
      JSON.stringify({
        type,
        params: {
          key: sessionId,
          taskId,
          label: label || activeChat?.Title || t('AIChatContent.newChatTitle'),
          goal: '',
        },
      }),
    )
    return true
  })

  const syncCasualTaskTab = useMemoizedFn(() => {
    const sessionId = activeChat?.SessionID
    if (!currentChatStatusQuestionID || !sessionId) return
    if (getSetting().Source !== AISourceEnum.aiAgent) return false
    emitTaskContentTab('add')
    sessionRef.current = sessionId
  })

  return {
    currentChatStatusQuestionID,
    syncCasualTaskTab,
  }
}
