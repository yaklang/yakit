import React, { useEffect, useMemo } from 'react'
import { FC } from 'react'

import { AIReActChat } from '@/pages/ai-re-act/aiReActChat/AIReActChat'
import classNames from 'classnames'
import styles from './HTTPHistory.module.scss'

import {
  AIHandleStartParams,
  AIHandleStartResProps,
  AIReActChatProps,
  AIReActChatRefProps,
  AISendParams,
  AISendResProps,
} from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import { getAIModelAvailableInfo, isForcedSetAIModal } from '@/pages/ai-agent/aiModelList/utils'
import { useDebounceFn, useMemoizedFn, useRequest, useSafeState } from 'ahooks'
import { apiGetGlobalNetworkConfig } from '@/pages/spaceEngine/utils'
import { defaultParams, GlobalNetworkConfig } from './configNetwork/ConfigNetworkPage'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { AIAgentSetting } from '@/pages/ai-agent/aiAgentType'
import { getRemoteValue } from '@/utils/kv'
import { AIModelForm } from '@/pages/ai-agent/aiModelList/aiModelForm/AIModelForm'
import useListenWidth from '@/pages/pluginHub/hooks/useListenWidth'

interface HistoryAIReActChatProps {
  refRef: React.RefObject<HTMLDivElement>
  showFreeChat: boolean
  setShowFreeChat: React.Dispatch<React.SetStateAction<boolean>>
  aiReActChatRef: React.RefObject<AIReActChatRefProps>
  onStartRequest: (data: AIHandleStartParams) => Promise<AIHandleStartResProps>
  onSendRequest: (data: AISendParams) => Promise<AISendResProps>
  setSetting: React.Dispatch<React.SetStateAction<AIAgentSetting>>
  inViewport: boolean
  className?: string
  title?: React.ReactNode
  mergeRemoteAIAgentSetting?: (cache: AIAgentSetting, prev: AIAgentSetting) => AIAgentSetting
  onChatReady?: () => void
  externalParameters: NonNullable<AIReActChatProps['externalParameters']>
}

const HistroryAIReActChat: FC<HistoryAIReActChatProps> = (props) => {
  const {
    refRef,
    showFreeChat,
    setShowFreeChat,
    aiReActChatRef,
    onStartRequest,
    onSendRequest,
    inViewport,
    setSetting,
    className,
    title = 'AI',
    mergeRemoteAIAgentSetting,
    onChatReady,
    externalParameters,
  } = props

  const [globalNetworkConfig, setGlobalNetworkConfig] = useSafeState<GlobalNetworkConfig>(defaultParams)

  const chatWidth = useListenWidth(refRef)

  const { data, run, loading } = useRequest(
    async () => {
      const res = await getAIModelAvailableInfo()
      const isModels = res.localModelsTotal === 0 && res.onlineModelsTotal === 0
      return isModels
    },
    { manual: true },
  )

  useEffect(() => {
    if (inViewport) {
      run()
      onGetGlobalNetworkConfig()
      getAIModelListOption()
    }
  }, [inViewport])

  const getAIModelListOption = useDebounceFn(
    () => {
      isForcedSetAIModal({
        pageKey: 'knowledge-base',
        isOpen: false,
      })
    },
    { leading: true },
  ).run

  /**获取全局网络配置 */
  const onGetGlobalNetworkConfig = useMemoizedFn(() => {
    apiGetGlobalNetworkConfig().then(setGlobalNetworkConfig)
  })

  useEffect(() => {
    if (inViewport) {
      // 获取缓存的全局配置数据
      getRemoteValue(RemoteAIAgentGV.AIAgentChatSetting)
        .then((res) => {
          if (!res) return
          try {
            const cache = JSON.parse(res) as AIAgentSetting
            if (typeof cache !== 'object') return
            setSetting((prev) => (mergeRemoteAIAgentSetting ? mergeRemoteAIAgentSetting(cache, prev) : cache))
          } catch (error) {}
        })
        .catch(() => {})
    }
    return () => {}
  }, [inViewport])

  useEffect(() => {
    if (!inViewport || loading || data === undefined || data) return
    onChatReady?.()
  }, [data, inViewport, loading, onChatReady])

  const resultRender = useMemo(() => {
    if (loading && data === undefined) return null

    // 无模型 → 配置引导
    if (data) {
      return (
        <AIModelForm
          onClose={() => {}}
          onSuccess={() => {
            run()
          }}
          thirdPartyApplicationConfig={
            chatWidth < 400
              ? {
                  FormProps: {
                    layout: 'vertical',
                    labelCol: 24,
                    wrapperCol: 24,
                  },
                  onAdd: () => {},
                  onCancel: () => {},
                }
              : {
                  FormProps: {
                    layout: 'horizontal',
                    labelCol: 8,
                    wrapperCol: 16,
                  },
                  onAdd: () => {},
                  onCancel: () => {},
                }
          }
        />
      )
    }

    // 有模型 → 正常聊天
    return (
      <AIReActChat
        mode={'task'}
        showFreeChat={showFreeChat}
        setShowFreeChat={setShowFreeChat}
        title={title}
        ref={aiReActChatRef}
        startRequest={onStartRequest}
        sendRequest={onSendRequest}
        chatContainerHeaderClassName={styles['history-ai-header']}
        externalParameters={externalParameters}
      />
    )
  }, [
    aiReActChatRef,
    chatWidth,
    data,
    externalParameters,
    loading,
    mergeRemoteAIAgentSetting,
    onSendRequest,
    onStartRequest,
    run,
    setShowFreeChat,
    showFreeChat,
    title,
  ])

  return (
    <div ref={refRef} className={classNames(styles['ai-wrapper'], className)}>
      {resultRender}
    </div>
  )
}

export { HistroryAIReActChat }
