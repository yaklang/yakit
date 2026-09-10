// Run the unmodified old Yakit IPC module against a real, explicitly supplied engine.
// Usage: node verify-legacy-client.cjs /absolute/legacy/newEngineStatus.js /absolute/yak
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const vm = require('node:vm')
const { EventEmitter } = require('node:events')
const os = require('node:os')
const path = require('node:path')
const net = require('node:net')
const childProcess = require('node:child_process')
const { setTimeout: delay } = require('node:timers/promises')
const { createEngineGrpcClient } = require('../../app/main/handlers/utils/engineGrpcClient')
const { stopEngineChild } = require('../../app/main/handlers/utils/engineStartup')
const { grpc, Yak } = require('./grpc.cjs')

async function main() {
  const [sourcePath, binary] = process.argv.slice(2)
  assert(path.isAbsolute(sourcePath) && path.isAbsolute(binary), 'Supply absolute source and engine paths')
  const source = await fs.readFile(sourcePath, 'utf8')
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'Yakit legacy client '))
  const children = [],
    clients = [],
    timers = new Set(),
    handlers = new Map()
  let connection
  const dependencies = {
    electron: { ipcMain: { handle: (name, handler) => handlers.set(name, handler) } },
    child_process: {
      ...childProcess,
      spawn: (...args) => {
        const child = childProcess.spawn(...args)
        children.push(child)
        return child
      },
    },
    '../state': { GLOBAL_YAK_SETTING: {} },
    '../filePath': { getLocalYaklangEngine: () => binary, getYakitHome: () => home },
    '../logFile': { engineLogOutputFileAndUI: () => {}, engineLogOutputUI: () => {} },
  }
  const context = {
    module: { exports: {} },
    require: (name) => {
      assert(Object.hasOwn(dependencies, name), `Unexpected legacy dependency ${name}`)
      return dependencies[name]
    },
    process: Object.assign(new EventEmitter(), {
      platform: process.platform,
      kill: process.kill.bind(process),
      env: {
        ...process.env,
        YAKIT_HOME: home,
        YAK_DEFAULT_PROJECT_DATABASE_NAME: path.join(home, 'project.db'),
        YAK_DEFAULT_PROFILE_DATABASE_NAME: path.join(home, 'profile.db'),
        SSA_DATABASE_RAW: path.join(home, 'ssa.db'),
      },
    }),
    Buffer,
    // grpc-js validates deadlines with instanceof Date across the VM boundary.
    Date,
    setTimeout: (...args) => {
      const timer = setTimeout(...args)
      timers.add(timer)
      return timer
    },
    clearTimeout,
    setInterval: (...args) => {
      const timer = setInterval(...args)
      timers.add(timer)
      return timer
    },
    clearInterval,
  }
  const makeClient = () => {
    const client = createEngineGrpcClient(Yak, connection)
    clients.push(client)
    return client
  }
  vm.runInNewContext(source, context, { filename: sourcePath })
  context.module.exports.registerNewIPC(
    { webContents: { send: () => {} } },
    (address, caPem, password) => {
      connection = { defaultYakGRPCAddr: address, caPem, password }
    },
    makeClient,
    makeClient,
    'legacy:',
  )
  const invoke = (name, params) => handlers.get('legacy:' + name)({}, params)
  const reserve = async () => {
    const server = net.createServer()
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    return server
  }
  const echo = (password) => {
    const client = createEngineGrpcClient(Yak, { ...connection, password })
    return new Promise((resolve) =>
      client.Echo({ text: 'legacy compatibility' }, { deadline: new Date(Date.now() + 3000) }, (error, data) => {
        client.close()
        resolve({ error, data })
      }),
    )
  }
  let occupied
  try {
    const reserved = await reserve()
    const port = reserved.address().port
    await new Promise((resolve) => reserved.close(resolve))
    const checked = await invoke('check-allow-secret-local-yaklang-engine', { port, softwareVersion: 'yakit' })
    assert.equal(checked.ok, true, `legacy check: ${checked.status}: ${checked.message}`)
    assert.match(checked.json.secret, /^[0-9a-f]{64}$/)
    // The legacy renderer first tries to connect, which also installs credentials
    // in its global client settings, then starts the engine if that probe fails.
    await assert.rejects(
      () => invoke('connect-yaklang-engine', { Host: '127.0.0.1', Port: port, Password: checked.json.secret }),
      (error) => /14 UNAVAILABLE/.test(String(error)),
    )
    const started = await invoke('start-secret-local-yaklang-engine', {
      port,
      password: checked.json.secret,
      version: 'yakit',
      softwareVersion: 'yakit',
    })
    assert.equal(started.ok, true, `legacy start: ${started.status}: ${started.message}`)
    assert.equal(connection.password, checked.json.secret)
    // The legacy renderer's keepalive retries every three seconds after its
    // log-based startup result. Retry only transient UNAVAILABLE responses;
    // never hide an authentication error or an indefinitely unavailable engine.
    let positive = await echo(checked.json.secret)
    let readinessRetries = 0
    while (positive.error?.code === grpc.status.UNAVAILABLE && readinessRetries < 9) {
      readinessRetries++
      await delay(3000)
      positive = await echo(checked.json.secret)
    }
    assert.equal(positive.data?.result, 'legacy compatibility', positive.error?.message)
    await invoke('connect-yaklang-engine', { Host: '127.0.0.1', Port: port, Password: checked.json.secret })
    assert.equal((await echo('')).error?.code, grpc.status.UNAUTHENTICATED)
    const masked = await echo('***')
    assert(masked.error && /secret verify failed/.test(masked.error.details))
    occupied = await reserve()
    const failure = await invoke('check-allow-secret-local-yaklang-engine', {
      port: occupied.address().port,
      softwareVersion: 'yakit',
    })
    assert.equal(failure.status, 'port_occupied')
    assert(occupied.listening)
    process.stdout.write(
      JSON.stringify(
        {
          legacySource: sourcePath,
          binary,
          platform: process.platform,
          randomCredential: 'passed',
          authenticatedStartup: 'passed',
          readinessRetries,
          anonymousAndMaskDenied: 'passed',
          legacyPortRecovery: 'passed',
        },
        null,
        2,
      ) + '\n',
    )
  } finally {
    for (const timer of timers) {
      clearTimeout(timer)
      clearInterval(timer)
    }
    for (const client of clients) client.close()
    await Promise.all(children.map((child) => stopEngineChild(child)))
    assert(
      children.every((child) => child.exitCode !== null || child.signalCode !== null),
      'Legacy test left an engine running',
    )
    if (occupied) await new Promise((resolve) => occupied.close(resolve))
    await fs.rm(home, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
  }
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
