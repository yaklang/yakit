import React, {createContext, memo, useCallback, useContext, useMemo, useRef} from "react"
import {useCreation, useInViewport, useMemoizedFn, useSafeState} from "ahooks"
import {cloneDeep} from "lodash"

import AIAgentContext, {AIAgentContextDispatcher, AIAgentContextStore} from "@/pages/ai-agent/useContext/AIAgentContext"
import ChatIPCContent, {
    AIChatIPCSendParams,
    AISendConfigHotpatchParams,
    AISendSyncMessageParams,
    ChatIPCContextDispatcher,
    ChatIPCContextStore,
    defaultDispatcherOfChatIPC
} from "@/pages/ai-agent/useContext/ChatIPCContent/ChatIPCContent"
import {AIAgentSetting} from "@/pages/ai-agent/aiAgentType"
import {AIAgentSettingDefault} from "@/pages/ai-agent/defaultConstant"
import {ChatDataStore} from "@/pages/ai-agent/store/ChatDataStore"
import {AIChatInfo} from "@/pages/ai-agent/type/aiChat"
import {
    AIHandleStartExtraProps,
    AIHandleStartParams,
    AIHandleStartResProps,
    AIReActChatProps,
    AIReActChatRefProps,
    AISendParams,
    AISendResProps
} from "@/pages/ai-re-act/aiReActChat/AIReActChatType"
import {AIInputEvent} from "@/pages/ai-re-act/hooks/grpcApi"
import {ChatIPCSendType, UseChatIPCEvents} from "@/pages/ai-re-act/hooks/type"
import useChatIPC from "@/pages/ai-re-act/hooks/useChatIPC"
import useGetSetState from "@/pages/pluginHub/hooks/useGetSetState"

import {HistroryAIReActChat} from "./AIReActChat"

export type HistoryAIReActChatExternalParameters = NonNullable<AIReActChatProps["externalParameters"]>

export interface HistoryAIReActChatBridge {
    activeID?: string
    events: UseChatIPCEvents
    onStop: () => void
    onChatFromHistory: (session: string) => void
    setActiveChat: React.Dispatch<React.SetStateAction<AIChatInfo | undefined>>
}

export interface HistoryAIReActChatSlotOptions {
    externalParameters: HistoryAIReActChatExternalParameters
    className?: string
}

export type HistoryAIReActChatSlotRender = (options: HistoryAIReActChatSlotOptions) => React.ReactNode

export type HistoryAIReActFocusModeLoop = NonNullable<AIInputEvent["FocusModeLoop"]>

export interface HistoryAIReActChatContextValue {
    renderHistoryAIReActChat: HistoryAIReActChatSlotRender
    setShowFreeChat: React.Dispatch<React.SetStateAction<boolean>>
    historyAIReActChatBridge: HistoryAIReActChatBridge
    focusModeLoop: HistoryAIReActFocusModeLoop
}

const HistoryAIReActChatContext = createContext<HistoryAIReActChatContextValue | null>(null)

export function useHistoryAIReActChat(): HistoryAIReActChatContextValue {
    const ctx = useContext(HistoryAIReActChatContext)
    if (!ctx) {
        throw new Error("useHistoryAIReActChat 必须在 HistoryAIReActChatProvider 内使用")
    }
    return ctx
}

export interface HistoryAIReActChatProviderProps {
    cacheDataStore: ChatDataStore
    focusModeLoop: HistoryAIReActFocusModeLoop
    children: React.ReactNode
}

