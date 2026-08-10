import type { Dispatch, SetStateAction } from 'react'
import type { AIInputEvent } from '../hooks/grpcApi'

export interface AIFocusModeProps {
  value: AIInputEvent['FocusModeLoop']
  onChange: Dispatch<SetStateAction<AIInputEvent['FocusModeLoop']>>
  className?: string
  disabled?: boolean
}
