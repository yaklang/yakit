import { describe, it, expect } from 'vitest'
import { convertNodeIdToVerbose, DefaultTaskPlanStatus, DefaultTaskPlanEndGate } from '../defaultConstant'
import { AITaskStatus } from '../grpcApi'

describe('defaultConstant', () => {
  it('B11: convertNodeIdToVerbose known and unknown', () => {
    expect(convertNodeIdToVerbose('re-act-loop-thought')).toEqual({
      Zh: '思考',
      En: '思考',
    })
    expect(convertNodeIdToVerbose('unknown-node')).toEqual({
      Zh: 'unknown-node',
      En: 'unknown-node',
    })
  })

  it('B12: DefaultTaskPlanStatus has no loading field', () => {
    expect(DefaultTaskPlanStatus).toEqual({
      plan: '',
      task: '',
      taskID: '',
      status: AITaskStatus.created,
      coordinatorId: '',
    })
    expect('loading' in DefaultTaskPlanStatus).toBe(false)
    expect(DefaultTaskPlanEndGate).toEqual({ endReceived: false, pendingStatus: undefined })
  })
})
