// Executes only a supplied, checksum-verified engine in isolated databases.
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const net = require('node:net')
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { createEngineSession } = require('../../app/main/handlers/utils/engineSession')
const { createEngineGrpcClient } = require('../../app/main/handlers/utils/engineGrpcClient')
const { Yak } = require('./grpc.cjs')

async function verify(binary, cycles = 1, policy = 'ipc', expected = 'ipc') {
  assert(path.isAbsolute(binary), 'Supply an absolute engine path')
  assert(Number.isInteger(cycles) && cycles >= 1 && cycles <= 100, 'cycles must be 1..100')
  assert(['auto', 'ipc', 'tcp'].includes(policy), 'Unknown startup policy')
  assert(['ipc', 'tcp', 'fallback', 'manual-tcp'].includes(expected), 'Unknown expected transport')
  const expectIPC = expected === 'ipc'
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'Yakit IPC 中文 & '))
  const hash = createHash('sha256')
    .update(await fs.readFile(binary))
    .digest('hex')
  const logs = []
  let connection
  const manager = createEngineSession({
    getCommand: () => binary,
    getEnv: () => ({
      ...process.env,
      YAKIT_HOME: home,
      YAK_DEFAULT_PROJECT_DATABASE_NAME: path.join(home, 'project.db'),
      YAK_DEFAULT_PROFILE_DATABASE_NAME: path.join(home, 'profile.db'),
      SSA_DATABASE_RAW: path.join(home, 'ssa.db'),
    }),
    createClient: (settings) => createEngineGrpcClient(Yak, settings),
    commitConnection: (settings) => {
      connection = settings
    },
    log: (line) => {
      logs.push(line)
      if (logs.length > 1000) logs.shift()
    },
    // Smoke tests fail quickly; production keeps the shared 180s / 180s / 360s budgets.
    timeouts: { check: 45000, start: 45000, total: 90000 },
  })
  const durations = []
  const endpoints = new Set()
  const passwords = new Set()
  const occupied = net.createServer()
  await new Promise((resolve, reject) => {
    occupied.once('error', reject)
    occupied.listen(0, '127.0.0.1', resolve)
  })
  const port = occupied.address().port
  // IPC must work with this TCP port occupied. TCP scenarios need a free loopback port.
  if (!expectIPC) await new Promise((resolve) => occupied.close(resolve))
  const rpc = (client, method, input) =>
    new Promise((resolve, reject) =>
      client[method](input, { deadline: new Date(Date.now() + 2000) }, (error, data) =>
        error ? reject(error) : resolve(data),
      ),
    )
  try {
    if (expectIPC) {
      const pending = manager.launch({ port, policy, softwareVersion: 'yakit', version: 'yakit' })
      const cancellation = await manager.cancel()
      assert.equal(cancellation.stopped, true, JSON.stringify(cancellation))
      assert.equal((await pending).status, 'cancelled')
      assert.equal(manager.current(), null)
    }
    for (let i = 0; i < cycles; i++) {
      const before = Date.now()
      let result = await manager.launch({ port, policy, softwareVersion: 'yakit', version: 'yakit' })
      if (expected === 'manual-tcp') {
        // beta17 silently ignores checker IPC flags and reports a TCP endpoint.
        // This is NOT explicit unsupported-flag evidence: fail closed, then exercise
        // the user's separate, explicit TCP selection with a fresh operation.
        assert.equal(result.status, 'protocol_error')
        assert.equal(result.stopped, true)
        assert.equal(result.attempts.length, 1)
        assert.equal(manager.current(), null)
        result = await manager.launch({ port, policy: 'tcp', softwareVersion: 'yakit', version: 'yakit' })
      }
      assert.equal(result.ok, true, JSON.stringify(result))
      assert.equal(result.instance.transport, expectIPC ? (process.platform === 'win32' ? 'npipe' : 'unix') : 'tcp')
      assert.equal(result.fallback, expected === 'fallback')
      assert.equal(result.instance.port, expectIPC ? undefined : port)
      if (expectIPC) {
        assert.equal(occupied.listening, true, 'IPC must not touch the occupied TCP listener')
        assert(!endpoints.has(result.instance.displayEndpoint), 'Endpoint reused across new instances')
      }
      if (expected === 'fallback') {
        assert.equal(result.attempts.length, 1, 'Only one fallback is allowed')
        assert.equal(result.attempts[0].reasonCode, 'ipc_cli_unsupported')
        assert.equal(result.attempts[0].stopped, true, 'Old IPC child must exit before TCP fallback')
      }
      assert(!passwords.has(connection.password), 'Password reused across new instances')
      endpoints.add(result.instance.displayEndpoint)
      passwords.add(connection.password)
      for (const password of [connection.password, '', 'incorrect']) {
        const client = createEngineGrpcClient(Yak, { ...connection, password })
        try {
          if (password === connection.password) {
            const version = await rpc(client, 'Version', {})
            assert(version.Version, 'Business RPC Version returned no version')
          } else {
            await assert.rejects(rpc(client, 'Echo', { text: 'negative' }), (error) =>
              password === '' ? error.code === 16 : [2, 16].includes(error.code),
            )
          }
        } finally {
          client.close()
        }
      }
      assert.equal(manager.disconnect().ok, true)
      assert.equal(manager.current(), null)
      assert.equal((await manager.connect({ InstanceId: result.instance.id })).ok, true)
      assert.equal(manager.current().id, result.instance.id)
      assert(!JSON.stringify(manager.list()).includes(connection.password), 'Secret in list DTO')
      assert(!logs.join('\n').includes(connection.password), 'Secret in logs')
      const stopped = await manager.stop(result.instance.id)
      assert.equal(stopped.stopped, true, JSON.stringify(stopped))
      assert(
        manager.list().every((item) => item.state === 'exited'),
        'Owned child leaked',
      )
      durations.push(Date.now() - before)
      if (cycles > 1 && (i + 1) % 10 === 0) console.error(`Completed ${i + 1}/${cycles} isolated IPC cycles`)
    }
    return {
      status: 'PASS',
      layer: process.versions.electron ? 'Electron main' : 'Node',
      engineSHA256: hash,
      os: os.release(),
      platform: process.platform,
      architecture: process.arch,
      electron: process.versions.electron || null,
      node: process.versions.node,
      grpc: require('@grpc/grpc-js/package.json').version,
      cycles,
      policy,
      expected,
      durationsMs: durations,
      occupiedTCP: expectIPC ? 'untouched' : 'not applicable',
      isolatedDatabases: true,
      cancellationRecovery: expectIPC,
      disconnectReconnect: true,
    }
  } catch (error) {
    error.message += '\nRecent sanitized engine output:\n' + logs.slice(-30).join('\n')
    throw error
  } finally {
    const result = await manager.stopAll()
    if (occupied.listening) await new Promise((resolve) => occupied.close(resolve))
    // Retain the isolated directory if a child cannot be confirmed dead.
    if (result.stopped) await fs.rm(home, { recursive: true, force: true })
  }
}

if (require.main === module) {
  const electron = process.versions.electron ? require('electron').app : null
  const run = async () => {
    try {
      const binary = path.resolve(process.argv[2])
      const cycles = Number(process.argv[3] || 1)
      const result =
        process.argv[4] === 'matrix'
          ? {
              status: 'PASS',
              electron: process.versions.electron || null,
              scenarios: [
                await verify(binary, cycles, 'auto', 'ipc'),
                await verify(binary, cycles, 'ipc', 'ipc'),
                await verify(binary, cycles, 'tcp', 'tcp'),
              ],
            }
          : await verify(binary, cycles, process.argv[4] || 'ipc', process.argv[5] || 'ipc')
      console.log(JSON.stringify(result, null, 2))
      if (electron) electron.exit(0)
    } catch (error) {
      console.error(error.message)
      if (electron) electron.exit(1)
      else process.exitCode = 1
    }
  }
  if (electron) electron.whenReady().then(run)
  else void run()
}
module.exports = { verify }
