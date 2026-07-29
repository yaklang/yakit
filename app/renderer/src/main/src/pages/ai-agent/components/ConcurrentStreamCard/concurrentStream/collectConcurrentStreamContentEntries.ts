import type { ChatDataStore } from '@/pages/ai-agent/store/ChatDataStore'
import type { AIChatQSData, ReActChatTaskElementSub } from '@/pages/ai-re-act/hooks/aiRender'
import type { ConcurrentStreamFramePayload } from '../concurrentStreamFrame'

/** 从主窗 store 收集并发任务卡片所需的 content 条目 */
export function collectConcurrentStreamContentEntries(
  store: ChatDataStore | undefined,
  frame: ConcurrentStreamFramePayload,
): Array<[string, AIChatQSData]> {
  if (!store) return []

  const { session, token, chatType, elements } = frame
  const contentEntries: Array<[string, AIChatQSData]> = []

  const rootContent = store.getContentMap({ session, chatType, mapKey: token })
  if (rootContent) {
    contentEntries.push([token, rootContent])
  }

  const collect = (items: ReActChatTaskElementSub[]) => {
    items.forEach((item) => {
      const content = store.getContentMap({
        session,
        chatType: item.chatType,
        mapKey: item.token,
      })
      if (content) {
        contentEntries.push([item.token, content])
      }
      if (item.kind === 'group') {
        collect(item.children)
      }
    })
  }

  collect(elements)
  return contentEntries
}
