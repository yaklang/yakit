import React from 'react'
import { AINodeItemProps } from './type'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import {
  AITriageChatContentWrapper,
  AIThought,
} from '../../aiChatListItemWrapper/aiItemContentWrapper/AIItemContentWrapper'
import { AIReActChatReview } from '../../aiReActChatReview/AIReActChatReview'
import styles from './AINodeItem.module.scss'
import { AIManualIntervention } from '../../aiManualIntervention/AIManualIntervention'
import { AIToolDecision } from '../../aiToolDecision/AIToolDecision'
import { AIHttpFlowFuzzStatusCard } from '../../aiHttpFlowFuzzStatusCard/AIHttpFlowFuzzStatusCard'
import { AIReportFinishCard } from '../../aiReportFinishCard/AIReportFinishCard'
import DividerCard from '../../DividerCard'
import { AITaskStatus } from '@/pages/ai-re-act/hooks/grpcApi'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import AiFailPlanCard from '../../aiFailPlanCard/AiFailPlanCard'
import { AIModelErrorPrompt } from '../aiModelErrorPrompt/AIModelErrorPrompt'
import AIStreamCardWrapper from '../../aiChatListItemWrapper/aiStreamCardWrapper/aiStreamCardWrapper'
import AIToolInvokerCardWrapper from '../../aiChatListItemWrapper/aiToolInvokerCardWrapper/AIToolInvokerCardWrapper'
import AIReviewResultWrapper from '../../aiChatListItemWrapper/aiReviewResultWrapper/AIReviewResultWrapper'
import AIGroupStreamNodeWrapper from '../../aiChatListItemWrapper/aiGroupStreamNodeWrapper/AIGroupStreamNodeWrapper'

const AINodeItem: React.FC<AINodeItemProps> = React.memo((props) => {
  const { itemData, renderNum, groupIndex } = props
  const { t } = useI18nNamespaces(['aiAgent'])
  switch (itemData.type) {
    case AIChatQSDataTypeEnum.QUESTION:
      return <AITriageChatContentWrapper isAnswer={false} itemData={itemData} renderNum={renderNum} />
    case AIChatQSDataTypeEnum.RESULT:
      return <AITriageChatContentWrapper isAnswer={true} itemData={itemData} renderNum={renderNum} />
    case AIChatQSDataTypeEnum.THOUGHT:
      return <AIThought itemData={itemData} renderNum={renderNum} />

    case AIChatQSDataTypeEnum.TOOL_RESULT:
      return <AIToolInvokerCardWrapper itemData={itemData} renderNum={renderNum} />

    case AIChatQSDataTypeEnum.EXEC_AIFORGE_REVIEW_REQUIRE:
    case AIChatQSDataTypeEnum.REQUIRE_USER_INTERACTIVE:
    case AIChatQSDataTypeEnum.PLAN_REVIEW_REQUIRE:
    case AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE:
    case AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE:
      if (!!itemData.data?.selected) {
        if (
          itemData.type === AIChatQSDataTypeEnum.TOOL_USE_REVIEW_REQUIRE ||
          itemData.type === AIChatQSDataTypeEnum.TASK_REVIEW_REQUIRE
        )
          return null
        return <AIReviewResultWrapper itemData={itemData} renderNum={renderNum} />
      } else {
        return (
          <AIReActChatReview
            chatType="casual"
            isEmbedded={true}
            expand={true}
            className={styles['review-wrapper']}
            info={itemData}
            renderNum={renderNum}
          />
        )
      }
    case AIChatQSDataTypeEnum.USER_MANUAL_INTERVENTION:
      return <AIManualIntervention info={itemData} renderNum={renderNum} />

    case AIChatQSDataTypeEnum.TOOL_CALL_DECISION:
      return <AIToolDecision item={itemData} renderNum={renderNum} />

    case AIChatQSDataTypeEnum.HTTP_FLOW_FUZZ_STATUS:
      return <AIHttpFlowFuzzStatusCard item={itemData} renderNum={renderNum} isChildWindow={false} />

    case AIChatQSDataTypeEnum.REPORT_FINISH:
      return <AIReportFinishCard item={itemData} renderNum={renderNum} isChildWindow={false} />

    case AIChatQSDataTypeEnum.END_PLAN_AND_EXECUTION:
      return (
        <DividerCard
          status={AITaskStatus.cancel}
          name={t('AIChatListItem.taskEnd')}
          desc={t('AIChatListItem.taskEndDesc')}
          success={0}
          error={0}
        />
      )

    case AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION:
    case AIChatQSDataTypeEnum.FAIL_REACT:
      return <AiFailPlanCard itemData={itemData} renderNum={renderNum} />

    case AIChatQSDataTypeEnum.AI_API_REQUEST_FAILED:
      return <AIModelErrorPrompt item={itemData} renderNum={renderNum} isChildWindow={false} />

    case AIChatQSDataTypeEnum.STREAM:
      if (!!itemData.parentGroupToken) {
        return <AIGroupStreamNodeWrapper itemData={itemData} renderNum={renderNum} groupIndex={groupIndex} />
      } else {
        // 组
        return <AIStreamCardWrapper token={itemData.id} />
      }
    default:
      return null
  }
})

export default AINodeItem
