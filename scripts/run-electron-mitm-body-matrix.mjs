import { spawn } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import {
  aggregateMITMBodyMatrixCase,
  renderMITMBodyMatrixMarkdown,
  resolveMITMBodyMatrix,
  summarizeMITMBodyMatrixCase,
} from '../e2e/fixtures/http-performance/http-performance-matrix.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')
const reportsRoot = path.join(repoRoot, 'reports', 'e2e-electron')
const args = process.argv.slice(2)
const usage = `Usage: node scripts/run-electron-mitm-body-matrix.mjs [options]

Options:
  --matrix-file <path>                 Matrix JSON (default: e2e/config/mitm-body-matrix.json)
  --case <name>                        Run one named matrix case
  --repeat <1-10>                      Run each case sequentially
  --flow-committed-mode <mode>         off, shadow, or canary
  --httpflow-live-stream-mode <mode>   off, shadow, or canary
  --sqlite-project-max-open-conns <n>  Writer pool size (1-8)
  --sqlite-project-read-pool-conns <n> Dedicated read pool size (0-4)
  --yak-build-fingerprint <20-hex>     Use one existing managed Yak build cache entry
  --cpu-profile-seconds <1-60>         Capture one bounded Yak CPU profile
  --heap-profile                       Capture one bounded Yak heap profile
  --renderer-trace                     Capture one bounded Renderer trace
  --disable-system-timing              Trace without backend timing (stream mode must be off)
  --disable-skip-total                 Include exact COUNT(*) in incremental queries
  --disable-flow-committed-shadow      Disable the legacy committed-flow shadow
  -h, --help                           Show this help without starting Electron or Yak`

if (args.includes('--help') || args.includes('-h')) {
  console.info(usage)
  process.exit(0)
}

