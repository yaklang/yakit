import { describe, it, expect } from 'vitest'
import { generateTaskNodeDataID, genBaseAIChatData, genExecTasks, isAutoExecuteReviewContinue } from '../utils'
import type { AIAgentGrpcApi } from '../grpcApi'

describe('utils core helpers', () => {
  it('B3: generateTaskNodeDataID for reAct / task', () => {
    expect(
      generateTaskNodeDataID({
        chatType: 'reAct',
        planID: 'p1',
        taskID: 't1',
        isExist: () => false,
      }),
    ).toBeUndefined()

    expect(
      generateTaskNodeDataID({
        chatType: 'reAct',
        planID: 'p1',
        taskID: 't1',
        isExist: (k) => k === 'p1-t1',
      }),
    ).toBe('p1-t1')

    expect(
      generateTaskNodeDataID({
        chatType: 'task',
        planID: 'p1',
        taskID: 't1',
        isExist: () => false,
      }),
    ).toBe('p1-default')

    expect(
      generateTaskNodeDataID({
        chatType: 'task',
        planID: 'p1',
        taskID: 't1',
        isExist: (k) => k === 'p1-t1',
      }),
    ).toBe('p1-t1')
  })

  it('B5: genBaseAIChatData copies service fields', () => {
    const base = genBaseAIChatData({
      AIService: 'svc',
      AIModelName: 'model',
      Timestamp: 123,
    } as any)
    expect(base.AIService).toBe('svc')
    expect(base.AIModelName).toBe('model')
    expect(base.Timestamp).toBe(123)
    expect(base.id).toBeTruthy()
  })

  it('B4: genExecTasks flattens tree and maps depends_on', () => {
    const root: AIAgentGrpcApi.PlanTask = {
      index: '0',
      name: 'root',
      goal: '',
      progress: '',
      task_id: 'root',
      semantic_identifier: 'root',
      depends_on: [],
      subtasks: [
        {
          index: '1',
          name: 'a',
          goal: '',
          progress: '',
          task_id: 'id-a',
          semantic_identifier: 'A',
          depends_on: [],
          subtasks: [],
        } as any,
        {
          index: '2',
          name: 'b',
          goal: '',
          progress: '',
          task_id: 'id-b',
          semantic_identifier: 'B',
          depends_on: ['A'],
          subtasks: [],
        } as any,
      ],
    } as any
    const tasks = genExecTasks(root)
    expect(tasks.map((t) => t.task_id)).toEqual(['id-a', 'id-b'])
    expect(tasks[1].depends_on).toEqual(['id-a'])
  })

  it('B7: isAutoExecuteReviewContinue', () => {
    expect(isAutoExecuteReviewContinue({ type: 'require_user_interactive' })).toBe(false)
    expect(isAutoExecuteReviewContinue({ getFunc: () => ({ ReviewPolicy: 'yolo' }) as any })).toBe(true)
    expect(isAutoExecuteReviewContinue({ getFunc: () => ({ ReviewPolicy: 'manual' }) as any })).toBe(false)
    expect(isAutoExecuteReviewContinue({})).toBe(false)
  })
})
