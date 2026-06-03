import React, { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useCreation, useInViewport, useMemoizedFn, useSafeState, useUpdateEffect } from 'ahooks'
import { cloneDeep } from 'lodash'

import AIAgentContext, {
  AIAgentContextDispatcher,
  AIAgentContextStore,
} from '@/pages/ai-agent/useContext/AIAgentContext'
import ChatIPCContent, {
  AIChatIPCSendParams,
  AISendConfigHotpatchParams,
  AISendSyncMessageParams,
  ChatIPCContextDispatcher,
  ChatIPCContextStore,
  defaultDispatcherOfChatIPC,
} from '@/pages/ai-agent/useContext/ChatIPCContent/ChatIPCContent'
import { AIAgentSetting } from '@/pages/ai-agent/aiAgentType'
import { AIMentionCommandParams } from '@/pages/ai-agent/components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'
import { AIAgentSettingDefault } from '@/pages/ai-agent/defaultConstant'
import { ChatDataStore } from '@/pages/ai-agent/store/ChatDataStore'
import { createActiveChatSessionId } from '@/pages/ai-agent/utils'
import { AISession } from '@/pages/ai-agent/type/aiChat'
import {
  AIHandleStartExtraProps,
  AIHandleStartParams,
  AIHandleStartResProps,
  AIReActChatProps,
  AIReActChatRefProps,
  AISendParams,
  AISendResProps,
} from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import { AIAgentGrpcApi, AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import {
  applyHttpFuzzRequestChangeToWebFuzzerPage,
  getWebFuzzerPageRequestString,
  enqueueWebFuzzerCasualReplaceReview,
  pushAIFuzzStatusRuntimeIdToWebFuzzerPage,
} from '@/pages/fuzzer/webFuzzerAiRequestApplyBridge'
import { ChatIPCSendType, UseChatIPCEvents } from '@/pages/ai-re-act/hooks/type'
import useChatIPC from '@/pages/ai-re-act/hooks/useChatIPC'
import { getChatDataStoreKey } from '@/pages/ai-re-act/hooks/useGetChatDataStoreKey'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import useDeleteAIImageByNode from '@/pages/ai-agent/components/aiMilkdownInput/aiCustomFile/hooks/useDeleteAIImageByNode'
import emiter from '@/utils/eventBus/eventBus'

import { HistroryAIReActChat } from './HistroryAIReActChat'
import {
  loadHistoryAIEmbeddedReviewPolicy,
  setHistoryAIReviewPolicy,
} from './historyAIReActChatStorage'

export type HistoryAIReActChatExternalParameters = NonNullable<AIReActChatProps['externalParameters']>

export interface HistoryAIReActChatBridge {
  activeID?: string
  events: UseChatIPCEvents
  onStop: () => void
  onNewChat: () => void
  onChatFromHistory: (session: string) => void
  setActiveChat: React.Dispatch<React.SetStateAction<AISession | undefined>>
  syncSelectedHttpFlowIds: (ids: string[]) => void
  registerClearTableSelection: (fn: () => void) => void
  clearTableSelection: () => void
  registerDeselectHttpFlowId: (fn: (id: string) => void) => void
  deselectHttpFlowId: (id: string) => void
  setMention: (v: AIMentionCommandParams) => void
  setValue: (v: string) => void
}

export interface HistoryAIReActChatSlotOptions {
  externalParameters: HistoryAIReActChatExternalParameters
  className?: string
  title?: React.ReactNode
}

export type HistoryAIReActChatSlotRender = (options: HistoryAIReActChatSlotOptions) => React.ReactNode

export type HistoryAIReActFocusModeLoop = NonNullable<AIInputEvent['FocusModeLoop']>

export interface HistoryAIReActChatContextValue {
  renderHistoryAIReActChat: HistoryAIReActChatSlotRender
  showFreeChat: boolean
  setShowFreeChat: React.Dispatch<React.SetStateAction<boolean>>
  historyAIReActChatBridge: HistoryAIReActChatBridge
  focusModeLoop: HistoryAIReActFocusModeLoop
}

const HistoryAIReActChatContext = createContext<HistoryAIReActChatContextValue | null>(null)

export function useHistoryAIReActChat(): HistoryAIReActChatContextValue {
  const ctx = useContext(HistoryAIReActChatContext)
  if (!ctx) {
    throw new Error('useHistoryAIReActChat 必须在 HistoryAIReActChatProvider 内使用')
  }
  return ctx
}

/**
 * 仅 Web Fuzzer：在发往引擎的 `AIInputEvent` 中，把当前请求包拼在 `UserQuery` / `FreeInput` 前（见 `onStartRequest` / `onSendRequest`）
 */
function prependWebFuzzerHttpRequestToSendFields(event: AIInputEvent, requestRaw: string): AIInputEvent {
  const raw = (requestRaw || '').trim()
  if (!raw) return event
  const join = (user: string) => `${raw}\n\n----\n\n${user ?? ''}`.trim()
  if (event.IsStart && event.Params) {
    const uq = event.Params.UserQuery
    if (uq != null) {
      return {
        ...event,
        Params: {
          ...event.Params,
          UserQuery: join(uq),
        },
      }
    }
  }
  if (event.IsFreeInput && event.FreeInput != null) {
    return { ...event, FreeInput: join(event.FreeInput) }
  }
  return event
}

export interface HistoryAIReActChatProviderProps {
  cacheDataStore: ChatDataStore
  focusModeLoop: HistoryAIReActFocusModeLoop
  children: React.ReactNode
  /** Web Fuzzer 页签 id：AI 改包回写、请求拼接、fuzz 状态推送等桥接用，与 SessionID 无关 */
  httpFuzzTabPageId?: string
  /**
   * - 在 `onStartRequest` / `onSendRequest` 内置（WebFuzzer 请求拼接）处理之后执行
   * - Irify「代码审计」用它把工程根路径附件追加到 `AttachedResourceInfo`
   */
  transformInputEvent?: (event: AIInputEvent) => AIInputEvent
  /** 自定义 start 请求的 extraParams，如知识库固定 chatId */
  resolveStartExtraParams?: (data: AIHandleStartParams) => AIHandleStartExtraProps
  /** 远程 setting 写入前合并，如知识库保留 TimelineSessionID */
  mergeRemoteAIAgentSetting?: (cache: AIAgentSetting, prev: AIAgentSetting) => AIAgentSetting
}

export const HistoryAIReActChatProvider = memo(function HistoryAIReActChatProviderInner({
  cacheDataStore,
  focusModeLoop,
  children,
  httpFuzzTabPageId,
  transformInputEvent,
  resolveStartExtraParams,
  mergeRemoteAIAgentSetting,
}: HistoryAIReActChatProviderProps) {
  const aiReActChatRef = useRef<AIReActChatRefProps>(null)
  const [showFreeChat, setShowFreeChat] = useSafeState(false)
  const refRef = useRef<HTMLDivElement>(null)

  const [inViewport = true] = useInViewport(refRef)

  const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>(() => cloneDeep(AIAgentSettingDefault))
  const [activeChat, setActiveChat] = useSafeState<AISession>()
  const casualLoadingRef = useRef(false)
  const initialRequestInCasualRef = useRef<string | null>(null)
  const clearTableSelectionRef = useRef<(() => void) | null>(null)
  const deselectHttpFlowIdRef = useRef<((id: string) => void) | null>(null)
  const pendingMentionRef = useRef<AIMentionCommandParams | null>(null)
  const chatReadyRef = useRef(false)
  const embeddedSettingCacheReadyRef = useRef(false)
  const lastPersistedEmbeddedSettingRef = useRef<{
    ReviewPolicy?: AIAgentSetting['ReviewPolicy']
  }>({})

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
    if (!inViewport) return
    applyHistoryAIEmbeddedReviewPolicy()
  }, [inViewport, applyHistoryAIEmbeddedReviewPolicy])

  useEffect(() => {
    const onRefreshEmbeddedSetting = () => {
      applyHistoryAIEmbeddedReviewPolicy()
    }
    emiter.on('onRefreshHistoryAIEmbeddedSetting', onRefreshEmbeddedSetting)
    return () => {
      emiter.off('onRefreshHistoryAIEmbeddedSetting', onRefreshEmbeddedSetting)
    }
  }, [applyHistoryAIEmbeddedReviewPolicy])

  useUpdateEffect(() => {
    if (!embeddedSettingCacheReadyRef.current) return
    const policy = setting.ReviewPolicy ?? AIAgentSettingDefault.ReviewPolicy ?? 'manual'
    if (lastPersistedEmbeddedSettingRef.current.ReviewPolicy === policy) return
    setHistoryAIReviewPolicy(policy).then(() => {
      lastPersistedEmbeddedSettingRef.current = { ReviewPolicy: policy }
      emiter.emit('onRefreshHistoryAIEmbeddedSetting', '')
    })
  }, [setting.ReviewPolicy])

  useEffect(() => {
    if (!showFreeChat) {
      chatReadyRef.current = false
    }
  }, [showFreeChat])

  const flushPendingMention = useMemoizedFn(() => {
    chatReadyRef.current = true
    requestAnimationFrame(() => {
      const pending = pendingMentionRef.current
      if (!pending) return
      aiReActChatRef.current?.setMention(pending)
      pendingMentionRef.current = null
    })
  })

  const onHttpFuzzRequestChange = useMemoizedFn((data: AIAgentGrpcApi.HttpFuzzRequestChange) => {
    if (!httpFuzzTabPageId) return

    // casual 问答期间：有完整 raw 时不自动写包，入队审阅（`op` 仅占位描述，不作为筛选项）
    if (casualLoadingRef.current) {
      const nextRaw = data?.request?.raw
      if (nextRaw != null && String(nextRaw).trim() !== '' && initialRequestInCasualRef.current != null) {
        enqueueWebFuzzerCasualReplaceReview(httpFuzzTabPageId, {
          original: initialRequestInCasualRef.current ?? '',
          change: data,
        })
        return
      }
    }

    applyHttpFuzzRequestChangeToWebFuzzerPage(httpFuzzTabPageId, data)
  })

  // AI `http_flow_fuzz_status` 推送：把每次最新的 `runtime_id` 静默推到当前 fuzzer 页签的处理器中。
  // 用户点击「查看详情」会显式再次推送并要求打开抽屉，所以这里不主动打开。
  const onGetHttpFlowFuzzStatus = useMemoizedFn((data: AIAgentGrpcApi.GetHttpFlowFuzzStatus) => {
    if (!httpFuzzTabPageId) return
    const runtimeId = data?.runtime_id
    if (!runtimeId) return
    pushAIFuzzStatusRuntimeIdToWebFuzzerPage(httpFuzzTabPageId, runtimeId, { source: 'auto' })
  })

  const [chatIPCData, events] = useChatIPC({
    autoConnect: true,
    cacheDataStore,
    getSetting,
    onHttpFuzzRequestChange,
    onGetHttpFlowFuzzStatus,
  })

  const imageStoreKey = useCreation(() => getChatDataStoreKey(cacheDataStore), [cacheDataStore])
  const [, { onClearImage }] = useDeleteAIImageByNode()

  const { execute, casualLoading } = chatIPCData

  useEffect(() => {
    if (!httpFuzzTabPageId) {
      casualLoadingRef.current = false
      initialRequestInCasualRef.current = null
      return
    }

    if (!casualLoadingRef.current && casualLoading) {
      initialRequestInCasualRef.current = getWebFuzzerPageRequestString(httpFuzzTabPageId) ?? ''
    } else if (casualLoadingRef.current && !casualLoading) {
      initialRequestInCasualRef.current = null
    }

    casualLoadingRef.current = casualLoading
  }, [casualLoading, httpFuzzTabPageId])

  const activeID = useCreation(() => {
    return activeChat?.SessionID
  }, [activeChat])

  useUpdateEffect(() => {
    events.onSwitchChat(activeChat?.SessionID, activeChat?.isCreate)
  }, [activeChat])

  const handleSendInteractiveMessage = useMemoizedFn((params: AIChatIPCSendParams, type: ChatIPCSendType) => {
    const { value, id, optionValue } = params
    if (!activeID) return
    if (!id) return

    const info: AIInputEvent = {
      IsInteractiveMessage: true,
      InteractiveId: id,
      InteractiveJSONInput: value,
    }
    events.onSend({ token: activeID, type, params: info, optionValue })
  })

  const handleSendCasual = useMemoizedFn((params: AIChatIPCSendParams) => {
    const targetParams = { ...params, FocusModeLoop: focusModeLoop }
    handleSendInteractiveMessage(targetParams, 'casual')
  })

  const onStartRequest = useMemoizedFn((data: AIHandleStartParams) => {
    const newChat: AIHandleStartExtraProps = resolveStartExtraParams?.(data) ?? {
      chatId: activeChat?.SessionID,
    }

    return new Promise<AIHandleStartResProps>((resolve) => {
      let params: AIInputEvent = { ...data.params, FocusModeLoop: focusModeLoop }
      if (httpFuzzTabPageId) {
        const raw = getWebFuzzerPageRequestString(httpFuzzTabPageId)
        if (raw != null) {
          params = prependWebFuzzerHttpRequestToSendFields(params, raw)
        }
      }
      if (transformInputEvent) {
        params = transformInputEvent(params)
      }
      resolve({
        params,
        extraParams: newChat,
      })
    })
  })

  const onChatFromHistory = useMemoizedFn((session: string) => {
    events.onDelChats([session])
  })

  /** 新建会话：清空 UI、断开旧连接，并预生成新的 TimelineSessionID */
  const onNewChat = useMemoizedFn(() => {
    const currentID = activeChat?.SessionID
    if (execute && currentID) {
      events.onClose(currentID)
    }
    events.onReset()
    setActiveChat(undefined)
    setSetting((prev) => ({
      ...prev,
      TimelineSessionID: createActiveChatSessionId(),
      SyncPerceptionTrigger: false,
      EnablePlan: false,
    }))
    aiReActChatRef.current?.setValue('')
  })

  const handleDelChats = useMemoizedFn((jsonString: string) => {
    try {
      const sessions: string[] = JSON.parse(jsonString)
      if (!sessions.length || imageStoreKey === 'unknown') return
      onClearImage({
        chatDataStoreKey: imageStoreKey,
        sessionID: sessions,
      })
      events.onDelChats(sessions)
    } catch (error) {}
  })

  useEffect(() => {
    emiter.on('onDelChats', handleDelChats)
    return () => {
      emiter.off('onDelChats', handleDelChats)
    }
  }, [handleDelChats])

  const onStop = useMemoizedFn(() => {
    if (execute && activeID) {
      events.onClose(activeID)
    }
  })

  const handleSend = useMemoizedFn((params: AIChatIPCSendParams) => {
    const targetParams = { ...params, FocusModeLoop: focusModeLoop }
    handleSendInteractiveMessage(targetParams, '')
  })

  const onSendRequest = useMemoizedFn((data: AISendParams) => {
    let params: AIInputEvent = { ...data.params, FocusModeLoop: focusModeLoop }
    if (httpFuzzTabPageId) {
      const raw = getWebFuzzerPageRequestString(httpFuzzTabPageId)
      if (raw != null) {
        params = prependWebFuzzerHttpRequestToSendFields(params, raw)
      }
    }
    if (transformInputEvent) {
      params = transformInputEvent(params)
    }

    return new Promise<AISendResProps>((resolve) => {
      resolve({
        params,
      })
    })
  })

  const handleSendSyncMessage = useMemoizedFn((data: AISendSyncMessageParams) => {
    if (!activeID) return
    const { syncType, SyncJsonInput } = data
    const params = { ...data.params, FocusModeLoop: focusModeLoop }
    const info: AIInputEvent = {
      IsSyncMessage: true,
      SyncType: syncType,
      SyncJsonInput,
      Params: params,
    }
    events.onSend({ token: activeID, type: '', params: info })
  })

  const handleSendConfigHotpatch = useMemoizedFn((data: AISendConfigHotpatchParams) => {
    if (!activeID) return
    const { hotpatchType } = data

    const params = { ...data.params, FocusModeLoop: focusModeLoop }
    const info: AIInputEvent = {
      IsConfigHotpatch: true,
      HotpatchType: hotpatchType,
      Params: params,
    }
    events.onSend({ token: activeID, type: '', params: info })
  })

  const store: ChatIPCContextStore = useCreation(() => {
    return {
      chatIPCData,
      planReviewTreeKeywordsMap: new Map(),
      reviewExpand: false,
    }
  }, [chatIPCData])

  const dispatcher: ChatIPCContextDispatcher = useCreation(() => {
    return {
      ...defaultDispatcherOfChatIPC,
      chatIPCEvents: events,
      handleSendCasual,
      handleStop: onStop,
      handleSend,
      handleSendSyncMessage,
      handleSendConfigHotpatch,
    }
  }, [events])

  const stores: AIAgentContextStore = useMemo(() => {
    return {
      setting: setting,
      activeChat: activeChat,
    }
  }, [setting, activeChat])

  const dispatchers: AIAgentContextDispatcher = useMemo(() => {
    return {
      getSetting: getSetting,
      setSetting: setSetting,
      setActiveChat: setActiveChat,
    }
  }, [])

  const historyAIReActChatBridge: HistoryAIReActChatBridge = useMemo(
    () => ({
      activeID,
      events,
      onStop,
      onNewChat,
      onChatFromHistory,
      setActiveChat,
      syncSelectedHttpFlowIds: (ids: string[]) => {
        aiReActChatRef.current?.setHttpFlow?.(ids)
      },
      registerClearTableSelection: (fn: () => void) => {
        clearTableSelectionRef.current = fn
      },
      clearTableSelection: () => {
        clearTableSelectionRef.current?.()
      },
      registerDeselectHttpFlowId: (fn: (id: string) => void) => {
        deselectHttpFlowIdRef.current = fn
      },
      deselectHttpFlowId: (id: string) => {
        deselectHttpFlowIdRef.current?.(id)
      },
      setMention: (v) => {
        if (chatReadyRef.current) {
          aiReActChatRef.current?.setMention(v)
          pendingMentionRef.current = null
          return
        }
        pendingMentionRef.current = v
      },
      setValue: (v) => {
        aiReActChatRef.current?.setValue(v)
      },
    }),
    [activeID, events, onStop, onNewChat, onChatFromHistory, setActiveChat],
  )

  const renderHistoryAIReActChat = useCallback(
    ({ className, externalParameters, title }: HistoryAIReActChatSlotOptions) => (
      <HistroryAIReActChat
        className={className}
        title={title}
        refRef={refRef}
        showFreeChat={showFreeChat}
        setShowFreeChat={setShowFreeChat}
        aiReActChatRef={aiReActChatRef}
        onStartRequest={onStartRequest}
        onSendRequest={onSendRequest}
        inViewport={inViewport}
        setSetting={setSetting}
        mergeRemoteAIAgentSetting={mergeRemoteAIAgentSetting}
        onChatReady={flushPendingMention}
        externalParameters={externalParameters}
      />
    ),
    [inViewport, flushPendingMention, mergeRemoteAIAgentSetting, onSendRequest, onStartRequest, showFreeChat],
  )

  const contextValue = useMemo(
    (): HistoryAIReActChatContextValue => ({
      renderHistoryAIReActChat,
      showFreeChat,
      setShowFreeChat,
      historyAIReActChatBridge,
      focusModeLoop,
    }),
    [renderHistoryAIReActChat, showFreeChat, setShowFreeChat, historyAIReActChatBridge, focusModeLoop],
  )

  return (
    <AIAgentContext.Provider value={{ store: stores, dispatcher: dispatchers }}>
      <ChatIPCContent.Provider value={{ store, dispatcher }}>
        <HistoryAIReActChatContext.Provider value={contextValue}>{children}</HistoryAIReActChatContext.Provider>
      </ChatIPCContent.Provider>
    </AIAgentContext.Provider>
  )
})

HistoryAIReActChatProvider.displayName = 'HistoryAIReActChatProvider'
