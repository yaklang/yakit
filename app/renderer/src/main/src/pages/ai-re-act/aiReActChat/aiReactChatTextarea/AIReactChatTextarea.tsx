import React, { forwardRef } from 'react'
import { AIReactChatTextareaProps } from './type'
import { AIChatTextarea } from '@/pages/ai-agent/template/template'
import styles from '../AIReActChat.module.scss'
import { RoundedStopButton } from '../AIReActComponent'
import omit from 'lodash/omit'
import useCreation from 'ahooks/lib/useCreation'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import { useStore } from 'zustand'
import { useCurrentStore } from '../../hooks/useCurrentDataBySession'
import { getImageStoreKeyByAISource } from '../../hooks/useGetChatDataStoreKey'

export const AIReactChatTextarea: React.FC<AIReactChatTextareaProps> = React.memo(
  forwardRef((props, ref) => {
    const { handleSubmit, externalParameters, handleStopCasualTask } = props

    const { setting } = useAIAgentStore()

    const store = useCurrentStore()
    const cancelCasualLoading = useStore(store, (state) => state.cancelCasualLoading)
    const casualLoading = useStore(store, (state) => state.casualLoading)

    const chatDataStoreKey = useCreation(() => {
      return getImageStoreKeyByAISource(setting.Source || 'ai')
    }, [setting.Source])
    return (
      <AIChatTextarea
        ref={ref}
        loading={false}
        onSubmit={handleSubmit}
        inputFooterRight={
          <div className={styles['extra-footer-right']}>
            {casualLoading && (
              <RoundedStopButton
                loading={cancelCasualLoading}
                onClick={handleStopCasualTask}
                style={{ width: 24, height: 24 }}
              />
            )}
          </div>
        }
        chatDataStoreKey={chatDataStoreKey}
        {...omit(externalParameters, 'rightIcon')}
      />
    )
  }),
)
