import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import React, { forwardRef } from 'react'
import type { AIReactChatTextareaProps } from './type'
import { AIChatTextarea } from '@/pages/ai-agent/template/template'
import styles from '../AIReActChat.module.scss'
import omit from 'lodash/omit'
import useGetChatDataStoreKey from '../../hooks/useGetChatDataStoreKey'

export const AIReactChatTextarea: React.FC<AIReactChatTextareaProps> = React.memo(
  forwardRef((props, ref) => {
    const { handleSubmit, externalParameters } = props

    const { pendingChat } = useAIAgentStore()

    const chatDataStoreKey = useGetChatDataStoreKey()
    return (
      <AIChatTextarea
        ref={ref}
        milkdownClassName={styles['milkdown-input']}
        loading={pendingChat?.status === 'connecting'}
        onSubmit={handleSubmit}
        chatDataStoreKey={chatDataStoreKey}
        {...omit(externalParameters, 'rightIcon')}
      />
    )
  }),
)
