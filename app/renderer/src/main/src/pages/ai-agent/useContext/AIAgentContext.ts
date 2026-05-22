import { Dispatch, SetStateAction, createContext } from 'react'
import { AIAgentSetting } from '../aiAgentType'
import { AIChatData, AISession } from '../type/aiChat'

export interface AIAgentContextStore {
  /** 全局配置 */
  setting: AIAgentSetting
  /** 历史对话 */
  chats: AISession[]
  /** 当前展示对话 */
  activeChat?: AISession
}

export interface AIAgentContextDispatcher {
  setSetting?: Dispatch<SetStateAction<AIAgentSetting>>
  getSetting?: () => AIAgentSetting
  setChats?: Dispatch<SetStateAction<AISession[]>>
  getChats?: () => AISession[]
  setActiveChat?: Dispatch<SetStateAction<AISession | undefined>>
  loadHistoryData?: (session?: string) => Promise<number>
  // getChatData?: (session: string) => AIChatData | undefined
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
  },
  dispatcher: {
    setSetting: undefined,
    getSetting: undefined,

    setChats: undefined,
    getChats: undefined,
    setActiveChat: undefined,
  },
})
