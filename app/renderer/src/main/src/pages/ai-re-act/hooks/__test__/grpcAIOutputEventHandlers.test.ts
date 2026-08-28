import { describe, it, expect } from 'vitest'
import { grpcAIMessageHandlers } from '../grpcStreamHandler/grpcAIOutputEventHandlers'
import { aiOtherDataHandlers } from '../grpcStreamHandler/aiOther'
import { aiStreamDataHandlers } from '../grpcStreamHandler/aiStream'
import { aiSingleItemDataHandlers } from '../grpcStreamHandler/aiSingleItem'
import { aiToolResultDataHandlers } from '../grpcStreamHandler/aiToolResult'
import { aiReviewDataHandlers } from '../grpcStreamHandler/aiReview'
import { aiTaskDetailDataHandlers } from '../grpcStreamHandler/aiTaskDetail'
import { aiPerfDataHandlers } from '../grpcStreamHandler/aiPerf'
import { aiYakExecResultDataHandlers } from '../grpcStreamHandler/yakExecResult'

describe('grpcAIMessageHandlers', () => {
  it('D1: aggregator includes all handler map keys', () => {
    const expected = {
      ...aiPerfDataHandlers,
      ...aiOtherDataHandlers,
      ...aiReviewDataHandlers,
      ...aiToolResultDataHandlers,
      ...aiSingleItemDataHandlers,
      ...aiStreamDataHandlers,
      ...aiYakExecResultDataHandlers,
      ...aiTaskDetailDataHandlers,
    }
    for (const key of Object.keys(expected)) {
      expect(typeof grpcAIMessageHandlers[key]).toBe('function')
    }
    expect(typeof grpcAIMessageHandlers.skip_subtask_in_plan).toBe('function')
  })
})
