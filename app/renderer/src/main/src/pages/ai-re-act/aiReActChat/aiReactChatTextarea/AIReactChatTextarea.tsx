import React, { forwardRef } from 'react'
import type { AIReactChatTextareaProps } from './type'
import { AIChatTextarea } from '@/pages/ai-agent/template/template'
import styles from '../AIReActChat.module.scss'
import { RoundedStopButton } from '../AIReActComponent'
import omit from 'lodash/omit'
import { useStore } from 'zustand'
import { useCurrentStore } from '../../hooks/useCurrentDataBySession'
import useGetChatDataStoreKey from '../../hooks/useGetChatDataStoreKey'
import { AITaskStatus } from '../../hooks/grpcApi'

export const AIReactChatTextarea: React.FC<AIReactChatTextareaProps> = React.memo(
  forwardRef((props, ref) => {
    const { handleSubmit, externalParameters, handleStopCasualTask } = props

    const store = useCurrentStore()
    const cancelChatLoading = useStore(store, (state) => state.cancelChatLoading)
    const casualLoading = useStore(store, (state) => state.currentChatStatus.status === AITaskStatus.inProgress)

    const chatDataStoreKey = useGetChatDataStoreKey()
    return (
      <AIChatTextarea
        ref={ref}
        loading={false}
        onSubmit={handleSubmit}
        inputFooterRight={
          <div className={styles['extra-footer-right']}>
            {casualLoading && (
              <RoundedStopButton
                loading={cancelChatLoading}
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
