import { ConcurrentStreamFramePayload } from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'
import { createContext } from 'react'

export interface AIConcurrentStreamStore extends Partial<ConcurrentStreamFramePayload> {
  /** 子窗口刷新版本号，点击刷新按钮自增，驱动子组件重渲染 */
  renderNum?: number
}

export interface AIConcurrentStreamDispatcher {
  requestRefresh: () => void
}

export interface AIConcurrentStreamValue {
  store: AIConcurrentStreamStore
  dispatcher: AIConcurrentStreamDispatcher
}

export default createContext<AIConcurrentStreamValue>({
  store: {
    session: '',
    token: '',
    chatType: 'reAct',
    childrenTokens: [],
    rawData: new Map(),
    renderNum: 0,
  },
  dispatcher: {
    requestRefresh: () => {},
  },
})
