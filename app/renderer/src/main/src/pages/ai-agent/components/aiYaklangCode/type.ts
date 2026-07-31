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
}
