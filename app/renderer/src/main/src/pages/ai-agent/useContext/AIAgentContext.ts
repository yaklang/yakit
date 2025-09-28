import {Dispatch, SetStateAction, createContext} from "react"
import {AIAgentSetting} from "../aiAgentType"
import {AIChatInfo} from "../type/aiChat"

export interface AIAgentContextStore {
    /** 全局配置 */
    setting: AIAgentSetting
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
        setting: {},

        chats: [],
        activeChat: undefined,

        activeAIModel: ""
    },
    dispatcher: {
        setSetting: undefined,
        getSetting: undefined,

        setChats: undefined,
        getChats: undefined,
        setActiveChat: undefined
    }
})
