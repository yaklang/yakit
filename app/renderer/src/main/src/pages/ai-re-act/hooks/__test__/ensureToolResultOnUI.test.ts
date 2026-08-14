import { describe, it, expect } from 'vitest'
import { ensureToolResultOnUI } from '../grpcStreamHandler/aiToolResult'
import { createTestSession, makeGrpcRes } from './fixtures'
import { AIChatQSDataTypeEnum } from '../aiRender'

describe('ensureToolResultOnUI', () => {
  it('B16: dispatches when missing, bumps when present', () => {
    const { store } = createTestSession()
    const res = makeGrpcRes({ Type: 'tool_call_done' })
    const toolResult = {
      id: 'call-1',
      type: AIChatQSDataTypeEnum.TOOL_RESULT,
      chatType: 'reAct' as const,
      Timestamp: 1,
      AIService: '',
      AIModelName: '',
      data: { tool: { status: 'success' } },
    } as any

    ensureToolResultOnUI({ res, chatType: 'reAct', store }, toolResult)
    expect(store.getState().items['call-1']).toBeTruthy()
    expect(store.getState().chatElements.some((e) => e.token === 'call-1')).toBe(true)

    const { renderNum: prevNum } = store.getState().items['call-1']
    ensureToolResultOnUI({ res, chatType: 'reAct', store }, toolResult)
    expect(store.getState().items['call-1'].renderNum).toBe(prevNum + 1)
  })
})
