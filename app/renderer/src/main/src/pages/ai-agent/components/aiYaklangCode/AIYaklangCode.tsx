import React, { useEffect, useMemo, useState } from 'react'
import { WebFuzzerAiStoreCardRightHeader } from '@/pages/ai-agent/components/WebFuzzerAiStoreCardRightHeader'
import { AIYaklangCodeProps } from './type'
import ChatCard from '../ChatCard'
import { OutlinCompileTwoIcon } from '@/assets/icon/outline'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import ModalInfo from '../ModelInfo'
import styles from './AIYaklangCode.module.scss'
import { useCreation, useMemoizedFn, useThrottleEffect } from 'ahooks'
import { tryWebFuzzerAutoApplyRequestFromAiYaklangCode } from '@/pages/fuzzer/webFuzzerAiRequestApplyBridge'
import { NewHTTPPacketEditor } from '@/utils/editors'
import useChatIPCDispatcher from '../../useContext/ChatIPCContent/useDispatcher'
import {
  WebFuzzerAiStore,
  aiChatDataStore,
  FlowAiStore,
  histroyAiStore,
  irifyAiCodeAuditPageAiStore,
  knowledgeBaseDataStore,
  type ChatDataStoreKey,
} from '@/pages/ai-agent/store/ChatDataStore'

export const AIYaklangCode: React.FC<AIYaklangCodeProps> = React.memo((props) => {
  const {
    content: defContent,
    autoApplyStreamId,
    autoApplyChatSessionId,
    listItemIndex,
    nodeLabel,
    modalInfo,
    contentType,
    referenceNode,
  } = props
  const [content, setContent] = useState(defContent)
  useThrottleEffect(
    () => {
      setContent(defContent)
    },
    [defContent],
    { wait: 500 },
  )
  const type = useCreation(() => {
    return contentType.split('/')?.[1] || 'plaintext'
  }, [contentType])
  const renderCode = useMemoizedFn(() => {
    switch (type) {
      case 'http-request':
        return <NewHTTPPacketEditor originValue={content} readOnly={true} onlyBasicMenu={false} noMinimap={true} />
      default:
        // case AIStreamContentType.CODE_YAKLANG:
        // case AIStreamContentType.CODE_PYTHON:
        return <YakitEditor type={type} value={content} readOnly={true} />
    }
  })
  const { chatIPCEvents } = useChatIPCDispatcher()
  const webFuzzerAiStoreFuzzerPageId = useMemo((): string | undefined => {
    const store = chatIPCEvents.fetchChatDataStore()
    return store instanceof WebFuzzerAiStore ? store.fuzzerPageId : undefined
  }, [chatIPCEvents])
  const chatDataStoreKey = useMemo((): ChatDataStoreKey => {
    const store = chatIPCEvents.fetchChatDataStore()
    switch (store) {
      case histroyAiStore:
        return 'histroyAiStore'
      case FlowAiStore:
        return 'FlowAiStore'
      case aiChatDataStore:
        return 'aiChatDataStore'
      case knowledgeBaseDataStore:
        return 'knowledgeBaseDataStore'
      case irifyAiCodeAuditPageAiStore:
        return 'irifyAiCodeAuditPageAiStore'
      default:
        if (store instanceof WebFuzzerAiStore) return 'WebFuzzerAiStore'
        return 'unknown'
    }
  }, [chatIPCEvents])

  const isWebFuzzerAiStore = useMemo(() => {
    return chatDataStoreKey === 'WebFuzzerAiStore'
  }, [chatDataStoreKey])

  useEffect(() => {
    if (!isWebFuzzerAiStore || !webFuzzerAiStoreFuzzerPageId) return
    tryWebFuzzerAutoApplyRequestFromAiYaklangCode(
      webFuzzerAiStoreFuzzerPageId,
      defContent,
      autoApplyStreamId,
      autoApplyChatSessionId,
      listItemIndex,
    )
  }, [
    defContent,
    isWebFuzzerAiStore,
    webFuzzerAiStoreFuzzerPageId,
    autoApplyStreamId,
    autoApplyChatSessionId,
    listItemIndex,
  ])

  const titleExtra = useMemo(() => {
    if (!modalInfo) return null
    return (
      <ModalInfo
        {...modalInfo}
        trailing={
          isWebFuzzerAiStore && webFuzzerAiStoreFuzzerPageId ? (
            <WebFuzzerAiStoreCardRightHeader content={content} fuzzerPageId={webFuzzerAiStoreFuzzerPageId} />
          ) : undefined
        }
      />
    )
  }, [modalInfo, isWebFuzzerAiStore, content, webFuzzerAiStoreFuzzerPageId])

  return (
    <div className={styles['ai-yaklang-code-hover-wrap']}>
      <ChatCard titleText={nodeLabel} titleIcon={<OutlinCompileTwoIcon />} titleExtra={titleExtra}>
        <div className={styles['ai-yaklang-code']}>{renderCode()}</div>
        {referenceNode}
      </ChatCard>
    </div>
  )
})
