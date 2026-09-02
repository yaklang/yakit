import { describe, it, expect } from 'vitest'
import {
  convertNodeIdToVerbose,
  DefaultAgentChatStatus,
  DefaultTaskPlanEndGate,
  getDefaultAgentLoadingTitle,
} from '../defaultConstant'
import { AITaskStatus } from '../grpcApi'
import i18n from '@/i18n/i18n'

const tAgent = i18n.getFixedT(null, 'aiAgent')

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

  it('B12: DefaultAgentChatStatus / getDefaultAgentLoadingTitle defaults', () => {
    expect(DefaultAgentChatStatus).toEqual({
      questionID: '',
      coordinatorId: '',
      status: AITaskStatus.created,
    })
    // 测试环境 i18n 资源不加载，t() 返回 key 本身；与实现使用同一翻译源断言
    expect(getDefaultAgentLoadingTitle()).toEqual({
      casualTitle: tAgent('AIChatLoading.sessionInitializing'),
      planTitle: '',
    })
    expect(DefaultTaskPlanEndGate).toEqual({ endReceived: false, pendingStatus: undefined })
  })
})
