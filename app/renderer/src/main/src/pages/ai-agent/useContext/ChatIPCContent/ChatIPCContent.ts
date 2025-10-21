import {createContext} from "react"
import {defaultChatIPCData} from "../../defaultConstant"
import {cloneDeep} from "lodash"
import {UseChatIPCEvents, UseChatIPCState} from "@/pages/ai-re-act/hooks/type"
import {AIAgentGrpcApi} from "@/pages/ai-re-act/hooks/grpcApi"
import {AIChatQSData} from "@/pages/ai-re-act/hooks/aiRender"

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
export interface ChatIPCContextDispatcher {
    chatIPCEvents: UseChatIPCEvents
    handleSendCasual: (params: AIChatIPCSendParams) => void
    handleSendTask: (params: AIChatIPCSendParams) => void
    handleStart: (qs: string) => void
    handleStop: () => void
    handleSend: (params: AIChatIPCSendParams) => void
    setTimelineMessage: React.Dispatch<React.SetStateAction<string | undefined>>
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
            fetchRequest: () => undefined,
            onStart: () => {},
            onSend: () => {},
            onClose: () => {},
            onReset: () => {}
        },
        handleSendCasual: () => {},
        handleSendTask: () => {},
        handleSend: () => {},
        handleStart: () => {},
        handleStop: () => {},
        setTimelineMessage: () => {}
    }
})
