// @vitest-environment node
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const handlerPath = new URL('../handlers/mitmV2.js', import.meta.url)
const source = readFileSync(handlerPath, 'utf8')
const requireFromHandler = createRequire(handlerPath)
const query = { SessionId: 'mitm-session', View: 'active' }

const registerDiagnostics = () => {
  const handlers = new Map()
  const ipcMain = { handle: (channel, handler) => handlers.set(channel, handler) }
  const module = { exports: {} }
  runInNewContext(source, {
    module,
    require: (id) => {
      if (id === 'electron') return { ipcMain }
      if (id === '../logFile') return {}
      return requireFromHandler(id)
    },
    setTimeout,
    clearTimeout,
  })
  const stream = new EventEmitter()
  stream.write = (_, done) => done()
  stream.cancel = vi.fn()
  const client = {
    MITMV2: () => stream,
    GetMITMDiagnostics: vi.fn(),
  }
  const win = { webContents: { send: vi.fn() } }
  module.exports(win, () => client)
  const event = { sender: win.webContents }
  return {
    event,
    rpc: client.GetMITMDiagnostics,
    diagnostics: handlers.get('mitmV2-get-diagnostics'),
    start: () => {
      handlers.get('mitmV2-start-call')(event, { Host: '127.0.0.1', Port: 8083, extra: {} })
      stream.emit('data', { PipelineStats: { SessionId: query.SessionId } })
    },
    stop: () => handlers.get('mitmV2-stop-call')(),
  }
}

describe('MITM V2 diagnostics IPC', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync()
    vi.useRealTimers()
  })

  it('rejects other senders even during an active session', () => {
    const { diagnostics, rpc, start } = registerDiagnostics()
    start()
    expect(() => diagnostics({ sender: {} }, query)).toThrow('Invalid MITM diagnostics sender')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('returns Ended without calling the engine for an inactive or different session', () => {
    const { diagnostics, event, rpc, start } = registerDiagnostics()
    expect(diagnostics(event, query)).toEqual({ Ended: true })
    start()
    expect(diagnostics(event, { ...query, SessionId: 'another-session' })).toEqual({ Ended: true })
    expect(rpc).not.toHaveBeenCalled()
  })

  it.each([
    [12, 'active', { Unsupported: true }],
    [5, 'active', { Ended: true }],
    [5, 'detail', { Missing: true }],
  ])('maps gRPC status %i for the %s view', async (code, View, expected) => {
    const { diagnostics, event, rpc, start } = registerDiagnostics()
    start()
    rpc.mockImplementation((_params, _options, callback) => callback({ code }))
    await expect(diagnostics(event, { ...query, View })).resolves.toEqual(expected)
    expect(rpc).toHaveBeenCalledOnce()
  })

  it('returns Ended when the session stops before the diagnostics response', async () => {
    const { diagnostics, event, rpc, start, stop } = registerDiagnostics()
    start()
    const pending = diagnostics(event, query)
    const [, , respond] = rpc.mock.calls[0]
    stop()
    respond(null, { SessionId: query.SessionId, Traces: [] })
    await expect(pending).resolves.toEqual({ Ended: true })
  })
})
