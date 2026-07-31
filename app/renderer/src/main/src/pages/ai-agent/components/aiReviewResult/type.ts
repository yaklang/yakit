import type { AIChatQSData, UIToolUseReview } from '@/pages/ai-re-act/hooks/aiRender'
import type { ReactNode } from 'react'
import type { ChatCardProps } from '../ChatCard'
import type { ModalInfoProps } from '../ModelInfo'

export interface AIReviewResultProps {
  info: AIChatQSData
  renderNum: number
  casualLength?: number
  taskLength?: number
}
export interface AISingHaveColorTextProps extends ChatCardProps {
  title: ReactNode
  subTitle: ReactNode
  tip: ReactNode
  modalInfo?: ModalInfoProps
  children?: ReactNode
}

export interface AIReviewParamsProps {
  params?: UIToolUseReview['params']
  isPreStyle?: boolean
  className?: string
}
