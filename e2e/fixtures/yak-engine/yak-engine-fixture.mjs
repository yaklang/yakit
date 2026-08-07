import { createHash, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { constants, createWriteStream } from 'node:fs'
import { access, chmod, mkdir, readFile, readdir, realpath, rename, rm, stat } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const treeKill = require('tree-kill')

export const YAK_GRPC_READY_PREFIX = 'yak grpc ready '
export const YAK_GRPC_PPROF_READY_PREFIX = 'yak grpc pprof ready '
const DEFAULT_BUILD_TIMEOUT_MS = 15 * 60_000
const DEFAULT_START_TIMEOUT_MS = 120_000
const DEFAULT_ECHO_TIMEOUT_MS = 60_000
const DEFAULT_STOP_TIMEOUT_MS = 8_000
const DEFAULT_BUILD_CACHE_MAX_ENTRIES = 6
const YAK_BUILD_CACHE_ENTRY_PATTERN = /^[a-f0-9]{20}$/

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const pathExists = async (target, mode = constants.F_OK) => {
  try {
    await access(target, mode)
    return true
  } catch {
    return false
  }
}

export const resolveYakBuildCacheMaxEntries = (env = process.env) => {
  const raw = env.YAKIT_E2E_YAK_BUILD_CACHE_MAX_ENTRIES
  if (raw === undefined || raw === '') return DEFAULT_BUILD_CACHE_MAX_ENTRIES
  const entries = Number(raw)
  if (!Number.isInteger(entries) || entries < 1 || entries > 32) {
    throw new Error(`YAKIT_E2E_YAK_BUILD_CACHE_MAX_ENTRIES must be an integer between 1 and 32: ${raw}`)
  }
  return entries
}

export const resolveYakBuildCacheFingerprint = (env = process.env) => {
  const raw = env.YAKIT_E2E_YAK_BUILD_FINGERPRINT
  if (raw === undefined || raw === '') return undefined
  if (!YAK_BUILD_CACHE_ENTRY_PATTERN.test(raw)) {
    throw new Error(`YAKIT_E2E_YAK_BUILD_FINGERPRINT must be exactly 20 lowercase hexadecimal characters: ${raw}`)
  }
  return raw
}

export const pruneYakEngineBuildCache = async ({ cacheDir, keepDirectories = [], maxEntries }) => {
  await mkdir(cacheDir, { recursive: true })
  const protectedDirectories = new Set(keepDirectories.map((directory) => path.resolve(directory)))
  const entries = await readdir(cacheDir, { withFileTypes: true })
  const candidates = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && YAK_BUILD_CACHE_ENTRY_PATTERN.test(entry.name))
      .map(async (entry) => {
        const directory = path.join(cacheDir, entry.name)
        return { directory, name: entry.name, modifiedAtMs: (await stat(directory)).mtimeMs }
      }),
  )
  candidates.sort((left, right) => right.modifiedAtMs - left.modifiedAtMs || left.name.localeCompare(right.name))

  const protectedCandidates = candidates.filter(({ directory }) => protectedDirectories.has(path.resolve(directory)))
  const keepUnprotected = Math.max(0, maxEntries - protectedCandidates.length)
  const retained = new Set(protectedCandidates.map(({ directory }) => path.resolve(directory)))
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate.directory)
    if (retained.has(resolved)) continue
    if (retained.size < protectedCandidates.length + keepUnprotected) {
      retained.add(resolved)
    }
  }

  const removed = []
  for (const candidate of candidates) {
    if (retained.has(path.resolve(candidate.directory))) continue
    await rm(candidate.directory, { recursive: true, force: true })
    removed.push(candidate.name)
  }
  return {
    removed,
    retained: candidates.filter(({ directory }) => retained.has(path.resolve(directory))).map(({ name }) => name),
  }
}

const assertRegularFile = async (target, description) => {
  let targetStat
  try {
    targetStat = await stat(target)
  } catch (error) {
    throw new Error(`${description} is missing at ${target}: ${error.message}`)
  }
  if (!targetStat.isFile()) throw new Error(`${description} is not a file: ${target}`)
}

