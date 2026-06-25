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
import { createActiveChatSessionId, getAIReActRequestParams } from '@/pages/ai-agent/utils'
import { AISession } from '@/pages/ai-agent/type/aiChat'
import { HandleStartParams } from '@/pages/ai-agent/aiAgentChat/type'
import {
  AIHandleStartExtraProps,
  AIHandleStartParams,
  AIHandleStartResProps,
  AIReActChatProps,
  AIReActChatRefProps,
  AISendParams,
  AISendResProps,
} from '@/pages/ai-re-act/aiReActChat/AIReActChatType'
import { AIAgentGrpcApi, AIInputEvent, AISource } from '@/pages/ai-re-act/hooks/grpcApi'
import {
  applyHttpFuzzRequestChangeToWebFuzzerPage,
  getWebFuzzerPageIsHttps,
  getWebFuzzerPageRequestString,
  enqueueWebFuzzerCasualReplaceReview,
  pushAIFuzzStatusRuntimeIdToWebFuzzerPage,
} from '@/pages/fuzzer/webFuzzerAiRequestApplyBridge'
import { appendWebFuzzerRequestRawAttachmentToEvent } from '@/pages/fuzzer/webFuzzerAiRequestAttachment'
import {
  appendYakRunnerWorkspaceContextToEvent,
  createYakRunnerGeneratedCodeFileName,
  enqueueYakRunnerCasualCodeReplaceReview,
  getYakRunnerPageActiveCodeString,
  resolveYaklangCreateTargetPath,
} from '../pages/yakRunner/yakRunnerAiCodeApplyBridge'
import { ChatIPCSendType, UseChatIPCEvents } from '@/pages/ai-re-act/hooks/type'
import useChatIPC from '@/pages/ai-re-act/hooks/useChatIPC'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import useDeleteAIImageByNode from '@/pages/ai-agent/components/aiMilkdownInput/aiCustomFile/hooks/useDeleteAIImageByNode'
import emiter from '@/utils/eventBus/eventBus'

import { HistroryAIReActChat } from './HistroryAIReActChat'
import { loadHistoryAIEmbeddedReviewPolicy, setHistoryAIReviewPolicy } from './historyAIReActChatStorage'

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
  handleStart: (value: HandleStartParams) => void
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
 * 仅 Web Fuzzer：在发往引擎的 `AIInputEvent.AttachedResourceInfo` 中附带当前请求包（见 `onStartRequest` / `onSendRequest`）
 */
function attachWebFuzzerHttpRequestToEvent(
  event: AIInputEvent,
  sessionId: string | undefined | null,
  requestRaw: string | null,
  isHttps: boolean,
): AIInputEvent {
  if (requestRaw == null) return event
  return appendWebFuzzerRequestRawAttachmentToEvent(event, sessionId, requestRaw, isHttps)
}

const CODE_BLOCK_TAG_DIRECTIVE = ':codeBlockTag'

/** 跳过 Milkdown 序列化的 `:codeBlockTag[...]{...}` 指令（含 attributes 内嵌代码） */
function skipCodeBlockTagDirective(markdown: string, start: number): number {
  let i = start + CODE_BLOCK_TAG_DIRECTIVE.length
  if (markdown[i] === '[') {
    const closeBracket = markdown.indexOf(']', i)
    if (closeBracket === -1) return markdown.length
    i = closeBracket + 1
  }
  if (markdown[i] !== '{') return i
  i++
  let inQuote = false
  let escape = false
  while (i < markdown.length) {
    const c = markdown[i]
    if (escape) {
      escape = false
    } else if (c === '\\') {
      escape = true
    } else if (c === '"') {
      inQuote = !inQuote
    } else if (c === '}' && !inQuote) {
      return i + 1
    }
    i++
  }
  return markdown.length
}

/**
 * Yak Runner 等代码审计：`IsStart` 的 `UserQuery` 只保留用户输入的文字描述；
 * 选中代码已通过 `AttachedResourceInfo`（codeBlockList）附带，不应重复写入 UserQuery。
 */
