import React from 'react'
import useGetChatDataStoreKey from '@/pages/ai-re-act/hooks/useGetChatDataStoreKey'
import { AITriageChatContent } from '../../aiTriageChat/AITriageChat'
import { AIThoughtProps, AITriageChatContentWrapperProps } from './type'
import { useCreation } from 'ahooks'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export const AITriageChatContentWrapper: React.FC<AITriageChatContentWrapperProps> = React.memo((props) => {
  const chatDataStoreKey = useGetChatDataStoreKey()
  return <AITriageChatContent {...props} chatDataStoreKey={chatDataStoreKey} />
})

export const AIThought: React.FC<AIThoughtProps> = React.memo((props) => {
  const { itemData, renderNum } = props
  const { t, i18n } = useI18nNamespaces(['aiAgent'])
  const newItemData = useCreation(() => {
    return {
      ...itemData,
      data: `${t('AIChatListItem.thinking')}${itemData?.data}`,
    }
  }, [renderNum, i18n.language])
  return <AITriageChatContentWrapper isAnswer={true} itemData={newItemData} renderNum={renderNum} />
})
