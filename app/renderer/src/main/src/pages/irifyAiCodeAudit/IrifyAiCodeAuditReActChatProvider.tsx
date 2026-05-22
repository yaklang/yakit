import React, {
  createContext,
  memo,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { useCreation, useInViewport, useMemoizedFn, useSafeState } from 'ahooks'
import { cloneDeep } from 'lodash'

import { HistroryAIReActChat } from '@/components/historyAIReActChat'
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
import { AIAgentSettingDefault } from '@/pages/ai-agent/defaultConstant'
import { ChatDataStore } from '@/pages/ai-agent/store/ChatDataStore'
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
import { AIInputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import { ChatIPCSendType, UseChatIPCEvents } from '@/pages/ai-re-act/hooks/type'
import useChatIPC from '@/pages/ai-re-act/hooks/useChatIPC'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import emiter from '@/utils/eventBus/eventBus'
import { appendCodeAuditTargetAttachmentToEvent } from './codeAuditAttachment'
import { IrifyWorkbenchAiAttachProvider, IrifyWorkbenchAiAttachRef } from './IrifyWorkbenchAiAttachContext'

export type IrifyAiCodeAuditReActChatExternalParameters = NonNullable<AIReActChatProps['externalParameters']>

export interface IrifyAiCodeAuditReActChatBridge {
  activeID?: string
  events: UseChatIPCEvents
  onStop: () => void
  onChatFromHistory: (session: string) => void
  setActiveChat: React.Dispatch<React.SetStateAction<AISession | undefined>>
}

export interface IrifyAiCodeAuditReActChatSlotOptions {
  externalParameters: IrifyAiCodeAuditReActChatExternalParameters
  className?: string
}

export type IrifyAiCodeAuditReActChatSlotRender = (options: IrifyAiCodeAuditReActChatSlotOptions) => React.ReactNode

export type IrifyAiCodeAuditFocusModeLoop = NonNullable<AIInputEvent['FocusModeLoop']>

export interface IrifyAiCodeAuditReActChatContextValue {
  renderIrifyAiReActChat: IrifyAiCodeAuditReActChatSlotRender
  setShowFreeChat: React.Dispatch<React.SetStateAction<boolean>>
  irifyAiReActChatBridge: IrifyAiCodeAuditReActChatBridge
  focusModeLoop: IrifyAiCodeAuditFocusModeLoop
}

const IrifyAiCodeAuditReActChatContext = createContext<IrifyAiCodeAuditReActChatContextValue | null>(null)

export function useIrifyAiCodeAuditReActChat(): IrifyAiCodeAuditReActChatContextValue {
  const ctx = useContext(IrifyAiCodeAuditReActChatContext)
  if (!ctx) {
    throw new Error('useIrifyAiCodeAuditReActChat 必须在 IrifyAiCodeAuditReActChatProvider 内使用')
  }
  return ctx
}

export interface IrifyAiCodeAuditReActChatProviderProps {
  cacheDataStore: ChatDataStore
  focusModeLoop: IrifyAiCodeAuditFocusModeLoop
}

type InnerProps = PropsWithChildren<IrifyAiCodeAuditReActChatProviderProps> & {
  attachRef: React.MutableRefObject<IrifyWorkbenchAiAttachRef>
}

const IrifyAiCodeAuditReActChatProviderInner = memo(function IrifyAiCodeAuditReActChatProviderInner({
  cacheDataStore,
  focusModeLoop,
  children,
  attachRef,
}: InnerProps) {
  const aiReActChatRef = useRef<AIReActChatRefProps>(null)
  const [showFreeChat, setShowFreeChat] = useSafeState(false)
  const refRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onSeed = (text: string) => {
      const apply = () => aiReActChatRef.current?.setValue(text)
      apply()
      window.setTimeout(apply, 50)
      window.setTimeout(apply, 200)
    }
    emiter.on('onIrifyAiCodeAuditSeedChatDraft', onSeed)
    return () => {
      emiter.off('onIrifyAiCodeAuditSeedChatDraft', onSeed)
    }
  }, [])

  const [inViewport = true] = useInViewport(refRef)

  const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>(cloneDeep(AIAgentSettingDefault))
  const [chats, setChats, getChats] = useGetSetState<AISession[]>([])
  const [activeChat, setActiveChat] = useSafeState<AISession>()

  const [chatIPCData, events] = useChatIPC({
    cacheDataStore,
  })

  const { execute } = chatIPCData

  const activeID = useCreation(() => {
    return activeChat?.SessionID
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
    const newChat: AIHandleStartExtraProps = {
      chatId: activeChat?.SessionID,
    }

    return new Promise<AIHandleStartResProps>((resolve) => {
      let params: AIInputEvent = { ...data.params, FocusModeLoop: focusModeLoop }
      params = appendCodeAuditTargetAttachmentToEvent(params, attachRef.current.projectRootAbsPath)
      resolve({
        params,
        extraParams: newChat,
      })
    })
  })

  const onChatFromHistory = useMemoizedFn((session: string) => {
    events.onDelChats([session])
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
    params = appendCodeAuditTargetAttachmentToEvent(params, attachRef.current.projectRootAbsPath)

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
      chats: chats,
      activeChat: activeChat,
    }
  }, [setting, chats, activeChat])

  const dispatchers: AIAgentContextDispatcher = useMemo(() => {
    return {
      getSetting: getSetting,
      setSetting: setSetting,
      setChats: setChats,
      getChats: getChats,
      setActiveChat: setActiveChat,
      getChatData: cacheDataStore.get,
    }
  }, [])

  const irifyAiReActChatBridge: IrifyAiCodeAuditReActChatBridge = useMemo(
    () => ({
      activeID,
      events,
      onStop,
      onChatFromHistory,
      setActiveChat,
    }),
    [activeID, events, onStop, onChatFromHistory, setActiveChat],
  )

  const renderIrifyAiReActChat = useCallback(
    ({ className, externalParameters }: IrifyAiCodeAuditReActChatSlotOptions) => (
      <HistroryAIReActChat
        className={className}
        refRef={refRef}
        showFreeChat={showFreeChat}
        setShowFreeChat={setShowFreeChat}
        aiReActChatRef={aiReActChatRef}
        onStartRequest={onStartRequest}
        onSendRequest={onSendRequest}
        inViewport={inViewport}
        setSetting={setSetting}
        externalParameters={externalParameters}
      />
    ),
    [inViewport, onSendRequest, onStartRequest, showFreeChat],
  )

  const contextValue = useMemo(
    (): IrifyAiCodeAuditReActChatContextValue => ({
      renderIrifyAiReActChat,
      setShowFreeChat,
      irifyAiReActChatBridge,
      focusModeLoop,
    }),
    [renderIrifyAiReActChat, setShowFreeChat, irifyAiReActChatBridge, focusModeLoop],
  )

  return (
    <AIAgentContext.Provider value={{ store: stores, dispatcher: dispatchers }}>
      <ChatIPCContent.Provider value={{ store, dispatcher }}>
        <IrifyAiCodeAuditReActChatContext.Provider value={contextValue}>
          {children}
        </IrifyAiCodeAuditReActChatContext.Provider>
      </ChatIPCContent.Provider>
    </AIAgentContext.Provider>
  )
})

IrifyAiCodeAuditReActChatProviderInner.displayName = 'IrifyAiCodeAuditReActChatProviderInner'

export const IrifyAiCodeAuditReActChatProvider: React.FC<PropsWithChildren<IrifyAiCodeAuditReActChatProviderProps>> = ({
  children,
  ...props
}) => {
  const attachRef = useRef<IrifyWorkbenchAiAttachRef>({})
  return (
    <IrifyWorkbenchAiAttachProvider attachRef={attachRef}>
      <IrifyAiCodeAuditReActChatProviderInner {...props} attachRef={attachRef}>
        {children}
      </IrifyAiCodeAuditReActChatProviderInner>
    </IrifyWorkbenchAiAttachProvider>
  )
}