const valueAfter = (name) => {
  const index = args.indexOf(name)
  if (index < 0) return undefined
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${name} requires a value`)
  return args[index + 1]
}

const configuredMatrixPath = valueAfter('--matrix-file')
const matrixPath = configuredMatrixPath
  ? path.resolve(process.cwd(), configuredMatrixPath)
  : path.join(repoRoot, 'e2e', 'config', 'mitm-body-matrix.json')
const selectedCase = valueAfter('--case')
const configuredYakBuildFingerprint = valueAfter('--yak-build-fingerprint')
const environmentYakBuildFingerprint = process.env.YAKIT_E2E_YAK_BUILD_FINGERPRINT
if (
  configuredYakBuildFingerprint &&
  environmentYakBuildFingerprint &&
  configuredYakBuildFingerprint !== environmentYakBuildFingerprint
) {
  throw new Error('--yak-build-fingerprint conflicts with YAKIT_E2E_YAK_BUILD_FINGERPRINT')
}
const yakBuildFingerprint = configuredYakBuildFingerprint || environmentYakBuildFingerprint
const cpuProfileSecondsRaw = valueAfter('--cpu-profile-seconds')
const cpuProfileSeconds = cpuProfileSecondsRaw === undefined ? 0 : Number(cpuProfileSecondsRaw)
const heapProfileEnabled = args.includes('--heap-profile')
const rendererTraceEnabled = args.includes('--renderer-trace')
const disableSystemTiming = args.includes('--disable-system-timing')
const disableSkipTotal = args.includes('--disable-skip-total')
const disableFlowCommittedShadow = args.includes('--disable-flow-committed-shadow')
const configuredFlowCommittedMode = valueAfter('--flow-committed-mode')
const flowCommittedMode = disableFlowCommittedShadow ? 'off' : configuredFlowCommittedMode || 'shadow'
const configuredHTTPFlowLiveStreamMode = valueAfter('--httpflow-live-stream-mode')
const httpFlowLiveStreamMode =
  configuredHTTPFlowLiveStreamMode || process.env.YAKIT_E2E_MITM_HTTPFLOW_LIVE_STREAM_MODE || 'canary'
const sqliteProjectMaxOpenConnsRaw = valueAfter('--sqlite-project-max-open-conns')
const sqliteProjectMaxOpenConns = Number(
  sqliteProjectMaxOpenConnsRaw || process.env.YAKIT_SQLITE_PROJECT_MAX_OPEN_CONNS || 1,
)
const sqliteProjectReadPoolConnsRaw = valueAfter('--sqlite-project-read-pool-conns')
const sqliteProjectReadPoolConns = Number(
  sqliteProjectReadPoolConnsRaw || process.env.YAKIT_SQLITE_PROJECT_READ_POOL_CONNS || 0,
)
const repeatRaw = valueAfter('--repeat')
const repeatCount = repeatRaw === undefined ? 1 : Number(repeatRaw)
if (
  cpuProfileSecondsRaw !== undefined &&
  (!Number.isInteger(cpuProfileSeconds) || cpuProfileSeconds < 1 || cpuProfileSeconds > 60)
) {
  throw new Error(`--cpu-profile-seconds must be an integer between 1 and 60: ${cpuProfileSecondsRaw}`)
}
if (args.filter((argument) => argument === '--heap-profile').length > 1) {
  throw new Error('--heap-profile may only be specified once')
}
if (args.filter((argument) => argument === '--renderer-trace').length > 1) {
  throw new Error('--renderer-trace may only be specified once')
}
if (args.filter((argument) => argument === '--yak-build-fingerprint').length > 1) {
  throw new Error('--yak-build-fingerprint may only be specified once')
}
if (yakBuildFingerprint && !/^[a-f0-9]{20}$/.test(yakBuildFingerprint)) {
  throw new Error(`--yak-build-fingerprint must be exactly 20 lowercase hexadecimal characters: ${yakBuildFingerprint}`)
}
if (args.filter((argument) => argument === '--disable-system-timing').length > 1) {
  throw new Error('--disable-system-timing may only be specified once')
}
if (args.filter((argument) => argument === '--disable-skip-total').length > 1) {
  throw new Error('--disable-skip-total may only be specified once')
}
if (args.filter((argument) => argument === '--disable-flow-committed-shadow').length > 1) {
  throw new Error('--disable-flow-committed-shadow may only be specified once')
}
if (args.filter((argument) => argument === '--flow-committed-mode').length > 1) {
  throw new Error('--flow-committed-mode may only be specified once')
}
if (disableFlowCommittedShadow && configuredFlowCommittedMode) {
  throw new Error('--disable-flow-committed-shadow and --flow-committed-mode are mutually exclusive')
}
if (!['off', 'shadow', 'canary'].includes(flowCommittedMode)) {
  throw new Error(`--flow-committed-mode must be off, shadow, or canary: ${flowCommittedMode}`)
}
if (args.filter((argument) => argument === '--httpflow-live-stream-mode').length > 1) {
  throw new Error('--httpflow-live-stream-mode may only be specified once')
}
if (!['off', 'shadow', 'canary'].includes(httpFlowLiveStreamMode)) {
  throw new Error(`--httpflow-live-stream-mode must be off, shadow, or canary: ${httpFlowLiveStreamMode}`)
}
if (args.filter((argument) => argument === '--sqlite-project-max-open-conns').length > 1) {
  throw new Error('--sqlite-project-max-open-conns may only be specified once')
}
if (!Number.isInteger(sqliteProjectMaxOpenConns) || sqliteProjectMaxOpenConns < 1 || sqliteProjectMaxOpenConns > 8) {
  throw new Error(`--sqlite-project-max-open-conns must be an integer between 1 and 8: ${sqliteProjectMaxOpenConnsRaw}`)
}
if (args.filter((argument) => argument === '--sqlite-project-read-pool-conns').length > 1) {
  throw new Error('--sqlite-project-read-pool-conns may only be specified once')
}
if (!Number.isInteger(sqliteProjectReadPoolConns) || sqliteProjectReadPoolConns < 0 || sqliteProjectReadPoolConns > 4) {
  throw new Error(
    `--sqlite-project-read-pool-conns must be an integer between 0 and 4: ${sqliteProjectReadPoolConnsRaw}`,
  )
}
if (args.filter((argument) => argument === '--repeat').length > 1) {
  throw new Error('--repeat may only be specified once')
}
if (!Number.isInteger(repeatCount) || repeatCount < 1 || repeatCount > 10) {
  throw new Error(`--repeat must be an integer between 1 and 10: ${repeatRaw}`)
}
if ([cpuProfileSeconds > 0, heapProfileEnabled, rendererTraceEnabled].filter(Boolean).length > 1) {
  throw new Error('--cpu-profile-seconds, --heap-profile and --renderer-trace are mutually exclusive')
}
if (repeatCount > 1 && [cpuProfileSeconds > 0, heapProfileEnabled, rendererTraceEnabled].some(Boolean)) {
  throw new Error('Diagnostic profiling and tracing modes require --repeat 1')
}
if (yakBuildFingerprint && [cpuProfileSeconds > 0, heapProfileEnabled, rendererTraceEnabled].some(Boolean)) {
  throw new Error('--yak-build-fingerprint cannot be combined with diagnostic profiling or tracing')
}
if (disableSystemTiming && !rendererTraceEnabled) {
  throw new Error('--disable-system-timing requires --renderer-trace')
}
if (disableSystemTiming && httpFlowLiveStreamMode !== 'off') {
  throw new Error(
    '--disable-system-timing requires --httpflow-live-stream-mode off because the live stream bootstraps from QueryHTTPFlow SystemTiming identity',
  )
}
const rawMatrix = JSON.parse(await readFile(matrixPath, 'utf8'))
const resolvedMatrix = resolveMITMBodyMatrix(rawMatrix)
const matrixCases = selectedCase
  ? resolvedMatrix.cases.filter((entry) => entry.name === selectedCase)
  : resolvedMatrix.cases
if (!matrixCases.length) throw new Error(`Unknown matrix case ${JSON.stringify(selectedCase)}`)

const matrixId = `body-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}`
const outputDirectory = path.join(reportsRoot, 'matrices', matrixId)
await mkdir(outputDirectory, { recursive: true })

const summary = {
  schemaVersion: 1,
  kind: 'yakit-electron-mitm-http-body-matrix',
  matrixId,
  status: 'running',
  baseProfile: resolvedMatrix.baseProfile,
  matrixFile: path.relative(repoRoot, matrixPath),
  selectedCase,
  repeatCount,
  diagnostics: {
    yakCPUProfileEnabled: cpuProfileSeconds > 0,
    ...(cpuProfileSeconds > 0 ? { yakCPUProfileDurationSeconds: cpuProfileSeconds } : {}),
    yakHeapProfileEnabled: heapProfileEnabled,
    rendererTraceEnabled,
    backendSystemTimingEnabled: !disableSystemTiming,
    skipLiveExactTotalEnabled: !disableSkipTotal,
    flowCommittedShadowEnabled: flowCommittedMode !== 'off',
    flowCommittedMode,
    httpFlowLiveStreamMode,
    sqliteProjectMaxOpenConns,
    sqliteProjectReadPoolConns,
    requireCPURecovery: resolvedMatrix.harness.requireCPURecovery,
    recoveryTimeoutMs: resolvedMatrix.harness.recoveryTimeoutMs,
    recoveryStableSamples: resolvedMatrix.harness.recoveryStableSamples,
    pipelineSampleIntervalMs: resolvedMatrix.harness.pipelineSampleIntervalMs,
  },
  startedAt: new Date().toISOString(),
  cases: [],
}

const writeSummary = async () => {
  await Promise.all([
    writeFile(path.join(outputDirectory, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`),
    writeFile(path.join(outputDirectory, 'summary.md'), renderMITMBodyMatrixMarkdown(summary)),
  ])
}

