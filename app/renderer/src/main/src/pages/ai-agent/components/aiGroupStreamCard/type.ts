import { Dispatch, SetStateAction } from 'react'

export interface AIGroupStreamCardHeardProps {
  expand: boolean
  setExpand: Dispatch<SetStateAction<boolean>>
  lastToken: string
  nodeLabel: string
  shouldShowMask: boolean
}

export interface AIGroupStreamCardHeardWrapperProps {
  expand: boolean
  setExpand: Dispatch<SetStateAction<boolean>>
  token: string
}

export interface AIGroupStreamCardListWrapperProps {
  expand: boolean
  token: string
}

export interface AIGroupStreamCardListProps {
  expand: boolean
  childrenTokens: string[]
}
