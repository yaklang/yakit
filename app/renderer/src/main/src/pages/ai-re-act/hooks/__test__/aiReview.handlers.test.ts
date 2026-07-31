import { describe, it, expect, vi } from 'vitest'
import { aiReviewDataHandlers } from '../grpcStreamHandler/aiReview'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'

vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
}))

describe('aiReview handlers', () => {
  it('D7: all review handlers are functions', () => {
    const keys = [
      'plan_review_require',
      'plan_task_analysis',
      'task_review_require',
      'tool_use_review_require',
      'require_user_interactive',
      'exec_aiforge_review_require',
      'ai_review_start',
      'ai_review_countdown',
      'ai_review_end',
      'review_release',
      'detached_plan_require',
    ] as const
    for (const key of keys) {
      expect(typeof aiReviewDataHandlers[key]).toBe('function')
    }
  })

  it('D7: tool_use_review_require does not throw with minimal payload', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('tool_use_review_require', {
        id: 'rev-1',
        selectors: [{ value: 'continue', prompt: 'ok' }],
      }),
    })
    expect(() => aiReviewDataHandlers.tool_use_review_require(req)).not.toThrow()
  })
})
