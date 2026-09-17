const { EventEmitter } = require('events')
const { createEngineSession, mayFallback } = require('../engineSession')
const { observedEngine } = require('../engineProcessDTO')
const marker = '50551aa97b5aa5ae8a3c3243ac60a8a7'
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve()
}

function fixture(options = {}) {
  const children = []
  const connections = []
  const commitConnection = vi.fn()
  const notify = vi.fn()
  const spawn = vi.fn((file, args) => {
    const child = Object.assign(new EventEmitter(), {
      pid: 10000 + children.length,
      exitCode: null,
      signalCode: null,
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      args,
    })
    child.exit = (code = 0) => {
      child.exitCode = code
      child.emit('exit', code, null)
      child.emit('close', code, null)
    }
    child.kill = vi.fn(() => {
      queueMicrotask(() => child.exit())
      return true
    })
    child.output = (text, stream = 'stdout') => child[stream].emit('data', Buffer.from(text))
    child.endpoint = () =>
      args.includes('--transport')
        ? { transport: args[args.indexOf('--transport') + 1], address: args[args.indexOf('--socket-path') + 1] }
        : { transport: 'tcp', address: `127.0.0.1:${args[args.indexOf('--port') + 1]}` }
    child.checked = (extra = {}) => {
      child.output(`<json-${marker}>${JSON.stringify({ ok: true, ...child.endpoint(), ...extra })}</json-${marker}>\n`)
      child.exit()
    }
    child.ready = (extra = {}) =>
      child.output(`yak grpc ready ${JSON.stringify({ schemaVersion: 2, ...child.endpoint(), ...extra })}\n`)
    children.push(child)
    return child
  })
  const session = createEngineSession({
    getCommand: () => '/fake/yak',
    getEnv: () => ({}),
    spawn,
    commitConnection,
    notify,
    platform: 'win32',
    execFile: (file, args, opts, cb) => {
      const child = children.find((item) => item.pid === Number(args[1]))
      child?.kill()
      cb(null)
    },
    createClient: (connection) => {
      connections.push(connection)
      return {
        close: vi.fn(),
        Echo: (request, opts, done) => {
          queueMicrotask(() => done(connection.password ? null : { code: 16 }, { result: request.text }))
          return { cancel: vi.fn() }
        },
      }
    },
    ...options,
  })
  return { session, children, connections, commitConnection, notify, spawn }
}

