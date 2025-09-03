import {createContext} from "react"
import {AIChatIPCData, AIChatIPCDataEvents} from "../../type/aiChat"
import {defaultChatIPCData} from "../../defaultConstant"
import {cloneDeep} from "lodash"

export interface ChatIPCContextStore {
    chatIPCData: AIChatIPCData
    coordinatorId:string
}

export interface ChatIPCContextDispatcher {
    chatIPCEvents: AIChatIPCDataEvents
}

export interface ChatIPCContextValue {
    store: ChatIPCContextStore
    dispatcher: ChatIPCContextDispatcher
}

export default createContext<ChatIPCContextValue>({
    store: {
        chatIPCData: cloneDeep(defaultChatIPCData),
        coordinatorId:""
    },
    dispatcher: {
        chatIPCEvents: {
            onStart: () => {},
            onSend: () => {},
            onClose: () => {},
            handleReset: () => {},
            fetchToken: () => ""
        }
    }
})
