import './setupElectron'
import { describe, it, expect, beforeEach } from 'vitest'
import { AIAgentLogEmitter } from '../AIAgentLogEmitter'
import { ipcRendererMock, resetIpcMocks } from './setupElectron'

describe('AIAgentLogEmitter', () => {
  let emitter: AIAgentLogEmitter

  beforeEach(() => {
    resetIpcMocks()
    emitter = new AIAgentLogEmitter()
  })

  it('F1: dispatch log invokes immediately', () => {
    emitter.dispatch({
      session: 's1',
      type: 'log',
      Timestamp: 100,
      log: { level: 'info', message: 'm' },
    })
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith(
      'forward-ai-chat-log-data',
      expect.objectContaining({
        sessionId: 's1',
        level: 'info',
        message: 'm',
      }),
    )
  })

  it('F3: clearLogsWindow / closeLogsWindow', () => {
    emitter.clearLogsWindow('s1')
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('clear-ai-chat-log-data')

    emitter.closeLogsWindow('s1')
    expect(ipcRendererMock.send).toHaveBeenCalledWith('close-ai-chat-window')
  })
})
