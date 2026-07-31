import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pushLogToOtherWindow } from '../utils'

const { dispatch } = vi.hoisted(() => ({
  dispatch: vi.fn(),
}))

vi.mock('../AIAgentLogEmitter', () => ({
  aiAgentLogEmitter: { dispatch },
  AIAgentLogEmitter: class {},
}))

describe('pushLogToOtherWindow', () => {
  beforeEach(() => {
    dispatch.mockClear()
  })

  it('B10: forwards log to emitter', () => {
    pushLogToOtherWindow({
      sessionId: 's1',
      Timestamp: 99,
      level: 'info',
      message: 'hello',
    })
    expect(dispatch).toHaveBeenCalledWith({
      session: 's1',
      type: 'log',
      Timestamp: 99,
      log: { level: 'info', message: 'hello' },
    })
  })
})
