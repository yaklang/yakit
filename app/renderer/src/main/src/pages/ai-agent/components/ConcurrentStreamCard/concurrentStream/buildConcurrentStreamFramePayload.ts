import {
  AIChatQSDataTypeEnum,
  type AIYakExecFileRecord,
  type ChatStoreState,
  type AIChatQSData,
} from '@/pages/ai-re-act/hooks/aiRender'
import { type AIItemKind, getAIItemKind } from '@/pages/ai-re-act/hooks/useAIItemKind'
import i18n from '@/i18n/i18n'
import type { FramePayload } from '../concurrentStreamFrame'

/** store 的最小依赖接口 */
interface BuildFrameStore {
  getState: () => ChatStoreState
}

interface BuildFrameRawData {
  contents: Map<string, AIChatQSData>
}

export interface BuildConcurrentStreamFramePayloadParams {
  token: string
  session: string
  chatType?: string
  store: BuildFrameStore
  rawData: BuildFrameRawData | null | undefined
  /**
   * 是否在返回的 frame 中填充 rawData（task 自身 + children + group 孙节点）。
   * - true（默认）：用于需要立即拿到全部 rawData 的场景。
   * - false：仅返回元数据（rawData 为空 Map），用于打开子窗口时只发轻量 payload，
   *   子窗 mount 后再通过 fetch-concurrent-stream-contents 拉取，避免开窗瞬间克隆大 Map。
   */
  withRawData: boolean
}

/** 判断 childToken 在 store 中的类型 */
function getKind(store: BuildFrameStore, childToken: string): AIItemKind | null {
  const state = store.getState()
  return getAIItemKind(state, childToken)
}

const tOriginal = i18n.getFixedT(null, 'aiAgent')
/** 获取 task 节点的名称 */
export function getTaskName(rawData: BuildFrameRawData | null | undefined, token: string): string {
  const itemData = rawData?.contents.get(token)
  if (!itemData) return ''
  switch (itemData.type) {
    case AIChatQSDataTypeEnum.TASK_DEFAULT_GROUP:
      return tOriginal('ConcurrentStreamCard.systemInfo')
    case AIChatQSDataTypeEnum.TASK_NODE_GROUP:
      return itemData.data?.taskName ?? ''
    default:
      return ''
  }
}

/**
 * 从主窗口 store + rawData 构建 ConcurrentStreamFramePayload。
 * 收集 task 自身、所有 childrenTokens 节点、group 内子节点的原始数据，
 */
export function buildConcurrentStreamFramePayload(
  params: BuildConcurrentStreamFramePayloadParams,
): FramePayload | null {
  const { token, chatType, store, rawData, withRawData = true } = params
  if (!chatType || !rawData) return null

  const frameRawData = new Map<string, AIChatQSData>()
  const execFileRecord = new Map<string, AIYakExecFileRecord[]>()
  const state = store.getState()
  let childrenTokens: string[] = []

  const handFileRecord = (record) => {
    switch (record.type) {
      case AIChatQSDataTypeEnum.TOOL_RESULT: {
        const fileRecord = state.execFileRecord.get(record.data.callToolId)
        if (fileRecord) execFileRecord.set(record.data.callToolId, fileRecord)
        break
      }
      default:
        break
    }
  }
  if (withRawData) {
    // task 自身数据
    const taskData = rawData.contents.get(token)
    if (taskData) frameRawData.set(token, taskData)
    const tokens = state.tasks[token]?.childrenTokens
    // 遍历所有子节点
    for (const childToken of tokens) {
      const kind = getKind(store, childToken)
      if (!kind) continue
      const childData = rawData.contents.get(childToken)
      if (!childData) continue
      frameRawData.set(childToken, childData)

      if (kind === 'item') {
        handFileRecord(childData)
      }
      // group 下的所有子节点数据
      if (kind === 'group') {
        const groupData = state.groups[childToken]
        for (const grandChildToken of groupData?.childrenTokens || []) {
          const grandChildData = rawData.contents.get(grandChildToken)
          if (!grandChildData) continue
          frameRawData.set(grandChildToken, grandChildData)
          handFileRecord(grandChildData)
        }
      }
    }
    childrenTokens = state.tasks[token]?.childrenTokens || []
  }

  return {
    // session,
    // token,
    // chatType: chatType as OpenAIConcurrentStreamPayload['chatType'],
    childrenTokens: [...childrenTokens],
    rawData: frameRawData,
    execFileRecord: execFileRecord,
    // taskName: getTaskName(rawData, token),
  }
}
