import { AIAgentSettingDefault } from '../defaultConstant'
import useAIAgentStore from './useStore'

/** 返回 UI 使用的 K tokens（1K = 1,000）；已有会话的整数 token 配置不做迁移。 */
export default function useRuntimeContextSizeLimit(): number {
  const { setting, activeChat } = useAIAgentStore()
  const limit = activeChat?.SessionID
    ? (activeChat.StartParams?.RuntimeContextSizeLimit ?? 0) / 1000
    : setting.RuntimeContextSizeLimit ?? 0
  // 非正数仅在 UI 中解析为默认阈值，不改写请求中“使用服务端默认值”的语义。
  return limit > 0 ? limit : AIAgentSettingDefault.RuntimeContextSizeLimit ?? 500
}
