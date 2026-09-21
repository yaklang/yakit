import type {
  ConcurrentStreamFramePayload,
  FramePayload,
} from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'
import { createContext } from 'react'

export interface AIConcurrentStreamStore extends ConcurrentStreamFramePayload, FramePayload {}

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
  },
  dispatcher: {
    requestRefresh: () => {},
  },
})
