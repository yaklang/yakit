import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  confirmStartupWorkspace,
  connectRemoteEngineThroughUI,
  enterDefaultProjectThroughUI,
  waitForMainWindow,
} from '../../drivers/application.driver.mjs'
import {
  collectElectronProcessMetrics,
  exerciseMITMTableVirtualScroll,
  getMITMObservabilitySnapshot,
  getMITMPipelineSnapshot,
  getMITMTableDOMSnapshot,
  getScenarioRenderObservation,
  openMITMV2ThroughUI,
  queryHTTPFlowPacketSummaryById,
  queryMITMScenarioFlows,
  resetMITMObservability,
  setMITMBackendSystemTimingEnabled,
  setMITMTableConsumerPosition,
  setMITMFlowCommittedMode,
  setMITMHTTPFlowLiveStreamMode,
  setMITMSkipLiveExactTotalEnabled,
  startMITMV2ThroughUI,
  startRendererLongTaskObserver,
  startScenarioRenderObserver,
  stopMITMV2ThroughUI,
  stopRendererLongTaskObserver,
} from '../../drivers/mitm.driver.mjs'
import {
  resolveMITMPerformanceProfile,
  startHTTPPerformanceFixture,
  waitForLoopbackPort,
  waitForLoopbackPortClosed,
} from '../../fixtures/http-performance/http-performance-fixture.mjs'
import {
  analyzeElectronRendererTrace,
  startElectronRendererTrace,
  stopElectronRendererTrace,
} from '../../fixtures/electron/electron-content-trace.mjs'
import { analyzeYakCPUProfile, collectYakCPUProfile } from '../../fixtures/yak-engine/yak-cpu-profile.mjs'
import { analyzeYakHeapProfiles, collectYakHeapProfile } from '../../fixtures/yak-engine/yak-heap-profile.mjs'
import {
  createYakProcessSampler,
  getGitWorktreeIdentity,
  readE2ERunMetadata,
  readRendererBuildMetadata,
  summarizeMITMPipelineSamples,
  summarizeResourceSamples,
  writeMITMPerformanceReport,
} from '../../reporters/mitm-performance-reporter.mjs'

const specDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(specDirectory, '../../..')
const artifactsDirectory = process.env.YAKIT_E2E_ARTIFACTS_DIR
const profileName = process.env.YAKIT_E2E_MITM_PROFILE || 'smoke'
const optionalIntegerEnvironmentValue = (name) => {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return undefined
  const value = Number(raw)
  if (!Number.isInteger(value)) throw new Error(`${name} must be an integer: ${raw}`)
  return value
}
const booleanEnvironmentValue = (name, defaultValue = false) => {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return defaultValue
  if (!['0', '1'].includes(raw)) throw new Error(`${name} must be 0 or 1: ${raw}`)
  return raw === '1'
}
const profileOverrides = {
  requests: optionalIntegerEnvironmentValue('YAKIT_E2E_MITM_REQUESTS'),
  concurrency: optionalIntegerEnvironmentValue('YAKIT_E2E_MITM_CONCURRENCY'),
  targetRequestsPerSecond: optionalIntegerEnvironmentValue('YAKIT_E2E_MITM_TARGET_REQUESTS_PER_SECOND'),
  requestBodyBytes: optionalIntegerEnvironmentValue('YAKIT_E2E_MITM_REQUEST_BODY_BYTES'),
  responseBodyBytes: optionalIntegerEnvironmentValue('YAKIT_E2E_MITM_RESPONSE_BODY_BYTES'),
  responseContentEncoding: process.env.YAKIT_E2E_MITM_RESPONSE_CONTENT_ENCODING || undefined,
}
const profile = resolveMITMPerformanceProfile(profileName, profileOverrides)
const matrixId = process.env.YAKIT_E2E_MITM_MATRIX_ID
const matrixCase = process.env.YAKIT_E2E_MITM_MATRIX_CASE
const matrixRepeatIndex = optionalIntegerEnvironmentValue('YAKIT_E2E_MITM_MATRIX_REPEAT_INDEX') || 1
const matrixRepeatCount = optionalIntegerEnvironmentValue('YAKIT_E2E_MITM_MATRIX_REPEAT_COUNT') || 1
if (matrixId) {
  if (!matrixCase) throw new Error('YAKIT_E2E_MITM_MATRIX_CASE is required when a matrix ID is present')
  if (
    matrixRepeatIndex < 1 ||
    matrixRepeatCount < 1 ||
    matrixRepeatCount > 10 ||
    matrixRepeatIndex > matrixRepeatCount
  ) {
    throw new Error(`Invalid MITM matrix repetition ${matrixRepeatIndex}/${matrixRepeatCount}`)
  }
}
const cpuProfileDurationSeconds = optionalIntegerEnvironmentValue('YAKIT_E2E_YAK_CPU_PROFILE_SECONDS') || 0
if (cpuProfileDurationSeconds < 0 || cpuProfileDurationSeconds > 60) {
  throw new Error(
    `YAKIT_E2E_YAK_CPU_PROFILE_SECONDS must be an integer between 1 and 60 when enabled: ${cpuProfileDurationSeconds}`,
  )
}
const cpuProfileEnabled = cpuProfileDurationSeconds > 0
const heapProfileRaw = process.env.YAKIT_E2E_YAK_HEAP_PROFILE
if (!['', '0', '1', undefined].includes(heapProfileRaw)) {
  throw new Error(`YAKIT_E2E_YAK_HEAP_PROFILE must be 0 or 1: ${heapProfileRaw}`)
}
const heapProfileEnabled = heapProfileRaw === '1'
const rendererTraceRaw = process.env.YAKIT_E2E_RENDERER_TRACE
if (!['', '0', '1', undefined].includes(rendererTraceRaw)) {
  throw new Error(`YAKIT_E2E_RENDERER_TRACE must be 0 or 1: ${rendererTraceRaw}`)
}
const rendererTraceEnabled = rendererTraceRaw === '1'
if ([cpuProfileEnabled, heapProfileEnabled, rendererTraceEnabled].filter(Boolean).length > 1) {
  throw new Error('Yak CPU, Yak heap and Electron Renderer trace diagnostic modes are mutually exclusive')
}
const backendSystemTimingRaw = process.env.YAKIT_E2E_MITM_SYSTEM_TIMING
if (!['', '0', '1', undefined].includes(backendSystemTimingRaw)) {
  throw new Error(`YAKIT_E2E_MITM_SYSTEM_TIMING must be 0 or 1: ${backendSystemTimingRaw}`)
}
const backendSystemTimingEnabled = backendSystemTimingRaw !== '0'
if (!backendSystemTimingEnabled && !rendererTraceEnabled) {
  throw new Error('Disabling MITM backend system timing is only allowed with the diagnostic Renderer trace')
}
const skipLiveExactTotalRaw = process.env.YAKIT_E2E_MITM_SKIP_TOTAL
if (!['', '0', '1', undefined].includes(skipLiveExactTotalRaw)) {
  throw new Error(`YAKIT_E2E_MITM_SKIP_TOTAL must be 0 or 1: ${skipLiveExactTotalRaw}`)
}
const skipLiveExactTotalEnabled = skipLiveExactTotalRaw !== '0'
const flowCommittedShadowRaw = process.env.YAKIT_E2E_MITM_FLOW_COMMITTED_SHADOW
if (!['', '0', '1', undefined].includes(flowCommittedShadowRaw)) {
  throw new Error(`YAKIT_E2E_MITM_FLOW_COMMITTED_SHADOW must be 0 or 1: ${flowCommittedShadowRaw}`)
}
const flowCommittedMode =
  process.env.YAKIT_E2E_MITM_FLOW_COMMITTED_MODE || (flowCommittedShadowRaw === '0' ? 'off' : 'shadow')