function normalizeStartUserQueryToTextDescription(event: AIInputEvent): AIInputEvent {
  if (!event.IsStart || event.Params?.UserQuery == null) return event
  const raw = String(event.Params.UserQuery)
  let textOnly = ''
  let cursor = 0
  while (cursor < raw.length) {
    const idx = raw.indexOf(CODE_BLOCK_TAG_DIRECTIVE, cursor)
    if (idx === -1) {
      textOnly += raw.slice(cursor)
      break
    }
    textOnly += raw.slice(cursor, idx)
    cursor = skipCodeBlockTagDirective(raw, idx)
  }
  textOnly = textOnly.replace(/\n{3,}/g, '\n\n').trim()
  if (textOnly === raw.trim()) return event
  return {
    ...event,
    Params: {
      ...event.Params,
      UserQuery: textOnly,
    },
  }
}

export interface HistoryAIReActChatProviderProps {
  source: AISource
  focusModeLoop: HistoryAIReActFocusModeLoop
  children: React.ReactNode
  /** Web Fuzzer 页签 id：AI 改包回写、请求附件、fuzz 状态推送等桥接用，与 SessionID 无关 */
  httpFuzzTabPageId?: string
  /** Yak Runner 工作区 id：AI `yaklang_code_change` 审阅/写回桥接 */
  yakRunnerPageId?: string
  /**
   * - 在 `onStartRequest` / `onSendRequest` 内置（WebFuzzer 请求附件）处理之后执行
   * - Irify「代码审计」用它把工程根路径附件追加到 `AttachedResourceInfo`
   */
  transformInputEvent?: (event: AIInputEvent) => AIInputEvent
  /** 自定义 start 请求的 extraParams，如知识库固定 chatId */
  resolveStartExtraParams?: (data: AIHandleStartParams) => AIHandleStartExtraProps
  /** 远程 setting 写入前合并，如知识库保留 TimelineSessionID */
  mergeRemoteAIAgentSetting?: (cache: AIAgentSetting, prev: AIAgentSetting) => AIAgentSetting
}