export const HistoryAIReActChatProvider = memo(function HistoryAIReActChatProviderInner({
    cacheDataStore,
    focusModeLoop,
    children
}: HistoryAIReActChatProviderProps) {
    const aiReActChatRef = useRef<AIReActChatRefProps>(null)
    const [showFreeChat, setShowFreeChat] = useSafeState(false)
    const refRef = useRef<HTMLDivElement>(null)

    const [inViewport = true] = useInViewport(refRef)

    const [setting, setSetting, getSetting] = useGetSetState<AIAgentSetting>(cloneDeep(AIAgentSettingDefault))
    const [chats, setChats, getChats] = useGetSetState<AIChatInfo[]>([])
    const [activeChat, setActiveChat] = useSafeState<AIChatInfo>()

    const [chatIPCData, events] = useChatIPC({
        cacheDataStore
    })

    const {execute} = chatIPCData

    const activeID = useCreation(() => {
        return activeChat?.SessionID
    }, [activeChat])

    const handleSendInteractiveMessage = useMemoizedFn((params: AIChatIPCSendParams, type: ChatIPCSendType) => {
        const {value, id, optionValue} = params
        if (!activeID) return
        if (!id) return

        const info: AIInputEvent = {
            IsInteractiveMessage: true,
            InteractiveId: id,
            InteractiveJSONInput: value
        }
        events.onSend({token: activeID, type, params: info, optionValue})
    })

    const handleSendCasual = useMemoizedFn((params: AIChatIPCSendParams) => {
        const targetParams = {...params, FocusModeLoop: focusModeLoop}
        handleSendInteractiveMessage(targetParams, "casual")
    })

    const onStartRequest = useMemoizedFn((data: AIHandleStartParams) => {
        const newChat: AIHandleStartExtraProps = {
            chatId: activeChat?.SessionID
        }

        return new Promise<AIHandleStartResProps>((resolve) => {
            const params = {...data.params, FocusModeLoop: focusModeLoop}
            resolve({
                params,
                extraParams: newChat
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
        const targetParams = {...params, FocusModeLoop: focusModeLoop}
        handleSendInteractiveMessage(targetParams, "")
    })

    const onSendRequest = useMemoizedFn((data: AISendParams) => {
        const params = {...data.params, FocusModeLoop: focusModeLoop}

        return new Promise<AISendResProps>((resolve) => {
            resolve({
                params
            })
        })
    })

    const handleSendSyncMessage = useMemoizedFn((data: AISendSyncMessageParams) => {
        if (!activeID) return
        const {syncType, SyncJsonInput} = data
        const params = {...data.params, FocusModeLoop: focusModeLoop}
        const info: AIInputEvent = {
            IsSyncMessage: true,
            SyncType: syncType,
            SyncJsonInput,
            Params: params
        }
        events.onSend({token: activeID, type: "", params: info})
    })

    const handleSendConfigHotpatch = useMemoizedFn((data: AISendConfigHotpatchParams) => {
        if (!activeID) return
        const {hotpatchType} = data

        const params = {...data.params, FocusModeLoop: focusModeLoop}
        const info: AIInputEvent = {
            IsConfigHotpatch: true,
            HotpatchType: hotpatchType,
            Params: params
        }
        events.onSend({token: activeID, type: "", params: info})
    })

    const store: ChatIPCContextStore = useCreation(() => {
        return {
            chatIPCData,
            planReviewTreeKeywordsMap: new Map(),
            reviewExpand: false
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
            handleSendConfigHotpatch
        }
    }, [events])

    const stores: AIAgentContextStore = useMemo(() => {
        return {
            setting: setting,
            chats: chats,
            activeChat: activeChat
        }
    }, [setting, chats, activeChat])

    const dispatchers: AIAgentContextDispatcher = useMemo(() => {
        return {
            getSetting: getSetting,
            setSetting: setSetting,
            setChats: setChats,
            getChats: getChats,
            setActiveChat: setActiveChat,
            getChatData: cacheDataStore.get
        }
    }, [])

    const historyAIReActChatBridge: HistoryAIReActChatBridge = useMemo(
        () => ({
            activeID,
            events,
            onStop,
            onChatFromHistory,
            setActiveChat
        }),
        [activeID, events, onStop, onChatFromHistory, setActiveChat]
    )

    const renderHistoryAIReActChat = useCallback(
        ({className, externalParameters}: HistoryAIReActChatSlotOptions) => (
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
        [inViewport, onSendRequest, onStartRequest, showFreeChat]
    )

    const contextValue = useMemo(
        (): HistoryAIReActChatContextValue => ({
            renderHistoryAIReActChat,
            setShowFreeChat,
            historyAIReActChatBridge,
            focusModeLoop
        }),
        [renderHistoryAIReActChat, setShowFreeChat, historyAIReActChatBridge, focusModeLoop]
    )

    return (
        <AIAgentContext.Provider value={{store: stores, dispatcher: dispatchers}}>
            <ChatIPCContent.Provider value={{store, dispatcher}}>
                <HistoryAIReActChatContext.Provider value={contextValue}>{children}</HistoryAIReActChatContext.Provider>
            </ChatIPCContent.Provider>
        </AIAgentContext.Provider>
    )
})

HistoryAIReActChatProvider.displayName = "HistoryAIReActChatProvider"
