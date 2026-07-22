import React, { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useCreation, useMemoizedFn, useSafeState } from 'ahooks'
import { cloneDeep } from 'lodash'

import AIAgentContext, {
  AIAgentContextDispatcher,
  AIAgentContextStore,
} from '@/pages/ai-agent/useContext/AIAgentContext'
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
import type { YakitRouteType } from '@/enums/yakitRoute'
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
import {
  normalizeYaklangCodeChangeForReview,
  resetYakRunnerPatchWorkingDraft,
} from '../pages/yakRunner/yakRunnerAiCodePatchApply'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import emiter from '@/utils/eventBus/eventBus'

import { HistroryAIReActChat } from './HistroryAIReActChat'
import { useChatIPC } from '@/pages/ai-re-act/hooks/useChatIPC'
import { useCurrentStore } from '@/pages/ai-re-act/hooks/useCurrentDataBySession'
import { useStore } from 'zustand'
import { globalSessionEngine } from '@/pages/ai-re-act/hooks/ChatMultiSessionController'

export type HistoryAIReActChatExternalParameters = NonNullable<AIReActChatProps['externalParameters']>

export interface HistoryAIReActChatBridge {
  activeID?: string
  // events: UseChatIPCEvents
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
  /** 会话归属路由（不可变） */
  route: YakitRouteType
  /** 会话当前归属 pageId（可变，可 rebind） */
  pageId: string
  focusModeLoop: HistoryAIReActFocusModeLoop
  children: React.ReactNode
  /** Web Fuzzer 页签 id：AI 改包回写、请求附件、fuzz 状态推送等桥接用，与 SessionID 无关 */
  // httpFuzzTabPageId?: string
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

/** TODO -  @whale 修改确认 */
export const HistoryAIReActChatProvider = memo(function HistoryAIReActChatProviderInner({
  source,
  route,
  pageId,
  focusModeLoop,
  children,
  yakRunnerPageId,
  transformInputEvent,
  resolveStartExtraParams,
  mergeRemoteAIAgentSetting,
}: HistoryAIReActChatProviderProps) {
  const aiReActChatRef = useRef<AIReActChatRefProps>(null)
  const [showFreeChat, setShowFreeChat] = useSafeState(false)

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
    if (!pageId) return

    // casual 问答期间：有完整 raw 时不自动写包，入队审阅（`op` 仅占位描述，不作为筛选项）
    if (casualLoadingRef.current) {
      const nextRaw = data?.request?.raw
      if (nextRaw != null && String(nextRaw).trim() !== '' && initialRequestInCasualRef.current != null) {
        enqueueWebFuzzerCasualReplaceReview(pageId, {
          original: initialRequestInCasualRef.current ?? '',
          change: data,
        })
        return
      }
    }

    applyHttpFuzzRequestChangeToWebFuzzerPage(pageId, data)
  })

  const onYaklangCodeChange = useMemoizedFn((data: AIAgentGrpcApi.YaklangCodeChange) => {
    if (!yakRunnerPageId) return

    const editorNow = getYakRunnerPageActiveCodeString(yakRunnerPageId) ?? ''
    const original =
      data.op === 'create'
        ? ''
        : editorNow !== ''
          ? editorNow
          : casualLoadingRef.current && initialCodeInCasualRef.current != null
            ? initialCodeInCasualRef.current
            : ''

    // op=patch：后端只给片段，这里合并成全量 replace，再走原有 diff UI
    const normalized = normalizeYaklangCodeChangeForReview(yakRunnerPageId, data, original)
    if (!normalized) return

    const nextCode = normalized.code?.content
    if (nextCode == null) return
    if (normalized.op === 'create' && String(nextCode).trim() === '') return

    const isCreate = normalized.op === 'create'
    const createFileName = isCreate ? createYakRunnerGeneratedCodeFileName() : undefined
    const createPath = isCreate
      ? resolveYaklangCreateTargetPath(yakRunnerPageId, yakRunnerLastAttachedResourceInfoRef.current, createFileName)
      : undefined
    const change = isCreate
      ? {
          ...normalized,
          code: {
            ...normalized.code,
            path: createPath,
          },
        }
      : normalized

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
    if (!pageId) return
    const runtimeId = data?.runtime_id
    if (!runtimeId) return
    pushAIFuzzStatusRuntimeIdToWebFuzzerPage(pageId, runtimeId, { source: 'auto' })
  })

  const { onStart, onSend, onClose, onUpdatePageId } = useChatIPC(route, pageId)

  const store = useCurrentStore()
  const execute = useStore(store, (state) => state.execute)
  const casualLoading = useStore(store, (state) => state.casualLoading)

