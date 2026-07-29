import React, { type FC, type ReactNode } from 'react'
import { AIReActTaskChatReview } from '@/pages/ai-agent/aiAgentChat/AIAgentChat'
import useChatIPCStore from '@/pages/ai-agent/useContext/ChatIPCContent/useStore'
import { AIRenderTaskFooterExtra } from './AIReActTaskChat'
import { useTaskChatExtraAction } from './useTaskChatExtraAction'

const REVIEW_FOOTER_BTN_PROPS = {
  btnProps: { size: 'middle' as const },
  subTaskBtnProps: {
    size: 'middle' as const,
    type: 'outline2' as const,
    className: '',
    colors: 'primary' as const,
    radius: '4px' as const,
  },
}

const renderReviewFooterExtra = (onExtraAction: ReturnType<typeof useTaskChatExtraAction>['onExtraAction']) => {
  return (node: ReactNode) => (
    <AIRenderTaskFooterExtra onExtraAction={onExtraAction} {...REVIEW_FOOTER_BTN_PROPS}>
      {node}
    </AIRenderTaskFooterExtra>
  )
}

export const AIReActTaskChatReviewBar: FC<{
  setScrollToBottom: (v: boolean) => void
}> = ({ setScrollToBottom }) => {
  const { reviewInfo, planReviewTreeKeywordsMap } = useChatIPCStore()
  const { onExtraAction } = useTaskChatExtraAction()

  if (!reviewInfo) return null

  return (
    <AIReActTaskChatReview
      reviewInfo={reviewInfo}
      planReviewTreeKeywordsMap={planReviewTreeKeywordsMap}
      setScrollToBottom={setScrollToBottom}
      footerExtra={renderReviewFooterExtra(onExtraAction)}
    />
  )
}
