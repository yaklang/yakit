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
  const processGroups = new Map()
  const clients = []
  const log = vi.fn()
  const notify = vi.fn()
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
      processGroups.set(child.pid, false)
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
    child.exitParent = (code = 0, signal = null) => {
      child.exitCode = code
      child.signalCode = signal
      child.emit('exit', code, signal)
      child.emit('close', code, signal)
    }
    children.push(child)
    processGroups.set(child.pid, true)
    return child
  })
  const killProcess = vi.fn((pid, signal) => {
    const groupId = Math.abs(pid)
    if (!processGroups.get(groupId)) {
      const error = new Error('process group not found')
      error.code = 'ESRCH'
      throw error
    }
    if (signal !== 0) children.find((child) => child.pid === groupId)?.kill(signal)
    return true
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
    notify,
    killProcess,
    // These children have synthetic PIDs. Never invoke the host's taskkill from a unit test.
    // Windows process-tree behavior is exercised separately with owned real processes.
    platform: 'linux',
    timeouts: { check: 1000, start: 1000, probe: 100, retry: 50 },
    ...options,
  })
  return { manager, children, clients, processGroups, killProcess, log, notify, spawn, commitConnection }
}

describe('engine startup lifecycle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it.each(['stdout', 'stderr'])('accepts the authoritative check result on %s', async (stream) => {
    const f = fixture()
    const pending = f.manager.check(params)
    f.children[0].output(wrap({ ok: true, port: 9011, secret: 'legacy-secret' }), stream)
    f.children[0].exit()
    expect((await pending).ok).toBe(true)
    expect(f.log.mock.calls.flat().join('')).not.toContain('legacy-secret')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('preserves structured failures on stderr and rejects contradictory results', async () => {
    const f = fixture()
    const failed = f.manager.check(params)
    f.children[0].output(wrap({ ok: false, reason: ['database error'] }), 'stderr')
    f.children[0].exit(1)
    expect((await failed).status).toBe('database_error')
    const ambiguous = f.manager.check(params)
    f.children[1].output(wrap({ ok: true, port: 9011 }))
    f.children[1].output(wrap({ ok: false, reason: ['database error'] }), 'stderr')
    f.children[1].exit()
    expect((await ambiguous).ok).toBe(false)
    expect(f.commitConnection).not.toHaveBeenCalled()
  })

  it.each([0, 1, 3221225477])('keeps actionable advice and exit code %s for silent check exits', async (code) => {
    const f = fixture()
    const pending = f.manager.check(params)
    f.children[0].exit(code)
    expect(await pending).toMatchObject({ ok: false, status: 'antivirus_blocked', exitCode: code })
    expect(f.log).toHaveBeenCalledWith(`Engine check exited: code=${code}, signal=none`)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not label a diagnostic process crash as antivirus blocking', async () => {
    const f = fixture()
    const pending = f.manager.check(params)
    f.children[0].output('runtime panic: failed to initialize\n', 'stderr')
    f.children[0].exit(2)
    expect(await pending).toMatchObject({ status: 'process_error', exitCode: 2 })
  })

  it.each(['check', 'start'])('allows %s to wait 180 seconds with a single hint after 20 seconds', async (stage) => {
    const f = fixture({ timeouts: {} })
    const pending = f.manager[stage](params)
    await vi.advanceTimersByTimeAsync(19999)
    expect(f.notify).not.toHaveBeenCalledWith('LocalEngine.migration_wait_hint')
    await vi.advanceTimersByTimeAsync(1)
    expect(f.notify.mock.calls.filter(([key]) => key === 'LocalEngine.migration_wait_hint')).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(159999)
    expect(f.children[0].kill).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect((await pending).status).toBe('timeout')
    expect(f.children[0].kill).toHaveBeenCalledOnce()
    expect(f.notify.mock.calls.filter(([key]) => key === 'LocalEngine.migration_wait_hint')).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['check', 'start'])('clears the delayed hint when %s is cancelled or superseded', async (stage) => {
    const f = fixture({ timeouts: {} })
    const first = f.manager[stage](params)
    await vi.advanceTimersByTimeAsync(19000)
    await f.manager.cancel()
    expect((await first).status).toBe('cancelled')
    const second = f.manager.check(params)
    await vi.advanceTimersByTimeAsync(1000)
    expect(f.notify).not.toHaveBeenCalledWith('LocalEngine.migration_wait_hint')
    f.children[1].output(wrap({ ok: true, port: 9011 }))
    f.children[1].exit()
    expect((await second).ok).toBe(true)
    await vi.advanceTimersByTimeAsync(20000)
    expect(f.notify).not.toHaveBeenCalledWith('LocalEngine.migration_wait_hint')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('treats initial, database and delayed progress as best-effort when the window closes', async () => {
    const f = fixture({
      timeouts: {},
      notify: () => {
        throw new Error('Object has been destroyed')
      },
    })
    const pending = f.manager.start(params)
    expect(() => f.children[0].output('<json-f97f966eb7f8ba8fdb63e4d29109c058>\n')).not.toThrow()
    await vi.advanceTimersByTimeAsync(20000)
    expect(f.children[0].kill).not.toHaveBeenCalled()
    f.children[0].output('yak grpc ok\n')
    f.clients.at(-1).done(null, { result: 'Hello Yakit!' })
    f.clients.at(-1).done({ code: 16 })
    expect((await pending).ok).toBe(true)
    await f.manager.dispose()
    expect(vi.getTimerCount()).toBe(0)
  })

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
    expect(f.commitConnection).not.toHaveBeenCalled()
    expect(f.clients[1].connection.password).toBe('')
    f.clients[1].done({ code: 16 })
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
    f.clients[1].done({ code: 16 })
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

  it('ignores a late anonymous-auth rejection after cancellation', async () => {
    const f = fixture()
    const pending = f.manager.start(params)
    await vi.advanceTimersByTimeAsync(50)
    f.clients[0].done(null, { result: 'Hello Yakit!' })
    expect(f.clients).toHaveLength(2)
    await f.manager.cancel()
    f.clients[1].done({ code: 16 })
    expect((await pending).status).toBe('cancelled')
    expect(f.clients[1].close).toHaveBeenCalledOnce()
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
    expect((await second).status).toBe('process_error')
    expect(f.spawn).toHaveBeenCalledOnce()
    f.children[0].exit()
  })

  it('does not connect when superseding an active child whose exit cannot be confirmed', async () => {
    const f = fixture()
    const first = f.manager.start(params)
    f.children[0].kill.mockImplementation(() => false)
    const second = f.manager.connect({
      defaultYakGRPCAddr: 'remote.example:9011',
      password: 'remote',
      caPem: 'cert',
    })
    await vi.advanceTimersByTimeAsync(4000)
    expect(await first).toMatchObject({ ok: false, status: 'process_error' })
    expect(await second).toMatchObject({ ok: false, stage: 'connect', status: 'process_error' })
    expect(f.clients).toHaveLength(0)
    expect(f.commitConnection).not.toHaveBeenCalled()
    f.children[0].exit(null, 'SIGKILL')
  })

  it('blocks independent connections after a settled startup fails to clean up', async () => {
    const f = fixture()
    const pending = f.manager.start(params)
    f.children[0].kill.mockImplementation(() => false)
    await vi.advanceTimersByTimeAsync(5000)
    expect(await pending).toMatchObject({ ok: false, status: 'process_error' })

    const connection = { defaultYakGRPCAddr: 'remote.example:9011', password: 'remote', caPem: '' }
    const clientCount = f.clients.length
    const blockedConnection = f.manager.connect(connection)
    expect(f.clients).toHaveLength(clientCount)
    expect(await blockedConnection).toMatchObject({ ok: false, status: 'process_error' })
    expect(f.commitConnection).not.toHaveBeenCalled()

    f.children[0].exit(null, 'SIGKILL')
    expect((await f.manager.dispose()).ok).toBe(true)
    const reconnect = f.manager.connect(connection)
    expect(f.clients).toHaveLength(clientCount + 1)
    f.clients.at(-1).done(null, { result: 'Hello Yakit!' })
    expect((await reconnect).ok).toBe(true)
    expect(f.commitConnection).toHaveBeenCalledOnce()
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

  it('uses the full connect budget instead of the short startup probe deadline', async () => {
    const f = fixture()
    const startedAt = Date.now()
    const pending = f.manager.connect({ defaultYakGRPCAddr: 'remote.example:9011', password: 'remote', caPem: 'cert' })
    expect(f.clients[0].deadline.getTime()).toBe(startedAt + 10000)
    await vi.advanceTimersByTimeAsync(3000)
    expect(f.commitConnection).not.toHaveBeenCalled()
    f.clients[0].done(null, { result: 'Hello Yakit!' })
    expect((await pending).ok).toBe(true)
  })

  it('times out an unresponsive explicit connection at 10 seconds and closes its RPC resources', async () => {
    const f = fixture()
    const pending = f.manager.connect({ defaultYakGRPCAddr: 'remote.example:9011', password: 'remote', caPem: 'cert' })
    await vi.advanceTimersByTimeAsync(9999)
    expect(f.clients[0].close).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(await pending).toMatchObject({ ok: false, status: 'timeout' })
    expect(f.clients[0].call.cancel).toHaveBeenCalledOnce()
    expect(f.clients[0].close).toHaveBeenCalledOnce()
    expect(f.commitConnection).not.toHaveBeenCalled()
  })

  it('fails an explicit local connection immediately on authentication rejection', async () => {
    const f = fixture()
    const pending = f.manager.connect(
      { defaultYakGRPCAddr: '127.0.0.1:9011', password: 'wrong-password', caPem: '' },
      true,
    )
    f.clients[0].done({ code: 16 })
    expect(await pending).toMatchObject({ ok: false, status: 'dial_error' })
    expect(f.clients).toHaveLength(1)
    expect(f.commitConnection).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shares one absolute connect deadline across both local authentication probes', async () => {
    const f = fixture({ timeouts: { check: 1000, start: 1000, connect: 1000, probe: 100, retry: 50 } })
    const pending = f.manager.connect(
      { defaultYakGRPCAddr: '127.0.0.1:9011', password: 'local-password', caPem: '' },
      true,
    )
    const deadline = f.clients[0].deadline.getTime()
    await vi.advanceTimersByTimeAsync(300)
    f.clients[0].done(null, { result: 'Hello Yakit!' })
    expect(f.clients[1].deadline.getTime()).toBe(deadline)
    f.clients[1].done({ code: 16 })
    expect((await pending).ok).toBe(true)
  })

  it('does not extend the connect budget when the anonymous authentication probe starts late', async () => {
    const f = fixture({ timeouts: { check: 1000, start: 1000, connect: 1000, probe: 100, retry: 50 } })
    const pending = f.manager.connect(
      { defaultYakGRPCAddr: '127.0.0.1:9011', password: 'local-password', caPem: '' },
      true,
    )
    const deadline = f.clients[0].deadline.getTime()
    await vi.advanceTimersByTimeAsync(900)
    f.clients[0].done(null, { result: 'Hello Yakit!' })
    expect(f.clients[1].deadline.getTime()).toBe(deadline)
    await vi.advanceTimersByTimeAsync(100)
    expect(await pending).toMatchObject({ ok: false, status: 'timeout' })
    expect(f.clients[1].close).toHaveBeenCalledOnce()
    expect(f.commitConnection).not.toHaveBeenCalled()
  })

  it('reports retained child cleanup failure and blocks later operations until cleanup succeeds', async () => {
    const f = fixture()
    const started = f.manager.start(params)
    await vi.advanceTimersByTimeAsync(50)
    f.clients[0].done(null, { result: 'Hello Yakit!' })
    f.clients[1].done({ code: 16 })
    expect((await started).ok).toBe(true)
    f.children[0].kill.mockImplementation(() => false)

    const disposing = f.manager.dispose()
    await vi.advanceTimersByTimeAsync(4000)
    expect(await disposing).toMatchObject({ ok: false, canceled: 0, status: 'process_error' })
    expect(
      await f.manager.connect({ defaultYakGRPCAddr: 'remote.example:9011', password: 'remote', caPem: 'cert' }),
    ).toMatchObject({
      ok: false,
      status: 'process_error',
    })
    expect(f.clients).toHaveLength(2)

    f.children[0].exit(null, 'SIGKILL')
    expect(await f.manager.dispose()).toEqual({ ok: true, canceled: 0, status: 'cancelled' })
  })

  it('propagates active cleanup failure without double-counting its child', async () => {
    const f = fixture()
    const pending = f.manager.start(params)
    f.children[0].kill.mockImplementation(() => false)
    const cancelling = f.manager.cancel()
    await vi.advanceTimersByTimeAsync(4000)
    expect(await pending).toMatchObject({ ok: false, status: 'process_error' })
    expect(await cancelling).toMatchObject({ ok: false, canceled: 0, status: 'process_error' })
    f.children[0].exit(null, 'SIGKILL')
  })

  it('accepts cleanup when an already-finishing timed out operation confirms child exit', async () => {
    const f = fixture()
    const pending = f.manager.start(params)
    f.children[0].kill.mockImplementation(() => true)
    await vi.advanceTimersByTimeAsync(1000)

    const cancelling = f.manager.cancel()
    f.children[0].exit(null, 'SIGTERM')
    expect((await pending).status).toBe('timeout')
    expect(await cancelling).toEqual({ ok: true, canceled: 0, status: 'cancelled' })
  })

  it('does not begin a new operation until retained child cleanup has settled', async () => {
    const f = fixture()
    const started = f.manager.start(params)
    await vi.advanceTimersByTimeAsync(50)
    f.clients[0].done(null, { result: 'Hello Yakit!' })
    f.clients[1].done({ code: 16 })
    await started
    f.children[0].kill.mockImplementation(() => true)

    const disposing = f.manager.dispose()
    const connecting = f.manager.connect({
      defaultYakGRPCAddr: 'remote.example:9011',
      password: 'remote',
      caPem: 'cert',
    })
    expect(f.clients).toHaveLength(2)
    f.children[0].exit(null, 'SIGTERM')
    expect(await disposing).toEqual({ ok: true, canceled: 1, status: 'cancelled' })
    await vi.advanceTimersByTimeAsync(0)
    expect(f.clients).toHaveLength(3)
    f.clients[2].done(null, { result: 'Hello Yakit!' })
    expect((await connecting).ok).toBe(true)
  })

  it('lets a repeated dispose invalidate an operation queued behind cleanup', async () => {
    const f = fixture()
    const started = f.manager.start(params)
    await vi.advanceTimersByTimeAsync(50)
    f.clients[0].done(null, { result: 'Hello Yakit!' })
    f.clients[1].done({ code: 16 })
    await started
    f.children[0].kill.mockImplementation(() => true)

    const firstDispose = f.manager.dispose()
    const connecting = f.manager.connect({
      defaultYakGRPCAddr: 'remote.example:9011',
      password: 'remote',
      caPem: 'cert',
    })
    const secondDispose = f.manager.dispose()
    f.children[0].exit(null, 'SIGTERM')

    expect(await firstDispose).toEqual({ ok: true, canceled: 1, status: 'cancelled' })
    expect(await secondDispose).toEqual({ ok: true, canceled: 1, status: 'cancelled' })
    expect(await connecting).toMatchObject({ ok: false, stage: 'connect', status: 'cancelled' })
    expect(f.clients).toHaveLength(2)
    expect(f.commitConnection).toHaveBeenCalledOnce()
  })

  it('logs bounded cleanup evidence and ignores logging failures', async () => {
    const f = fixture({
      log: () => {
        throw new Error('log unavailable')
      },
    })
    const pending = f.manager.start(params)
    const cancelling = f.manager.cancel()
    await vi.advanceTimersByTimeAsync(0)
    expect((await pending).status).toBe('cancelled')
    expect(await cancelling).toEqual({ ok: true, canceled: 1, status: 'cancelled' })

    const withLog = fixture()
    const run = withLog.manager.start(params)
    const cancel = withLog.manager.cancel()
    await vi.advanceTimersByTimeAsync(0)
    await run
    await cancel
    const cleanupLogs = withLog.log.mock.calls
      .flat()
      .filter((line) => String(line).includes('cleanup_'))
      .join('\n')
    expect(cleanupLogs).toContain('cleanup_start')
    expect(cleanupLogs).toContain('cleanup_result')
    expect(cleanupLogs).toContain('operationId')
    expect(cleanupLogs).toContain('ownedChildPid')
    expect(cleanupLogs).toContain('confirmedExit')
    expect(cleanupLogs).not.toContain(params.password)
  })

  it('logs cleanup action boundaries even when there is no owned child', async () => {
    const f = fixture()
    expect(await f.manager.dispose()).toEqual({ ok: true, canceled: 0, status: 'cancelled' })
    const events = f.log.mock.calls.flat().map((line) => JSON.parse(line))
    expect(events).toEqual([
      expect.objectContaining({
        event: 'cleanup_start',
        stage: 'dispose',
        ownedChildPid: null,
        confirmedExit: null,
      }),
      expect.objectContaining({
        event: 'cleanup_result',
        stage: 'dispose',
        ownedChildPid: null,
        confirmedExit: true,
      }),
    ])
    expect(events[0].operationId).toBe(events[1].operationId)
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

  it('spawns an owned POSIX process group and waits for the whole group to exit', async () => {
    const f = fixture()
    const running = f.manager.start(params)
    const child = f.children[0]
    expect(child.settings.detached).toBe(true)
    child.kill.mockImplementation(() => true)

    const cancelling = f.manager.cancel()
    child.exitParent(null, 'SIGTERM')
    await vi.advanceTimersByTimeAsync(2000)
    expect(f.killProcess).toHaveBeenCalledWith(-child.pid, 'SIGTERM')
    expect(f.killProcess).toHaveBeenCalledWith(-child.pid, 'SIGKILL')
    expect(await Promise.race([cancelling.then(() => 'settled'), Promise.resolve('pending')])).toBe('pending')

    f.processGroups.set(child.pid, false)
    await vi.advanceTimersByTimeAsync(50)
    expect((await running).status).toBe('cancelled')
    expect(await cancelling).toEqual({ ok: true, canceled: 1, status: 'cancelled' })

    const callsAfterExit = f.killProcess.mock.calls.length
    f.processGroups.set(child.pid, true)
    f.manager.killOnExit()
    expect(f.killProcess).toHaveBeenCalledTimes(callsAfterExit)
  })

  it('reports cleanup failure when the POSIX group survives the four second deadline', async () => {
    const f = fixture()
    const running = f.manager.start(params)
    const child = f.children[0]
    child.kill.mockImplementation(() => true)

    const cancelling = f.manager.cancel()
    child.exitParent(null, 'SIGTERM')
    await vi.advanceTimersByTimeAsync(4000)
    expect(await running).toMatchObject({ ok: false, status: 'process_error' })
    expect(await cancelling).toMatchObject({ ok: false, status: 'process_error' })

    f.processGroups.set(child.pid, false)
    expect((await f.manager.dispose()).ok).toBe(true)
  })

  it('uses only the owned POSIX group for the synchronous exit fallback', () => {
    const f = fixture()
    f.manager.start(params)
    const child = f.children[0]
    const externalGroupId = 99999
    f.processGroups.set(externalGroupId, true)

    f.manager.killOnExit()

    expect(f.killProcess).toHaveBeenCalledWith(-child.pid, 'SIGKILL')
    expect(f.killProcess.mock.calls.some(([pid]) => pid > 0)).toBe(false)
    expect(f.killProcess.mock.calls.some(([pid]) => pid === -externalGroupId)).toBe(false)
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