  // TODO - @whale 修改确认 useEffect => httpFuzzTabPageId->pageId
  useEffect(() => {
    if (!pageId && !yakRunnerPageId) {
      casualLoadingRef.current = false
      initialRequestInCasualRef.current = null
      initialCodeInCasualRef.current = null
      return
    }

    if (!casualLoadingRef.current && casualLoading) {
      if (pageId) {
        initialRequestInCasualRef.current = getWebFuzzerPageRequestString(pageId) ?? ''
      }
      if (yakRunnerPageId) {
        resetYakRunnerPatchWorkingDraft(yakRunnerPageId)
        initialCodeInCasualRef.current = getYakRunnerPageActiveCodeString(yakRunnerPageId) ?? ''
      }
    } else if (casualLoadingRef.current && !casualLoading) {
      initialRequestInCasualRef.current = null
      initialCodeInCasualRef.current = null
      if (yakRunnerPageId) {
        resetYakRunnerPatchWorkingDraft(yakRunnerPageId)
      }
    }

    casualLoadingRef.current = casualLoading
  }, [casualLoading, pageId, yakRunnerPageId])

  const activeID = useCreation(() => {
    return activeChat?.SessionID
  }, [activeChat])

  const onStartRequest = useMemoizedFn((data: AIHandleStartParams) => {
    const newChat: AIHandleStartExtraProps = resolveStartExtraParams?.(data) ?? {
      chatId: activeChat?.SessionID,
    }

    return new Promise<AIHandleStartResProps>((resolve) => {
      let params: AIInputEvent = { ...data.params, FocusModeLoop: focusModeLoop }
      // TODO - @whale 修改确认 httpFuzzTabPageId->pageId
      if (pageId) {
        const raw = getWebFuzzerPageRequestString(pageId)
        const isHttps = getWebFuzzerPageIsHttps(pageId) ?? false
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
    // events.onDelChats([session])
    globalSessionEngine.forceCloseSession({
      sessionIds: [session],
    })
  })

  /** 新建会话：清空 UI、断开旧连接，并预生成新的 TimelineSessionID */
  const onNewChat = useMemoizedFn(() => {
    const currentID = activeChat?.SessionID
    if (execute && currentID) {
      onClose([currentID])
    }
    // events.onReset()
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
      onClose([activeID])
    }
  })

  const onSendRequest = useMemoizedFn((data: AISendParams) => {
    let params: AIInputEvent = { ...data.params, FocusModeLoop: focusModeLoop }
    // TODO - @whale 修改确认 httpFuzzTabPageId->pageId
    if (pageId) {
      const raw = getWebFuzzerPageRequestString(pageId)
      const isHttps = getWebFuzzerPageIsHttps(pageId) ?? false
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
      const { attachedResourceInfo } = getAIReActRequestParams(value)
      const chatMessage: AIInputEvent = {
        IsFreeInput: true,
        FreeInput: value.qs,
        AttachedResourceInfo: attachedResourceInfo,
        FocusModeLoop: value.focusMode ?? focusModeLoop,
      }
      const onSendChat = (res: AISendResProps) => {
        const { params } = res
        onSend({
          token: sessionID,
          type: 'casual',
          params: {
            IsFreeInput: true,
            ...params,
          },
        })
        emiter.emit('sessionData', JSON.stringify({ type: 'refresh', sessionId: sessionID }))
        aiReActChatRef.current?.setValue('')
      }
      onSendRequest({ params: chatMessage })
        .then(onSendChat)
        .catch(() => {
          onSendChat({ params: chatMessage })
        })
      return
    }
    aiReActChatRef.current?.handleStart(value)
  })

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
      onStart,
      onSend,
      onClose,
      onUpdatePageId,
    }
  }, [])

  const historyAIReActChatBridge: HistoryAIReActChatBridge = useMemo(
    () => ({
      activeID,
      // events,
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
    [activeID, onStop, onNewChat, onChatFromHistory, setActiveChat, handleSubmitQuery],
  )

  const renderHistoryAIReActChat = useCallback(
    ({ className, externalParameters, title }: HistoryAIReActChatSlotOptions) => (
      <HistroryAIReActChat
        className={className}
        title={title}
        showFreeChat={showFreeChat}
        setShowFreeChat={setShowFreeChat}
        aiReActChatRef={aiReActChatRef}
        onStartRequest={onStartRequest}
        onSendRequest={onSendRequest}
        mergeRemoteAIAgentSetting={mergeRemoteAIAgentSetting}
        onChatReady={flushPendingMention}
        externalParameters={externalParameters}
        source={source}
      />
    ),
    [flushPendingMention, mergeRemoteAIAgentSetting, onSendRequest, onStartRequest, showFreeChat, source],
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
      <HistoryAIReActChatContext.Provider value={contextValue}>{children}</HistoryAIReActChatContext.Provider>
    </AIAgentContext.Provider>
  )
})

HistoryAIReActChatProvider.displayName = 'HistoryAIReActChatProvider'
