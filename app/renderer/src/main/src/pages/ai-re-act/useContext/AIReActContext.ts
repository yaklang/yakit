import {createContext} from "react"
import {AIReActSetting} from "../aiReActType"
import {AIChatInfo} from "../../ai-agent/type/aiChat"
import useGetSetState from "../../pluginHub/hooks/useGetSetState"

export interface AIReActContextStore {
    setting: AIReActSetting
    chats: AIChatInfo[]
    activeChat?: AIChatInfo
}

export interface AIReActContextDispatcher {
    getSetting: () => AIReActSetting
    setSetting: (setting: AIReActSetting) => void
    setChats: (chats: AIChatInfo[]) => void
    getChats: () => AIChatInfo[]
    setActiveChat: (chat?: AIChatInfo) => void
}

export interface AIReActContextProps {
    store: AIReActContextStore
    dispatcher: AIReActContextDispatcher
}

const AIReActContext = createContext<AIReActContextProps>({} as AIReActContextProps)

export default AIReActContext
