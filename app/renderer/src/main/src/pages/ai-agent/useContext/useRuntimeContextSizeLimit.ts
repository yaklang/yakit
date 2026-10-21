import { AIAgentSettingDefault } from '../defaultConstant'
import useAIAgentStore from './useStore'

/** 返回 UI 使用的 KB 值；已有会话使用自己的字节配置，新会话使用全局默认配置。 */
export default function useRuntimeContextSizeLimit(): number {
  const { setting, activeChat } = useAIAgentStore()
  const limit = activeChat?.SessionID
    ? (activeChat.StartParams?.RuntimeContextSizeLimit ?? 0) / 1024
    : (setting.RuntimeContextSizeLimit ?? 0)
  // 非正数仅在 UI 中解析为默认阈值，不改写请求中“使用服务端默认值”的语义。
  return limit > 0 ? limit : (AIAgentSettingDefault.RuntimeContextSizeLimit ?? 300)
}
