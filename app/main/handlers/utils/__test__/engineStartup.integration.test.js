const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const net = require('node:net')
const childProcess = require('node:child_process')
const { createEngineStartup } = require('../engineStartup')
const { createEngineGrpcClient } = require('../engineGrpcClient')
const { grpc, Yak } = require('../../../../../scripts/engine-startup/grpc.cjs')

// Self-signed credentials used only by the loopback integration test.
const TLS_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDNWLiKxGTU4JCx
G098i8B/fefyOxuEqSqEfntvOHCNV2oMe+voJWFW0Dy5tCjas47pFvSqmAxCEmhp
1mH18Uw9toE7X2P8tbbu6v+PN6OvsPXolRQy4IRBgmFAmKZIbfzhJN1qOpYvbANR
DP5VrICb3izTu3AbMAHk1pborcrQPEwcl7gImi2pP+MZEVU5XyLhAz5wkSZEw0wb
PN0djSISh3QALmbEX55KveoUyzBcvZYO5RFA392ltOPJaYUkPRz4q9Ve+nTx6b43
KX0AFhySzBC3wQLz1f1tjwrQMLuqI8K6SX5wSoheokZDhWdFxdXP07fdOcwTqo/x
n6ZzUZL/AgMBAAECggEAMA1a4d4jWk1Sjp89cn+hhDQKWvzJ67lKYcbXS6eBbxHN
ly5IfgKBTLdd/nbSOJtcDd95UZJTDAMSu/GW6t6UYLyccTBZTYGYVUBYnUL/4tUe
Nlbsaxtu14WTDHKsNrbGPklKJtme22oDPKw1uAat8cuD4egyy6noR4yPs9M3apLF
sJKzGdAhUGJyxw9xpXEVcDQCd4Xc2bnshqKi2E2oste1BJ1xxigRVRQc5qAZ/ERI
WWS9aTa6eaXiOstyhzsIfPVZNhcJX0aLWQ+AAc7f92v1QTcuPiFChF+OG72EXLCu
LoLQ1sHhRkiFVk93JtK08mTVFXjJswQ9QCjgIRgzQQKBgQD/NBbKpAohCZTC2Wh1
n2pzlEeZz2Lxf4kcatbgM5TXJ4XsPDq71yoZEKl1ShX8NdVpZ+LcJU4nyXaLUZuN
ZbRQjM0L85to+RuejHPlU4vA4cKoUmP36zcQMCALp9Ev7UZw2RFV9IJkk0VjhRKZ
CmW+CZCa+5tQEr7/L73Q1OIXpQKBgQDN/MumRe15/GrW6K/OSvymMojaQSiGPObA
cHIdlSmNjA0Ea+gTkDusAG6yk3iy8acP+sm9OJy7mKpQ+nKJQqXqVb0H/kNpnO3/
FtSwn99lEWN4d9oMJZuTzmzzwGrC/L85lq+wZyvC+UV0l1/AX0RjAcrM2ei/YPil
6sb82Ove0wKBgQCJwWRMHiAZlUJnq1NnqpWbrf64V+ng0icA3+r9OtqtCPiRfDF4
E7z1qrjORx929Ngt/ZXHn5uAfo8uxO5idPPQRzCnsufA0jbGbqpgr6hQhYy9rzun
J6ChbFjf8cZJSJstbv6cl0+LWrOp9LsFQUeKPT+BaS99GaFfvjWH9GHWwQKBgQCA
/EFRtwwDjOoh9MbRuOcH8zD66j5EALLF4iOzHopMllw4XpGOXozfIc4viGTWOLfS
K8pT8LVES06rMoiyJsfaOyIJdVAlPB1T1KoOh63NjdvpvbMOVCZdoa9b2yt/OeFM
YG1XWuNuTcUOQxO0VHNwQ9kH+ZPi8wgAbUl5XyQj/QKBgCx9lGcpC+/dVHgLb/V6
+DCjswqvFAcjh4jD/cusx3L9JyfLSdQDkDmmCvY5wfmhvshDy9X+VIOVu8W4kL2I
6dsowgBbotmDf5W/hYRqeESCwQUX1ucxdI7iEbf/YNoqMsFW7u0so4c20N2P0Xf0
ZaoxdgiavpPWtOG++cMDeCBm
-----END PRIVATE KEY-----`
const TLS_CERT = `-----BEGIN CERTIFICATE-----
MIIC6jCCAdKgAwIBAgIJAIQQe8RFAyPxMA0GCSqGSIb3DQEBCwUAMBQxEjAQBgNV
BAMMCWxvY2FsaG9zdDAeFw0yNjA5MTEwNDE4NTJaFw0zNjA5MDgwNDE4NTJaMBQx
EjAQBgNVBAMMCWxvY2FsaG9zdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC
ggEBAM1YuIrEZNTgkLEbT3yLwH995/I7G4SpKoR+e284cI1Xagx76+glYVbQPLm0
KNqzjukW9KqYDEISaGnWYfXxTD22gTtfY/y1tu7q/483o6+w9eiVFDLghEGCYUCY
pkht/OEk3Wo6li9sA1EM/lWsgJveLNO7cBswAeTWluitytA8TByXuAiaLak/4xkR
VTlfIuEDPnCRJkTDTBs83R2NIhKHdAAuZsRfnkq96hTLMFy9lg7lEUDf3aW048lp
hSQ9HPir1V76dPHpvjcpfQAWHJLMELfBAvPV/W2PCtAwu6ojwrpJfnBKiF6iRkOF
Z0XF1c/Tt905zBOqj/GfpnNRkv8CAwEAAaM/MD0wGgYDVR0RBBMwEYIJbG9jYWxo
b3N0hwR/AAABMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgKkMA0GCSqG
SIb3DQEBCwUAA4IBAQCZSOMRodKmFvFgvlYswO3UJ/JHl4AKo81i4gFgL9VQRX0P
ggiThzt0CH07KAHyWgYXzlvxvARtZDhFEodw9P2i+N88WKNjjzwQJYXnLd+gbMU7
0pqza6aMcthtW6fr/538BXBcFQcBGZEy0/aV7f+WJIwc8sIhdw9P5of6kimzNg00
P/4wDSVcL+kGI6JXchxNG+eUrWkE4p05iFy1HQsUDHe+xHeNveIwx8lSvDffQAoV
2cFm522BPkMrctBk8ovOpm7qoKZ4OStxE1XDGs7xavSB5zMswKIAsU5LcP7BgW/X
d6R3Nz1x7W5f+JHhLWp23B9oSl+/gey9H5EE6wDc
-----END CERTIFICATE-----`

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
const processGroupAlive = (pid) => {
  try {
    process.kill(-pid, 0)
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
  let dir, fixturePath, managers, children, servers, descendants, externalChildren
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'Yakit startup 空格 '))
    fixturePath = path.join(dir, 'engine fixture.cjs')
    await fs.copyFile(path.join(scripts, 'fixtures/engine.cjs'), fixturePath)
    managers = []
    children = []
    servers = []
    descendants = []
    externalChildren = []
  })
  afterEach(async () => {
    await Promise.all(managers.map((manager) => manager.dispose()))
    for (const pid of descendants) {
      try {
        if (pidAlive(pid)) process.kill(pid, 'SIGKILL')
      } catch {}
    }
    for (const child of externalChildren) {
      try {
        if (pidAlive(child.pid)) process.kill(-child.pid, 'SIGKILL')
      } catch {}
    }
    await vi.waitFor(
      () => {
        expect(descendants.filter(pidAlive)).toHaveLength(0)
        expect(externalChildren.filter((child) => pidAlive(child.pid))).toHaveLength(0)
      },
      { timeout: 5000 },
    )
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
  async function readDescendantPid() {
    let pid
    await vi.waitFor(
      async () => {
        pid = Number(await fs.readFile(path.join(dir, 'descendant'), 'utf8'))
        expect(pidAlive(pid)).toBe(true)
      },
      { timeout: 5000 },
    )
    descendants.push(pid)
    return pid
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
        child.spawnOptions = options
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
    expect(await manager.dispose()).toEqual({ ok: true, canceled: 1, status: 'cancelled' })
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
    expect(await manager.cancel()).toEqual({ ok: true, canceled: 1, status: 'cancelled' })
    expect((await first).status).toBe('cancelled')
    expect((await manager.start({ port, password: 'second-password' })).ok).toBe(true)
    expect(logs.join('\n')).not.toContain('second-password')
  })

  it('reports an exited executable instead of hanging', async () => {
    const { manager } = setup('v2', 'crash')
    expect((await manager.start({ port: await freePort(), password: 'password' })).status).toBe('engine_exited')
  })

  it('rejects an Echo server that accepts anonymous requests', async () => {
    const { manager, commitConnection } = setup('v2', 'unauthenticated')
    const result = await manager.start({ port: await freePort(), password: 'password' })
    expect(result.status).toBe('protocol_error')
    expect(commitConnection).not.toHaveBeenCalled()
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

  it('allows a remote Echo response after the short startup probe window', async () => {
    const port = await freePort()
    const server = new grpc.Server()
    server.addService(Yak.service, {
      Echo(call, done) {
        setTimeout(() => done(null, { result: call.request.text }), 750)
      },
    })
    await new Promise((resolve, reject) => {
      server.bindAsync(`127.0.0.1:${port}`, grpc.ServerCredentials.createInsecure(), (error) =>
        error ? reject(error) : resolve(),
      )
    })
    server.start()

    const { manager, commitConnection } = setup('v2', 'success', { connect: 2000, probe: 100 })
    try {
      const result = await manager.connect({ defaultYakGRPCAddr: `127.0.0.1:${port}`, password: '', caPem: '' })
      expect(result).toMatchObject({ ok: true, status: 'success' })
      expect(commitConnection).toHaveBeenCalledOnce()
    } finally {
      server.forceShutdown()
    }
  })

  it('allows a delayed TLS Echo within the shared connect budget', async () => {
    const port = await freePort()
    const server = new grpc.Server()
    server.addService(Yak.service, {
      Echo(call, done) {
        setTimeout(() => done(null, { result: call.request.text }), 750)
      },
    })
    await new Promise((resolve, reject) => {
      const credentials = grpc.ServerCredentials.createSsl(null, [
        { private_key: Buffer.from(TLS_KEY), cert_chain: Buffer.from(TLS_CERT) },
      ])
      server.bindAsync(`127.0.0.1:${port}`, credentials, (error) => (error ? reject(error) : resolve()))
    })
    server.start()

    const { manager, commitConnection } = setup('v2', 'success', { connect: 2000, probe: 100 })
    try {
      const result = await manager.connect({
        defaultYakGRPCAddr: `localhost:${port}`,
        password: '',
        caPem: TLS_CERT,
      })
      expect(result).toMatchObject({ ok: true, status: 'success' })
      expect(commitConnection).toHaveBeenCalledOnce()
    } finally {
      server.forceShutdown()
    }
  })

  it.skipIf(process.platform === 'win32').each([
    ['normal helper', 'tree'],
    ['SIGTERM-ignoring helper', 'tree-ignore-term'],
  ])('POSIX: cancel removes the entire owned process group with a %s', async (_label, scenario) => {
    const { manager } = setup('v2', scenario)
    const pending = manager.start({ port: await freePort(), password: 'password' })
    await vi.waitFor(() => expect(children).toHaveLength(1))
    const parent = children[0]
    const helperPid = await readDescendantPid()

    expect(parent.spawnOptions.detached).toBe(true)
    expect(await manager.cancel()).toEqual({ ok: true, canceled: 1, status: 'cancelled' })
    expect((await pending).status).toBe('cancelled')
    await vi.waitFor(
      () => {
        expect(pidAlive(parent.pid)).toBe(false)
        expect(pidAlive(helperPid)).toBe(false)
        expect(processGroupAlive(parent.pid)).toBe(false)
      },
      { timeout: 5000 },
    )
  })

  it.skipIf(process.platform === 'win32')(
    'POSIX: dispose removes a retained group after its parent exits naturally',
    async () => {
      const { manager } = setup('v2', 'success-parent-exit-tree')
      const port = await freePort()
      expect((await manager.start({ port, password: 'password' })).ok).toBe(true)
      const parent = children[0]
      const helperPid = await readDescendantPid()
      await vi.waitFor(() => expect(parent.exitCode).toBe(0), { timeout: 5000 })
      expect(pidAlive(helperPid)).toBe(true)
      expect(processGroupAlive(parent.pid)).toBe(true)

      expect(await manager.dispose()).toEqual({ ok: true, canceled: 1, status: 'cancelled' })
      await vi.waitFor(
        () => {
          expect(pidAlive(helperPid)).toBe(false)
          expect(processGroupAlive(parent.pid)).toBe(false)
        },
        { timeout: 5000 },
      )
    },
  )

  it.skipIf(process.platform === 'win32')('POSIX: killOnExit kills only the owned process group', async () => {
    const external = childProcess.spawn(process.execPath, ['-e', 'setTimeout(() => process.exit(92), 15000)'], {
      detached: true,
      stdio: 'ignore',
    })
    externalChildren.push(external)
    await vi.waitFor(() => expect(pidAlive(external.pid)).toBe(true))

    const { manager } = setup('v2', 'tree')
    const pending = manager.start({ port: await freePort(), password: 'password' })
    await vi.waitFor(() => expect(children).toHaveLength(1))
    const parent = children[0]
    const helperPid = await readDescendantPid()

    manager.killOnExit()
    await vi.waitFor(
      () => {
        expect(pidAlive(parent.pid)).toBe(false)
        expect(pidAlive(helperPid)).toBe(false)
        expect(processGroupAlive(parent.pid)).toBe(false)
      },
      { timeout: 5000 },
    )
    expect(pidAlive(external.pid)).toBe(true)
    expect((await pending).status).toBe('engine_exited')
  })

  it.skipIf(process.platform !== 'win32')('Windows: cancels the owned process tree with taskkill', async () => {
    const { manager } = setup('v2', 'tree')
    const pending = manager.start({ port: await freePort(), password: 'password' })
    const pid = await readDescendantPid()
    await manager.cancel()
    expect((await pending).status).toBe('cancelled')
    await vi.waitFor(() => expect(pidAlive(pid)).toBe(false), { timeout: 2000 })
  })
})
