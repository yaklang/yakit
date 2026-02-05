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
    /** useChatIPC的各种事件 */
    chatIPCEvents: UseChatIPCEvents
    /** 发送自由对话 */
    handleSendCasual: (params: AIChatIPCSendParams) => void
    /** 任务规划 */
    handleSendTask: (params: AIChatIPCSendParams) => void
    /** 开始 */
    // handleStart: (data: HandleStartParams) => void
    /** 停止ai */
    handleStop: () => void
    handleSend: (params: AIChatIPCSendParams) => void
    /**发送 Sync-Type */
    handleSendSyncMessage: (params: AISendSyncMessageParams) => void
    /**发送 Config-Hotpatch */
    handleSendConfigHotpatch: (params: AISendConfigHotpatchParams) => void
}

export interface ChatIPCContextValue {
    store: ChatIPCContextStore
    dispatcher: ChatIPCContextDispatcher
}
export const defaultDispatcherOfChatIPC: ChatIPCContextDispatcher = {
    chatIPCEvents: {
        fetchToken: () => "",
        fetchTaskChatID: () => "",
        onSwitchChat: () => {},
        onStart: () => {},
        onSend: () => {},
        onClose: () => {},
        onReset: () => {},
        handleTaskReviewRelease: () => {},
        fetchChatDataStore: () => undefined
    },
    handleSendCasual: () => {},
    handleSendTask: () => {},
    handleSend: () => {},
    // handleStart: () => {},
    handleStop: () => {},
    handleSendSyncMessage: () => {},
    handleSendConfigHotpatch: () => {}
}
export default createContext<ChatIPCContextValue>({
    store: {
        chatIPCData: cloneDeep(defaultChatIPCData),
        reviewInfo: undefined,
        planReviewTreeKeywordsMap: new Map(),
        reviewExpand: false
    },
    dispatcher: defaultDispatcherOfChatIPC
})