const findCaseReport = async (caseName, repeatIndex) => {
  const entries = await readdir(reportsRoot, { withFileTypes: true })
  const candidates = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const reportPath = path.join(reportsRoot, entry.name, 'mitm-performance.json')
    try {
      const report = JSON.parse(await readFile(reportPath, 'utf8'))
      if (
        report.config?.matrixId === matrixId &&
        report.config?.matrixCase === caseName &&
        report.config?.matrixRepeatIndex === repeatIndex
      ) {
        candidates.push({ reportPath, report })
      }
    } catch {
      // Cache and aggregate directories do not contain a case report.
    }
  }
  candidates.sort((left, right) => String(right.report.startedAt).localeCompare(String(left.report.startedAt)))
  if (!candidates.length) {
    throw new Error(`No MITM performance report found for matrix case ${caseName} repeat ${repeatIndex}`)
  }
  return candidates[0]
}

let activeChild
let interruptedSignal
const forwardSignal = (signal) => {
  interruptedSignal = signal
  if (activeChild && !activeChild.killed) activeChild.kill(signal)
}
process.once('SIGINT', () => forwardSignal('SIGINT'))
process.once('SIGTERM', () => forwardSignal('SIGTERM'))

const runCase = async (matrixCase) => {
  const profile = matrixCase.profile
  const samples = []
  const caseIndex = summary.cases.length
  const updateCaseSummary = () => {
    summary.cases[caseIndex] = aggregateMITMBodyMatrixCase({
      matrixCase,
      samples,
      requestedRepeats: repeatCount,
    })
  }
  updateCaseSummary()
  await writeSummary()

  for (let repeatIndex = 1; repeatIndex <= repeatCount; repeatIndex += 1) {
    const consumerDescription =
      matrixCase.consumer.mode === 'scroll-away'
        ? `, consumer away ${matrixCase.consumer.pauseAfterRequests}->${matrixCase.consumer.resumeAfterRequests}`
        : ''
    console.info(
      `[mitm-body-matrix] ${matrixCase.name} repeat ${repeatIndex}/${repeatCount}: ${profile.requests} requests, concurrency ${profile.concurrency}, target ${profile.targetRequestsPerSecond || 'max'} requests/s, request ${profile.requestBodyBytes} bytes, response ${profile.responseBodyBytes} bytes (${profile.responseContentEncoding})${consumerDescription}`,
    )
    activeChild = spawn(
      process.execPath,
      [path.join(repoRoot, 'scripts', 'run-electron-e2e.mjs'), '--with-yak-engine', '--suite', 'mitm-performance'],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          YAKIT_E2E_MITM_PROFILE: resolvedMatrix.baseProfile,
          YAKIT_E2E_MITM_REQUESTS: String(profile.requests),
          YAKIT_E2E_MITM_CONCURRENCY: String(profile.concurrency),
          YAKIT_E2E_MITM_TARGET_REQUESTS_PER_SECOND: String(profile.targetRequestsPerSecond),
          YAKIT_E2E_MITM_REQUEST_BODY_BYTES: String(profile.requestBodyBytes),
          YAKIT_E2E_MITM_RESPONSE_BODY_BYTES: String(profile.responseBodyBytes),
          YAKIT_E2E_MITM_RESPONSE_CONTENT_ENCODING: profile.responseContentEncoding,
          YAKIT_E2E_MITM_MATRIX_ID: matrixId,
          YAKIT_E2E_MITM_MATRIX_CASE: matrixCase.name,
          YAKIT_E2E_MITM_MATRIX_REPEAT_INDEX: String(repeatIndex),
          YAKIT_E2E_MITM_MATRIX_REPEAT_COUNT: String(repeatCount),
          ...(yakBuildFingerprint ? { YAKIT_E2E_YAK_BUILD_FINGERPRINT: yakBuildFingerprint } : {}),
          ...(cpuProfileSeconds > 0 ? { YAKIT_E2E_YAK_CPU_PROFILE_SECONDS: String(cpuProfileSeconds) } : {}),
          ...(heapProfileEnabled ? { YAKIT_E2E_YAK_HEAP_PROFILE: '1' } : {}),
          ...(rendererTraceEnabled ? { YAKIT_E2E_RENDERER_TRACE: '1' } : {}),
          ...(disableSystemTiming ? { YAKIT_E2E_MITM_SYSTEM_TIMING: '0' } : {}),
          YAKIT_E2E_MITM_SKIP_TOTAL: disableSkipTotal ? '0' : '1',
          YAKIT_E2E_MITM_FLOW_COMMITTED_MODE: flowCommittedMode,
          YAKIT_E2E_MITM_HTTPFLOW_LIVE_STREAM_MODE: httpFlowLiveStreamMode,
          YAKIT_E2E_MITM_CONSUMER_MODE: matrixCase.consumer.mode,
          ...(matrixCase.consumer.mode === 'scroll-away'
            ? {
                YAKIT_E2E_MITM_CONSUMER_PAUSE_AT_TARGET_PERCENT: String(matrixCase.consumer.pauseAtTargetPercent),
                YAKIT_E2E_MITM_CONSUMER_RESUME_AT_TARGET_PERCENT: String(matrixCase.consumer.resumeAtTargetPercent),
                YAKIT_E2E_MITM_CONSUMER_PAUSE_AFTER_REQUESTS: String(matrixCase.consumer.pauseAfterRequests),
                YAKIT_E2E_MITM_CONSUMER_RESUME_AFTER_REQUESTS: String(matrixCase.consumer.resumeAfterRequests),
              }
            : {}),
          YAKIT_SQLITE_PROJECT_MAX_OPEN_CONNS: String(sqliteProjectMaxOpenConns),
          YAKIT_SQLITE_PROJECT_READ_POOL_CONNS: String(sqliteProjectReadPoolConns),
          YAKIT_E2E_REQUIRE_CPU_RECOVERY: resolvedMatrix.harness.requireCPURecovery ? '1' : '0',
          ...(Number.isInteger(resolvedMatrix.harness.recoveryTimeoutMs)
            ? { YAKIT_E2E_RECOVERY_TIMEOUT_MS: String(resolvedMatrix.harness.recoveryTimeoutMs) }
            : {}),
          ...(Number.isInteger(resolvedMatrix.harness.recoveryStableSamples)
            ? { YAKIT_E2E_RECOVERY_STABLE_SAMPLES: String(resolvedMatrix.harness.recoveryStableSamples) }
            : {}),
          ...(Number.isInteger(resolvedMatrix.harness.pipelineSampleIntervalMs)
            ? { YAKIT_E2E_PIPELINE_SAMPLE_INTERVAL_MS: String(resolvedMatrix.harness.pipelineSampleIntervalMs) }
            : {}),
        },
        stdio: 'inherit',
      },
    )
    const exit = await new Promise((resolve, reject) => {
      activeChild.once('error', reject)
      activeChild.once('exit', (code, signal) => resolve({ code, signal }))
    })
    activeChild = undefined
    if (interruptedSignal) throw new Error(`Matrix interrupted by ${interruptedSignal}`)

    let caseReport
    try {
      caseReport = await findCaseReport(matrixCase.name, repeatIndex)
    } catch (error) {
      if (exit.code !== 0) {
        throw new Error(
          `Matrix case ${matrixCase.name} repeat ${repeatIndex} exited with ${exit.code ?? exit.signal}; ${error.message}`,
        )
      }
      throw error
    }
    const { reportPath, report } = caseReport
    const refreshMinIntervalMs = Number(report.config?.httpFlowLiveRefreshMinIntervalMs)
    if (Number.isFinite(refreshMinIntervalMs)) {
      const previousIntervalMs = summary.diagnostics.httpFlowLiveRefreshMinIntervalMs
      if (previousIntervalMs !== undefined && previousIntervalMs !== refreshMinIntervalMs) {
        throw new Error(
          `HTTPFlow live refresh interval changed within one matrix: ${previousIntervalMs} != ${refreshMinIntervalMs}`,
        )
      }
      summary.diagnostics.httpFlowLiveRefreshMinIntervalMs = refreshMinIntervalMs
    }
    const sample = summarizeMITMBodyMatrixCase({
      matrixCase,
      report,
      reportPath: path.relative(outputDirectory, reportPath),
      repeatIndex,
    })
    sample.runnerExit = exit
    samples.push(sample)
    updateCaseSummary()
    summary.revisions ||= report.revisions
    await writeSummary()

    if (exit.code !== 0) {
      throw new Error(`Matrix case ${matrixCase.name} repeat ${repeatIndex} exited with ${exit.code ?? exit.signal}`)
    }
    if (report.status !== 'passed' || sample.correctness.cleanupErrors.length > 0) {
      throw new Error(`Matrix case ${matrixCase.name} repeat ${repeatIndex} failed report or cleanup checks`)
    }
  }
}

await writeSummary()
try {
  for (const matrixCase of matrixCases) await runCase(matrixCase)
  summary.status = 'passed'
} catch (error) {
  summary.status = interruptedSignal ? 'interrupted' : 'failed'
  summary.failure = error?.stack || String(error)
  process.exitCode = 1
  console.error(`[mitm-body-matrix] ${summary.failure}`)
} finally {
  summary.finishedAt = new Date().toISOString()
  await writeSummary()
  console.info(`[mitm-body-matrix] summary: ${outputDirectory}`)
}

if (interruptedSignal) process.kill(process.pid, interruptedSignal)