const killProcessTree = (pid, signal) =>
  new Promise((resolve) => {
    if (!pid) {
      resolve()
      return
    }
    treeKill(pid, signal, () => resolve())
  })

const waitForExit = (child) => {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode })
  }
  return new Promise((resolve) => {
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })
}

// ChildProcess "exit" may fire before stdout/stderr have been fully drained.
// Commands whose output is hashed or persisted must wait for "close" instead.
const waitForClose = (child) =>
  new Promise((resolve) => {
    child.once('close', (code, signal) => resolve({ code, signal }))
  })

const runBufferedCommand = async (command, args, options = {}) => {
  const { cwd, env = process.env, timeoutMs = 30_000, signal } = options
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  const stdoutChunks = []
  const stderrChunks = []
  child.stdout.on('data', (chunk) => {
    stdoutChunks.push(chunk)
  })
  child.stderr.on('data', (chunk) => {
    stderrChunks.push(chunk)
  })

  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    void killProcessTree(child.pid, 'SIGKILL')
  }, timeoutMs)
  const abort = () => void killProcessTree(child.pid, 'SIGTERM')
  signal?.addEventListener('abort', abort, { once: true })

  const spawnError = new Promise((_, reject) => child.once('error', reject))
  try {
    const result = await Promise.race([waitForClose(child), spawnError])
    const stdout = Buffer.concat(stdoutChunks).toString('utf8').trim()
    const stderr = Buffer.concat(stderrChunks).toString('utf8').trim()
    if (signal?.aborted) throw new Error(`${command} was interrupted`)
    if (timedOut) throw new Error(`${command} timed out after ${timeoutMs}ms`)
    if (result.code !== 0) {
      throw new Error(
        `${command} ${args.join(' ')} exited with ${result.code ?? result.signal}: ${stderr.trim() || stdout.trim()}`,
      )
    }
    return { stdout, stderr }
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}

const runLoggedCommand = async (command, args, options) => {
  const { cwd, env, logPath, timeoutMs, signal } = options
  await mkdir(path.dirname(logPath), { recursive: true })
  const log = createWriteStream(logPath, { flags: 'w' })
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child.stdout.pipe(log, { end: false })
  child.stderr.pipe(log, { end: false })

  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    void killProcessTree(child.pid, 'SIGKILL')
  }, timeoutMs)
  const abort = () => void killProcessTree(child.pid, 'SIGTERM')
  signal?.addEventListener('abort', abort, { once: true })

  const spawnError = new Promise((_, reject) => child.once('error', reject))
  try {
    const result = await Promise.race([waitForClose(child), spawnError])
    if (signal?.aborted) throw new Error(`${command} was interrupted; see ${logPath}`)
    if (timedOut) throw new Error(`${command} timed out after ${timeoutMs}ms; see ${logPath}`)
    if (result.code !== 0) {
      throw new Error(`${command} exited with ${result.code ?? result.signal}; see ${logPath}`)
    }
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
    await new Promise((resolve) => log.end(resolve))
  }
}

export const parseYakGRPCReadyLine = (line) => {
  const markerAt = String(line).indexOf(YAK_GRPC_READY_PREFIX)
  if (markerAt < 0) return undefined

  const rawPayload = String(line)
    .slice(markerAt + YAK_GRPC_READY_PREFIX.length)
    .trim()
  let payload
  try {
    payload = JSON.parse(rawPayload)
  } catch (error) {
    throw new Error(`Invalid Yak gRPC ready JSON: ${error.message}`)
  }
  if (payload?.schemaVersion !== 1) {
    throw new Error(`Unsupported Yak gRPC ready schema: ${payload?.schemaVersion}`)
  }
  const addressMatch = /^127\.0\.0\.1:(\d+)$/.exec(payload.address || '')
  const port = Number(addressMatch?.[1])
  if (!addressMatch || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Yak gRPC fixture must listen on 127.0.0.1 with a valid port: ${payload.address}`)
  }
  return {
    schemaVersion: 1,
    address: payload.address,
    host: '127.0.0.1',
    port,
  }
}

export const parseLegacyYakGRPCReadyLine = (line, address) => {
  if (String(line).trim() !== 'yak grpc ok') return undefined
  const addressMatch = /^127\.0\.0\.1:(\d+)$/.exec(address || '')
  const port = Number(addressMatch?.[1])
  if (!addressMatch || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Legacy Yak gRPC ready fallback requires a reserved loopback address: ${address}`)
  }
  return {
    schemaVersion: 1,
    address,
    host: '127.0.0.1',
    port,
  }
}

