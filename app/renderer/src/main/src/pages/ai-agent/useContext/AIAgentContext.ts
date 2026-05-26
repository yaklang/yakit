import { Dispatch, SetStateAction, createContext } from 'react'
import { AIAgentSetting } from '../aiAgentType'
import { AISession } from '../type/aiChat'

export interface AIAgentContextStore {
  /** 全局配置 */
  setting: AIAgentSetting
  /** 当前展示对话 */
  activeChat?: AISession
}

export interface AIAgentContextDispatcher {
  setSetting?: Dispatch<SetStateAction<AIAgentSetting>>
  getSetting?: () => AIAgentSetting
  setActiveChat?: Dispatch<SetStateAction<AISession | undefined>>
}

export interface AIAgentContextValue {
  store: AIAgentContextStore
  dispatcher: AIAgentContextDispatcher
}

export default createContext<AIAgentContextValue>({
  store: {
    setting: {},
    activeChat: undefined,
  },
  dispatcher: {
    setSetting: undefined,
    getSetting: undefined,

    setActiveChat: undefined,
  },
})
