import type { OpenAIConcurrentStreamPayload } from '@/utils/openWebsite'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'

/** store 的最小依赖接口 */
interface BuildFrameStore {
  getState: () => {
    tasks: Record<string, { childrenTokens?: string[] } | undefined>
    items: Record<string, unknown>
    groups: Record<string, { childrenTokens?: string[]; type?: string } | undefined>
  }
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
}

/** 判断 childToken 在 store 中的类型 */
function getKind(store: BuildFrameStore, childToken: string): 'item' | 'group' | null {
  const state = store.getState()
  if (state.items[childToken]) return 'item'
  if (state.groups[childToken]) return 'group'
  return null
}

/** 获取 task 节点的名称 */
function getTaskName(rawData: BuildFrameRawData | null | undefined, token: string): string {
  const itemData = rawData?.contents.get(token)
  if (!itemData) return ''
  switch (itemData.type) {
    case AIChatQSDataTypeEnum.TASK_NODE_GROUP:
      return itemData.data?.taskName ?? ''
    default:
      return ''
  }
}

/**
 * 从主窗口 store + rawData 构建 ConcurrentStreamFramePayload。
 * 收集 task 自身、所有 childrenTokens 节点、group 内子节点的原始数据，
 * 逻辑由 openChildWindow 与 useConcurrentStreamRefreshListener 共用。
 */
export function buildConcurrentStreamFramePayload(
  params: BuildConcurrentStreamFramePayloadParams,
): OpenAIConcurrentStreamPayload | null {
  const { token, session, chatType, store, rawData } = params
  if (!chatType || !rawData) return null

  const frameRawData = new Map<string, AIChatQSData>()
  const state = store.getState()
  const childrenTokens = state.tasks[token]?.childrenTokens || []

  // task 自身数据
  const taskData = rawData.contents.get(token)
  if (taskData) frameRawData.set(token, taskData)

  // 遍历所有子节点
  for (const childToken of childrenTokens) {
    const kind = getKind(store, childToken)
    if (!kind) continue
    const childData = rawData.contents.get(childToken)
    if (!childData) continue
    frameRawData.set(childToken, childData)

    // group 下的所有子节点数据
    if (kind === 'group') {
      const groupData = state.groups[childToken]
      for (const grandChildToken of groupData?.childrenTokens || []) {
        const grandChildData = rawData.contents.get(grandChildToken)
        if (!grandChildData) continue
        frameRawData.set(grandChildToken, grandChildData)
      }
    }
  }

  return {
    session,
    token,
    chatType: chatType as OpenAIConcurrentStreamPayload['chatType'],
    childrenTokens,
    rawData: frameRawData,
    taskName: getTaskName(rawData, token),
  }
}
