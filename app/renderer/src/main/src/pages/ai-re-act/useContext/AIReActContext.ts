import {createContext, Dispatch, SetStateAction} from "react"
import {AIReActSetting} from "../aiReActType"
import {AIChatInfo} from "@/pages/ai-agent/type/aiChat"

export interface AIReActContextStore {
    setting: AIReActSetting
    chats: AIChatInfo[]
    activeChat?: AIChatInfo
}

export interface AIReActContextDispatcher {
    getSetting: () => AIReActSetting
    setSetting: Dispatch<SetStateAction<AIReActSetting>>
    setChats: Dispatch<SetStateAction<AIChatInfo[]>>
    getChats: () => AIChatInfo[]
    setActiveChat: Dispatch<SetStateAction<AIChatInfo | undefined>>
}

export interface AIReActContextProps {
    store: AIReActContextStore
    dispatcher: AIReActContextDispatcher
}

const AIReActContext = createContext<AIReActContextProps>({} as AIReActContextProps)

export default AIReActContext
