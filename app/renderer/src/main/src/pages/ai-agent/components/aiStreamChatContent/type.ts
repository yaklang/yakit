import type { AIOutputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import type { ReactNode } from 'react'

export interface AIStreamChatContentProps {
  content: string
  nodeId?: string
  nodeIdVerbose: AIOutputEvent['NodeIdVerbose']
  referenceNode?: ReactNode
  streaming?: boolean
  /** 列表项 token，思考折叠态写入 chatStore.uiExpandMap */
  token?: string
}
