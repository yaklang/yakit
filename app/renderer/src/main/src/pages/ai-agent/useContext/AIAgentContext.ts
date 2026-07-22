import { Dispatch, SetStateAction, createContext } from 'react'
import { AIAgentSetting } from '../aiAgentType'
import { AISession } from '../type/aiChat'
import { AIChatIPCStartParams, AIChatSendParams } from '@/pages/ai-re-act/hooks/type'
import { AIAgentSettingDefault } from '../defaultConstant'
import { useChatIPC } from '@/pages/ai-re-act/hooks/useChatIPC'

export interface AIAgentContextStore {
  /** 全局配置 */
  setting: AIAgentSetting
  /** 当前展示对话 */
  activeChat?: AISession
}

/** 上层 onStart 入参：route/pageId 由 useChatIPC 注入，调用方无需传递 */
export interface UseChatIPCStartParams extends Omit<AIChatIPCStartParams, 'route' | 'pageId'> {
  onSuccess?: (sessionId: string) => void
}
export interface AIAgentContextDispatcher extends ReturnType<typeof useChatIPC> {
  setSetting: Dispatch<SetStateAction<AIAgentSetting>>
  getSetting: () => AIAgentSetting
  setActiveChat: Dispatch<SetStateAction<AISession | undefined>>
}

export interface AIAgentContextValue {
  store: AIAgentContextStore
  dispatcher: AIAgentContextDispatcher
}

export default createContext<AIAgentContextValue>({
  store: {
    setting: { ...AIAgentSettingDefault },
    activeChat: undefined,
  },
  dispatcher: {
    setSetting: () => {},
    getSetting: () => AIAgentSettingDefault,
    setActiveChat: () => {},

    onStart: () => {},
    onSend: () => {},
    onClose: () => {},
    onUpdatePageId: () => {},
  },
})
