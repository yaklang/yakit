import { Dispatch, SetStateAction, createContext } from 'react'
import { AIAgentSetting } from '../aiAgentType'
import { AISession } from '../type/aiChat'
import { AIChatIPCStartParams, AIChatSendParams } from '@/pages/ai-re-act/hooks/type'
import { AISource } from '@/pages/ai-re-act/hooks/grpcApi'
import { AIAgentSettingDefault } from '../defaultConstant'

export interface AIAgentContextStore {
  /** 全局配置 */
  setting: AIAgentSetting
  /** 当前展示对话 */
  activeChat?: AISession
}

export interface UseChatIPCStartParams {
  args: AIChatIPCStartParams
  onSuccess?: (sessionId: string) => void
}
export interface AIAgentContextDispatcher {
  setSetting: Dispatch<SetStateAction<AIAgentSetting>>
  getSetting: () => AIAgentSetting
  setActiveChat: Dispatch<SetStateAction<AISession | undefined>>

  /** 开始会话 */
  onStart: (UseChatIPCStartParams) => void
  /** 会话过程中向后端发送消息 */
  onSend: (params: AIChatSendParams) => void
  /** 关闭指定会话 */
  onClose: (sessionId: string[]) => void
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
  },
})
