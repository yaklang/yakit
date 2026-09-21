import type { AIChatQSData, AIYakExecFileRecord, ChatListRenderType } from '@/pages/ai-re-act/hooks/aiRender'
import { type AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'

export interface ConcurrentStreamFramePayload {
  session: string
  token: string
  chatType: ChatListRenderType
  taskName?: string
  /**
   * 根节点类型（token 在 rawData 中的 AIChatQSDataTypeEnum）。
   * 由主窗口开窗/推送时填入，子窗口无需等待 rawData 拉取完成即可据此选择卡片组件，
   * 使懒加载 chunk 与 IPC 拉取并行、骨架屏提前切到 card 变体。
   */
  rootType?: AIChatQSDataTypeEnum
  renderNum?: number
}

export interface FramePayload {
  childrenTokens: string[]
  /** childrenTokens 中各节点 token 对应的原始数据 */
  rawData: Map<string, AIChatQSData>
  execFileRecord: Map<string, AIYakExecFileRecord[]>
}
export function isConcurrentStreamFrame(record: unknown): record is ConcurrentStreamFramePayload {
  if (!record || typeof record !== 'object') return false
  return (
    'session' in record &&
    'token' in record &&
    'chatType' in record &&
    typeof record.session === 'string' &&
    typeof record.token === 'string' &&
    typeof record.chatType === 'string'
  )
}
