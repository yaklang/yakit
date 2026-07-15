import React, { memo, useEffect, useMemo, useRef } from 'react'
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
import { useDebounceFn, useInViewport, useMemoizedFn, useRequest, useSafeState, useUpdateEffect } from 'ahooks'
import { apiGetGlobalNetworkConfig } from '@/pages/spaceEngine/utils'
import { defaultParams, GlobalNetworkConfig } from './configNetwork/ConfigNetworkPage'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { AIAgentSetting } from '@/pages/ai-agent/aiAgentType'
import { getRemoteValue } from '@/utils/kv'
import { AIModelForm } from '@/pages/ai-agent/aiModelList/aiModelForm/AIModelForm'
import useListenWidth from '@/pages/pluginHub/hooks/useListenWidth'
import { AISource } from '@/pages/ai-re-act/hooks/grpcApi'
import useAIAgentDispatcher from '@/pages/ai-agent/useContext/useDispatcher'
import { loadHistoryAIEmbeddedReviewPolicy, setHistoryAIReviewPolicy } from './historyAIReActChatStorage'
import useAIAgentStore from '@/pages/ai-agent/useContext/useStore'
import { AIAgentSettingDefault } from '@/pages/ai-agent/defaultConstant'

interface HistoryAIReActChatProps {
  showFreeChat: boolean
  setShowFreeChat: React.Dispatch<React.SetStateAction<boolean>>
  aiReActChatRef: React.RefObject<AIReActChatRefProps>
  onStartRequest: (data: AIHandleStartParams) => Promise<AIHandleStartResProps>
  onSendRequest: (data: AISendParams) => Promise<AISendResProps>
  className?: string
  title?: React.ReactNode
  mergeRemoteAIAgentSetting?: (cache: AIAgentSetting, prev: AIAgentSetting) => AIAgentSetting
  onChatReady?: () => void
  externalParameters: NonNullable<AIReActChatProps['externalParameters']>

  source: AISource
}

/** TODO -  @whale 修改确认 */
const HistroryAIReActChat: FC<HistoryAIReActChatProps> = memo((props) => {
  const {
    showFreeChat,
    setShowFreeChat,
    aiReActChatRef,
    onStartRequest,
    onSendRequest,
    className,
    title = 'AI',
    mergeRemoteAIAgentSetting,
    onChatReady,
    externalParameters,
    source,
  } = props

  const { setSetting } = useAIAgentDispatcher()
  const { setting } = useAIAgentStore()

  const [_, setGlobalNetworkConfig] = useSafeState<GlobalNetworkConfig>(defaultParams)

  const refRef = useRef<HTMLDivElement>(null)

  const [inViewport = true] = useInViewport(refRef)
  const chatWidth = useListenWidth(refRef)

  const embeddedSettingCacheReadyRef = useRef(false)
  const lastPersistedEmbeddedSettingRef = useRef<{
    ReviewPolicy?: AIAgentSetting['ReviewPolicy']
  }>({})

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
      applyHistoryAIEmbeddedReviewPolicy()
      getAIAgentChatSetting()
    }
  }, [inViewport])

  const applyHistoryAIEmbeddedReviewPolicy = useMemoizedFn(async () => {
    const reviewPolicy = await loadHistoryAIEmbeddedReviewPolicy()
    lastPersistedEmbeddedSettingRef.current = { ReviewPolicy: reviewPolicy }
    setSetting((prev) => ({
      ...prev,
      ReviewPolicy: reviewPolicy,
    }))
  })

  useEffect(() => {
    applyHistoryAIEmbeddedReviewPolicy().finally(() => {
      embeddedSettingCacheReadyRef.current = true
    })
  }, [applyHistoryAIEmbeddedReviewPolicy])

  useUpdateEffect(() => {
    if (!showFreeChat) return
    applyHistoryAIEmbeddedReviewPolicy()
  }, [showFreeChat, applyHistoryAIEmbeddedReviewPolicy])

  useUpdateEffect(() => {
    if (!embeddedSettingCacheReadyRef.current) return
    const policy = setting.ReviewPolicy ?? AIAgentSettingDefault.ReviewPolicy ?? 'manual'
    if (lastPersistedEmbeddedSettingRef.current.ReviewPolicy === policy) return
    setHistoryAIReviewPolicy(policy).then(() => {
      lastPersistedEmbeddedSettingRef.current = { ReviewPolicy: policy }
    })
  }, [setting.ReviewPolicy])

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

  /** 获取缓存的全局配置数据 */
  const getAIAgentChatSetting = useMemoizedFn(async () => {
    getRemoteValue(RemoteAIAgentGV.AIAgentChatSetting)
      .then((res) => {
        if (!res) return
        try {
          const cache = JSON.parse(res) as AIAgentSetting
          if (typeof cache !== 'object') return
          const { ReviewPolicy: _ignoredPolicy, ...cacheWithoutReviewPolicy } = cache
          setSetting((prev) => {
            const next = mergeRemoteAIAgentSetting
              ? mergeRemoteAIAgentSetting(cacheWithoutReviewPolicy as AIAgentSetting, prev)
              : { ...prev, ...cacheWithoutReviewPolicy }
            return {
              ...next,
              ReviewPolicy: prev.ReviewPolicy,
              Source: source,
            }
          })
        } catch (error) {}
      })
      .catch(() => {})
  })

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
})

export { HistroryAIReActChat }
