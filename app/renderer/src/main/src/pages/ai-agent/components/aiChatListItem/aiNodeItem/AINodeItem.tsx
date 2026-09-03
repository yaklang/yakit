import React from 'react'
import type { AINodeItemProps } from './type'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import {
  AITriageChatContentWrapper,
  AIThought,
} from '../../aiChatListItemWrapper/aiItemContentWrapper/AIItemContentWrapper'
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
import AIGroupStreamNodeWrapper from '../../aiChatListItemWrapper/aiGroupStreamNodeWrapper/AIGroupStreamNodeWrapper'
import { AIBrowserHandoffCard } from '../../aiBrowserHandoffCard/AIBrowserHandoffCard'

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

    case AIChatQSDataTypeEnum.USER_MANUAL_INTERVENTION:
      return <AIManualIntervention info={itemData} renderNum={renderNum} />

    case AIChatQSDataTypeEnum.TOOL_CALL_DECISION:
      return <AIToolDecision item={itemData} renderNum={renderNum} />

    case AIChatQSDataTypeEnum.HTTP_FLOW_FUZZ_STATUS:
      return <AIHttpFlowFuzzStatusCard item={itemData} renderNum={renderNum} isChildWindow={false} />

    case AIChatQSDataTypeEnum.REPORT_FINISH:
      return <AIReportFinishCard item={itemData} renderNum={renderNum} isChildWindow={false} />

    case AIChatQSDataTypeEnum.BROWSER_HANDOFF:
      return <AIBrowserHandoffCard item={itemData} renderNum={renderNum} />

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
      if (itemData.parentGroupToken) {
        // 组
        return <AIGroupStreamNodeWrapper itemData={itemData} renderNum={renderNum} groupIndex={groupIndex} />
      } else {
        return <AIStreamCardWrapper token={itemData.id} />
      }
    default:
      return null
  }
})

export default AINodeItem
