import { AIAgentSettingDefault } from '../defaultConstant'
import useAIAgentStore from './useStore'
import { isChatSession } from '../utils/isChatSession'

/** 返回展示用的十进制 K tokens；内存中的旧会话参数仍按传输边界的 KB 约定读取。 */
export default function useRuntimeContextSizeLimit(): number {
  const { setting, activeChat } = useAIAgentStore()
  const limit = isChatSession(activeChat)
    ? ((activeChat.StartParams?.RuntimeContextSizeLimit ?? 0) * 1024) / 1000
    : (setting.RuntimeContextSizeLimit ?? 0)
  // 非正数仅在 UI 中解析为默认阈值，不改写请求中“使用服务端默认值”的语义。
  return limit > 0 ? limit : (AIAgentSettingDefault.RuntimeContextSizeLimit ?? 500)
}
