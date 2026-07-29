import { spawn } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { startYakEngineFixture } from '../e2e/fixtures/yak-engine/yak-engine-fixture.mjs'
import {
  getRendererBuildIdentity,
  validateRendererBuildMetadata,
} from '../e2e/fixtures/electron/renderer-build-metadata.mjs'
import { terminateProcessTree } from '../e2e/fixtures/process/process-tree.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const temporaryPrefix = path.join(tmpdir(), 'yakit-electron-e2e-')
const rawArgs = process.argv.slice(2)
const withYakEngine = rawArgs.includes('--with-yak-engine')
const wdioArgs = rawArgs.filter((arg) => arg !== '--with-yak-engine')
const rendererBuildMetadataPath = path.join(repoRoot, 'app/renderer/pages/main/yakit-e2e-build.json')
const requiredRendererArtifacts = [
  path.join(repoRoot, 'app/renderer/pages/main/index.html'),
  path.join(repoRoot, 'app/renderer/engine-link-startup/dist/index.html'),
  rendererBuildMetadataPath,
]

const exists = async (filePath) => {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

const missingArtifacts = []
for (const artifact of requiredRendererArtifacts) {
  if (!(await exists(artifact))) missingArtifacts.push(path.relative(repoRoot, artifact))
}

if (missingArtifacts.length) {
  console.error('[electron-e2e] required Renderer artifacts are missing:')
  for (const artifact of missingArtifacts) console.error(`  - ${artifact}`)
  console.error('[electron-e2e] run `yarn test:e2e:build` first')
  process.exit(2)
}

let rendererBuildMetadata
try {
  rendererBuildMetadata = validateRendererBuildMetadata(
    JSON.parse(await readFile(rendererBuildMetadataPath, 'utf8')),
    await getRendererBuildIdentity(repoRoot),
    rendererBuildMetadataPath,
  )
} catch (error) {
  console.error(`[electron-e2e] ${error.message}`)
  process.exit(2)
}

const runId = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const artifactsDir = path.join(repoRoot, 'reports', 'e2e-electron', runId)
const temporaryRoot = await mkdtemp(temporaryPrefix)
const userDataDir = path.join(temporaryRoot, 'user-data')
const yakitHomeDir = path.join(temporaryRoot, 'yakit-home')
await Promise.all([mkdir(artifactsDir, { recursive: true }), mkdir(userDataDir), mkdir(yakitHomeDir)])

const metadata = {
  version: 1,
  runId,
  startedAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  args: wdioArgs,
  runner: {
    withYakEngine,
  },
  rendererBuild: rendererBuildMetadata,
}
await writeFile(path.join(artifactsDir, 'run-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`)

const wdioCli = path.join(repoRoot, 'node_modules', '@wdio', 'cli', 'bin', 'wdio.js')
const wdioConfig = path.join(repoRoot, 'e2e', 'config', 'wdio.electron.conf.mjs')
let child
let yakFixture
let stoppingYakEngine = false
let unexpectedYakExit
let interruptedSignal = null
let fatalError
let childTermination
const abortController = new AbortController()
const stopChildTree = (signal) => {
  if (!child?.pid || childTermination) return
  childTermination = terminateProcessTree(child.pid, signal)
}
const forwardSignal = (signal) => {
  interruptedSignal = signal
  abortController.abort()
  stopChildTree(signal)
}
process.once('SIGINT', () => forwardSignal('SIGINT'))
process.once('SIGTERM', () => forwardSignal('SIGTERM'))

let exitCode = 1
try {
  if (withYakEngine) {
    console.info('[electron-e2e] preparing isolated Yak engine fixture')
    yakFixture = await startYakEngineFixture({
      repoRoot,
      temporaryRoot,
      yakitHomeDir,
      artifactsDir,
      configuredSourceDir: process.env.YAKLANG_MAIN_DIR,
      env: process.env,
      signal: abortController.signal,
    })
    const { build, engine } = yakFixture
    metadata.yakEngine = {
      sourceDir: build.sourceDir,
      head: build.head,
      dirty: build.dirty,
      buildFingerprint: build.fingerprint,
      currentSourceFingerprint: build.currentSourceFingerprint,
      buildCacheHit: build.cacheHit,
      buildCacheSelection: build.cacheSelection,
      sourceMatchesBinary: build.sourceMatchesBinary,
      goVersion: build.goVersion,
      goos: build.goos,
      goarch: build.goarch,
      diagnosticSymbols: build.diagnosticSymbols,
      address: engine.address,
      pid: engine.pid,
      projectDatabase: engine.projectDatabase,
      profileDatabase: engine.profileDatabase,
      cpuProfile: engine.cpuProfile,
      heapProfile: engine.heapProfile,
    }
    // Database paths are already below the disposable root; retain only their
    // relative names in the durable report.
    metadata.yakEngine.projectDatabase = path.relative(temporaryRoot, engine.projectDatabase)
    metadata.yakEngine.profileDatabase = path.relative(temporaryRoot, engine.profileDatabase)
    await writeFile(path.join(artifactsDir, 'run-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`)
    console.info(`[electron-e2e] Yak Echo ready at ${engine.address} (pid ${engine.pid})`)

    void engine.waitForExit().then((result) => {
      if (stoppingYakEngine) return
      unexpectedYakExit = result
      console.error(`[electron-e2e] Yak exited unexpectedly: ${JSON.stringify(result)}`)
      stopChildTree('SIGTERM')
    })
  }

  const childEnv = {
    ...process.env,
    ELECTRON_IS_DEV: '0',
    YAKIT_E2E: '1',
    YAKIT_E2E_USER_DATA: userDataDir,
    YAKIT_HOME: yakitHomeDir,
    YAKIT_E2E_ARTIFACTS_DIR: artifactsDir,
    ...(yakFixture
      ? {
          YAKIT_E2E_ENGINE_FIXTURE: 'external',
          YAKIT_E2E_ENGINE_HOST: yakFixture.engine.host,
          YAKIT_E2E_ENGINE_PORT: String(yakFixture.engine.port),
          YAKIT_E2E_ENGINE_PID: String(yakFixture.engine.pid),
          ...(yakFixture.engine.pprof
            ? {
                YAKIT_E2E_ENGINE_PPROF_ADDRESS: yakFixture.engine.pprof.address,
                YAKIT_E2E_ENGINE_BINARY: yakFixture.build.binaryPath,
              }
            : {}),
        }
      : {}),
  }
  child = spawn(process.execPath, [wdioCli, 'run', wdioConfig, ...wdioArgs], {
    cwd: repoRoot,
    env: childEnv,
    stdio: 'inherit',
  })
  exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (signal) {
        console.error(`[electron-e2e] WDIO terminated by ${signal}`)
        resolve(1)
        return
      }
      resolve(code ?? 1)
    })
  })
  if (unexpectedYakExit) exitCode = 1
} catch (error) {
  fatalError = error
  exitCode = 1
  console.error(`[electron-e2e] ${error?.stack || error}`)
} finally {
  if (childTermination) await childTermination
  if (yakFixture) {
    stoppingYakEngine = true
    try {
      metadata.yakEngine.stopResult = await yakFixture.engine.stop()
    } catch (error) {
      exitCode = 1
      fatalError ||= error
      console.error(`[electron-e2e] failed to stop Yak: ${error?.stack || error}`)
    }
  }

  const keepTemporary = process.env.YAKIT_E2E_KEEP_TEMP === '1'
  const safeTemporaryRoot = temporaryRoot.startsWith(temporaryPrefix) && temporaryRoot !== temporaryPrefix
  if (keepTemporary) {
    console.info(`[electron-e2e] kept isolated data at ${temporaryRoot}`)
  } else if (safeTemporaryRoot) {
    await rm(temporaryRoot, { recursive: true, force: true })
  } else {
    console.error(`[electron-e2e] refused to remove unexpected path: ${temporaryRoot}`)
    exitCode = 1
  }

  const finishedAt = new Date()
  const status = interruptedSignal ? 'interrupted' : exitCode === 0 ? 'passed' : 'failed'
  Object.assign(metadata, {
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - new Date(metadata.startedAt).getTime(),
    status,
    exitCode,
    signal: interruptedSignal,
    temporaryDataKept: keepTemporary,
    ...(fatalError ? { failure: String(fatalError?.stack || fatalError) } : {}),
  })
  await Promise.all([
    writeFile(path.join(artifactsDir, 'run-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`),
    writeFile(
      path.join(artifactsDir, 'report.json'),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          runId,
          status,
          exitCode,
          startedAt: metadata.startedAt,
          finishedAt: metadata.finishedAt,
          durationMs: metadata.durationMs,
          suiteArgs: metadata.args,
          logsDirectory: 'logs',
          yakEngine: metadata.yakEngine
            ? {
                head: metadata.yakEngine.head,
                dirty: metadata.yakEngine.dirty,
                buildFingerprint: metadata.yakEngine.buildFingerprint,
                currentSourceFingerprint: metadata.yakEngine.currentSourceFingerprint,
                buildCacheHit: metadata.yakEngine.buildCacheHit,
                buildCacheSelection: metadata.yakEngine.buildCacheSelection,
                sourceMatchesBinary: metadata.yakEngine.sourceMatchesBinary,
                address: metadata.yakEngine.address,
                diagnosticSymbols: metadata.yakEngine.diagnosticSymbols,
                cpuProfile: metadata.yakEngine.cpuProfile
                  ? {
                      enabled: true,
                      durationSeconds: metadata.yakEngine.cpuProfile.durationSeconds,
                    }
                  : { enabled: false },
                heapProfile: {
                  enabled: Boolean(metadata.yakEngine.heapProfile),
                },
                stopResult: metadata.yakEngine.stopResult,
              }
            : undefined,
          failure: metadata.failure,
        },
        null,
        2,
      )}\n`,
    ),
  ])
  console.info(`[electron-e2e] artifacts: ${artifactsDir}`)
}

if (interruptedSignal) process.kill(process.pid, interruptedSignal)
process.exit(exitCode)
