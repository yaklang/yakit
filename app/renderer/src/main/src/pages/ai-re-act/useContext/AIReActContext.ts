import {createContext, Dispatch, SetStateAction} from "react"
import {AIReActSetting} from "../aiReActType"
import {AIReActChatMessage} from "@/pages/ai-agent/type/aiChat"

export interface AIReActContextStore {
    setting: AIReActSetting
    chats: AIReActChatMessage.AIReActChatItem[]
    activeChat?: AIReActChatMessage.AIReActChatItem
}

export interface AIReActContextDispatcher {
    getSetting: () => AIReActSetting
    setSetting: Dispatch<SetStateAction<AIReActSetting>>
    setChats: Dispatch<SetStateAction<AIReActChatMessage.AIReActChatItem[]>>
    getChats: () => AIReActChatMessage.AIReActChatItem[]
    setActiveChat: Dispatch<SetStateAction<AIReActChatMessage.AIReActChatItem | undefined>>
}

export interface AIReActContextProps {
    store: AIReActContextStore
    dispatcher: AIReActContextDispatcher
}

const AIReActContext = createContext<AIReActContextProps>({} as AIReActContextProps)

export default AIReActContext
