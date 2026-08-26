import { describe, it, expect, vi } from 'vitest'
import { aiStreamDataHandlers } from '../grpcStreamHandler/aiStream'
import { makeGrpcJsonRes, makeHandlerRequest, makeGrpcRes } from './fixtures'
import { AIChatQSDataTypeEnum } from '../aiRender'

vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
  persistToolResultIfTerminal: vi.fn(),
  upsertSessionContent: vi.fn(),
  setSessionReferencePersist: vi.fn(),
  persistGetSessionContent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../AIAgentLogEmitter', () => ({
  aiAgentLogEmitter: { dispatch: vi.fn() },
  AIAgentLogEmitter: class {},
}))

describe('aiStream handlers', () => {
  it('D4: stream_start creates STREAM content', async () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'stream_start',
        { event_writer_id: 'ew-1' },
        { NodeId: 're-act-loop-thought', EventUUID: 'eu-1' },
      ),
    })
    await aiStreamDataHandlers.stream_start(req)
    const found = [...req.rawData.contents.values()].find((c) => c.type === AIChatQSDataTypeEnum.STREAM)
    expect(found).toBeTruthy()
    expect(found?.stageSettled).toBe(false)
  })

  it('D4: stream-finished ends stream by event_writer_id', async () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes(
        'structured',
        { event_writer_id: 'ew-1', node_id: 're-act-loop-thought', is_reason: false, is_system: false },
        { NodeId: 'stream-finished' },
      ),
    })
    req.rawData.contents.set('ew-1', {
      id: 'ew-1',
      type: AIChatQSDataTypeEnum.STREAM,
      chatType: 'reAct',
      Timestamp: 1,
      AIService: '',
      AIModelName: '',
      data: {
        NodeId: 're-act-loop-thought',
        EventUUID: 'ew-1',
        status: 'start',
        content: 'hi',
      },
    } as any)
    await aiStreamDataHandlers['stream-finished'](req)
    const stream = req.rawData.contents.get('ew-1') as any
    expect(stream.data.status).toBe('end')
  })

  it('D4: reference_material handler registered', () => {
    expect(typeof aiStreamDataHandlers.reference_material).toBe('function')
  })

  it('D4: stream handler hydrates/rebuilds when contents missing', async () => {
    expect(typeof aiStreamDataHandlers.stream).toBe('function')
    const req = makeHandlerRequest({
      res: makeGrpcRes({
        Type: 'stream',
        NodeId: 're-act-loop-thought',
        EventUUID: 'eu-1',
        Content: new TextEncoder().encode('x'),
      }),
    })
    await aiStreamDataHandlers.stream(req)
    const stream = req.rawData.contents.get('eu-1') as any
    expect(stream?.type).toBe(AIChatQSDataTypeEnum.STREAM)
    expect(stream.data.content).toBe('x')
    expect(stream.stageSettled).toBe(false)
  })
})
