import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerModeSlashReopenHandler, requestModeSlashReopen, setModeSlashReopenHandler } from '../modeSlashReopen'

afterEach(() => {
  setModeSlashReopenHandler(null)
})

describe('modeSlashReopen', () => {
  it('未注册 handler 时 request 不抛错', () => {
    expect(() => requestModeSlashReopen({ kind: 'goalModes' })).not.toThrow()
  })

  it('注册后 request 会把 payload 交给 handler', () => {
    const handler = vi.fn()
    const unregister = registerModeSlashReopenHandler(handler)
    const payload = { kind: 'goalAcceptance' as const, text: '接口 200' }
    requestModeSlashReopen(payload)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(payload)
    unregister()
  })

  it('注销后不再回调旧 handler', () => {
    const handler = vi.fn()
    const unregister = registerModeSlashReopenHandler(handler)
    unregister()
    requestModeSlashReopen({ kind: 'goalModes' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('多实例：后注册优先；先注销后注册不影响先注册的', () => {
    const inputHandler = vi.fn()
    const historyHandler = vi.fn()
    const unregInput = registerModeSlashReopenHandler(inputHandler)
    const unregHistory = registerModeSlashReopenHandler(historyHandler)

    requestModeSlashReopen({ kind: 'goalModes' })
    expect(historyHandler).toHaveBeenCalledTimes(1)
    expect(inputHandler).not.toHaveBeenCalled()

    // 历史只读实例卸载：只摘自身，输入区 handler 仍可用
    unregHistory()
    requestModeSlashReopen({ kind: 'goalIterations', iterations: 3 })
    expect(inputHandler).toHaveBeenCalledTimes(1)
    expect(inputHandler).toHaveBeenCalledWith({ kind: 'goalIterations', iterations: 3 })

    unregInput()
  })

  it('支持 goalDuration / goalIterations / multiAgentConfig payload', () => {
    const handler = vi.fn()
    const unregister = registerModeSlashReopenHandler(handler)

    requestModeSlashReopen({ kind: 'goalDuration', durationKey: '1h' })
    requestModeSlashReopen({ kind: 'goalIterations', iterations: 5 })
    requestModeSlashReopen({ kind: 'multiAgentConfig', subAgents: 3 })

    expect(handler).toHaveBeenNthCalledWith(1, { kind: 'goalDuration', durationKey: '1h' })
    expect(handler).toHaveBeenNthCalledWith(2, { kind: 'goalIterations', iterations: 5 })
    expect(handler).toHaveBeenNthCalledWith(3, { kind: 'multiAgentConfig', subAgents: 3 })
    unregister()
  })
})
