import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { AIChatContentProps } from './type'
import styles from './AIChatContent.module.scss'
import { useMemoizedFn } from 'ahooks'
import { AIReActChat } from '@/pages/ai-re-act/aiReActChat/AIReActChat'
import useAIAgentStore from '../useContext/useStore'
import type {
  AIHandleStartParams,
  AIHandleStartResProps,
  AIReActChatRefProps,
} from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import AIGlobalLoading from '../aiGlobalLoading/AIGlobalLoading'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import { AIHorizontalScrollCard } from './aiHorizontalScrollCard/AIHorizontalScrollCard'
import { sessionStatusStore, SessionDeleteStatus } from '@/pages/ai-re-act/hooks/sessionStatus/sessionStatusStore'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { ArrowLeftOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { onNewChat } from '../historyChat/HistoryChat'

export const AIChatContent: React.FC<AIChatContentProps> = React.memo(
  forwardRef((props, ref) => {
    const { onChat } = props
    const { t } = useI18nNamespaces(['aiAgent'])

    const store = useCurrentStore()
    const initLoading = useStore(store, (state) => state.initLoading)
    const { activeChat } = useAIAgentStore()

    const [showFreeChat, setShowFreeChat] = useState<boolean>(true)
    const [showBackToHome, setShowBackToHome] = useState(false)

    useEffect(() => {
      setShowBackToHome(false)
      if (!initLoading) return
      const timer = setTimeout(() => setShowBackToHome(true), 3000)
      return () => clearTimeout(timer)
    }, [initLoading, activeChat?.SessionID])

    const aiReActChatRef = useRef<AIReActChatRefProps>({
      handleStart: () => {},
      setMention: () => {},
      setValue: () => {},
      setHttpFlow: () => {},
      getValue: () => {},
    })

    useImperativeHandle(ref, () => {
      return {
        ...aiReActChatRef.current,
      }
    }, [])

    const startRequest = useMemoizedFn((data: AIHandleStartParams) => {
      return new Promise<AIHandleStartResProps>((resolve) => {
        resolve({
          params: data.params,
          onChat,
        })
      })
    })

    const deleteStatus = useStore(
      sessionStatusStore,
      (s) => s.deleteStatuses.get(activeChat?.SessionID || '') ?? SessionDeleteStatus.Idle,
    )
    const isSessionDeleting = deleteStatus === SessionDeleteStatus.Deleting
    const sourceDeleting = useStore(sessionStatusStore, (s) => s.deletingSources.has(activeChat?.Source || ''))

    return (
      <div className={styles['ai-chat-content-wrapper']}>
        <YakitSpin spinning={isSessionDeleting || sourceDeleting}>
          <AIGlobalLoading
            loopAnimationMode="sequential"
            loading={initLoading}
            actions={
              showBackToHome && (
                <YakitButton type="outline2" icon={<ArrowLeftOutlined color="currentColor" />} onClick={onNewChat}>
                  {t('AIChatContent.backToHome')}
                </YakitButton>
              )
            }
          >
            <AIHorizontalScrollCard />
            <div className={styles['ai-chat-tab-wrapper']}>
              <AIReActChat
                showFreeChat={showFreeChat}
                setShowFreeChat={setShowFreeChat}
                startRequest={startRequest}
                showAIRightPanel
                ref={aiReActChatRef}
              />
            </div>
          </AIGlobalLoading>
        </YakitSpin>
      </div>
    )
  }),
)
