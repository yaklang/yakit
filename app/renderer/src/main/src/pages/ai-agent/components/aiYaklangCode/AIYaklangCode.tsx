import React, { useMemo, useState } from 'react'
import { WebFuzzerAiStoreCardRightHeader } from '@/pages/ai-agent/components/WebFuzzerAiStoreCardRightHeader'
import { AIYaklangCodeProps } from './type'
import ChatCard from '../ChatCard'
import { OutlinCompileTwoIcon } from '@/assets/icon/outline'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import ModalInfo from '../ModelInfo'
import styles from './AIYaklangCode.module.scss'
import { useCreation, useMemoizedFn, useThrottleEffect } from 'ahooks'
import { NewHTTPPacketEditor } from '@/utils/editors'
import useChatIPCDispatcher from '../../useContext/ChatIPCContent/useDispatcher'
import { WebFuzzerAiStore } from '@/pages/ai-agent/store/ChatDataStore'
import useGetChatDataStoreKey from '@/pages/ai-re-act/hooks/useGetChatDataStoreKey'

export const AIYaklangCode: React.FC<AIYaklangCodeProps> = React.memo((props) => {
  const { content: defContent, nodeLabel, modalInfo, contentType, referenceNode } = props

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
        return (
          <NewHTTPPacketEditor
            originValue={content}
            readOnly={true}
            onlyBasicMenu={false}
            noMinimap={true}
            noLineNumber={true}
          />
        )
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
  const { chatDataStoreKey } = useGetChatDataStoreKey()

  const isWebFuzzerAiStore = useMemo(() => {
    return chatDataStoreKey === 'WebFuzzerAiStore'
  }, [chatDataStoreKey])

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
