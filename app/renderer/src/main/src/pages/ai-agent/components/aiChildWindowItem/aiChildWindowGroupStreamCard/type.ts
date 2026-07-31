import type { Dispatch, SetStateAction } from 'react'

export interface AIChildWindowGroupStreamCardProps {
  token: string
}

export interface AIChildWindowGroupStreamCardListWrapperProps {
  childItemTokens: string[]
  expand: boolean
}

export interface AIChildWindowGroupStreamCardHeardWrapperProps {
  token: string
  lastToken: string
  childrenTokensLength: number
  expand: boolean
  setExpand: Dispatch<SetStateAction<boolean>>
}
