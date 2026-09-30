import type { ChatStream } from '@/pages/ai-re-act/hooks/aiRender'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

export interface AIGroupStreamCardHeardProps {
  expand: boolean
  setExpand: Dispatch<SetStateAction<boolean>>
  lastItem?: ChatStream
  /** 原始布尔：子流 status 原地改写时 lastItem 引用不变，memo 只能靠此字段感知结束 */
  streaming?: boolean
  nodeId?: string
  nodeLabel: string
  shouldShowMask: boolean
  childrenTokensLength: number
  persistKey?: string
}

export interface AIGroupStreamCardHeardWrapperProps {
  expand: boolean
  setExpand: Dispatch<SetStateAction<boolean>>
  token: string
}

export interface AIGroupStreamCardListWrapperProps {
  expand: boolean
  token: string
  isThought?: boolean
}

export interface AIGroupStreamCardListProps {
  expand: boolean
  childrenTokens: string[]
  rendItem?: (token: string, index: number) => ReactNode
  isThought?: boolean
}
