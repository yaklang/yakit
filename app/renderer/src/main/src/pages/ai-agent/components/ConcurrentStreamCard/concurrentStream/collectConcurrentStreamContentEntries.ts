import type { ChatDataStore } from '@/pages/ai-agent/store/ChatDataStore'
import type { AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import type { ConcurrentStreamFramePayload } from '../concurrentStreamFrame'

/**
 * @deprecated 不适合新版
 */
export function collectConcurrentStreamContentEntries(
  store: ChatDataStore | undefined,
  frame: ConcurrentStreamFramePayload,
): Map<string, AIChatQSData> {
  const result = new Map<string, AIChatQSData>()
  if (!store) return result

  const { session, token, chatType, childrenTokens } = frame

  /** 收集单个 token 对应的数据 */
  const collectOne = (mapKey: string) => {
    if (result.has(mapKey)) return
    const content = store.getContentMap({ session, chatType, mapKey })
    if (content) {
      result.set(mapKey, content)
    }
  }

  // task 自身
  collectOne(token)

  // childrenTokens 各节点
  for (const childToken of childrenTokens) {
    collectOne(childToken)

    // 如果该节点是 group，收集 group 内所有子节点（通过 parentGroupToken === childToken 关联）
    const chatData = store.get(session)
    if (chatData) {
      const contentsMap = chatType === 'reAct' ? chatData.casualChat.contents : chatData.taskChat.contents
      contentsMap.forEach((value, key) => {
        if (value.parentGroupToken === childToken) {
          collectOne(key)
        }
      })
    }
  }

  return result
}
