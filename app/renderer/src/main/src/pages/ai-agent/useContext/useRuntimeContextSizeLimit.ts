import { AIAgentSettingDefault } from '../defaultConstant'
import useAIAgentStore from './useStore'

/** 返回 UI 使用的 KB 值；已有会话使用自己的字节配置，新会话使用全局默认配置。 */
export default function useRuntimeContextSizeLimit(): number {
  const { setting, activeChat } = useAIAgentStore()
  if (activeChat?.SessionID) {
    // 旧会话缺少字段时由后端恢复配置，前端不以当前全局默认值猜测上限。
    return (activeChat.StartParams?.RuntimeContextSizeLimit ?? 0) / 1024
  }
  return setting.RuntimeContextSizeLimit ?? AIAgentSettingDefault.RuntimeContextSizeLimit ?? 300
}
