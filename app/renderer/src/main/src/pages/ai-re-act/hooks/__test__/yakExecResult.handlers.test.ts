import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { aiYakExecResultDataHandlers } from '../grpcStreamHandler/yakExecResult'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'

describe('yakExecResult handlers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('D10: status updates casualTitle for reAct', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { key: 're-act-loading-status-key', value: 'working' },
        { NodeId: 'status', TaskId: 'q1' },
      ),
      chatType: 'reAct',
    })
    req.store.getState().updateState({ currentCasualTaskID: 'q1' })
    aiYakExecResultDataHandlers.status(req)
    expect(req.store.getState().casualTitle).toBe('working')
  })

  it('D10: status updates plan title for task', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { key: 'plan-executing-loading-status-key', value: 'planning' },
        { NodeId: 'status' },
      ),
      chatType: 'task',
    })
    aiYakExecResultDataHandlers.status(req)
    expect(req.store.getState().taskStatus.plan).toBe('planning')
  })

  it('D10: yak_exec_result registered', () => {
    expect(typeof aiYakExecResultDataHandlers.yak_exec_result).toBe('function')
  })
})
