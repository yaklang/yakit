import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestModeSlashReopen, setModeSlashReopenHandler } from '../modeSlashReopen'

afterEach(() => {
  setModeSlashReopenHandler(null)
})

describe('modeSlashReopen', () => {
  it('未注册 handler 时 request 不抛错', () => {
    expect(() => requestModeSlashReopen({ kind: 'goalModes' })).not.toThrow()
  })

  it('注册后 request 会把 payload 交给 handler', () => {
    const handler = vi.fn()
    setModeSlashReopenHandler(handler)
    const payload = { kind: 'goalAcceptance' as const, text: '接口 200' }
    requestModeSlashReopen(payload)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(payload)
  })

  it('set null 后不再回调旧 handler', () => {
    const handler = vi.fn()
    setModeSlashReopenHandler(handler)
    setModeSlashReopenHandler(null)
    requestModeSlashReopen({ kind: 'goalModes' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('支持 goalDuration / goalIterations / multiAgentConfig payload', () => {
    const handler = vi.fn()
    setModeSlashReopenHandler(handler)

    requestModeSlashReopen({ kind: 'goalDuration', durationKey: '1h' })
    requestModeSlashReopen({ kind: 'goalIterations', iterations: 5 })
    requestModeSlashReopen({ kind: 'multiAgentConfig', subAgents: 3 })

    expect(handler).toHaveBeenNthCalledWith(1, { kind: 'goalDuration', durationKey: '1h' })
    expect(handler).toHaveBeenNthCalledWith(2, { kind: 'goalIterations', iterations: 5 })
    expect(handler).toHaveBeenNthCalledWith(3, { kind: 'multiAgentConfig', subAgents: 3 })
  })
})
