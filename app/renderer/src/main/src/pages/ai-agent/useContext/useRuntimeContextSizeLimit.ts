import { AIAgentSettingDefault } from '../defaultConstant'
import useAIAgentStore from './useStore'

/** UI 使用 KB；已有会话以自己的字节参数为准，不用新会话默认值覆盖。 */
export default function useRuntimeContextSizeLimit(): number {
  const { setting, activeChat } = useAIAgentStore()
  const limit = activeChat?.SessionID
    ? Number(activeChat.StartParams?.RuntimeContextSizeLimit ?? 0) / 1024
    : Number(setting.RuntimeContextSizeLimit ?? 0)
  // 0 仅展示参考默认值；打开或失焦不应把“引擎默认”改写为显式值。
  return Number.isFinite(limit) && limit > 0 ? limit : (AIAgentSettingDefault.RuntimeContextSizeLimit ?? 300)
}
