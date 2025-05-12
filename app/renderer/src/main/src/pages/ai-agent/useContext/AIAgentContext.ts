import {Dispatch, SetStateAction, createContext} from "react"
import {AIAgentSetting, RenderMCPClientInfo} from "../aiAgentType"
import {AIChatInfo} from "../type/aiChat"

export interface AIAgentContextStore {
    mcpServers: RenderMCPClientInfo[]
    setting: AIAgentSetting
    chats: AIChatInfo[]
    activeChat?: AIChatInfo
}

export interface AIAgentContextDispatcher {
    setMCPServers?: Dispatch<SetStateAction<RenderMCPClientInfo[]>>
    getMCPServers?: () => RenderMCPClientInfo[]
    setSetting?: Dispatch<SetStateAction<AIAgentSetting>>
    getSetting?: () => AIAgentSetting
    setChats?: Dispatch<SetStateAction<AIChatInfo[]>>
    getChats?: () => AIChatInfo[]
    setActiveChat?: Dispatch<SetStateAction<AIChatInfo | undefined>>
}

export interface AIAgentContextValue {
    store: AIAgentContextStore
    dispatcher: AIAgentContextDispatcher
}

export default createContext<AIAgentContextValue>({
    store: {
        mcpServers: [],
        setting: {},
        chats: [],
        activeChat: undefined
    },
    dispatcher: {
        setMCPServers: undefined,
        getMCPServers: undefined,
        setSetting: undefined,
        getSetting: undefined,
        setChats: undefined,
        getChats: undefined,
        setActiveChat: undefined
    }
})
