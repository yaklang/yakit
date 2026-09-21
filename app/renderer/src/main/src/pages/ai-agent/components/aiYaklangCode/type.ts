import type { AIOutputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import type { ModalInfoProps } from '../ModelInfo'
import type { ReactNode } from 'react'

export interface AIYaklangCodeProps {
  content: string
  autoApplyStreamId?: string
  listItemIndex?: number
  nodeLabel: string
  modalInfo: ModalInfoProps
  contentType: AIOutputEvent['ContentType']
  referenceNode?: ReactNode
  /** false 表示流式已结束（status === 'end'）或历史消息 */
  streaming?: boolean
}
