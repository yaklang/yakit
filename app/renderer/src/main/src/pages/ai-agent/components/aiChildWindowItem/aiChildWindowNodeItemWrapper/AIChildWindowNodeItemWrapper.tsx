import useAIConcurrentStreamStore from '@/auxWindow/pages/AIConcurrentStream/useContext/useStore'
import { type AIChatQSData, AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import { type FC, memo } from 'react'
import { AIModelErrorPrompt } from '../../aiChatListItem/aiModelErrorPrompt/AIModelErrorPrompt'
import AINodeItem from '../../aiChatListItem/aiNodeItem/AINodeItem'
import { AIHttpFlowFuzzStatusCard } from '../../aiHttpFlowFuzzStatusCard/AIHttpFlowFuzzStatusCard'
import { AIReportFinishCard } from '../../aiReportFinishCard/AIReportFinishCard'
import { AIReviewResult } from '../../aiReviewResult/AIReviewResult'
import AIChildWindowGroupStreamNode from '../aiChildWindowGroupStreamNode/AIChildWindowGroupStreamNode'
import AIChildWindowStreamCard from '../aiChildWindowStreamCard/AIChildWindowStreamCard'
import AIChildWindowToolInvokerCard from '../aiChildWindowToolInvokerCard/AIChildWindowToolInvokerCard'

/**
 * 子窗口版 node item 包装器。
 * STREAM 类型依赖 streaming hooks（useTypedStream → useCurrentStore），
 * 子窗口无 store，故 STREAM 直接展示纯文本内容；其余类型复用 AINodeItem。
 */
const AIChildWindowNodeItemWrapper: FC<{ itemData: AIChatQSData; groupIndex?: number }> = memo(
  ({ itemData, groupIndex }) => {
    const { renderNum = 0 } = useAIConcurrentStreamStore()
    switch (itemData.type) {
      case AIChatQSDataTypeEnum.TOOL_RESULT:
        return <AIChildWindowToolInvokerCard itemData={itemData} renderNum={renderNum} />
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
          return <AIReviewResult info={itemData} renderNum={renderNum} />
        }
        // 任务子窗口中没有未review的数据
        return null

      case AIChatQSDataTypeEnum.HTTP_FLOW_FUZZ_STATUS:
        return <AIHttpFlowFuzzStatusCard item={itemData} renderNum={renderNum} isChildWindow={true} />
      case AIChatQSDataTypeEnum.REPORT_FINISH:
        return <AIReportFinishCard item={itemData} renderNum={renderNum} isChildWindow={true} />
      case AIChatQSDataTypeEnum.AI_API_REQUEST_FAILED:
        return <AIModelErrorPrompt item={itemData} renderNum={renderNum} isChildWindow={true} />
      case AIChatQSDataTypeEnum.STREAM:
        if (!!itemData.parentGroupToken) {
          return <AIChildWindowGroupStreamNode itemData={itemData} renderNum={renderNum} groupIndex={groupIndex} />
        } else {
          // 组
          return <AIChildWindowStreamCard itemData={itemData} renderNum={renderNum} />
        }
      case AIChatQSDataTypeEnum.QUESTION:
      case AIChatQSDataTypeEnum.RESULT:
      case AIChatQSDataTypeEnum.THOUGHT:
      case AIChatQSDataTypeEnum.USER_MANUAL_INTERVENTION:
      case AIChatQSDataTypeEnum.TOOL_CALL_DECISION:
      case AIChatQSDataTypeEnum.END_PLAN_AND_EXECUTION:
      case AIChatQSDataTypeEnum.FAIL_PLAN_AND_EXECUTION:
      case AIChatQSDataTypeEnum.FAIL_REACT:
        return <AINodeItem itemData={itemData} renderNum={renderNum} />
      default:
        return null
    }
  },
)
export default AIChildWindowNodeItemWrapper
