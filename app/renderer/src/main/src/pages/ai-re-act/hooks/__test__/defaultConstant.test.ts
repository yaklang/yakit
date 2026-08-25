import { describe, it, expect } from 'vitest'
import {
  convertNodeIdToVerbose,
  DefaultAgentChatStatus,
  DefaultAgentLoadingTitle,
  DefaultTaskPlanEndGate,
} from '../defaultConstant'
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

  it('B12: DefaultAgentChatStatus / DefaultAgentLoadingTitle defaults', () => {
    expect(DefaultAgentChatStatus).toEqual({
      questionID: '',
      coordinatorId: '',
      status: AITaskStatus.created,
    })
    expect(DefaultAgentLoadingTitle).toEqual({
      casualTitle: '会话初始化中...',
      planTitle: '',
    })
    expect(DefaultTaskPlanEndGate).toEqual({ endReceived: false, pendingStatus: undefined })
  })
})