if (!['off', 'shadow', 'canary'].includes(flowCommittedMode)) {
  throw new Error(`YAKIT_E2E_MITM_FLOW_COMMITTED_MODE must be off, shadow, or canary: ${flowCommittedMode}`)
}
const flowCommittedShadowEnabled = flowCommittedMode !== 'off'
const httpFlowLiveStreamMode = process.env.YAKIT_E2E_MITM_HTTPFLOW_LIVE_STREAM_MODE || 'canary'
if (!['off', 'shadow', 'canary'].includes(httpFlowLiveStreamMode)) {
  throw new Error(`YAKIT_E2E_MITM_HTTPFLOW_LIVE_STREAM_MODE must be off, shadow, or canary: ${httpFlowLiveStreamMode}`)
}
const httpFlowLiveStreamEnabled = httpFlowLiveStreamMode !== 'off'
const consumerMode = process.env.YAKIT_E2E_MITM_CONSUMER_MODE || 'follow'
if (!['follow', 'scroll-away'].includes(consumerMode)) {
  throw new Error(`YAKIT_E2E_MITM_CONSUMER_MODE must be follow or scroll-away: ${consumerMode}`)
}
const consumerPauseAtTargetPercent = optionalIntegerEnvironmentValue('YAKIT_E2E_MITM_CONSUMER_PAUSE_AT_TARGET_PERCENT')
const consumerResumeAtTargetPercent = optionalIntegerEnvironmentValue(
  'YAKIT_E2E_MITM_CONSUMER_RESUME_AT_TARGET_PERCENT',
)
const consumerPauseAfterRequests = optionalIntegerEnvironmentValue('YAKIT_E2E_MITM_CONSUMER_PAUSE_AFTER_REQUESTS')
const consumerResumeAfterRequests = optionalIntegerEnvironmentValue('YAKIT_E2E_MITM_CONSUMER_RESUME_AFTER_REQUESTS')
const consumerThresholds = [
  consumerPauseAtTargetPercent,
  consumerResumeAtTargetPercent,
  consumerPauseAfterRequests,
  consumerResumeAfterRequests,
]
if (consumerMode === 'follow' && consumerThresholds.some((value) => value !== undefined)) {
  throw new Error('MITM follow consumer cannot define pause/resume thresholds')
}
if (consumerMode === 'scroll-away') {
  if (!httpFlowLiveStreamEnabled) {
    throw new Error('MITM scroll-away consumer requires the HTTPFlow live stream for backlog measurement')
  }
  if (
    !Number.isInteger(consumerPauseAtTargetPercent) ||
    !Number.isInteger(consumerResumeAtTargetPercent) ||
    consumerPauseAtTargetPercent < 1 ||
    consumerResumeAtTargetPercent > 99 ||
    consumerPauseAtTargetPercent >= consumerResumeAtTargetPercent
  ) {
    throw new Error(
      `Invalid MITM scroll-away percentages: ${consumerPauseAtTargetPercent}/${consumerResumeAtTargetPercent}`,
    )
  }
  const expectedPauseAfterRequests = Math.max(1, Math.ceil((profile.requests * consumerPauseAtTargetPercent) / 100))
  const expectedResumeAfterRequests = Math.min(
    profile.requests - 1,
    Math.ceil((profile.requests * consumerResumeAtTargetPercent) / 100),
  )
  if (
    consumerPauseAfterRequests !== expectedPauseAfterRequests ||
    consumerResumeAfterRequests !== expectedResumeAfterRequests ||
    consumerPauseAfterRequests >= consumerResumeAfterRequests ||
    profile.targetRequestsPerSecond <= 0
  ) {
    throw new Error(
      `Invalid MITM scroll-away request thresholds: ${consumerPauseAfterRequests}/${consumerResumeAfterRequests}`,
    )
  }
}
const sqliteProjectMaxOpenConns = Number(process.env.YAKIT_SQLITE_PROJECT_MAX_OPEN_CONNS || 1)
if (!Number.isInteger(sqliteProjectMaxOpenConns) || sqliteProjectMaxOpenConns < 1 || sqliteProjectMaxOpenConns > 8) {
  throw new Error(
    `YAKIT_SQLITE_PROJECT_MAX_OPEN_CONNS must be an integer between 1 and 8: ${process.env.YAKIT_SQLITE_PROJECT_MAX_OPEN_CONNS}`,
  )
}
const sqliteProjectReadPoolConns = Number(process.env.YAKIT_SQLITE_PROJECT_READ_POOL_CONNS || 0)
if (!Number.isInteger(sqliteProjectReadPoolConns) || sqliteProjectReadPoolConns < 0 || sqliteProjectReadPoolConns > 4) {
  throw new Error(
    `YAKIT_SQLITE_PROJECT_READ_POOL_CONNS must be an integer between 0 and 4: ${process.env.YAKIT_SQLITE_PROJECT_READ_POOL_CONNS}`,
  )
}
const harnessVersion = 9
const sampleIntervalMs = Number(process.env.YAKIT_E2E_RESOURCE_SAMPLE_INTERVAL_MS || 200)
if (!Number.isInteger(sampleIntervalMs) || sampleIntervalMs < 50 || sampleIntervalMs > 5_000) {
  throw new Error(`YAKIT_E2E_RESOURCE_SAMPLE_INTERVAL_MS must be an integer between 50 and 5000: ${sampleIntervalMs}`)
}
const idleCPUThresholdPercent = Number(process.env.YAKIT_E2E_IDLE_CPU_THRESHOLD_PERCENT || 25)
const idleStableSamples = Number(process.env.YAKIT_E2E_IDLE_STABLE_SAMPLES || 3)
const idleTimeoutMs = Number(process.env.YAKIT_E2E_IDLE_TIMEOUT_MS || 30_000)
const baselineSampleCount = Number(process.env.YAKIT_E2E_BASELINE_SAMPLE_COUNT || 5)
const recoveryTimeoutMs = Number(process.env.YAKIT_E2E_RECOVERY_TIMEOUT_MS || 10_000)
const recoveryStableSamples = Number(process.env.YAKIT_E2E_RECOVERY_STABLE_SAMPLES || idleStableSamples)
const pipelineSampleIntervalMs = Number(process.env.YAKIT_E2E_PIPELINE_SAMPLE_INTERVAL_MS || 1_000)
const requireCPURecovery = booleanEnvironmentValue('YAKIT_E2E_REQUIRE_CPU_RECOVERY')
if (!Number.isFinite(idleCPUThresholdPercent) || idleCPUThresholdPercent < 1 || idleCPUThresholdPercent > 100) {
  throw new Error(`YAKIT_E2E_IDLE_CPU_THRESHOLD_PERCENT must be between 1 and 100: ${idleCPUThresholdPercent}`)
}
for (const [name, value, minimum, maximum] of [
  ['YAKIT_E2E_IDLE_STABLE_SAMPLES', idleStableSamples, 1, 20],
  ['YAKIT_E2E_IDLE_TIMEOUT_MS', idleTimeoutMs, 1_000, 120_000],
  ['YAKIT_E2E_BASELINE_SAMPLE_COUNT', baselineSampleCount, 3, 50],
  ['YAKIT_E2E_RECOVERY_TIMEOUT_MS', recoveryTimeoutMs, 1_000, 120_000],
  ['YAKIT_E2E_RECOVERY_STABLE_SAMPLES', recoveryStableSamples, 1, 50],
  ['YAKIT_E2E_PIPELINE_SAMPLE_INTERVAL_MS', pipelineSampleIntervalMs, 100, 10_000],
]) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}: ${value}`)
  }
}
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const totalElectronCPU = (sample) => sample.electron.reduce((sum, processMetric) => sum + processMetric.cpuPercent, 0)

const requireCondition = (condition, message) => {
  if (!condition) throw new Error(message)
}

const loadEngineCredentials = () => {
  requireCondition(process.env.YAKIT_E2E_ENGINE_FIXTURE === 'external', 'MITM performance requires a real Yak fixture')
  const port = Number(process.env.YAKIT_E2E_ENGINE_PORT)
  requireCondition(Number.isInteger(port) && port > 0 && port <= 65_535, `Invalid Yak fixture port: ${port}`)
  return {
    Host: process.env.YAKIT_E2E_ENGINE_HOST,
    Port: port,
    Mode: 'remote',
    IsTLS: false,
    Password: '',
  }
}

const expectedSequences = (count) => Array.from({ length: count }, (_, index) => index + 1)

const sequenceFromFlowURL = (url) => {
  try {
    const pathParts = new URL(url).pathname.split('/')
    return Number(pathParts[pathParts.length - 1])
  } catch {
    return Number.NaN
  }
}

describe('MITM V2 loopback HTTP performance', function () {
  this.timeout(profile.scenarioTimeoutMs + 180_000)

  it(`captures the ${profile.name} end-to-end Renderer baseline`, async () => {
    requireCondition(artifactsDirectory && path.isAbsolute(artifactsDirectory), 'Missing E2E artifacts directory')
    const runMetadata = await readE2ERunMetadata(artifactsDirectory)
    const rendererBuildMetadata = await readRendererBuildMetadata(repoRoot)
    const report = {
      schemaVersion: 1,
      kind: 'yakit-electron-mitm-http-performance',
      status: 'running',
      profile: profile.name,
      startedAt: new Date().toISOString(),
      revisions: {
        frontend: await getGitWorktreeIdentity(repoRoot),
        backend: runMetadata?.yakEngine
          ? {
              head: runMetadata.yakEngine.head,
              dirty: runMetadata.yakEngine.dirty,
              buildFingerprint: runMetadata.yakEngine.buildFingerprint,
              currentSourceFingerprint: runMetadata.yakEngine.currentSourceFingerprint,
              buildCacheSelection: runMetadata.yakEngine.buildCacheSelection,
              sourceMatchesBinary: runMetadata.yakEngine.sourceMatchesBinary,
              goVersion: runMetadata.yakEngine.goVersion,
            }
          : undefined,
      },
      system: {
        node: runMetadata?.node || process.version,
        platform: runMetadata?.platform || process.platform,
        arch: runMetadata?.arch || process.arch,
      },
      config: {
        harnessVersion,
        protocol: 'http',
        loopbackOnly: true,
        requests: profile.requests,
        concurrency: profile.concurrency,
        targetRequestsPerSecond: profile.targetRequestsPerSecond,
        requestBodyBytes: profile.requestBodyBytes,
        responseBodyBytes: profile.responseBodyBytes,
        responseContentEncoding: profile.responseContentEncoding,
        requestTimeoutMs: profile.requestTimeoutMs,
        resourceSampleIntervalMs: sampleIntervalMs,
        resourceIdleCPUThresholdPercent: idleCPUThresholdPercent,
        resourceIdleStableSamples: idleStableSamples,
        resourceIdleTimeoutMs: idleTimeoutMs,
        resourceBaselineSamples: baselineSampleCount,
        resourceRecoveryTimeoutMs: recoveryTimeoutMs,
        resourceRecoveryStableSamples: recoveryStableSamples,
        requireCPURecovery,
        pipelineSampleIntervalMs,
        engineMaxProcs: Number(process.env.YAKIT_E2E_ENGINE_MAX_PROCS || 2),
        engineMemoryLimit: process.env.YAKIT_E2E_ENGINE_MEMORY_LIMIT || '2GiB',
        rendererBuildMode: rendererBuildMetadata.mode,
        rendererReactMode: rendererBuildMetadata.reactMode,
        yakCPUProfileEnabled: cpuProfileEnabled,
        ...(cpuProfileEnabled ? { yakCPUProfileDurationSeconds: cpuProfileDurationSeconds } : {}),
        yakHeapProfileEnabled: heapProfileEnabled,
        rendererTraceEnabled,
        backendSystemTimingEnabled,
        skipLiveExactTotalEnabled,
        flowCommittedShadowEnabled,
        flowCommittedMode,
        httpFlowLiveStreamMode,
        consumerMode,
        ...(consumerMode === 'scroll-away'
          ? {
              consumerPauseAtTargetPercent,
              consumerResumeAtTargetPercent,
              consumerPauseAfterRequests,
              consumerResumeAfterRequests,
            }
          : {}),
        sqliteProjectMaxOpenConns,
        sqliteProjectReadPoolConns,
        ...(matrixId
          ? {
              matrixId,
              matrixCase,
              matrixRepeatIndex,
              matrixRepeatCount,
            }
          : {}),
      },
      correctness: {},
      timing: {},
      resources: { samples: [] },
      pipeline: { samples: [], databaseProgress: [] },
      cleanup: {},
    }

    let fixture
    let yakSampler
    let mitmStarted = false
    let longTaskObserverStarted = false
    let renderObserverStarted = false
    let cpuProfileCapturePromise
    let heapBaselineCapture
    let rendererTraceStarted = false
    let rendererTraceStopAttempted = false
    let rendererTraceStartCapture
    let scenarioError
    const cleanupErrors = []

    const sampleResources = async (phase) => {
      const [electron, yak] = await Promise.all([collectElectronProcessMetrics(), yakSampler?.sample()])
      const sample = { atUnixMs: Date.now(), phase, electron, yak }
      report.resources.samples.push(sample)
      return sample
    }

    const recordPipelineSample = async (phase) => {
      const snapshot = await getMITMPipelineSnapshot()
      const producerReceivedRequests = fixture?.target.progress().receivedRequests || 0
      const state = snapshot.state || {}
      const stream = snapshot.httpFlowLiveStream || {}
      const sample = {
        atUnixMs: snapshot.generatedAtUnixMs || Date.now(),
        phase,
        producerReceivedRequests,
        producerPersistenceBacklog: Math.max(0, producerReceivedRequests - Number(stream.committed || 0)),
        latestBackendPersistedId: Number(state.latestBackendPersistedId || 0),
        latestBackendDetectedId: Number(state.latestBackendDetectedId || 0),
        latestVisibleId: Number(state.latestVisibleId || 0),
        approximateIdBacklog: Number(state.approximateIdBacklog || 0),
        streamVisibleIdBacklog: Number(state.streamVisibleIdBacklog || 0),
        asyncWriteQueueDepth: Number(state.asyncWriteQueueDepth || 0),
        asyncWriteQueueCapacity: Number(state.asyncWriteQueueCapacity || 0),
        asyncWriteQueueUtilization: Number(state.asyncWriteQueueUtilization || 0),
        pendingQueries: Number(state.pendingQueries || 0),
        activeQueries: Number(state.activeQueries || 0),
        pendingFlows: Number(state.pendingFlows || 0),
        pendingLiveTriggers: Number(state.pendingLiveTriggers || 0),
        pendingFlowCommittedShadow: Number(state.pendingFlowCommittedShadow || 0),
        initialSnapshotOmittedFlowCommittedShadow: Number(state.initialSnapshotOmittedFlowCommittedShadow || 0),
        querySamples: Number(state.querySamples || 0),
        flowSamples: Number(state.flowSamples || 0),
        liveCycles: Number(state.liveCycles || 0),
        streamStatus: stream.status,
        streamReceived: Number(stream.received || 0),
        streamCommitted: Number(stream.committed || 0),
        streamHighWaterId: Number(stream.highWaterId || 0),
        streamGaps: Number(stream.gaps || 0),
        directRecoveryRequired: stream.directRecoveryRequired === true,
        directRecoveryHighWaterId: Number(stream.directRecoveryHighWaterId || 0),
        directRecoveryEntries: Number(stream.directRecoveryEntries || 0),
        directRecoveryCompletions: Number(stream.directRecoveryCompletions || 0),
      }
      report.pipeline.samples.push(sample)
      return sample
    }

    const finalizeYakCPUProfile = async () => {
      if (!cpuProfileCapturePromise) return
      const pendingCapture = cpuProfileCapturePromise
      cpuProfileCapturePromise = undefined
      const outcome = await pendingCapture
      if (outcome.error) throw outcome.error
      const summary = await analyzeYakCPUProfile({
        binaryPath: process.env.YAKIT_E2E_ENGINE_BINARY,
        profilePath: path.join(artifactsDirectory, 'yak-cpu.pprof'),
        artifactsDirectory,
        capture: outcome.capture,
      })
      report.diagnostics ||= {}
      report.diagnostics.yakCPUProfile = {
        diagnosticOnly: true,
        capture: summary.capture,
        pprof: {
          durationMs: summary.pprof.durationMs,
          totalSamplesMs: summary.pprof.totalSamplesMs,
          averageCPUPercent: summary.pprof.averageCPUPercent,
          shownSamplesMs: summary.pprof.shownSamplesMs,
          shownPercent: summary.pprof.shownPercent,
          leafCategories: summary.pprof.leafCategories,
          flatTop: summary.pprof.flatTop.slice(0, 20),
          cumulativeTop: summary.pprof.cumulativeTop.slice(0, 20),
        },
        artifacts: summary.artifacts,
      }
    }

    const finalizeYakHeapProfile = async () => {
      if (!heapBaselineCapture) return
      const postCapture = await collectYakHeapProfile({
        address: process.env.YAKIT_E2E_ENGINE_PPROF_ADDRESS,
        outputPath: path.join(artifactsDirectory, 'yak-heap-post.pprof'),
      })
      const summary = await analyzeYakHeapProfiles({
        binaryPath: process.env.YAKIT_E2E_ENGINE_BINARY,
        baselineProfilePath: path.join(artifactsDirectory, 'yak-heap-baseline.pprof'),
        postProfilePath: path.join(artifactsDirectory, 'yak-heap-post.pprof'),
        artifactsDirectory,
        capture: {
          baseline: heapBaselineCapture,
          post: postCapture,
        },
      })
      report.diagnostics ||= {}
      report.diagnostics.yakHeapProfile = {
        diagnosticOnly: true,
        status: 'completed',
        forcedGC: true,
        capture: summary.capture,
        allocationDelta: {
          ...summary.allocationDelta,
          flatTop: summary.allocationDelta.flatTop.slice(0, 20),
          cumulativeTop: summary.allocationDelta.cumulativeTop.slice(0, 20),
        },
        positiveLiveHeapDelta: {
          ...summary.positiveLiveHeapDelta,
          flatTop: summary.positiveLiveHeapDelta.flatTop.slice(0, 20),
          cumulativeTop: summary.positiveLiveHeapDelta.cumulativeTop.slice(0, 20),
        },
        postLiveHeap: {
          ...summary.postLiveHeap,
          flatTop: summary.postLiveHeap.flatTop.slice(0, 20),
        },
        artifacts: summary.artifacts,
      }
      heapBaselineCapture = undefined
    }

    const finalizeRendererTrace = async ({ scenarioWindowCompleted = true } = {}) => {
      if (!rendererTraceStarted || rendererTraceStopAttempted) return
      rendererTraceStopAttempted = true
      const tracePath = path.join(artifactsDirectory, 'renderer-trace.json')
      report.diagnostics ||= {}
      report.diagnostics.rendererTrace = {
        ...report.diagnostics.rendererTrace,
        status: 'stopping',
      }
      try {
        const stoppedCapture = await stopElectronRendererTrace({
          outputPath: tracePath,
          started: rendererTraceStartCapture,
        })
        rendererTraceStarted = false
        const summary = await analyzeElectronRendererTrace({
          tracePath,
          artifactsDirectory,
          capture: stoppedCapture,
        })
        report.diagnostics.rendererTrace = {
          diagnosticOnly: true,
          status: scenarioWindowCompleted ? 'completed' : 'partial',
          scenarioWindowCompleted,
          capture: summary.capture,
          analysis: summary.analysis,
          artifacts: summary.artifacts,
        }
      } catch (error) {
        rendererTraceStarted = false
        report.diagnostics.rendererTrace = {
          ...report.diagnostics.rendererTrace,
          status: 'failed',
          reason: error.message,
        }
        throw error
      }
    }

    try {
      const credentials = loadEngineCredentials()
      requireCondition(credentials.Host === '127.0.0.1', `Yak fixture is not loopback: ${credentials.Host}`)
      await confirmStartupWorkspace()
      await connectRemoteEngineThroughUI(credentials)
      await waitForMainWindow()
      await enterDefaultProjectThroughUI()

      fixture = await startHTTPPerformanceFixture({ profileName: profile.name, profileOverrides })
      report.scenario = {
        token: fixture.token,
        proxyAddress: `${fixture.proxyHost}:${fixture.proxyPort}`,
        targetOrigin: fixture.target.origin,
        responseBodyBytes: fixture.target.responseBodyBytes,
        wireResponseBodyBytes: fixture.target.wireResponseBodyBytes,
        responseContentEncoding: fixture.target.responseContentEncoding,
      }
      yakSampler = await createYakProcessSampler(Number(process.env.YAKIT_E2E_ENGINE_PID))
      report.resources.yakSampler = {
        supported: yakSampler.supported,
        clockTicksPerSecond: yakSampler.clockTicksPerSecond,
        reason: yakSampler.reason,
      }

      await openMITMV2ThroughUI()
      requireCondition(
        (await setMITMBackendSystemTimingEnabled(backendSystemTimingEnabled)) === backendSystemTimingEnabled,
        'Renderer did not apply the MITM backend timing diagnostic setting',
      )
      requireCondition(
        (await setMITMSkipLiveExactTotalEnabled(skipLiveExactTotalEnabled)) === skipLiveExactTotalEnabled,
        'Renderer did not apply the MITM live exact-total setting',
      )
      requireCondition(
        (await setMITMFlowCommittedMode(flowCommittedMode)) === flowCommittedMode,
        'Renderer did not apply the MITM FlowCommitted mode',
      )
      requireCondition(
        (await setMITMHTTPFlowLiveStreamMode(httpFlowLiveStreamMode)) === httpFlowLiveStreamMode,
        'Renderer did not apply the MITM HTTPFlow live stream mode',
      )
      mitmStarted = true
      await startMITMV2ThroughUI({ host: fixture.proxyHost, port: fixture.proxyPort })
      await waitForLoopbackPort({ port: fixture.proxyPort, timeoutMs: 30_000 })

      await Promise.all([collectElectronProcessMetrics(), yakSampler.sample()])
      const idleStarted = Date.now()
      let consecutiveIdleSamples = 0
      let acceptedBaselineSamples = []
      let stabilizedAfterMs
      let lastIdleCPU
      while (Date.now() - idleStarted < idleTimeoutMs && acceptedBaselineSamples.length < baselineSampleCount) {
        await delay(sampleIntervalMs)
        const sample = await sampleResources('warmup')
        lastIdleCPU = {
          electron: totalElectronCPU(sample),
          yak: sample.yak?.cpuPercent || 0,
        }
        if (lastIdleCPU.electron <= idleCPUThresholdPercent && lastIdleCPU.yak <= idleCPUThresholdPercent) {
          if (consecutiveIdleSamples < idleStableSamples) {
            consecutiveIdleSamples += 1
            if (consecutiveIdleSamples === idleStableSamples) stabilizedAfterMs = Date.now() - idleStarted
          } else {
            sample.phase = 'baseline'
            acceptedBaselineSamples.push(sample)
          }
        } else {
          consecutiveIdleSamples = 0
          stabilizedAfterMs = undefined
          for (const baselineSample of acceptedBaselineSamples) baselineSample.phase = 'warmup'
          acceptedBaselineSamples = []
        }
      }
      report.resources.idleGate = {
        stabilized: acceptedBaselineSamples.length === baselineSampleCount,
        waitedMs: Date.now() - idleStarted,
        stabilizedAfterMs,
        stableSamples: consecutiveIdleSamples,
        requiredStableSamples: idleStableSamples,
        baselineSamples: acceptedBaselineSamples.length,
        requiredBaselineSamples: baselineSampleCount,
        cpuThresholdPercent: idleCPUThresholdPercent,
        lastCPUPercent: lastIdleCPU,
      }
      requireCondition(
        report.resources.idleGate.stabilized,
        `Resources did not become idle within ${idleTimeoutMs}ms (Electron ${lastIdleCPU?.electron?.toFixed(1)}%, Yak ${lastIdleCPU?.yak?.toFixed(1)}%)`,
      )

      if (heapProfileEnabled) {
        requireCondition(
          process.env.YAKIT_E2E_ENGINE_PPROF_ADDRESS,
          'Yak heap profiling was enabled without a pprof endpoint',
        )
        requireCondition(
          process.env.YAKIT_E2E_ENGINE_BINARY && path.isAbsolute(process.env.YAKIT_E2E_ENGINE_BINARY),
          'Yak heap profiling was enabled without an absolute engine binary path',
        )
        report.diagnostics ||= {}
        report.diagnostics.yakHeapProfile = {
          diagnosticOnly: true,
          status: 'collecting-baseline',
          forcedGC: true,
        }
        heapBaselineCapture = await collectYakHeapProfile({
          address: process.env.YAKIT_E2E_ENGINE_PPROF_ADDRESS,
          outputPath: path.join(artifactsDirectory, 'yak-heap-baseline.pprof'),
        })
        report.diagnostics.yakHeapProfile = {
          ...report.diagnostics.yakHeapProfile,
          status: 'baseline-collected',
          baselineCapture: heapBaselineCapture,
        }
      }

      // MITM startup issues its first list query asynchronously. Reset only
      // after the idle gate (and optional baseline profile) so an old query
      // cannot commit rows across the observation boundary.
      await resetMITMObservability()
      longTaskObserverStarted = await startRendererLongTaskObserver()
      await startScenarioRenderObserver(fixture.token)
      renderObserverStarted = true

      if (rendererTraceEnabled) {
        report.diagnostics ||= {}
        report.diagnostics.rendererTrace = {
          diagnosticOnly: true,
          status: 'starting',
        }
        rendererTraceStartCapture = await startElectronRendererTrace()
        rendererTraceStarted = true
        report.diagnostics.rendererTrace = {
          ...report.diagnostics.rendererTrace,
          status: 'recording',
          capture: rendererTraceStartCapture,
        }
      }

      if (cpuProfileEnabled) {
        requireCondition(
          process.env.YAKIT_E2E_ENGINE_PPROF_ADDRESS,
          'Yak CPU profiling was enabled without a pprof endpoint',
        )
        requireCondition(
          process.env.YAKIT_E2E_ENGINE_BINARY && path.isAbsolute(process.env.YAKIT_E2E_ENGINE_BINARY),
          'Yak CPU profiling was enabled without an absolute engine binary path',
        )
        report.diagnostics ||= {}
        report.diagnostics.yakCPUProfile = {
          diagnosticOnly: true,
          status: 'collecting',
          durationSeconds: cpuProfileDurationSeconds,
        }
        cpuProfileCapturePromise = collectYakCPUProfile({
          address: process.env.YAKIT_E2E_ENGINE_PPROF_ADDRESS,
          durationSeconds: cpuProfileDurationSeconds,
          outputPath: path.join(artifactsDirectory, 'yak-cpu.pprof'),
        }).then(
          (capture) => ({ capture }),
          (error) => ({ error }),
        )
      }

      let consumerState = consumerMode === 'scroll-away' ? 'waiting-to-pause' : 'following'
      let consumerPauseStartedAtUnixMs = 0
      const updateConsumerPosition = async () => {
        if (consumerMode !== 'scroll-away') return
        const targetProgress = fixture.target.progress()
        if (consumerState === 'waiting-to-pause' && targetProgress.receivedRequests >= consumerPauseAfterRequests) {
          const table = await setMITMTableConsumerPosition('away')
          requireCondition(
            table.atRequestedPosition,
            `MITM table could not pause away from the top (max scroll ${table.maximumScrollTop})`,
          )
          consumerPauseStartedAtUnixMs = Date.now()
          consumerState = 'paused'
          report.consumer = {
            mode: consumerMode,
            pauseStart: {
              atUnixMs: consumerPauseStartedAtUnixMs,
              targetReceivedRequests: targetProgress.receivedRequests,
              table,
              pipeline: await recordPipelineSample('consumer-pause-start'),
            },
          }
          return
        }
        if (consumerState === 'paused' && targetProgress.receivedRequests >= consumerResumeAfterRequests) {
          const pauseEndPipeline = await recordPipelineSample('consumer-pause-end')
          requireCondition(
            pauseEndPipeline.streamVisibleIdBacklog > 0,
            'MITM table consumer pause did not produce a visible stream backlog',
          )
          const table = await setMITMTableConsumerPosition('top')
          requireCondition(
            table.before.scrollTop >= 10,
            `MITM table returned to the top before the consumer resume gate (${table.before.scrollTop})`,
          )
          requireCondition(table.atRequestedPosition, `MITM table did not return to the top (${table.after.scrollTop})`)
          const resumedAtUnixMs = Date.now()
          consumerState = 'resumed'
          report.consumer.pauseEnd = {
            atUnixMs: resumedAtUnixMs,
            targetReceivedRequests: targetProgress.receivedRequests,
            tableBeforeResume: table.before,
            pipeline: pauseEndPipeline,
          }
          report.consumer.resume = {
            atUnixMs: resumedAtUnixMs,
            targetReceivedRequests: targetProgress.receivedRequests,
            table,
            pipeline: await recordPipelineSample('consumer-resume-start'),
          }
          report.timing.consumerPauseWindowMs = Math.max(0, resumedAtUnixMs - consumerPauseStartedAtUnixMs)
        }
      }

      let loadSettled = false
      let nextPipelineSampleAt = 0
      const loadPromise = fixture.runLoad().finally(() => {
        loadSettled = true
      })
      do {
        await updateConsumerPosition()
        const loadPhase =
          consumerState === 'paused' ? 'consumer-paused' : consumerState === 'resumed' ? 'consumer-recovery' : 'load'
        await sampleResources(loadPhase)
        if (Date.now() >= nextPipelineSampleAt) {
          await recordPipelineSample(loadPhase)
          nextPipelineSampleAt = Date.now() + pipelineSampleIntervalMs
        }
        if (!loadSettled) await delay(sampleIntervalMs)
      } while (!loadSettled)
      await updateConsumerPosition()
      report.load = await loadPromise
      report.pipeline.producerStop = await recordPipelineSample('producer-stop')

      if (consumerMode === 'scroll-away') {
        report.correctness.consumer = {
          required: true,
          paused: !!report.consumer?.pauseStart,
          resumed: consumerState === 'resumed' && !!report.consumer?.resume,
          remainedAway: Number(report.consumer?.pauseEnd?.tableBeforeResume?.scrollTop) >= 10,
          restoredToTop: report.consumer?.resume?.table?.atRequestedPosition === true,
          backlogObserved: Number(report.consumer?.pauseEnd?.pipeline?.streamVisibleIdBacklog) > 0,
          caughtUp: false,
        }
        requireCondition(report.correctness.consumer.paused, 'MITM table consumer never entered the paused position')
        requireCondition(report.correctness.consumer.resumed, 'MITM table consumer never resumed at the top')
        requireCondition(
          report.correctness.consumer.remainedAway,
          'MITM table consumer did not remain away from the top',
        )
        requireCondition(
          report.correctness.consumer.restoredToTop,
          'MITM table consumer did not restore the top position',
        )
        requireCondition(report.correctness.consumer.backlogObserved, 'MITM table consumer did not accumulate backlog')
      }

      const targetSnapshot = fixture.target.snapshot()
      const expected = expectedSequences(profile.requests)
      report.correctness.producer = {
        completed: report.load.completed,
        failed: report.load.failed,
        errors: report.load.errors,
      }
      report.correctness.target = targetSnapshot
      requireCondition(report.load.failed === 0, `HTTP producer failed ${report.load.failed} requests`)
      requireCondition(
        report.load.responseBytes === profile.requests * fixture.target.wireResponseBodyBytes,
        `Producer received ${report.load.responseBytes}/${profile.requests * fixture.target.wireResponseBodyBytes} wire response body bytes`,
      )
      requireCondition(
        targetSnapshot.receivedRequests === profile.requests,
        `Target received ${targetSnapshot.receivedRequests}/${profile.requests}`,
      )
      requireCondition(
        targetSnapshot.receivedRequestBodyBytes === profile.requests * profile.requestBodyBytes,
        `Target received ${targetSnapshot.receivedRequestBodyBytes}/${profile.requests * profile.requestBodyBytes} request body bytes`,
      )
      requireCondition(
        targetSnapshot.duplicateSequences.length === 0,
        `Target saw duplicate sequences: ${targetSnapshot.duplicateSequences}`,
      )
      requireCondition(
        JSON.stringify(targetSnapshot.sequences) === JSON.stringify(expected),
        'Target sequence set has gaps',
      )

      let databaseCountSnapshot
      const databaseWaitStarted = Date.now()
      const databaseDeadline = databaseWaitStarted + profile.scenarioTimeoutMs
      while (Date.now() < databaseDeadline) {
        databaseCountSnapshot = await queryMITMScenarioFlows({ token: fixture.token, limit: 1 })
        report.pipeline.databaseProgress.push({
          atUnixMs: Date.now(),
          total: databaseCountSnapshot.total,
        })
        await sampleResources('drain')
        if (Date.now() >= nextPipelineSampleAt) {
          await recordPipelineSample('database-drain')
          nextPipelineSampleAt = Date.now() + pipelineSampleIntervalMs
        }
        if (databaseCountSnapshot.total >= profile.requests) break
        await delay(sampleIntervalMs)
      }
      report.timing.databaseCatchUpMs = Math.max(0, Date.now() - report.load.finishedAtUnixMs)
      const databaseSnapshot = await queryMITMScenarioFlows({ token: fixture.token, limit: profile.requests + 10 })
      report.timing.databaseDrainMs = Math.max(0, Date.now() - report.load.finishedAtUnixMs)
      report.pipeline.databaseDrained = await recordPipelineSample('database-drained')
      requireCondition(
        databaseSnapshot?.total === profile.requests,
        `Project DB contains ${databaseSnapshot?.total || 0}/${profile.requests} scenario flows`,
      )
      requireCondition(
        databaseSnapshot.flows.length === profile.requests,
        `Project DB returned ${databaseSnapshot.flows.length}/${profile.requests} scenario rows`,
      )

      const databaseSequences = databaseSnapshot.flows
        .map((flow) => sequenceFromFlowURL(flow.url))
        .sort((a, b) => a - b)
      const databaseIds = databaseSnapshot.flows.map((flow) => flow.id)
      report.correctness.database = {
        total: databaseSnapshot.total,
        uniqueIds: new Set(databaseIds).size,
        sequences: databaseSequences,
        allStatus200: databaseSnapshot.flows.every((flow) => flow.statusCode === 200),
        allMITM: databaseSnapshot.flows.every((flow) => flow.sourceType === 'mitm'),
      }
      requireCondition(new Set(databaseIds).size === profile.requests, 'Project DB returned duplicate flow IDs')
      requireCondition(
        JSON.stringify(databaseSequences) === JSON.stringify(expected),
        'Project DB scenario sequence set has gaps',
      )
      requireCondition(report.correctness.database.allStatus200, 'Project DB contains a non-200 scenario flow')
      requireCondition(report.correctness.database.allMITM, 'Project DB contains a scenario flow from another source')

      const maxScenarioFlowId = Math.max(...databaseIds)
      const rendererWaitStarted = Date.now()
      const rendererDeadline = rendererWaitStarted + profile.scenarioTimeoutMs
      let rendererPipeline
      let observability
      while (Date.now() < rendererDeadline) {
        rendererPipeline = await recordPipelineSample('renderer-drain')
        await sampleResources('drain')
        if (
          rendererPipeline.latestVisibleId >= maxScenarioFlowId &&
          rendererPipeline.approximateIdBacklog === 0 &&
          rendererPipeline.streamVisibleIdBacklog === 0 &&
          rendererPipeline.directRecoveryRequired === false &&
          (!backendSystemTimingEnabled || rendererPipeline.flowSamples > 0) &&
          (!httpFlowLiveStreamEnabled ||
            (rendererPipeline.streamCommitted > 0 && rendererPipeline.streamHighWaterId >= maxScenarioFlowId))
        ) {
          break
        }
        await delay(sampleIntervalMs)
      }
      report.timing.rendererDrainMs = Math.max(0, Date.now() - report.load.finishedAtUnixMs)
      report.pipeline.rendererDrained = rendererPipeline
      if (consumerMode === 'scroll-away') {
        report.timing.consumerResumeToRendererDrainMs = Math.max(
          0,
          Date.now() - Number(report.consumer?.resume?.atUnixMs || Date.now()),
        )
        report.correctness.consumer.caughtUp =
          rendererPipeline.latestVisibleId >= maxScenarioFlowId &&
          rendererPipeline.approximateIdBacklog === 0 &&
          rendererPipeline.streamVisibleIdBacklog === 0 &&
          rendererPipeline.directRecoveryRequired === false
        requireCondition(
          report.correctness.consumer.caughtUp,
          `MITM table did not catch up after consumer resume (visible backlog ${rendererPipeline.streamVisibleIdBacklog})`,
        )
      }
      if (flowCommittedShadowEnabled && httpFlowLiveStreamMode === 'canary') {
        let lastReconciliationSnapshot
        try {
          await browser.waitUntil(
            async () => {
              const current = await getMITMObservabilitySnapshot()
              lastReconciliationSnapshot = current
              return (
                Number(current?.flowCommittedShadow?.pending || 0) === 0 &&
                Number(current?.flowCommittedShadow?.directRowsWithoutEvent || 0) === 0
              )
            },
            {
              timeout: 5_000,
              interval: 100,
              timeoutMsg: 'FlowCommitted shadow and direct-list observations did not reconcile',
            },
          )
        } finally {
          if (lastReconciliationSnapshot) report.observability = lastReconciliationSnapshot
        }
      }
      observability = await getMITMObservabilitySnapshot()
      report.observability = observability
      report.config.httpFlowLiveRefreshMinIntervalMs = observability?.config?.httpFlowLiveRefreshMinIntervalMs
      report.config.httpFlowLiveDirectMinIntervalMs = observability?.config?.httpFlowLiveDirectMinIntervalMs
      report.config.httpFlowLiveDirectSustainedIntervalMs =
        observability?.config?.httpFlowLiveDirectSustainedIntervalMs
      report.config.httpFlowLiveDirectSustainedPendingRows =
        observability?.config?.httpFlowLiveDirectSustainedPendingRows
      report.config.mitmFlowTableOverscan = observability?.config?.mitmFlowTableOverscan
      requireCondition(
        observability?.state.latestVisibleId >= maxScenarioFlowId,
        `Renderer high-water ${observability?.state.latestVisibleId || 0} did not reach scenario flow ${maxScenarioFlowId}`,
      )
      requireCondition(
        observability.state.approximateIdBacklog === 0,
        `Renderer backlog remained at ${observability.state.approximateIdBacklog}`,
      )
      requireCondition(
        observability.state.streamVisibleIdBacklog === 0,
        `Renderer stream backlog remained at ${observability.state.streamVisibleIdBacklog}`,
      )
      if (backendSystemTimingEnabled) {
        requireCondition(observability.flow.count > 0, 'Renderer did not correlate any flow timing samples')
      } else {
        requireCondition(
          observability.config?.backendSystemTimingEnabled === false,
          'Renderer unexpectedly re-enabled backend system timing',
        )
      }
      if (flowCommittedShadowEnabled) {
        requireCondition(
          observability.flowCommittedShadow?.received > 0,
          'Renderer did not receive any FlowCommitted shadow events',
        )
        requireCondition(
          observability.flowCommittedShadow?.invalid === 0,
          `Renderer rejected ${observability.flowCommittedShadow?.invalid || 0} FlowCommitted shadow events`,
        )
        requireCondition(
          observability.flowCommittedShadow?.duplicates === 0,
          `Renderer observed ${observability.flowCommittedShadow?.duplicates || 0} duplicate FlowCommitted events`,
        )
      }
      if (flowCommittedMode === 'canary') {
        requireCondition(
          observability.live?.timeline?.some((cycle) => cycle.triggerSource === 'flow-committed'),
          'FlowCommitted canary did not trigger any live QueryHTTPFlows cycle',
        )
      }
      if (httpFlowLiveStreamEnabled) {
        const liveStream = observability.httpFlowLiveStream
        requireCondition(
          liveStream?.mode === httpFlowLiveStreamMode,
          `HTTPFlow live stream mode drifted to ${liveStream?.mode || 'unknown'}`,
        )
        requireCondition(liveStream?.received > 0, 'Renderer did not receive any HTTPFlow live stream events')
        requireCondition(liveStream?.committed > 0, 'Renderer did not receive any HTTPFlow live commit events')
        requireCondition(
          liveStream?.highWaterId >= maxScenarioFlowId,
          `HTTPFlow live stream high-water ${liveStream?.highWaterId || 0} did not reach ${maxScenarioFlowId}`,
        )
        for (const [name, value] of Object.entries({
          gaps: liveStream?.gaps,
          invalidEnvelopes: liveStream?.invalidEnvelopes,
          invalidEvents: liveStream?.invalidEvents,
          sequenceGaps: liveStream?.sequenceGaps,
          duplicates: liveStream?.duplicates,
          outOfOrder: liveStream?.outOfOrder,
          unavailable: liveStream?.unavailable,
          ended: liveStream?.ended,
        })) {
          requireCondition(Number(value || 0) === 0, `HTTPFlow live stream ${name}=${value || 0}`)
        }
      }
      if (httpFlowLiveStreamMode === 'canary') {
        requireCondition(
          observability.httpFlowLiveStream?.directRows > 0,
          'HTTPFlow live stream canary did not commit any direct summary rows',
        )
        if (consumerMode === 'scroll-away') {
          report.correctness.consumer.directFallbackObserved =
            Number(observability.httpFlowLiveStream?.directFallbackRows || 0) > 0
          requireCondition(
            report.correctness.consumer.directFallbackObserved,
            'HTTPFlow live stream did not exercise query fallback while the table was away from the top',
          )
          report.correctness.consumer.directRecoveryEntered =
            Number(observability.httpFlowLiveStream?.directRecoveryEntries || 0) > 0
          report.correctness.consumer.directRecoveryCompleted =
            Number(observability.httpFlowLiveStream?.directRecoveryCompletions || 0) > 0 &&
            observability.httpFlowLiveStream?.directRecoveryRequired === false
          requireCondition(
            report.correctness.consumer.directRecoveryEntered,
            'HTTPFlow live stream did not enter query recovery after direct fallback',
          )
          requireCondition(
            report.correctness.consumer.directRecoveryCompleted,
            'HTTPFlow live stream did not complete query recovery after returning to the top',
          )
        }
        if (flowCommittedShadowEnabled) {
          requireCondition(
            observability.flowCommittedShadow?.directMatches > 0,
            'FlowCommitted shadow did not match any direct list commits',
          )
          requireCondition(
            Number(observability.flowCommittedShadow?.pending || 0) === 0,
            `FlowCommitted shadow retained ${observability.flowCommittedShadow?.pending || 0} pending events`,
          )
          requireCondition(
            Number(observability.flowCommittedShadow?.directRowsWithoutEvent || 0) === 0,
            `Direct list retained ${observability.flowCommittedShadow?.directRowsWithoutEvent || 0} rows without shadow events`,
          )
        }
      }

      await browser.waitUntil(
        async () => {
          const observation = await getScenarioRenderObservation()
          return observation?.seen === true
        },
        {
          timeout: 15_000,
          interval: 100,
          timeoutMsg: 'No scenario URL was rendered in the visible MITM virtual table',
        },
      )
      const renderObservation = await getScenarioRenderObservation({ stop: true })
      renderObserverStarted = false
      report.renderer = {
        firstScenarioRow: {
          ...renderObservation,
          latencyFromLoadStartMs: Math.max(0, renderObservation.firstVisibleAtUnixMs - report.load.startedAtUnixMs),
        },
        longTasks: await stopRendererLongTaskObserver(),
      }
      longTaskObserverStarted = false
      await finalizeRendererTrace()

      const baselineSummary = summarizeResourceSamples(report.resources.samples).baseline
      const electronRecoveryThreshold = Math.max(
        idleCPUThresholdPercent,
        (baselineSummary?.electronCPUPercent?.p95 || 0) + 10,
      )
      const yakRecoveryThreshold = Math.max(idleCPUThresholdPercent, (baselineSummary?.yakCPUPercent?.p95 || 0) + 10)
      const recoveryStarted = Date.now()
      const recoveryDeadline = recoveryStarted + recoveryTimeoutMs
      let stableRecoverySamples = 0
      while (Date.now() < recoveryDeadline && stableRecoverySamples < recoveryStableSamples) {
        await delay(sampleIntervalMs)
        const sample = await sampleResources('recovery')
        const electronCPU = totalElectronCPU(sample)
        const yakCPU = sample.yak?.cpuPercent || 0
        if (electronCPU <= electronRecoveryThreshold && yakCPU <= yakRecoveryThreshold) stableRecoverySamples += 1
        else stableRecoverySamples = 0
      }
      const recovered = stableRecoverySamples >= recoveryStableSamples
      report.timing.cpuRecoveryMs = Math.min(Date.now() - recoveryStarted, recoveryTimeoutMs)
      report.timing.producerStopToCPURecoveryMs = Math.max(0, Date.now() - report.load.finishedAtUnixMs)
      report.resources.recovery = {
        recovered,
        timedOut: !recovered,
        stableSamples: stableRecoverySamples,
        requiredStableSamples: recoveryStableSamples,
        electronCPUThresholdPercent: electronRecoveryThreshold,
        yakCPUThresholdPercent: yakRecoveryThreshold,
        informationalOnly: !requireCPURecovery,
      }
      report.correctness.cpuRecovery = { required: requireCPURecovery, recovered }
      requireCondition(!requireCPURecovery || recovered, `CPU did not recover within ${recoveryTimeoutMs}ms`)

      await finalizeYakCPUProfile()
      await finalizeYakHeapProfile()

      // DOM/scroll correctness intentionally runs after CPU recovery so this
      // synthetic interaction cannot delay the producer-stop-to-idle metric.
      report.renderer.virtualScroll = await exerciseMITMTableVirtualScroll()
      requireCondition(report.renderer.virtualScroll.moved, 'MITM virtual table did not render rows after scrolling')
      requireCondition(report.renderer.virtualScroll.restoredToTop, 'MITM virtual table did not restore its top rows')
      report.renderer.dom = await getMITMTableDOMSnapshot()

      // Detail hydration is a correctness check, not part of the live-list
      // performance window. Large packets here would otherwise skew renderer
      // long-task and CPU-recovery comparisons against older reports.
      const detailPacket = await queryHTTPFlowPacketSummaryById(databaseIds[0])
      report.correctness.detailPacket = detailPacket
      requireCondition(detailPacket.id === databaseIds[0], 'GetHTTPFlowById returned a different flow')
      requireCondition(
        detailPacket.request.bodyBytes === profile.requestBodyBytes,
        `Detail request body is ${detailPacket.request.bodyBytes}/${profile.requestBodyBytes} bytes`,
      )
      requireCondition(
        detailPacket.response.bodyBytes === profile.responseBodyBytes,
        `Detail response body is ${detailPacket.response.bodyBytes}/${profile.responseBodyBytes} bytes`,
      )
      report.status = 'passed'
    } catch (error) {
      scenarioError = error
      report.status = 'failed'
      report.failure = {
        message: error?.message || String(error),
        stack: error?.stack,
      }
    } finally {
      if (heapBaselineCapture && report.diagnostics?.yakHeapProfile) {
        report.diagnostics.yakHeapProfile = {
          ...report.diagnostics.yakHeapProfile,
          status: 'incomplete',
          reason: 'scenario did not reach the post-recovery heap snapshot',
        }
      }
      if (cpuProfileCapturePromise) {
        try {
          await finalizeYakCPUProfile()
        } catch (error) {
          cleanupErrors.push(`Yak CPU profile: ${error.message}`)
        }
      }
      if (rendererTraceStarted && !rendererTraceStopAttempted) {
        try {
          await finalizeRendererTrace({ scenarioWindowCompleted: false })
        } catch (error) {
          cleanupErrors.push(`Electron Renderer trace: ${error.message}`)
        }
      }
      if (renderObserverStarted) {
        try {
          await getScenarioRenderObservation({ stop: true })
        } catch (error) {
          cleanupErrors.push(`render observer: ${error.message}`)
        }
      }
      if (longTaskObserverStarted) {
        try {
          report.renderer ||= {}
          report.renderer.longTasks = await stopRendererLongTaskObserver()
        } catch (error) {
          cleanupErrors.push(`long-task observer: ${error.message}`)
        }
      }
      if (mitmStarted) {
        try {
          await stopMITMV2ThroughUI()
          await waitForLoopbackPortClosed({ port: fixture.proxyPort, timeoutMs: 10_000 })
          report.cleanup.mitmStopped = true
        } catch (error) {
          cleanupErrors.push(`MITM: ${error.message}`)
        }
      }
      if (fixture) {
        try {
          await fixture.stop()
          report.cleanup.targetStopped = true
        } catch (error) {
          cleanupErrors.push(`HTTP target: ${error.message}`)
        }
      }
      report.cleanup.errors = cleanupErrors
      report.pipeline.summary = summarizeMITMPipelineSamples(report.pipeline.samples)
      report.resources.summary = summarizeResourceSamples(report.resources.samples)
      report.finishedAt = new Date().toISOString()
      report.durationMs = new Date(report.finishedAt).getTime() - new Date(report.startedAt).getTime()
      if (cleanupErrors.length && report.status === 'passed') {
        report.status = 'failed'
        report.failure = { message: `Cleanup failed: ${cleanupErrors.join('; ')}` }
      }
      const outputPath = await writeMITMPerformanceReport(artifactsDirectory, report)
      console.info(`[electron-e2e] MITM performance report: ${outputPath}`)
    }

    if (scenarioError) throw scenarioError
    if (cleanupErrors.length) throw new Error(`MITM performance cleanup failed: ${cleanupErrors.join('; ')}`)
  })
})
