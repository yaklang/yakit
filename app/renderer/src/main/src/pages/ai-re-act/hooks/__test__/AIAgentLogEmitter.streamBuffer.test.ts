import './setupElectron'
import { describe, it, expect, beforeEach } from 'vitest'
import { AIAgentLogEmitter } from '../AIAgentLogEmitter'
import { ipcRendererMock, resetIpcMocks } from './setupElectron'

describe('AIAgentLogEmitter stream buffer', () => {
  let emitter: AIAgentLogEmitter

  beforeEach(() => {
    resetIpcMocks()
    emitter = new AIAgentLogEmitter()
  })

  it('F2: buffers stream chunks until end', () => {
    emitter.dispatch({
      session: 's1',
      type: 'stream',
      Timestamp: 1,
      stream: { NodeId: 'n1', EventUUID: 'e1', content: 'a', status: 'start' },
    })
    expect(ipcRendererMock.invoke).not.toHaveBeenCalled()

    emitter.dispatch({
      session: 's1',
      type: 'stream',
      Timestamp: 1,
      stream: { NodeId: 'n1', EventUUID: 'e1', content: 'b', status: 'end' },
    })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
      'forward-ai-chat-log-data',
      expect.objectContaining({
        message: 'ab',
        isStream: true,
        level: 'n1',
      }),
    )
  })

  it('F3: clearSessionBuffer drops residual stream', () => {
    emitter.dispatch({
      session: 's1',
      type: 'stream',
      Timestamp: 1,
      stream: { NodeId: 'n1', EventUUID: 'e1', content: 'x', status: 'start' },
    })
    emitter.clearSessionBuffer('s1')
    emitter.dispatch({
      session: 's1',
      type: 'stream',
      Timestamp: 1,
      stream: { NodeId: 'n1', EventUUID: 'e1', content: 'y', status: 'end' },
    })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
      'forward-ai-chat-log-data',
      expect.objectContaining({ message: 'y' }),
    )
  })
})