export const reserveYakLoopbackPort = async () => {
  const reservation = net.createServer()
  await new Promise((resolve, reject) => {
    reservation.once('error', reject)
    reservation.listen(0, '127.0.0.1', resolve)
  })
  const address = reservation.address()
  await new Promise((resolve, reject) => reservation.close((error) => (error ? reject(error) : resolve())))
  if (!address || typeof address === 'string') throw new Error('Cannot resolve reserved Yak gRPC loopback port')
  return address.port
}

export const parseYakGRPCPProfReadyLine = (line) => {
  const markerAt = String(line).indexOf(YAK_GRPC_PPROF_READY_PREFIX)
  if (markerAt < 0) return undefined

  const rawPayload = String(line)
    .slice(markerAt + YAK_GRPC_PPROF_READY_PREFIX.length)
    .trim()
  let payload
  try {
    payload = JSON.parse(rawPayload)
  } catch (error) {
    throw new Error(`Invalid Yak gRPC pprof ready JSON: ${error.message}`)
  }
  if (payload?.schemaVersion !== 1) {
    throw new Error(`Unsupported Yak gRPC pprof ready schema: ${payload?.schemaVersion}`)
  }
  const addressMatch = /^127\.0\.0\.1:(\d+)$/.exec(payload.address || '')
  const port = Number(addressMatch?.[1])
  if (!addressMatch || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Yak pprof fixture must listen on 127.0.0.1 with a valid port: ${payload.address}`)
  }
  return {
    schemaVersion: 1,
    address: payload.address,
    host: '127.0.0.1',
    port,
  }
}

export const resolveYakCPUProfileDurationSeconds = (env = process.env) => {
  const raw = env.YAKIT_E2E_YAK_CPU_PROFILE_SECONDS
  if (raw === undefined || raw === '') return 0
  const seconds = Number(raw)
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 60) {
    throw new Error(`YAKIT_E2E_YAK_CPU_PROFILE_SECONDS must be an integer between 1 and 60: ${raw}`)
  }
  return seconds
}

export const resolveYakHeapProfileEnabled = (env = process.env) => {
  const raw = env.YAKIT_E2E_YAK_HEAP_PROFILE
  if (raw === undefined || raw === '' || raw === '0') return false
  if (raw === '1') return true
  throw new Error(`YAKIT_E2E_YAK_HEAP_PROFILE must be 0 or 1: ${raw}`)
}

export const resolveYakPProfDiagnostics = (env = process.env) => {
  const cpuProfileDurationSeconds = resolveYakCPUProfileDurationSeconds(env)
  const heapProfileEnabled = resolveYakHeapProfileEnabled(env)
  if (cpuProfileDurationSeconds > 0 && heapProfileEnabled) {
    throw new Error('Yak CPU and heap profiling modes are mutually exclusive')
  }
  return {
    enabled: cpuProfileDurationSeconds > 0 || heapProfileEnabled,
    cpuProfileDurationSeconds,
    heapProfileEnabled,
  }
}

export const resolveYaklangMainDirectory = async ({ repoRoot, configuredPath }) => {
  if (configuredPath && !path.isAbsolute(configuredPath)) {
    throw new Error(`YAKLANG_MAIN_DIR must be an absolute path: ${configuredPath}`)
  }
  const candidates = configuredPath
    ? [configuredPath]
    : [path.resolve(repoRoot, '../../go/yaklang-main'), path.resolve(repoRoot, '../yaklang-main')]

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate)
    if (!(await pathExists(path.join(resolved, 'go.mod')))) continue
    if (!(await pathExists(path.join(resolved, 'common/yak/cmd/yak.go')))) continue
    return realpath(resolved)
  }

  const checked = candidates.map((candidate) => path.resolve(candidate)).join(', ')
  throw new Error(`Cannot locate yaklang-main (${checked}). Set YAKLANG_MAIN_DIR to its absolute worktree path.`)
}

export const resolveGoExecutable = (env = process.env) => {
  const configuredRoot = env.GOROOT
  if (!configuredRoot) return 'go'
  if (!path.isAbsolute(configuredRoot)) {
    throw new Error(`GOROOT must be an absolute path when set: ${configuredRoot}`)
  }
  return path.join(configuredRoot, 'bin', process.platform === 'win32' ? 'go.exe' : 'go')
}

export const getYakBuildIdentity = async (sourceDir, signal, { diagnosticSymbols = false, env = process.env } = {}) => {
  const goExecutable = resolveGoExecutable(env)
  const [head, status, diff, untrackedFiles, goVersion, goOS, goArch] = await Promise.all([
    runBufferedCommand('git', ['rev-parse', 'HEAD'], { cwd: sourceDir, signal }),
    runBufferedCommand('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: sourceDir, signal }),
    runBufferedCommand('git', ['diff', '--binary', 'HEAD'], { cwd: sourceDir, signal }),
    runBufferedCommand('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: sourceDir, signal }),
    runBufferedCommand(goExecutable, ['version'], { cwd: sourceDir, env, signal }),
    runBufferedCommand(goExecutable, ['env', 'GOOS'], { cwd: sourceDir, env, signal }),
    runBufferedCommand(goExecutable, ['env', 'GOARCH'], { cwd: sourceDir, env, signal }),
  ])
  const dirty = status.stdout.length > 0
  const stateHash = createHash('sha256').update(head.stdout).update('\0').update(diff.stdout)
  const untracked = untrackedFiles.stdout.split('\0').filter(Boolean).sort()
  for (const relativePath of untracked) {
    stateHash
      .update('\0')
      .update(relativePath)
      .update('\0')
      .update(await readFile(path.join(sourceDir, relativePath)))
  }
  const identity = {
    head: head.stdout,
    dirty,
    stateFingerprint: stateHash.digest('hex'),
    goVersion: goVersion.stdout,
    goos: goOS.stdout,
    goarch: goArch.stdout,
    buildContract: 3,
    diagnosticSymbols,
  }
  const fingerprint = createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0, 20)
  return { ...identity, fingerprint }
}

export const buildYakEngine = async ({
  sourceDir,
  cacheDir,
  temporaryRoot,
  artifactsDir,
  env = process.env,
  signal,
}) => {
  await assertRegularFile(path.join(sourceDir, 'common/yak/cmd/yak.go'), 'Yak CLI entrypoint')
  const diagnosticSymbols = resolveYakPProfDiagnostics(env).enabled
  const requestedFingerprint = resolveYakBuildCacheFingerprint(env)
  if (requestedFingerprint && diagnosticSymbols) {
    throw new Error('YAKIT_E2E_YAK_BUILD_FINGERPRINT cannot be combined with Yak CPU or heap profiling')
  }
  const goExecutable = resolveGoExecutable(env)
  const identity = await getYakBuildIdentity(sourceDir, signal, { diagnosticSymbols, env })
  const selectedFingerprint = requestedFingerprint || identity.fingerprint
  const executableName = process.platform === 'win32' ? 'yak.exe' : 'yak'
  const outputDir = path.join(cacheDir, selectedFingerprint)
  const outputPath = path.join(outputDir, executableName)
  const canReuse = await pathExists(outputPath, constants.X_OK)
  const cacheRoot = path.dirname(cacheDir)
  const goBuildCacheDir = path.join(cacheRoot, 'go-build')
  const goBuildTemporaryDir = path.join(cacheRoot, 'go-tmp')
  const maxCacheEntries = resolveYakBuildCacheMaxEntries(env)

  await Promise.all([
    rm(goBuildCacheDir, { recursive: true, force: true }),
    rm(goBuildTemporaryDir, { recursive: true, force: true }),
  ])
  if (requestedFingerprint && !canReuse) {
    throw new Error(`Requested managed Yak build cache entry is missing or not executable: ${requestedFingerprint}`)
  }
  await pruneYakEngineBuildCache({
    cacheDir,
    keepDirectories: [outputDir],
    maxEntries: canReuse ? maxCacheEntries : Math.max(1, maxCacheEntries - 1),
  })

  if (!canReuse) {
    await mkdir(outputDir, { recursive: true })
    await Promise.all([mkdir(goBuildCacheDir, { recursive: true }), mkdir(goBuildTemporaryDir, { recursive: true })])
    const buildTarget = `${outputPath}.tmp-${process.pid}-${randomUUID()}`
    const maxProcs = String(env.YAKIT_E2E_GO_MAX_PROCS || '2')
    const buildEnv = {
      ...env,
      GOCACHE: goBuildCacheDir,
      GOTMPDIR: goBuildTemporaryDir,
      GOMAXPROCS: maxProcs,
      GOMEMLIMIT: env.YAKIT_E2E_GO_MEMORY_LIMIT || '2GiB',
    }
    const buildArgs = ['build', `-p=${maxProcs}`, '-trimpath']
    if (!diagnosticSymbols) buildArgs.push('-ldflags', '-s -w')
    buildArgs.push('-o', buildTarget, './common/yak/cmd/yak.go')
    try {
      await runLoggedCommand(goExecutable, buildArgs, {
        cwd: sourceDir,
        env: buildEnv,
        logPath: path.join(artifactsDir, 'yak-build.log'),
        timeoutMs: Number(env.YAKIT_E2E_YAK_BUILD_TIMEOUT_MS || DEFAULT_BUILD_TIMEOUT_MS),
        signal,
      })
      await rm(outputPath, { force: true })
      await rename(buildTarget, outputPath)
      if (process.platform !== 'win32') await chmod(outputPath, 0o755)
    } finally {
      await Promise.all([
        rm(goBuildCacheDir, { recursive: true, force: true }),
        rm(goBuildTemporaryDir, { recursive: true, force: true }),
        rm(buildTarget, { force: true }),
      ])
    }
  }

  await pruneYakEngineBuildCache({ cacheDir, keepDirectories: [outputDir], maxEntries: maxCacheEntries })

  return {
    binaryPath: outputPath,
    sourceDir,
    cacheHit: canReuse,
    ...identity,
    fingerprint: selectedFingerprint,
    currentSourceFingerprint: identity.fingerprint,
    cacheSelection: requestedFingerprint ? 'explicit-managed-cache' : 'current-source',
    sourceMatchesBinary: selectedFingerprint === identity.fingerprint,
  }
}

const createYakClient = (repoRoot, address) => {
  const protoPath = path.join(repoRoot, 'app/protos/grpc.proto')
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  })
  const descriptor = grpc.loadPackageDefinition(packageDefinition)
  return new descriptor.ypb.Yak(address, grpc.credentials.createInsecure(), {
    'grpc.enable_http_proxy': 0,
    'grpc.max_receive_message_length': 100 * 1024 * 1024,
    'grpc.max_send_message_length': 100 * 1024 * 1024,
  })
}

export const waitForYakEcho = async ({ repoRoot, address, timeoutMs = DEFAULT_ECHO_TIMEOUT_MS, signal }) => {
  const client = createYakClient(repoRoot, address)
  const token = `yakit-e2e-${randomUUID()}`
  const expiresAt = Date.now() + timeoutMs
  let lastError

  try {
    while (Date.now() < expiresAt) {
      if (signal?.aborted) throw new Error('Yak Echo readiness was interrupted')
      try {
        const response = await new Promise((resolve, reject) => {
          const deadline = new Date(Date.now() + 2_000)
          client.Echo({ text: token }, { deadline }, (error, data) => {
            if (error) reject(error)
            else resolve(data)
          })
        })
        if (response?.result === token) return
        lastError = new Error(`Yak Echo returned an unexpected payload: ${JSON.stringify(response)}`)
      } catch (error) {
        lastError = error
      }
      await delay(250)
    }
  } finally {
    client.close()
  }

  throw new Error(`Yak Echo was not ready at ${address} after ${timeoutMs}ms: ${lastError || 'unknown error'}`)
}

const stopYakProcess = async (child, timeoutMs = DEFAULT_STOP_TIMEOUT_MS) => {
  if (child.exitCode !== null || child.signalCode !== null) return waitForExit(child)

  await killProcessTree(child.pid, 'SIGTERM')
  const graceful = await Promise.race([
    waitForExit(child).then((result) => ({ exited: true, result })),
    delay(timeoutMs).then(() => ({ exited: false })),
  ])
  if (graceful.exited) return graceful.result

  await killProcessTree(child.pid, 'SIGKILL')
  return Promise.race([waitForExit(child), delay(3_000).then(() => ({ code: null, signal: 'SIGKILL-timeout' }))])
}

export const startYakEngine = async ({ repoRoot, build, yakitHomeDir, artifactsDir, env = process.env, signal }) => {
  const projectDatabase = path.join(yakitHomeDir, 'e2e-project.db')
  const profileDatabase = path.join(yakitHomeDir, 'e2e-profile.db')
  await mkdir(yakitHomeDir, { recursive: true })

  const grpcPort = await reserveYakLoopbackPort()
  const grpcAddress = `127.0.0.1:${grpcPort}`
  const args = [
    'grpc',
    '--host',
    '127.0.0.1',
    '--port',
    String(grpcPort),
    '--home',
    yakitHomeDir,
    '--project-db',
    projectDatabase,
    '--profile-db',
    profileDatabase,
    '--frontend',
    'yakit',
    '--disable-reverse-server',
  ]
  const diagnostics = resolveYakPProfDiagnostics(env)
  if (diagnostics.enabled) {
    args.push('--pprof', '--pprof-listen', '127.0.0.1:0', '--pprof-block-rate', '0')
  }
  const childEnv = {
    ...env,
    YAKIT_HOME: yakitHomeDir,
    GOMAXPROCS: String(env.YAKIT_E2E_ENGINE_MAX_PROCS || '2'),
    GOMEMLIMIT: env.YAKIT_E2E_ENGINE_MEMORY_LIMIT || '2GiB',
  }
  const child = spawn(build.binaryPath, args, {
    cwd: build.sourceDir,
    env: childEnv,
    detached: process.platform !== 'win32',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const stdoutPath = path.join(artifactsDir, 'yak-engine.stdout.log')
  const stderrPath = path.join(artifactsDir, 'yak-engine.stderr.log')
  const stdoutLog = createWriteStream(stdoutPath, { flags: 'w' })
  const stderrLog = createWriteStream(stderrPath, { flags: 'w' })
  const logsFinished = Promise.all([
    new Promise((resolve) => stdoutLog.once('finish', resolve)),
    new Promise((resolve) => stderrLog.once('finish', resolve)),
  ])
  child.stdout.pipe(stdoutLog)
  child.stderr.pipe(stderrLog)

  const exitPromise = waitForExit(child)
  let resolveGRPCReady
  let rejectGRPCReady
  const readyPromise = new Promise((resolve, reject) => {
    resolveGRPCReady = resolve
    rejectGRPCReady = reject
  })
  let resolvePProfReady
  let rejectPProfReady
  const pprofReadyPromise = diagnostics.enabled
    ? new Promise((resolve, reject) => {
        resolvePProfReady = resolve
        rejectPProfReady = reject
      })
    : Promise.resolve(undefined)
  const lines = readline.createInterface({ input: child.stdout })
  lines.on('line', (line) => {
    try {
      const ready = parseYakGRPCReadyLine(line) || parseLegacyYakGRPCReadyLine(line, grpcAddress)
      if (ready) resolveGRPCReady(ready)
      if (diagnostics.enabled) {
        const pprofReady = parseYakGRPCPProfReadyLine(line)
        if (pprofReady) resolvePProfReady(pprofReady)
      }
    } catch (error) {
      rejectGRPCReady(error)
      rejectPProfReady?.(error)
    }
  })
  child.once('error', (error) => {
    rejectGRPCReady(error)
    rejectPProfReady?.(error)
  })
  exitPromise.then(({ code, signal: exitSignal }) => {
    const error = new Error(
      `Yak exited before readiness with ${code ?? exitSignal}; see ${stdoutPath} and ${stderrPath}`,
    )
    rejectGRPCReady(error)
    rejectPProfReady?.(error)
  })
  const startTimeoutMs = Number(env.YAKIT_E2E_YAK_START_TIMEOUT_MS || DEFAULT_START_TIMEOUT_MS)
  let startTimeout
  let abortStartup
  const boundedReadyPromise = new Promise((resolve, reject) => {
    startTimeout = setTimeout(() => {
      reject(
        new Error(`Yak did not emit a ready event within ${startTimeoutMs}ms; see ${stdoutPath} and ${stderrPath}`),
      )
    }, startTimeoutMs)
    abortStartup = () => reject(new Error('Yak startup was interrupted'))
    if (signal?.aborted) abortStartup()
    else signal?.addEventListener('abort', abortStartup, { once: true })
    Promise.all([readyPromise, pprofReadyPromise]).then(resolve, reject)
  })
  const stop = async () => {
    const result = await stopYakProcess(child)
    await Promise.race([logsFinished, delay(2_000)])
    return result
  }

  try {
    const [ready, pprofReady] = await boundedReadyPromise
    clearTimeout(startTimeout)
    signal?.removeEventListener('abort', abortStartup)
    await waitForYakEcho({
      repoRoot,
      address: ready.address,
      timeoutMs: Number(env.YAKIT_E2E_YAK_ECHO_TIMEOUT_MS || DEFAULT_ECHO_TIMEOUT_MS),
      signal,
    })

    return {
      ...ready,
      pid: child.pid,
      projectDatabase,
      profileDatabase,
      credentials: {
        Host: ready.host,
        Port: ready.port,
        Mode: 'remote',
        IsTLS: false,
        Password: '',
      },
      cpuProfile:
        diagnostics.cpuProfileDurationSeconds > 0
          ? {
              durationSeconds: diagnostics.cpuProfileDurationSeconds,
              pprofAddress: pprofReady.address,
            }
          : undefined,
      heapProfile: diagnostics.heapProfileEnabled
        ? {
            pprofAddress: pprofReady.address,
          }
        : undefined,
      pprof: diagnostics.enabled
        ? {
            address: pprofReady.address,
          }
        : undefined,
      stop,
      waitForExit: () => exitPromise,
    }
  } catch (error) {
    clearTimeout(startTimeout)
    signal?.removeEventListener('abort', abortStartup)
    await stop()
    throw error
  }
}

export const startYakEngineFixture = async ({
  repoRoot,
  temporaryRoot,
  yakitHomeDir,
  artifactsDir,
  configuredSourceDir,
  env = process.env,
  signal,
}) => {
  const sourceDir = await resolveYaklangMainDirectory({ repoRoot, configuredPath: configuredSourceDir })
  const build = await buildYakEngine({
    sourceDir,
    cacheDir: path.join(repoRoot, 'reports/e2e-electron/.cache/yak-engine'),
    temporaryRoot,
    artifactsDir,
    env,
    signal,
  })
  const engine = await startYakEngine({ repoRoot, build, yakitHomeDir, artifactsDir, env, signal })
  return { build, engine }
}