describe('session orchestration', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('prepares without spawning, then checks and authenticates one IPC instance', async () => {
    const f = fixture()
    const prepared = f.session.prepare({ port: 9011 })
    expect(f.spawn).not.toHaveBeenCalled()
    expect(JSON.stringify(prepared)).not.toMatch(/secret|password|pipe/)
    const pending = f.session.launch({ launchId: prepared.json.launchId })
    f.children[0].checked()
    await flush()
    expect(f.children).toHaveLength(2)
    expect(f.children[0].endpoint()).toEqual(f.children[1].endpoint())
    expect(f.connections).toHaveLength(0)
    f.children[1].ready()
    const result = await pending
    expect(result.ok).toBe(true)
    expect(result.instance).toMatchObject({ transport: 'npipe', current: true, ownership: 'managed' })
    expect(result.instance.port).toBeUndefined()
    const password = f.commitConnection.mock.calls[0][0].password
    expect(password).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(f.session.list())).not.toMatch(/password|secret|cmd|origin/)
    expect(JSON.stringify(result)).not.toContain(password)
    expect((await f.session.connect({ InstanceId: result.instance.id })).ok).toBe(true)
    expect(f.children).toHaveLength(2)
    expect((await f.session.stopAll()).stopped).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('recognizes an actual unsupported-flag diagnostic and falls back once with legacy arguments', async () => {
    const f = fixture()
    const pending = f.session.launch({ port: 9011 })
    f.children[0].output('Incorrect Usage. flag provided but not defined: -transport\n', 'stderr')
    f.children[0].exit(1)
    await flush()
    expect(f.children[1].args).toEqual(['check-secret-local-grpc', '--port', '9011'])
    f.children[1].checked({ port: 9011 })
    await flush()
    f.children[2].ready()
    const result = await pending
    expect(result).toMatchObject({ ok: true, fallback: true, instance: { transport: 'tcp' } })
    expect(result.attempts).toHaveLength(1)
    expect(result.instance.fallbackReason).toEqual({
      status: 'ipc_unsupported',
      reasonCode: 'ipc_cli_unsupported',
      stage: 'check',
    })
    expect(f.children[2].args).toContain('--local-password')
    expect(f.children[2].args).not.toContain('--transport')
    await f.session.stopAll()
  })

  it.each(['ipc', 'tcp'])('honors explicit %s policy without fallback', async (policy) => {
    const f = fixture()
    const pending = f.session.launch({ port: 9011, policy })
    f.children[0].output('flag provided but not defined: -transport\n')
    f.children[0].exit(1)
    expect((await pending).ok).toBe(false)
    expect(f.children).toHaveLength(1)
  })

  it.each(['ipc_bind_failed', 'database_error', 'ipc_endpoint_invalid'])(
    'does not hide %s using TCP',
    async (reasonCode) => {
      const f = fixture()
      const pending = f.session.launch({ port: 9011 })
      f.children[0].checked({ ok: false, reasonCode })
      expect((await pending).ok).toBe(false)
      expect(f.children).toHaveLength(1)
    },
  )

  it('shares the 180-second check budget and emits the 20-second hint once across fallback', async () => {
    const f = fixture()
    const pending = f.session.launch({ port: 9011 })
    await vi.advanceTimersByTimeAsync(170000)
    f.children[0].checked({ ok: false, reasonCode: 'ipc_bind_denied' })
    await flush()
    expect(f.children).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(10000)
    expect((await pending).status).toBe('timeout')
    expect(f.notify.mock.calls.filter(([key]) => key === 'LocalEngine.migration_wait_hint')).toHaveLength(1)
    expect(f.children).toHaveLength(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects mismatched ready before sending a password', async () => {
    const f = fixture()
    const pending = f.session.launch({ port: 9011 })
    f.children[0].checked()
    await flush()
    f.children[1].ready({ address: '\\\\.\\pipe\\foreign' })
    expect((await pending).status).toBe('protocol_error')
    expect(f.connections).toHaveLength(0)
    expect(f.commitConnection).not.toHaveBeenCalled()
  })

  it('cancels without fallback and blocks another launch until a stubborn owned child exits', async () => {
    const f = fixture({ execFile: () => {} })
    const pending = f.session.launch({ port: 9011 })
    f.children[0].kill.mockImplementation(() => false)
    const cancelled = f.session.cancel()
    expect((await f.session.launch({ port: 9011 })).status).toBe('operation_busy')
    await vi.advanceTimersByTimeAsync(4000)
    expect((await cancelled).stopped).toBe(false)
    expect((await pending).status).toBe('stop_failed')
    expect((await f.session.launch({ port: 9011 })).status).toBe('stop_failed')
    expect(f.spawn).toHaveBeenCalledOnce()
    f.children[0].exit()
  })

  it('rejects arbitrary IDs/PIDs and never spawns to reconnect an unknown engine', async () => {
    const f = fixture()
    expect((await f.session.stop(123)).status).toBe('not_owned')
    expect((await f.session.stop('observed-123')).status).toBe('not_owned')
    expect((await f.session.connect({ InstanceId: 'foreign' })).ok).toBe(false)
    expect(f.spawn).not.toHaveBeenCalled()
  })

  it('cannot report success or start another engine during a restore/install mutation', async () => {
    const f = fixture()
    let finish
    const mutation = f.session.withStopped(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    await flush()
    expect((await f.session.cancel()).ok).toBe(false)
    expect((await f.session.stopAll()).ok).toBe(false)
    expect((await f.session.launch({ port: 9011 })).status).toBe('operation_busy')
    expect(f.spawn).not.toHaveBeenCalled()
    finish()
    await mutation
    expect((await f.session.stopAll()).stopped).toBe(true)
  })

  it('shares the start budget across an IPC bind failure and TCP fallback', async () => {
    const f = fixture({
      createClient: () => ({
        close: vi.fn(),
        Echo: (_request, _options, done) => {
          queueMicrotask(() => done({ code: 14 }))
          return { cancel: vi.fn() }
        },
      }),
    })
    const pending = f.session.launch({ port: 9011 })
    f.children[0].checked()
    await flush()
    await vi.advanceTimersByTimeAsync(170000)
    f.children[1].output('yak grpc failed {"schemaVersion":2,"transport":"npipe","reasonCode":"ipc_bind_denied"}\n')
    await flush()
    f.children[2].checked({ port: 9011 })
    await flush()
    await vi.advanceTimersByTimeAsync(10000)
    expect((await pending).status).toBe('timeout')
    expect(f.children).toHaveLength(4)
    expect(f.notify.mock.calls.filter(([key]) => key === 'LocalEngine.migration_wait_hint')).toHaveLength(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('enforces the total operation deadline even when individual stages have time remaining', async () => {
    const f = fixture({ timeouts: { check: 180000, start: 180000, total: 210000 } })
    const pending = f.session.launch({ port: 9011 })
    await vi.advanceTimersByTimeAsync(170000)
    f.children[0].checked()
    await flush()
    await vi.advanceTimersByTimeAsync(40000)
    expect((await pending).status).toBe('timeout')
    expect(f.children).toHaveLength(2)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('process boundary and fallback allowlist', () => {
  it('rejects contradictory bind diagnostics from database or authentication stages', () => {
    for (const phase of ['database', 'auth', 'dial', 'version_rpc', 'wait_connect'])
      expect(mayFallback({ stopped: true, engineEvent: { phase, reasonCode: 'ipc_bind_denied' } })).toBe(false)
  })
  it('does not leak argv, guess a port, or take ownership of discovery', () => {
    const result = observedEngine({
      pid: 42,
      cmd: 'yak grpc --transport npipe --local-password private',
      origin: { secret: 'private' },
    })
    expect(result).toMatchObject({
      ownership: 'external',
      current: false,
      transport: 'npipe',
      actions: { stop: false, connect: false },
    })
    expect(result.port).toBeUndefined()
    expect(JSON.stringify(result)).not.toMatch(/private|secret|cmd|origin/)
    expect(observedEngine({ pid: 42, cmd: 'yak grpc --port 60001' }).port).toBe(60001)
    expect(observedEngine({ pid: 42, cmd: 'yak grpc' }).port).toBeUndefined()
  })
  it.each(['timeout', 'cancelled', 'stop_failed', 'protocol_error', 'database_error'])(
    'does not fallback on %s',
    (status) => {
      expect(mayFallback({ status, stopped: true })).toBe(false)
    },
  )
})
