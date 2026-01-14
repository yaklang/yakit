import {Dispatch, SetStateAction, createContext} from "react"
import {AIAgentSetting} from "../aiAgentType"
import {AIChatData, AIChatInfo} from "../type/aiChat"

export interface AIAgentContextStore {
    /** 全局配置 */
    setting: AIAgentSetting
    /** 历史对话 */
    chats: AIChatInfo[]
    /** 当前展示对话 */
    activeChat?: AIChatInfo
}

export interface AIAgentContextDispatcher {
    setSetting?: Dispatch<SetStateAction<AIAgentSetting>>
    getSetting?: () => AIAgentSetting
    setChats?: Dispatch<SetStateAction<AIChatInfo[]>>
    getChats?: () => AIChatInfo[]
    setActiveChat?: Dispatch<SetStateAction<AIChatInfo | undefined>>

    getChatData?: (session: string) => AIChatData | undefined
    setChatData?: (session: string, data: AIChatData) => void
    removeChatData?: (session: string) => void
    clearChatData?: () => void
}

export interface AIAgentContextValue {
    store: AIAgentContextStore
    dispatcher: AIAgentContextDispatcher
}

export default createContext<AIAgentContextValue>({
    store: {
        setting: {},
        chats: [],
        activeChat: undefined
    },
    dispatcher: {
        setSetting: undefined,
        getSetting: undefined,

        setChats: undefined,
        getChats: undefined,
        setActiveChat: undefined
    }
})
