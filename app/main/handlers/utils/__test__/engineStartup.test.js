// @vitest-environment node
const { EventEmitter } = require('events')
const { createEngineStartup, stopEngineChild } = require('../engineStartup')
const {
  createEngineLineReader,
  classifyEngineFailure,
  parseEngineEvent,
  parseCheckResult,
  redactEngineLog,
} = require('../engineDiagnostics')

const MARKER = '50551aa97b5aa5ae8a3c3243ac60a8a7'
const params = { port: 9011, password: 'a'.repeat(64), softwareVersion: 'yakit' }
const wrap = (json) => `<json-${MARKER}>\n${JSON.stringify(json)}\n</json-${MARKER}>\n`

function fixture(options = {}) {
  const children = []
  const clients = []
  const log = vi.fn()
  const commitConnection = vi.fn()
  const spawn = vi.fn((command, args, settings) => {
    const child = new EventEmitter()
    Object.assign(child, {
      pid: 10000 + children.length,
      exitCode: null,
      signalCode: null,
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      args,
      settings,
    })
    child.exit = (code = 0, signal = null) => {
      child.exitCode = code
      child.signalCode = signal
      child.emit('exit', code, signal)
      child.emit('close', code, signal)
    }
    child.kill = vi.fn((signal) => {
      queueMicrotask(() => child.exit(null, signal))
      return true
    })
    child.output = (text, stream = 'stdout') => child[stream].emit('data', Buffer.from(text))
    children.push(child)
    return child
  })
  const createClient = vi.fn((connection) => {
    const client = { connection, close: vi.fn(), call: { cancel: vi.fn() } }
    client.Echo = vi.fn((request, callOptions, done) => {
      client.done = done
      client.deadline = callOptions.deadline
      return client.call
    })
    clients.push(client)
    return client
  })
  const manager = createEngineStartup({
    getCommand: () => '/fake/yak',
    getEnv: () => ({ YAKIT_HOME: '/fake/home' }),
    createClient,
    commitConnection,
    spawn,
    log,
    timeouts: { check: 1000, start: 1000, probe: 100, retry: 50 },
    ...options,
  })
  return { manager, children, clients, log, spawn, commitConnection }
}

