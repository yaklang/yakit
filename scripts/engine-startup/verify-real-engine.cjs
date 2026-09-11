// Usage: node scripts/engine-startup/verify-real-engine.cjs /absolute/path/to/yak [another/yak]
// Only explicitly supplied binaries are executed. Each gets a disposable home and databases.
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const net = require('node:net')
const { createHash } = require('node:crypto')
const { createEngineStartup } = require('../../app/main/handlers/utils/engineStartup')
const { createEngineGrpcClient } = require('../../app/main/handlers/utils/engineGrpcClient')
const { grpc, Yak } = require('./grpc.cjs')

const listen = (port = 0) =>
  new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
const close = (server) => new Promise((resolve) => server.close(resolve))
async function verify(binary) {
  assert(path.isAbsolute(binary), 'Supply an absolute engine path')
  const sha256 = createHash('sha256')
    .update(await fs.readFile(binary))
    .digest('hex')
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'Yakit real engine 空格 '))
  let committed
  const logs = []
  const manager = createEngineStartup({
    getCommand: () => binary,
    getEnv: () => ({
      ...process.env,
      YAKIT_HOME: home,
      YAK_DEFAULT_PROJECT_DATABASE_NAME: path.join(home, 'project.db'),
      YAK_DEFAULT_PROFILE_DATABASE_NAME: path.join(home, 'profile.db'),
      SSA_DATABASE_RAW: path.join(home, 'ssa.db'),
    }),
    createClient: (connection) => createEngineGrpcClient(Yak, connection, { 'grpc.enable_http_proxy': 0 }),
    commitConnection: (connection) => {
      committed = connection
    },
    log: (line) => logs.push(line),
  })
  let occupied
  try {
    const reserved = await listen()
    const port = reserved.address().port
    await close(reserved)
    const checked = await manager.check({ port })
    assert.equal(checked.ok, true, checked.message)
    assert.match(checked.json.secret, /^[a-f0-9]{64}$/)
    const started = await manager.start({ port, password: checked.json.secret, version: 'yakit' })
    assert.equal(started.ok, true, started.message)
    assert.equal(committed.password, checked.json.secret)
    const auth = []
    for (const [label, password] of [
      ['correct', committed.password],
      ['empty', ''],
      ['mask', '***'],
      ['wrong', 'wrong'],
    ]) {
      const client = createEngineGrpcClient(Yak, { ...committed, password })
      const result = await new Promise((resolve) =>
        client.Echo({ text: 'compatibility' }, { deadline: new Date(Date.now() + 3000) }, (error, data) => {
          client.close()
          resolve({ error, data })
        }),
      )
      if (label === 'correct') assert.equal(result.data?.result, 'compatibility')
      else if (label === 'empty') assert.equal(result.error?.code, grpc.status.UNAUTHENTICATED)
      else {
        assert([grpc.status.UNKNOWN, grpc.status.UNAUTHENTICATED].includes(result.error?.code))
        assert.match(result.error.details, /secret verify failed/i)
      }
      auth.push({ credential: label, code: result.error?.code || 0 })
    }
    assert(!logs.join('\n').includes(checked.json.secret), 'Production password leaked into logs')
    assert.equal((await manager.dispose()).ok, true, 'Owned engine cleanup failed')
    // Rebinding the *same* port proves disposal released the running engine.
    // Reserving a different free port could hide a leaked child process.
    occupied = await listen(port)
    const conflict = await manager.check({ port: occupied.address().port })
    assert.equal(conflict.status, 'port_occupied')
    assert.equal(occupied.listening, true)
    await close(occupied)
    occupied = null

    // A failed RPC can coexist with a live owned engine. Exercise both user
    // recovery choices: restart on the same port and switch to another port.
    let recoveryPort = port
    let previousSecret = checked.json.secret
    for (const changePort of [false, true]) {
      const recoveryCheck = await manager.check({ port: recoveryPort })
      assert.equal(recoveryCheck.ok, true, recoveryCheck.message)
      assert.notEqual(recoveryCheck.json.secret, previousSecret)
      previousSecret = recoveryCheck.json.secret
      const recoveryStart = await manager.start({ port: recoveryPort, password: previousSecret })
      assert.equal(recoveryStart.ok, true, recoveryStart.message)
      const failedConnection = await manager.connect({ ...committed, password: 'wrong-recovery-credential' })
      assert.equal(failedConnection.ok, false)
      assert.equal((await manager.check({ port: recoveryPort })).status, 'port_occupied')
      assert.deepEqual(await manager.dispose(), { ok: true, canceled: 1, status: 'cancelled' })
      const released = await listen(recoveryPort)
      await close(released)
      if (changePort) {
        const nextPort = await listen()
        recoveryPort = nextPort.address().port
        await close(nextPort)
      }
    }
    const finalCheck = await manager.check({ port: recoveryPort })
    assert.equal(finalCheck.ok, true, finalCheck.message)
    assert.notEqual(finalCheck.json.secret, previousSecret)
    assert.equal((await manager.start({ port: recoveryPort, password: finalCheck.json.secret })).ok, true)
    assert(!logs.join('\n').includes(finalCheck.json.secret), 'Recovery password leaked into logs')
    assert.equal((await manager.dispose()).ok, true)
    return {
      binary,
      sha256,
      check: 'passed',
      authenticatedStart: 'passed',
      auth,
      secretRedaction: 'passed',
      portConflictRecovery: 'passed',
      cleanup: 'passed',
      ownedEngineRecovery: 'passed',
    }
  } finally {
    await manager.dispose()
    if (occupied) await close(occupied)
    await fs.rm(home, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  }
}
async function main() {
  assert(process.argv.length > 2, 'Supply at least one engine binary')
  const results = []
  for (const binary of process.argv.slice(2)) results.push(await verify(binary))
  process.stdout.write(JSON.stringify({ platform: process.platform, node: process.version, results }, null, 2) + '\n')
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
