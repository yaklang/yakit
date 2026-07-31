import { describe, it, expect, vi } from 'vitest'
import { aiOtherDataHandlers } from '../grpcStreamHandler/aiOther'
import { DefaultMemoryList } from '../defaultConstant'
import { makeGrpcJsonRes, makeHandlerRequest } from './fixtures'

vi.mock('../persist/contentPersistHelper', () => ({
  persistIndependentItem: vi.fn(),
  persistToolResultIfTerminal: vi.fn(),
  upsertSessionContent: vi.fn(),
}))

describe('aiOther other handlers', () => {
  it('D3: session_title updates rawData', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('structured', { title: 'hello-title' }, { NodeId: 'session_title' }),
    })
    aiOtherDataHandlers.session_title(req)
    expect(req.rawData.sessionTitle).toBe('hello-title')
  })

  it('D3: memory_context merges for reAct', () => {
    const lists = {
      ...DefaultMemoryList,
      memories: [{ id: 'm1' }],
      total_memories: 1,
      memory_pool_limit: 10,
      total_size: 1,
    }
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('memory_context', lists),
      chatType: 'reAct',
    })
    aiOtherDataHandlers.memory_context(req)
    expect(req.meta.casualMemoryList.total_memories).toBe(1)
  })

  it('D3: filesystem pin updates folders', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('filesystem_pin_directory', { path: '/tmp/x' }),
    })
    aiOtherDataHandlers.filesystem_pin_directory(req)
    expect(req.store.getState().grpcFolders.some((f) => f.path === '/tmp/x')).toBe(true)
  })

  it('D3: timeline_item appends', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('structured', { id: 9, content: 't' }, { NodeId: 'timeline_item' }),
    })
    aiOtherDataHandlers.timeline_item(req)
    expect(req.store.getState().reActTimelines.some((t) => t.id === 9)).toBe(true)
  })

  it('D3: notify sets message', () => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('notify', { type: 'info', content: 'n1', duration_ms: 0 }),
    })
    aiOtherDataHandlers.notify(req)
    expect(req.store.getState().notifyMessage?.content).toBe('n1')
  })
})
