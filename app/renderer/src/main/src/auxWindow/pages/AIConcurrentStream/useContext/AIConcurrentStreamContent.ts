import type {
  ConcurrentStreamFramePayload,
  FramePayload,
} from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'
import { createContext } from 'react'

export interface AIConcurrentStreamStore extends ConcurrentStreamFramePayload, FramePayload {
  /**
   * 按 token 粒度的内容版本号：每次拉取时只有内容发生变化的 token 才递增。
   * 子卡片按各自 token 的版本订阅（作为 useCreation/比较依赖），
   * 避免全局 renderNum 一变就全树重渲染（拖动滚动条卡顿的根因）。
   */
  tokenVersions: Map<string, number>
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
    execFileRecord: new Map(),
    tokenVersions: new Map(),
  },
  dispatcher: {
    requestRefresh: () => {},
  },
})
