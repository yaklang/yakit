import { describe, it, expect, vi } from 'vitest'
import { aiToolResultDataHandlers } from '../grpcStreamHandler/aiToolResult'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'
import { AIChatQSDataTypeEnum } from '../aiRender'

vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
  persistToolResultIfTerminal: vi.fn(),
  upsertSessionContent: vi.fn(),
  persistGetSessionContent: vi.fn().mockResolvedValue(undefined),
}))

describe('aiToolResult handlers', () => {
  it('D6: tool_call_start creates TOOL_RESULT', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('tool_call_start', {
        call_tool_id: 'call-9',
        tool: { name: 'http', description: 'd' },
        start_time: 1,
        start_time_ms: 1,
      }),
    })
    aiToolResultDataHandlers.tool_call_start(req)
    const item = req.rawData.contents.get('call-9')
    expect(item?.type).toBe(AIChatQSDataTypeEnum.TOOL_RESULT)
    expect(item?.stageSettled).toBe(false)
  })

  it('D6: tool_call_param updates params', async () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('tool_call_param', {
        call_tool_id: 'call-9',
        params: { a: 1 },
      }),
    })
    req.rawData.contents.set('call-9', {
      id: 'call-9',
      type: AIChatQSDataTypeEnum.TOOL_RESULT,
      chatType: 'reAct',
      Timestamp: 1,
      AIService: '',
      AIModelName: '',
      data: { tool: { status: 'default' }, callToolId: 'call-9' },
    } as any)
    await aiToolResultDataHandlers.tool_call_param(req)
    expect((req.rawData.contents.get('call-9') as any).data.tool.reviewParams).toEqual({ a: 1 })
  })

  it('D6: handler keys registered', () => {
    for (const key of Object.keys(aiToolResultDataHandlers)) {
      expect(typeof (aiToolResultDataHandlers as any)[key]).toBe('function')
    }
  })
})
