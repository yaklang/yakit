const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const net = require('node:net')
const childProcess = require('node:child_process')
const { createEngineStartup } = require('../engineStartup')
const { createEngineGrpcClient } = require('../engineGrpcClient')
const { grpc, Yak } = require('../../../../../scripts/engine-startup/grpc.cjs')

const scripts = path.resolve(__dirname, '../../../../../scripts/engine-startup')
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const alive = (child) => child.exitCode === null && child.signalCode === null
const pidAlive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
const listen = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
const close = (server) => new Promise((resolve) => server.close(resolve))

describe('real child processes and authenticated TCP', () => {
  let dir, fixturePath, managers, children, servers, descendants
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'Yakit startup 空格 '))
    fixturePath = path.join(dir, 'engine fixture.cjs')
    await fs.copyFile(path.join(scripts, 'fixtures/engine.cjs'), fixturePath)
    managers = []
    children = []
    servers = []
    descendants = []
  })
  afterEach(async () => {
    await Promise.all(managers.map((manager) => manager.dispose()))
    for (const pid of descendants) {
      if (pidAlive(pid)) process.kill(pid, 'SIGKILL')
    }
    await Promise.all(servers.map(close))
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
    expect(children.filter(alive)).toHaveLength(0)
  })

  async function freePort() {
    const server = await listen()
    const port = server.address().port
    await close(server)
    return port
  }
  function setup(contract = 'v2', scenario = 'success', timeouts = {}) {
    const commitConnection = vi.fn()
    const logs = []
    const manager = createEngineStartup({
      getCommand: () => process.execPath,
      getEnv: () => ({
        ...process.env,
        YAKIT_HOME: dir,
        YAKIT_TEST_GRPC_HELPER: path.join(scripts, 'grpc.cjs'),
        YAKIT_TEST_CONTRACT: contract,
        YAKIT_TEST_SCENARIO: scenario,
        YAKIT_TEST_DESCENDANT: path.join(dir, 'descendant'),
      }),
      spawn: (command, args, options) => {
        const child = childProcess.spawn(command, [fixturePath, ...args], options)
        children.push(child)
        return child
      },
      createClient: (connection) => createEngineGrpcClient(Yak, connection),
      commitConnection,
      log: (line) => logs.push(line),
      timeouts: { check: 8000, start: 8000, probe: 500, retry: 200, ...timeouts },
    })
    managers.push(manager)
    return { manager, commitConnection, logs }
  }
  function echo(connection) {
    const client = createEngineGrpcClient(Yak, connection)
    return new Promise((resolve) => {
      client.Echo({ text: 'auth test' }, { deadline: new Date(Date.now() + 2000) }, (error, data) => {
        client.close()
        resolve({ error, data })
      })
    })
  }

  it.each(['legacy', 'v1', 'v2'])('%s: checks, starts, authenticates and releases the port', async (contract) => {
    const { manager, commitConnection, logs } = setup(contract)
    const port = await freePort()
    const checked = await manager.check({ port })
    expect(checked.ok).toBe(true)
    expect(checked.json.secret).toMatch(/^[0-9a-f]{64}$/)
    const result = await manager.start({ port, password: checked.json.secret })
    expect(result).toMatchObject({ ok: true, status: 'success' })
    expect(commitConnection).toHaveBeenCalledOnce()
    const connection = commitConnection.mock.calls[0][0]
    expect((await echo(connection)).data).toEqual({ result: 'auth test' })
    for (const password of ['', '***', 'incorrect']) {
      expect((await echo({ ...connection, password })).error.code).toBe(grpc.status.UNAUTHENTICATED)
    }
    expect(logs.join('\n')).not.toContain(checked.json.secret)
    await manager.dispose()
    const replacement = net.createServer()
    await new Promise((resolve, reject) => {
      replacement.once('error', reject)
      replacement.listen(port, '127.0.0.1', resolve)
    })
    servers.push(replacement)
  })

  it.each(['legacy', 'v2'])('%s: preserves an unrelated process occupying the port', async (contract) => {
    const occupied = await listen()
    servers.push(occupied)
    const { manager, commitConnection } = setup(contract)
    const result = await manager.check({ port: occupied.address().port })
    expect(result.status).toBe('port_occupied')
    expect(occupied.listening).toBe(true)
    expect(commitConnection).not.toHaveBeenCalled()
  })

  it.each(['hang', 'slow-rpc', 'wrong-auth'])('%s: reaches a deadline and cleans up', async (scenario) => {
    const { manager, commitConnection } = setup('v2', scenario, { start: 2000 })
    const result = await manager.start({ port: await freePort(), password: 'real-test-password' })
    expect(result.status).toBe('timeout')
    expect(commitConnection).not.toHaveBeenCalled()
    expect(children.every((child) => !alive(child))).toBe(true)
  })

  it('cancels a live process and can start again immediately', async () => {
    const { manager, logs } = setup()
    const port = await freePort()
    const first = manager.start({ port, password: 'first-password' })
    await vi.waitFor(() => expect(children).toHaveLength(1))
    await manager.cancel()
    expect((await first).status).toBe('cancelled')
    expect((await manager.start({ port, password: 'second-password' })).ok).toBe(true)
    expect(logs.join('\n')).not.toContain('second-password')
  })

  it('reports an exited executable instead of hanging', async () => {
    const { manager } = setup('v2', 'crash')
    expect((await manager.start({ port: await freePort(), password: 'password' })).status).toBe('engine_exited')
  })

  it('does not commit a connection advertising an unexpected transport', async () => {
    const { manager, commitConnection } = setup('v2', 'wrong-transport', { retry: 3000 })
    expect((await manager.start({ port: await freePort(), password: 'password' })).status).toBe('protocol_error')
    expect(commitConnection).not.toHaveBeenCalled()
  })

  it('keeps client credentials immutable across other connection attempts', async () => {
    const { manager, commitConnection } = setup()
    const port = await freePort()
    await manager.start({ port, password: 'snapshot-secret' })
    const settings = { ...commitConnection.mock.calls[0][0] }
    const client = createEngineGrpcClient(Yak, settings)
    settings.password = 'changed-global-value'
    try {
      const result = await new Promise((resolve, reject) =>
        client.Echo({ text: 'snapshot' }, { deadline: new Date(Date.now() + 2000) }, (error, data) =>
          error ? reject(error) : resolve(data),
        ),
      )
      expect(result.result).toBe('snapshot')
    } finally {
      client.close()
    }
  })

  it.skipIf(process.platform !== 'win32')('Windows: cancels the owned process tree with taskkill', async () => {
    const { manager } = setup('v2', 'tree')
    const pending = manager.start({ port: await freePort(), password: 'password' })
    let pid
    await vi.waitFor(
      async () => {
        pid = Number(await fs.readFile(path.join(dir, 'descendant'), 'utf8'))
        expect(pidAlive(pid)).toBe(true)
      },
      { timeout: 5000 },
    )
    descendants.push(pid)
    await manager.cancel()
    expect((await pending).status).toBe('cancelled')
    await vi.waitFor(() => expect(pidAlive(pid)).toBe(false), { timeout: 2000 })
  })
})
