import { Dispatch, SetStateAction } from 'react'

export interface AITaskDefaultGroupCardHeardWrapperProps {
  expand: boolean
  token: string
  expandToggle: () => void
}

export interface AITaskDefaultGroupCardListWrapperProps {
  token: string
  setContentFocused: Dispatch<SetStateAction<boolean>>
}
