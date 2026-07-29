import { type FC, memo } from 'react'
import { AIYaklangCode } from '../aiYaklangCode/AIYaklangCode'
import type { AIOutputEvent } from '@/pages/ai-re-act/hooks/grpcApi'
import useAINodeLabel from '@/pages/ai-re-act/hooks/useAINodeLabel'
import type { ModalInfoProps } from '../ModelInfo'

interface AITextSyntaxFlowProps {
  content: string
  nodeIdVerbose: AIOutputEvent['NodeIdVerbose']
  modalInfo: ModalInfoProps
  contentType: string
}

const AITextSyntaxFlow: FC<AITextSyntaxFlowProps> = memo(({ content, nodeIdVerbose, modalInfo, contentType }) => {
  const { nodeLabel } = useAINodeLabel(nodeIdVerbose)
  return <AIYaklangCode content={content} nodeLabel={nodeLabel} modalInfo={modalInfo} contentType={contentType} />
})
export default AITextSyntaxFlow
