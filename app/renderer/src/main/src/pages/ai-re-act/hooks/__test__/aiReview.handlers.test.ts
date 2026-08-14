import { describe, it, expect, vi } from 'vitest'
import { aiReviewDataHandlers } from '../grpcStreamHandler/aiReview'
import { DefaultCurrentExecTaskTree } from '../defaultConstant'
import type { AIAgentGrpcApi } from '../grpcApi'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'

vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
}))

const makePlanTask = (
  task_id: string,
  name: string,
  subtasks: AIAgentGrpcApi.PlanTask[] = [],
): AIAgentGrpcApi.PlanTask => ({
  task_id,
  name,
  goal: '',
  semantic_identifier: task_id,
  depends_on: [] as string[],
  subtasks,
  isRemove: false,
  tools: [] as string[],
  description: '',
  total_tool_call_count: 0,
  success_tool_call_count: 0,
  fail_tool_call_count: 0,
  summary: '',
})

const makePlanReviewPayload = (id = 'plan-rev-1', subtasks: AIAgentGrpcApi.PlanTask[] = []) => ({
  id,
  plans_id: 'plans-1',
  selectors: [{ value: 'continue', prompt: 'ok' }],
  plans: {
    root_task: makePlanTask('root', 'root', subtasks),
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

  it('D7: review_release plan-review continue writes currentPlan and clears extra', () => {
    const payload = makePlanReviewPayload('plan-rev-cont', [makePlanTask('leaf-1', 'leaf')])
    const req = makeHandlerRequest({
      chatType: 'task',
      res: makeGrpcJsonRes('review_release', { id: 'plan-rev-cont', params: { suggestion: 'continue' } }),
    })
    req.rawData.contents.set('plan-rev-cont', {
      id: 'plan-rev-cont',
      type: 'plan_review_require',
      chatType: 'task',
      data: payload,
    } as any)
    req.store.getState().updateState({ currentReviewDetail: { token: 'plan-rev-cont', renderNum: 0 } })
    req.meta.currentPlanReviewExtraId = 'extra-1'
    req.meta.planReviewExtraData.set('extra-1', { id: 'extra-1' } as any)

    aiReviewDataHandlers.review_release(req)
    expect(req.store.getState().currentPlan.root_task_name).toBe('root')
    expect(req.store.getState().currentPlan.task_tree.some((t) => t.task_id === 'leaf-1')).toBe(true)
    expect(req.meta.currentPlanReviewExtraId).toBe('')
    expect(req.meta.planReviewExtraData.size).toBe(0)
    expect(req.rawData.contents.get('plan-rev-cont')).toBeUndefined()
    expect(req.store.getState().currentReviewDetail.token).toBe('')
  })

  it('D7: review_release plan-review non-continue skips currentPlan but still clears extra', () => {
    const req = makeHandlerRequest({
      chatType: 'task',
      res: makeGrpcJsonRes('review_release', { id: 'plan-rev-chg', params: { suggestion: 'change' } }),
    })
    req.rawData.contents.set('plan-rev-chg', {
      id: 'plan-rev-chg',
      type: 'plan_review_require',
      chatType: 'task',
      data: makePlanReviewPayload('plan-rev-chg'),
    } as any)
    req.store.getState().updateState({ currentReviewDetail: { token: 'plan-rev-chg', renderNum: 0 } })
    req.meta.currentPlanReviewExtraId = 'extra-2'
    req.meta.planReviewExtraData.set('extra-2', { id: 'extra-2' } as any)

    aiReviewDataHandlers.review_release(req)
    expect(req.store.getState().currentPlan).toEqual(DefaultCurrentExecTaskTree)
    expect(req.meta.currentPlanReviewExtraId).toBe('')
    expect(req.meta.planReviewExtraData.size).toBe(0)
    expect(req.rawData.contents.get('plan-rev-chg')).toBeUndefined()
    expect(req.store.getState().currentReviewDetail.token).toBe('')
  })
})
