import {Dispatch, SetStateAction, createContext} from "react"
import {AIAgentSetting} from "../aiAgentType"
import {AIChatInfo} from "../type/aiChat"
import {AITriageChatData} from "../aiTriageChat/type"

export interface AIAgentContextStore {
    /** 全局配置 */
    setting: AIAgentSetting
    /** 当前连接中的 triage 对话集合 */
    triages: AITriageChatData[]
    /** 当前展示的 triage 对话 */
    activeTriage?: AITriageChatData
    /** 历史对话 */
    chats: AIChatInfo[]
    /** 当前展示对话 */
    activeChat?: AIChatInfo
    /**当前会话选择的 ai 模型 */
    activeAIModel?: string
}

export interface AIAgentContextDispatcher {
    setSetting?: Dispatch<SetStateAction<AIAgentSetting>>
    getSetting?: () => AIAgentSetting
    setTriages?: Dispatch<SetStateAction<AITriageChatData[]>>
    getTriages?: () => AITriageChatData[]
    setActiveTriage?: Dispatch<SetStateAction<AITriageChatData | undefined>>
    setChats?: Dispatch<SetStateAction<AIChatInfo[]>>
    getChats?: () => AIChatInfo[]
    setActiveChat?: Dispatch<SetStateAction<AIChatInfo | undefined>>

    getAIActiveAIModel: () => string
    setAIActiveAIModel: Dispatch<SetStateAction<string>>
}

export interface AIAgentContextValue {
    store: AIAgentContextStore
    dispatcher: AIAgentContextDispatcher
}

export default createContext<AIAgentContextValue>({
    store: {
        setting: {},

        triages: [],
        activeTriage: undefined,

        chats: [],
        activeChat: undefined,

        activeAIModel: ""
    },
    dispatcher: {
        setSetting: undefined,
        getSetting: undefined,

        setTriages: undefined,
        getTriages: undefined,
        setActiveTriage: undefined,

        setChats: undefined,
        getChats: undefined,
        setActiveChat: undefined,

        getAIActiveAIModel: () => "",
        setAIActiveAIModel: () => {}
    }
})
