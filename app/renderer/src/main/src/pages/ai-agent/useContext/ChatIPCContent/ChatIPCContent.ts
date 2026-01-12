import {createContext} from "react"
import {defaultChatIPCData} from "../../defaultConstant"
import {cloneDeep} from "lodash"
import {UseChatIPCEvents, UseChatIPCState} from "@/pages/ai-re-act/hooks/type"
import {AIAgentGrpcApi, AIInputEvent, AIStartParams} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIChatQSData} from "@/pages/ai-re-act/hooks/aiRender"
import {HandleStartParams} from "../../aiAgentChat/type"
import {AIChatMentionSelectItem} from "../../components/aiChatMention/type"

export interface ChatIPCContextStore {
    chatIPCData: UseChatIPCState
    reviewInfo?: AIChatQSData
    planReviewTreeKeywordsMap: Map<string, AIAgentGrpcApi.PlanReviewRequireExtra>
    reviewExpand: boolean
    timelineMessage?: string
}

export interface AIChatIPCSendParams {
    /**InteractiveJSONInput */
    value: string
    id: string
    /**用户审阅过程中选择得btn */
    optionValue?: string
}
type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export interface AISendSyncMessageParams {
    syncType: AIInputEvent["SyncType"]
    SyncJsonInput?: AIInputEvent["SyncJsonInput"]
    params?: MakeOptional<AIStartParams, "UserQuery">
}
export interface AISendConfigHotpatchParams {
    hotpatchType: AIInputEvent["HotpatchType"]
    params: MakeOptional<AIStartParams, "UserQuery">
}
export interface ChatIPCContextDispatcher {
    chatIPCEvents: UseChatIPCEvents
    handleSendCasual: (params: AIChatIPCSendParams) => void
    handleSendTask: (params: AIChatIPCSendParams) => void
    handleStart: (data: HandleStartParams) => void
    handleStop: () => void
    handleSend: (params: AIChatIPCSendParams) => void
    setTimelineMessage: React.Dispatch<React.SetStateAction<string | undefined>>
    handleSendSyncMessage: (params: AISendSyncMessageParams) => void
    handleSendConfigHotpatch: (params: AISendConfigHotpatchParams) => void
}

export interface ChatIPCContextValue {
    store: ChatIPCContextStore
    dispatcher: ChatIPCContextDispatcher
}

export default createContext<ChatIPCContextValue>({
    store: {
        chatIPCData: cloneDeep(defaultChatIPCData),
        reviewInfo: undefined,
        planReviewTreeKeywordsMap: new Map(),
        reviewExpand: false,
        timelineMessage: undefined
    },
    dispatcher: {
        chatIPCEvents: {
            fetchToken: () => "",
            fetchTaskChatID: () => "",
            onStart: () => {},
            onSend: () => {},
            onClose: () => {},
            onReset: () => {},
            handleTaskReviewRelease: () => {},
            getChatContentMap: () => undefined
        },
        handleSendCasual: () => {},
        handleSendTask: () => {},
        handleSend: () => {},
        handleStart: () => {},
        handleStop: () => {},
        setTimelineMessage: () => {},
        handleSendSyncMessage: () => {},
        handleSendConfigHotpatch: () => {}
    }
})
