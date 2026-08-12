import { describe, it, expect, vi } from 'vitest'
import { aiReviewDataHandlers } from '../grpcStreamHandler/aiReview'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'

vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
}))

const makePlanReviewPayload = (id = 'plan-rev-1') => ({
  id,
  plans_id: 'plans-1',
  selectors: [{ value: 'continue', prompt: 'ok' }],
  plans: {
    root_task: {
      task_id: 'root',
      name: 'root',
      goal: '',
      semantic_identifier: 'root',
      depends_on: [],
      subtasks: [],
      isRemove: false,
      tools: [],
      description: '',
      total_tool_call_count: 0,
      success_tool_call_count: 0,
    },
  },
})

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

  it('D7: plan_review_require sets currentReviewDetail for task', () => {
    const req = makeHandlerRequest({
      chatType: 'task',
      res: makeGrpcJsonRes('plan_review_require', makePlanReviewPayload('plan-rev-1')),
    })
    aiReviewDataHandlers.plan_review_require(req)
    expect(req.rawData.contents.get('plan-rev-1')).toBeTruthy()
    expect(req.store.getState().currentReviewDetail.token).toBe('plan-rev-1')
  })

  it('D7: plan_review_require ignores non-task chatType', () => {
    const req = makeHandlerRequest({
      chatType: 'reAct',
      res: makeGrpcJsonRes('plan_review_require', makePlanReviewPayload('plan-rev-2')),
    })
    aiReviewDataHandlers.plan_review_require(req)
    expect(req.rawData.contents.get('plan-rev-2')).toBeUndefined()
    expect(req.store.getState().currentReviewDetail.token).toBe('')
  })

  it('D7: plan_review_require ignores history IsSync', () => {
    const req = makeHandlerRequest({
      chatType: 'task',
      res: makeGrpcJsonRes('plan_review_require', makePlanReviewPayload('plan-rev-3'), { IsSync: true }),
    })
    aiReviewDataHandlers.plan_review_require(req)
    expect(req.rawData.contents.get('plan-rev-3')).toBeUndefined()
    expect(req.store.getState().currentReviewDetail.token).toBe('')
  })

  it('D7: tool_use_review_require sets currentReviewDetail for casual', () => {
    const req = makeHandlerRequest({
      chatType: 'reAct',
      res: makeGrpcJsonRes('tool_use_review_require', {
        id: 'rev-1',
        selectors: [{ value: 'continue', prompt: 'ok' }],
      }),
    })
    aiReviewDataHandlers.tool_use_review_require(req)
    expect(req.rawData.contents.get('rev-1')).toBeTruthy()
    expect(req.store.getState().currentReviewDetail.token).toBe('rev-1')
  })

  it('D7: require_user_interactive sets currentReviewDetail', () => {
    const req = makeHandlerRequest({
      chatType: 'reAct',
      res: makeGrpcJsonRes('require_user_interactive', { id: 'rev-ui-1' }),
    })
    aiReviewDataHandlers.require_user_interactive(req)
    expect(req.rawData.contents.get('rev-ui-1')).toBeTruthy()
    expect(req.store.getState().currentReviewDetail.token).toBe('rev-ui-1')
  })

  it('D7: review_release clears matched currentReviewDetail', () => {
    const req = makeHandlerRequest({
      chatType: 'reAct',
      res: makeGrpcJsonRes('review_release', { id: 'rev-1', params: { suggestion: 'continue' } }),
    })
    req.rawData.contents.set('rev-1', {
      id: 'rev-1',
      type: 'tool_use_review_require',
      chatType: 'reAct',
      data: {},
    } as any)
    req.store.getState().updateState({ currentReviewDetail: { token: 'rev-1', renderNum: 0 } })

    aiReviewDataHandlers.review_release(req)
    expect(req.rawData.contents.get('rev-1')).toBeUndefined()
    expect(req.store.getState().currentReviewDetail.token).toBe('')
  })

  it('D7: review_release no-ops when token mismatches', () => {
    const req = makeHandlerRequest({
      chatType: 'reAct',
      res: makeGrpcJsonRes('review_release', { id: 'rev-stale', params: { suggestion: 'continue' } }),
    })
    req.rawData.contents.set('rev-stale', {
      id: 'rev-stale',
      type: 'tool_use_review_require',
      chatType: 'reAct',
      data: {},
    } as any)
    req.store.getState().updateState({ currentReviewDetail: { token: 'rev-active', renderNum: 1 } })

    aiReviewDataHandlers.review_release(req)
    expect(req.rawData.contents.get('rev-stale')).toBeTruthy()
    expect(req.store.getState().currentReviewDetail).toEqual({ token: 'rev-active', renderNum: 1 })
  })

  it('D7: review_release ignores history IsSync', () => {
    const req = makeHandlerRequest({
      chatType: 'reAct',
      res: makeGrpcJsonRes('review_release', { id: 'rev-1', params: { suggestion: 'continue' } }, { IsSync: true }),
    })
    req.rawData.contents.set('rev-1', {
      id: 'rev-1',
      type: 'tool_use_review_require',
      chatType: 'reAct',
      data: {},
    } as any)
    req.store.getState().updateState({ currentReviewDetail: { token: 'rev-1', renderNum: 0 } })

    aiReviewDataHandlers.review_release(req)
    expect(req.rawData.contents.get('rev-1')).toBeTruthy()
    expect(req.store.getState().currentReviewDetail.token).toBe('rev-1')
  })
})
