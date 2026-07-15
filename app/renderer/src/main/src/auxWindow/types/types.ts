import { ConcurrentStreamFramePayload } from '@/pages/ai-agent/components/ConcurrentStreamCard/concurrentStreamFrame'

export interface AuxWindowCreateOptions {
  route: string
  payload?: ConcurrentStreamFramePayload
  singletonKey?: string
  title?: string
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  titleBarStyle?: 'default' | 'hidden'
  /** 是否开启开发者工具，默认 false */
  openDevTools?: boolean
}

export interface AuxWindowInitPayload {
  windowId: string
  route: string
  title?: string
  payload: ConcurrentStreamFramePayload
}

export interface AuxWindowPushPayload {
  windowId: string
  route: string
  payload: ConcurrentStreamFramePayload
}

declare global {
  type AuxWindowInitPayload = import('@/auxWindow/types/types').AuxWindowInitPayload
  type AuxWindowPushPayload = import('@/auxWindow/types/types').AuxWindowPushPayload
}

export {}
