import {Dispatch, SetStateAction, createContext} from "react"
import {AIAgentSetting, RenderMCPClientInfo} from "../aiAgentType"
import {AIChatInfo} from "../type/aiChat"

export interface AIAgentContextStore {
    mcpServers: RenderMCPClientInfo[]
    /** 全局配置 */
    setting: AIAgentSetting
    /** 历史对话 */
    chats: AIChatInfo[]
    /** 当前展示对话 */
    activeChat?: AIChatInfo
    /** ai-triage 建议 forges */
    aiTriageForges: string[]
}

export interface AIAgentContextDispatcher {
    setMCPServers?: Dispatch<SetStateAction<RenderMCPClientInfo[]>>
    getMCPServers?: () => RenderMCPClientInfo[]
    setSetting?: Dispatch<SetStateAction<AIAgentSetting>>
    getSetting?: () => AIAgentSetting
    setChats?: Dispatch<SetStateAction<AIChatInfo[]>>
    getChats?: () => AIChatInfo[]
    setActiveChat?: Dispatch<SetStateAction<AIChatInfo | undefined>>
    // 向 tirage 发送问题信息
    onSendTriage?: (content: string) => void
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
        activeChat: undefined,
        aiTriageForges: []
    },
    dispatcher: {
        setMCPServers: undefined,
        getMCPServers: undefined,
        setSetting: undefined,
        getSetting: undefined,
        setChats: undefined,
        getChats: undefined,
        setActiveChat: undefined,
        onSendTriage: undefined
    }
})
