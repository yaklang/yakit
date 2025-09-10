import {createContext} from "react"
import {defaultChatIPCData} from "../../defaultConstant"
import {cloneDeep} from "lodash"
import {UseChatIPCEvents, UseChatIPCState} from "@/pages/ai-re-act/hooks/type"
import {AIChatReview, AIChatMessage} from "../../type/aiChat"

export interface ChatIPCContextStore {
    chatIPCData: UseChatIPCState
    reviewInfo?: AIChatReview
    planReviewTreeKeywordsMap: Map<string, AIChatMessage.PlanReviewRequireExtra>
}

export interface ChatIPCContextDispatcher {
    chatIPCEvents: UseChatIPCEvents
    handleSendCasual: (value: string, id: string) => void
    handleSendTask: (value: string, id: string) => void
}

export interface ChatIPCContextValue {
    store: ChatIPCContextStore
    dispatcher: ChatIPCContextDispatcher
}

export default createContext<ChatIPCContextValue>({
    store: {
        chatIPCData: cloneDeep(defaultChatIPCData),
        reviewInfo: undefined,
        planReviewTreeKeywordsMap: new Map()
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
        handleSendCasual: (value: string, id: string) => {},
        handleSendTask: (value: string, id: string) => {}
    }
})
