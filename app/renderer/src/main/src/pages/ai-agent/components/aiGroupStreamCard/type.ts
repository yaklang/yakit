import type { ChatStream } from '@/pages/ai-re-act/hooks/aiRender'
import type { Dispatch, ReactNode, SetStateAction } from 'react'

export interface AIGroupStreamCardHeardProps {
  expand: boolean
  setExpand: Dispatch<SetStateAction<boolean>>
  lastItem?: ChatStream
  nodeLabel: string
  shouldShowMask: boolean
  childrenTokensLength: number
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