export const HistoryAIReActChatProvider = memo(function HistoryAIReActChatProviderInner({
  source,
  focusModeLoop,
  children,
  httpFuzzTabPageId,
  yakRunnerPageId,
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
  const initialCodeInCasualRef = useRef<string | null>(null)
  const clearTableSelectionRef = useRef<(() => void) | null>(null)
  const deselectHttpFlowIdRef = useRef<((id: string) => void) | null>(null)
  const pendingMentionRef = useRef<AIMentionCommandParams | null>(null)
  const chatReadyRef = useRef(false)
  const yakRunnerLastAttachedResourceInfoRef = useRef<AIInputEvent['AttachedResourceInfo']>([])
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

  useUpdateEffect(() => {
    if (!embeddedSettingCacheReadyRef.current) return
    const policy = setting.ReviewPolicy ?? AIAgentSettingDefault.ReviewPolicy ?? 'manual'
    if (lastPersistedEmbeddedSettingRef.current.ReviewPolicy === policy) return
    setHistoryAIReviewPolicy(policy).then(() => {
      lastPersistedEmbeddedSettingRef.current = { ReviewPolicy: policy }
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

  const onYaklangCodeChange = useMemoizedFn((data: AIAgentGrpcApi.YaklangCodeChange) => {
    if (!yakRunnerPageId) return

    const nextCode = data?.code?.content
    if (nextCode == null || String(nextCode).trim() === '') return

    const isCreate = data.op === 'create'
    const createFileName = isCreate ? createYakRunnerGeneratedCodeFileName() : undefined
    const createPath = isCreate
      ? resolveYaklangCreateTargetPath(yakRunnerPageId, yakRunnerLastAttachedResourceInfoRef.current, createFileName)
      : undefined
    const change = isCreate
      ? {
          ...data,
          code: {
            ...data.code,
            path: createPath,
          },
        }
      : data

    const original = isCreate
      ? ''
      : casualLoadingRef.current && initialCodeInCasualRef.current != null
        ? initialCodeInCasualRef.current
        : (getYakRunnerPageActiveCodeString(yakRunnerPageId) ?? '')

    enqueueYakRunnerCasualCodeReplaceReview(yakRunnerPageId, {
      original,
      change,
      fileName: createFileName,
      isCreate,
    })
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
    // autoConnect: true,
    // aiSource,
    // cacheDataStore,
    // getSetting,
    // onHttpFuzzRequestChange,
    // onGetHttpFlowFuzzStatus,
    // onYaklangCodeChange,
  })

  const [, { onClearImage }] = useDeleteAIImageByNode()

  const { execute, casualLoading } = chatIPCData

  useEffect(() => {
    if (!httpFuzzTabPageId && !yakRunnerPageId) {
      casualLoadingRef.current = false
      initialRequestInCasualRef.current = null
      initialCodeInCasualRef.current = null
      return
    }

    if (!casualLoadingRef.current && casualLoading) {
      if (httpFuzzTabPageId) {
        initialRequestInCasualRef.current = getWebFuzzerPageRequestString(httpFuzzTabPageId) ?? ''
      }
      if (yakRunnerPageId) {
        initialCodeInCasualRef.current = getYakRunnerPageActiveCodeString(yakRunnerPageId) ?? ''
      }
    } else if (casualLoadingRef.current && !casualLoading) {
      initialRequestInCasualRef.current = null
      initialCodeInCasualRef.current = null
    }

    casualLoadingRef.current = casualLoading
  }, [casualLoading, httpFuzzTabPageId, yakRunnerPageId])

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
        const isHttps = getWebFuzzerPageIsHttps(httpFuzzTabPageId) ?? false
        const sessionId =
          data.params.Params?.TimelineSessionID || activeChat?.SessionID || getSetting().TimelineSessionID
        params = attachWebFuzzerHttpRequestToEvent(params, sessionId, raw, isHttps)
      }
      if (transformInputEvent) {
        params = transformInputEvent(params)
      }
      if (yakRunnerPageId) {
        params = appendYakRunnerWorkspaceContextToEvent(yakRunnerPageId, params)
        params = normalizeStartUserQueryToTextDescription(params)
        yakRunnerLastAttachedResourceInfoRef.current = params.AttachedResourceInfo || []
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
      const isHttps = getWebFuzzerPageIsHttps(httpFuzzTabPageId) ?? false
      params = attachWebFuzzerHttpRequestToEvent(params, activeChat?.SessionID, raw, isHttps)
    }
    if (transformInputEvent) {
      params = transformInputEvent(params)
    }
    if (yakRunnerPageId) {
      params = appendYakRunnerWorkspaceContextToEvent(yakRunnerPageId, params)
      yakRunnerLastAttachedResourceInfoRef.current = params.AttachedResourceInfo || []
    }

    return new Promise<AISendResProps>((resolve) => {
      resolve({
        params,
      })
    })
  })

  /** 与输入框提交一致：执行中走自由输入，否则开启新会话 */
  const handleSubmitQuery = useMemoizedFn((value: HandleStartParams) => {
    const sessionID = activeChat?.SessionID
    if (execute && sessionID) {
      const { extra, attachedResourceInfo } = getAIReActRequestParams(value)
      const chatMessage: AIInputEvent = {
        IsFreeInput: true,
        FreeInput: value.qs,
        AttachedResourceInfo: attachedResourceInfo,
        FocusModeLoop: value.focusMode ?? focusModeLoop,
      }
      const onSend = (res: AISendResProps) => {
        const { params } = res
        events.onSend({
          token: sessionID,
          type: 'casual',
          params: {
            IsFreeInput: true,
            ...params,
          },
          extraValue: extra,
        })
        emiter.emit('sessionData', JSON.stringify({ type: 'refresh', sessionId: sessionID }))
        aiReActChatRef.current?.setValue('')
      }
      onSendRequest({ params: chatMessage })
        .then(onSend)
        .catch(() => {
          onSend({ params: chatMessage })
        })
      return
    }
    aiReActChatRef.current?.handleStart(value)
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
      handleStart: (value) => {
        setTimeout(() => {
          handleSubmitQuery(value)
        })
      },
    }),
    [activeID, events, onStop, onNewChat, onChatFromHistory, setActiveChat, handleSubmitQuery],
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
        source={source}
      />
    ),
    [inViewport, flushPendingMention, mergeRemoteAIAgentSetting, onSendRequest, onStartRequest, showFreeChat, source],
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