describe('engine startup lifecycle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it.each(['***', 'legacy-secret', ''])(
    'creates a fresh production password regardless of check secret %s',
    async (secret) => {
      const f = fixture()
      const run = async () => {
        const pending = f.manager.check(params)
        f.children.at(-1).output(wrap({ ok: true, port: 9011, secret, version: 'dev' }))
        f.children.at(-1).exit()
        return pending
      }
      const first = await run()
      const second = await run()
      expect(first.ok).toBe(true)
      expect(first.json.secret).toMatch(/^[a-f0-9]{64}$/)
      expect(second.json.secret).not.toBe(first.json.secret)
      expect(first.json.secret).not.toBe(secret)
      expect(f.log.mock.calls.flat().join('')).not.toContain('legacy-secret')
    },
  )

  it.each([1, 2])('authenticates ready v%s before committing global state', async (schemaVersion) => {
    const f = fixture()
    const pending = f.manager.start(params)
    f.children[0].output('yak grpc rea')
    f.children[0].output(`dy ${JSON.stringify({ schemaVersion, address: '127.0.0.1:9011', transport: 'tcp' })}\r\n`)
    expect(f.commitConnection).not.toHaveBeenCalled()
    expect(f.clients[0].connection.password).toBe(params.password)
    expect(f.clients[0].deadline).toBeInstanceOf(Date)
    f.clients[0].done(null, { result: 'Hello Yakit!' })
    expect((await pending).ok).toBe(true)
    expect(f.clients[0].close).toHaveBeenCalledOnce()
    expect(f.commitConnection).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    await f.manager.dispose()
  })

  it('supports a legacy engine without a structured ready event', async () => {
    const f = fixture()
    const pending = f.manager.start(params)
    await vi.advanceTimersByTimeAsync(50)
    f.clients[0].done(null, { result: 'Hello Yakit!' })
    expect((await pending).ok).toBe(true)
    expect(f.children[0].args).not.toContain('--transport')
    expect(f.children[0].args).toContain('--local-password')
    await f.manager.dispose()
  })

  it('rejects failed, exits its child and never restarts polling afterwards', async () => {
    const f = fixture()
    const pending = f.manager.start(params)
    f.children[0].output('yak grpc failed {"phase":"listen","reasonCode":"tcp_bind_in_use"}\n')
    expect((await pending).status).toBe('port_occupied')
    await vi.advanceTimersByTimeAsync(10000)
    expect(f.clients).toHaveLength(0)
    expect(f.commitConnection).not.toHaveBeenCalled()
    expect(f.children[0].kill).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels a pending Echo, closes its client and ignores late success', async () => {
    const f = fixture()
    const pending = f.manager.start(params)
    await vi.advanceTimersByTimeAsync(50)
    await f.manager.cancel()
    f.clients[0].done(null, { result: 'Hello Yakit!' })
    expect((await pending).status).toBe('cancelled')
    expect(f.clients[0].call.cancel).toHaveBeenCalledOnce()
    expect(f.clients[0].close).toHaveBeenCalledOnce()
    expect(f.commitConnection).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('waits for the superseded child to exit before spawning the next check', async () => {
    const f = fixture()
    const first = f.manager.check(params)
    const child = f.children[0]
    child.kill.mockImplementation(() => true)
    const second = f.manager.check(params)
    expect(f.spawn).toHaveBeenCalledTimes(1)
    child.exit(null, 'SIGTERM')
    expect((await first).status).toBe('cancelled')
    await vi.advanceTimersByTimeAsync(0)
    expect(f.spawn).toHaveBeenCalledTimes(2)
    f.children[1].output(wrap({ ok: true, port: 9011 }))
    f.children[1].exit()
    expect((await second).ok).toBe(true)
  })

  it('does not start another process if cleanup cannot confirm exit', async () => {
    const f = fixture()
    const first = f.manager.start(params)
    f.children[0].kill.mockImplementation(() => false)
    const second = f.manager.start(params)
    await vi.advanceTimersByTimeAsync(4000)
    expect((await first).status).toBe('process_error')
    expect((await second).status).toBe('port_occupied')
    expect(f.spawn).toHaveBeenCalledOnce()
    f.children[0].exit()
  })

  it('settles both timeout and early exit without leaked timers', async () => {
    const f = fixture()
    const pending = f.manager.check(params)
    await vi.advanceTimersByTimeAsync(1000)
    expect((await pending).status).toBe('timeout')
    expect(vi.getTimerCount()).toBe(0)
    const again = f.manager.start(params)
    f.children.at(-1).exit(1)
    expect((await again).status).toBe('engine_exited')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps only one bounded RPC in flight when the engine never responds', async () => {
    const f = fixture()
    const pending = f.manager.start(params)
    await vi.advanceTimersByTimeAsync(999)
    expect(f.clients.length).toBeLessThan(8)
    expect(f.clients.slice(0, -1).every((client) => client.close.mock.calls.length === 1)).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    expect((await pending).status).toBe('timeout')
    expect(f.clients.every((client) => client.close.mock.calls.length === 1)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([
    { schemaVersion: 2, transport: 'unix', address: '/tmp/engine.sock' },
    { schemaVersion: 2, transport: 'npipe', address: '\\\\.\\pipe\\engine' },
    { schemaVersion: 2, transport: 'tcp', address: '192.0.2.1:9011' },
    { schemaVersion: 99, address: '127.0.0.1:9011' },
    null,
  ])('rejects unexpected ready data without sending credentials: %j', async (event) => {
    const f = fixture()
    const pending = f.manager.start(params)
    f.children[0].output(`yak grpc ready ${JSON.stringify(event)}\n`)
    expect((await pending).status).toBe('protocol_error')
    expect(f.clients).toHaveLength(0)
  })

  it.each(['', '***', '\nunsafe'])('refuses invalid production passwords before spawn: %j', async (password) => {
    const f = fixture()
    expect((await f.manager.start({ ...params, password })).status).toBe('protocol_error')
    expect(f.spawn).not.toHaveBeenCalled()
  })

  it('does not trust an ok result when the child exits unsuccessfully', async () => {
    const f = fixture()
    const pending = f.manager.check(params)
    f.children[0].output(wrap({ ok: true, port: 9011 }))
    f.children[0].exit(1)
    expect((await pending).ok).toBe(false)
  })

  it('flushes an unterminated failed line on child close', async () => {
    const f = fixture()
    const pending = f.manager.start(params)
    f.children[0].output('yak grpc failed {"phase":"database"}')
    f.children[0].exit(1)
    expect((await pending).status).toBe('database_error')
  })

  it('bounds diagnostic output and still kills the child', async () => {
    const f = fixture()
    const pending = f.manager.check(params)
    f.children[0].output('x'.repeat(65537))
    expect((await pending).status).toBe('protocol_error')
    expect(f.children[0].kill).toHaveBeenCalledOnce()
  })

  it('does not let a cancelled connection overwrite a newer remote connection', async () => {
    const f = fixture()
    const first = f.manager.connect({ defaultYakGRPCAddr: '127.0.0.1:9011', password: 'old', caPem: '' })
    const second = f.manager.connect({ defaultYakGRPCAddr: 'remote.example:9011', password: 'new', caPem: 'cert' })
    expect((await first).status).toBe('cancelled')
    await vi.advanceTimersByTimeAsync(0)
    f.clients[0].done(null, { result: 'Hello Yakit!' })
    f.clients[1].done(null, { result: 'Hello Yakit!' })
    expect((await second).ok).toBe(true)
    expect(f.commitConnection).toHaveBeenCalledOnce()
    expect(f.commitConnection.mock.calls[0][0].password).toBe('new')
  })

  it('uses argument-safe Windows process-tree termination and skips exited children', async () => {
    const f = fixture()
    const running = f.manager.start(params)
    const child = f.children[0]
    const execFile = vi.fn((file, args, options, done) => {
      child.exit(1)
      done(null)
    })
    expect(await stopEngineChild(child, execFile, 'win32')).toBe(true)
    expect(execFile).toHaveBeenCalledWith(
      'taskkill.exe',
      ['/PID', '10000', '/T', '/F'],
      expect.objectContaining({ windowsHide: true, timeout: 3000 }),
      expect.any(Function),
    )
    expect(await stopEngineChild(child, execFile, 'win32')).toBe(true)
    expect(execFile).toHaveBeenCalledOnce()
    await running
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('engine diagnostic compatibility', () => {
  it.each([
    ['net.Listen(tcp, addr) failed', 'port_occupied'],
    ['database error', 'database_error'],
    ['build yak grpc server failed', 'build_yak_error'],
    ['dial grpc server failed', 'dial_error'],
    ['call Version RPC failed', 'call_error'],
    ['waiting grpc listener failed', 'timeout'],
  ])('preserves the legacy recovery route for %s in any reason array position', (reason, status) => {
    expect(classifyEngineFailure({ reason: ['unrelated', reason] }).status).toBe(status)
  })
  it('uses precise Windows denial diagnostics without losing legacy fallback', () => {
    expect(
      classifyEngineFailure({ reason: ['net.Listen(tcp, addr) failed'], info: 'bind: WSAEACCES 10013' }).status,
    ).toBe('port_denied')
    expect(
      classifyEngineFailure({ reason: ['net.Listen(tcp, addr) failed'], reasonCode: 'tcp_bind_failed' }).status,
    ).toBe('endpoint_unreachable')
  })
  it('decodes UTF-8 split across chunks and flushes a final line', () => {
    const lines = []
    const reader = createEngineLineReader(
      (line) => lines.push(line),
      () => {
        throw Error('overflow')
      },
    )
    const bytes = Buffer.from('数据库异常\r\nlast')
    for (const byte of bytes) reader.write(Buffer.from([byte]))
    reader.end()
    reader.end()
    expect(lines).toEqual(['数据库异常', 'last'])
  })
  it('redacts old engine secret logs and JSON without changing protocol parsing', () => {
    const json = { ok: true, port: 9011, secret: 'legacy-secret' }
    expect(redactEngineLog(wrap(json))).not.toContain('legacy-secret')
    expect(redactEngineLog('generated random secret for testing: legacy-secret')).not.toContain('legacy-secret')
    expect(parseCheckResult(wrap(json)).secret).toBe('legacy-secret')
    expect(parseCheckResult(wrap(json) + wrap(json))).toBeNull()
    expect(parseCheckResult('<json-unrelated>{"ok":true}</json-unrelated>')).toBeNull()
    expect(parseEngineEvent('yak grpc ready null').type).toBe('invalid')
  })
})
