import type { AIMessageHandler } from '../type'
import { aiPerfDataHandlers } from './aiPerf'
import { aiOtherDataHandlers } from './aiOther'
import { aiReviewDataHandlers } from './aiReview'
import { aiToolResultDataHandlers } from './aiToolResult'
import { aiSingleItemDataHandlers } from './aiSingleItem'
import { aiStreamDataHandlers } from './aiStream'
import { aiYakExecResultDataHandlers } from './yakExecResult'
import { aiTaskDetailDataHandlers } from './aiTaskDetail'

/**
 * grpc流数据的各种类型处理逻辑集合
 * 该逻辑集合里的方法处理，没有使用try-catch拦截，因为在hook层进行了同一try-catch拦截
 * 注意！别的地方单独使用时，请自行加入try-catch拦截错误
 */
export const grpcAIMessageHandlers: Record<string, AIMessageHandler> = {
  ...aiPerfDataHandlers,
  ...aiOtherDataHandlers,
  ...aiReviewDataHandlers,
  ...aiToolResultDataHandlers,
  ...aiSingleItemDataHandlers,
  ...aiStreamDataHandlers,
  ...aiYakExecResultDataHandlers,
  ...aiTaskDetailDataHandlers,
}
