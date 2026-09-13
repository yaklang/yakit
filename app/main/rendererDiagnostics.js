const fs = require('fs')
const os = require('os')
const path = require('path')
const { randomUUID } = require('crypto')

const SAMPLE_INTERVAL_MS = 5000
const HISTORY_LIMIT = 12
const INCIDENT_LIMIT = 10
const LOG_TAIL_BYTES = 2 * 1024 * 1024
const DUMP_MAX_BYTES = 32 * 1024 * 1024
const MEMORY_CHANNEL = 'renderer-diagnostics:memory'
const MEMORY_INTERVAL_MS = 1000
const MEMORY_HISTORY_LIMIT = 60
const MEMORY_FRESH_MS = 10_000

function memoryAssessment(details, memory, pid) {
  if (details.reason === 'oom') return { status: 'reported-oom', source: 'electron' }
  const last = memory.at(-1)
  const ageMs = last ? Math.max(0, Date.now() - last.receivedAt) : null
  if (!last || last.rendererPid !== pid || ageMs > MEMORY_FRESH_MS) {
    return { status: 'unknown', sampleAgeMs: ageMs }
  }
  const ratio = last.usedHeapKB / last.heapLimitKB
  return {
    // High usage is evidence of pressure, not proof of the cause of a native crash.
    status: ratio >= 0.8 ? 'suspected-js-heap-pressure' : 'no-js-heap-pressure-observed',
    sampleAgeMs: ageMs,
    heapUsedRatio: ratio,
    usedHeapKB: last.usedHeapKB,
    heapLimitKB: last.heapLimitKB,
    availableHeapKB: last.availableHeapKB,
  }
}

// A rejected or stuck GPU query must never delay window creation or recovery.
function settleWithin(read, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ error: 'timeout' }), timeoutMs)
    Promise.resolve()
      .then(read)
      .then(
        (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        (error) => {
          clearTimeout(timer)
          resolve({ error: String(error?.message || error) })
        },
      )
  })
}

function readProcesses(app) {
  try {
    return app.getAppMetrics().map((metric) => ({
      pid: metric.pid,
      creationTime: metric.creationTime,
      type: metric.type,
      cpuPercent: metric.cpu?.percentCPUUsage ?? null,
      workingSetSizeKB: metric.memory?.workingSetSize ?? null,
      peakWorkingSetSizeKB: metric.memory?.peakWorkingSetSize ?? null,
    }))
  } catch (error) {
    return { error: String(error?.message || error) }
  }
}

function listFiles(directory, accept) {
  try {
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && accept(entry.name))
      .map((entry) => {
        const file = path.join(directory, entry.name)
        return { file, ...fs.statSync(file) }
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
  } catch {
    return []
  }
}

/** All new telemetry is local. Existing text logs and native dumps are included only on explicit export. */
function createRendererDiagnostics({ app, crashReporter, writeLog, flushLogs, getLogFiles }) {
  const directory = path.join(app.getPath('userData'), 'renderer-diagnostics')
  const crashDumps = path.join(directory, 'Crashpad')
  const history = []
  const windows = new Map()
  let timer
  let memoryTimer
  let gpu = { status: 'pending' }
  let reporter = { enabled: false, uploadToServer: false }
  const base = {
    appName: app.getName(),
    appVersion: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    cpuModel: os.cpus()[0]?.model,
    cpuCount: os.cpus().length,
    totalMemoryKB: Math.round(os.totalmem() / 1024),
    versions: { ...process.versions },
    graphicsFlags: {
      disableGPU: app.commandLine?.hasSwitch('disable-gpu') || false,
      disableGPUCompositing: app.commandLine?.hasSwitch('disable-gpu-compositing') || false,
      useAngle: app.commandLine?.getSwitchValue('use-angle') || '',
    },
  }
  const log = (message) => {
    try {
      writeLog(message)
    } catch {
      // Keep diagnostics failures out of the recovery path.
    }
  }

  // Called before the first BrowserWindow is created, including in isolated E2E runs.
  try {
    fs.mkdirSync(crashDumps, { recursive: true, mode: 0o700 })
    app.setPath('crashDumps', crashDumps)
    crashReporter.start({ uploadToServer: false })
    reporter = { enabled: true, uploadToServer: false }
  } catch (error) {
    reporter.error = String(error?.message || error)
    log(`[renderer-diagnostics] crash reporter unavailable: ${reporter.error}`)
  }

  function sample() {
    const value = {
      time: new Date().toISOString(),
      freeMemoryKB: Math.round(os.freemem() / 1024),
      systemUptimeSeconds: os.uptime(),
      appUptimeSeconds: process.uptime(),
      loadAverage: os.loadavg(),
      processes: readProcesses(app),
    }
    history.push(value)
    if (history.length > HISTORY_LIMIT) history.shift()
    for (const [window, identity] of windows) {
      try {
        if (!window.isDestroyed() && !window.webContents.isDestroyed() && !window.webContents.isCrashed()) {
          const pid = window.webContents.getOSProcessId()
          if (pid) identity.rendererPid = pid
        }
      } catch (error) {
        identity.samplingError = String(error?.message || error)
      }
    }
    return value
  }

  function snapshot() {
    return {
      time: new Date().toISOString(),
      base,
      gpu,
      reporter,
      current: sample(),
      history: history.slice(),
      rendererMemory: [...windows.values()].map(({ name, rendererPid, memory }) => ({
        name,
        rendererPid,
        samples: memory.slice(),
      })),
    }
  }

  function trackWindow(window, name) {
    const identity = {
      name,
      windowId: window.id,
      webContentsId: window.webContents.id,
      rendererPid: null,
      memory: [],
      pending: null,
      lastPressureAt: -Infinity,
    }
    windows.set(window, identity)
    window.webContents.on('did-finish-load', sample)
    window.webContents.on('dom-ready', () => {
      identity.pending = null
      requestMemory(window, identity)
    })
    window.webContents.on('did-start-loading', () => {
      identity.pending = null
    })
    window.webContents.on('ipc-message', (event, channel, nonce, payload) => {
      if (
        channel !== MEMORY_CHANNEL ||
        !identity.pending ||
        nonce !== identity.pending.nonce ||
        event.senderFrame !== window.webContents.mainFrame
      )
        return
      const pending = identity.pending
      identity.pending = null
      const keys = ['usedHeapKB', 'heapLimitKB', 'availableHeapKB', 'blinkAllocatedKB', 'blinkTotalKB']
      if (
        !payload ||
        keys.some((key) => !Number.isSafeInteger(payload[key]) || payload[key] < 0) ||
        payload.heapLimitKB === 0 ||
        payload.usedHeapKB > payload.heapLimitKB
      )
        return
      const value = { receivedAt: Date.now(), rendererPid: pending.pid }
      for (const key of keys) value[key] = payload[key]
      identity.memory.push(value)
      if (identity.memory.length > MEMORY_HISTORY_LIMIT) identity.memory.shift()
      if (value.usedHeapKB / value.heapLimitKB >= 0.8 && Date.now() - identity.lastPressureAt >= 60_000) {
        identity.lastPressureAt = Date.now()
        record('renderer-memory-pressure', { source: 'v8-heap' }, window)
      }
    })
    window.once('closed', () => windows.delete(window))
  }

  function requestMemory(window, identity) {
    try {
      // One outstanding request per window: a hung renderer cannot accumulate polling IPC.
      if (
        identity.pending ||
        window.isDestroyed() ||
        window.webContents.isDestroyed() ||
        window.webContents.isCrashed()
      )
        return
      const pid = window.webContents.getOSProcessId()
      if (!pid) return
      identity.rendererPid = pid
      const nonce = randomUUID()
      identity.pending = { nonce, pid }
      window.webContents.send(MEMORY_CHANNEL, nonce)
    } catch {
      identity.pending = null
    }
  }

  async function start() {
    if (timer) return
    sample()
    timer = setInterval(sample, SAMPLE_INTERVAL_MS)
    timer.unref?.()
    memoryTimer = setInterval(() => {
      for (const [window, identity] of windows) requestMemory(window, identity)
    }, MEMORY_INTERVAL_MS)
    memoryTimer.unref?.()
    const [gpuFeatureStatus, gpuInfoBasic, gpuInfoComplete] = await Promise.all([
      settleWithin(() => app.getGPUFeatureStatus()),
      settleWithin(() => app.getGPUInfo('basic')),
      settleWithin(() => app.getGPUInfo('complete')),
    ])
    gpu = { capturedAt: new Date().toISOString(), gpuFeatureStatus, gpuInfoBasic, gpuInfoComplete }
    log(`[renderer-diagnostics] startup snapshot: ${JSON.stringify(snapshot())}`)
  }

  function record(event, details = {}, window) {
    // Copy the pre-crash identity before sampling: a dead renderer's PID may already be 0.
    const tracked = windows.get(window)
    const identity = tracked
      ? {
          name: tracked.name,
          windowId: tracked.windowId,
          webContentsId: tracked.webContentsId,
          rendererPid: tracked.rendererPid,
        }
      : null
    const incident = {
      schemaVersion: 1,
      id: `incident-${Date.now()}-${randomUUID()}`,
      time: new Date().toISOString(),
      event,
      details,
      window: identity,
      memoryAssessment: memoryAssessment(details, tracked?.memory || [], identity?.rendererPid),
      snapshot: snapshot(),
      crashDumps,
    }
    let file
    try {
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
      file = path.join(directory, `${incident.id}.json`)
      // This bounded record survives an immediate app.exit; no renderer IPC or GPU Promise is needed.
      fs.writeFileSync(file, JSON.stringify(incident, null, 2), { mode: 0o600 })
      for (const old of listFiles(directory, (name) => /^incident-.*\.json$/.test(name)).slice(INCIDENT_LIMIT)) {
        fs.unlinkSync(old.file)
      }
    } catch (error) {
      incident.writeError = String(error?.message || error)
    }
    log(`[renderer-diagnostics] ${JSON.stringify({ ...incident, file })}`)
    return incident
  }

  async function exportBundle(destination) {
    const staging = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'yakit-diagnostics-'))
    const partial = `${destination}.${randomUUID()}.partial`
    try {
      const manifest = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        snapshot: snapshot(),
        files: [],
        notes: [
          'Text logs may contain sensitive application data; native dumps contain memory fragments. Review before sharing.',
          'Only current-session log tails and up to 3 recent dumps are included. A dump is not guaranteed for killed/OOM processes.',
          'Dump files are selected by modification time; this does not establish a match to a particular incident.',
        ],
      }
      manifest.flush = await settleWithin(async () => {
        await flushLogs()
        return { status: 'flushed' }
      })
      for (const [kind, file] of Object.entries(getLogFiles())) {
        if (!file) continue
        let handle
        try {
          handle = await fs.promises.open(file, 'r')
          const { size } = await handle.stat()
          const length = Math.min(size, LOG_TAIL_BYTES)
          const buffer = Buffer.alloc(length)
          const { bytesRead } = await handle.read(buffer, 0, length, Math.max(0, size - length))
          const name = `${kind}-log.txt`
          await fs.promises.writeFile(path.join(staging, name), buffer.subarray(0, bytesRead), { mode: 0o600 })
          manifest.files.push({ name, originalBytes: size, includedBytes: bytesRead, truncated: size > bytesRead })
        } catch (error) {
          manifest.files.push({ name: `${kind}-log.txt`, error: String(error?.message || error) })
        } finally {
          await handle?.close()
        }
      }
      const incidents = listFiles(directory, (name) => /^incident-.*\.json$/.test(name)).slice(0, INCIDENT_LIMIT)
      // Crashpad's layout varies by platform and Electron version (macOS 27 also uses pending).
      const dumps = ['', 'reports', 'pending', 'completed']
        .flatMap((subdir) => listFiles(path.join(crashDumps, subdir), (name) => name.endsWith('.dmp')))
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
        .slice(0, 3)
      for (const entry of [...incidents, ...dumps]) {
        const name = path.basename(entry.file)
        if (entry.size > DUMP_MAX_BYTES) {
          manifest.files.push({ name, originalBytes: entry.size, omitted: 'exceeds 32 MiB export limit' })
          continue
        }
        try {
          await fs.promises.copyFile(entry.file, path.join(staging, name))
          manifest.files.push({ name, includedBytes: entry.size })
        } catch (error) {
          manifest.files.push({ name, error: String(error?.message || error) })
        }
      }
      const includedDumps = manifest.files.filter(
        (entry) => entry.name.endsWith('.dmp') && entry.includedBytes > 0,
      ).length
      manifest.dumpCollection = {
        status: includedDumps ? 'included' : dumps.length ? 'unavailable' : 'no-dump-found',
        candidates: dumps.length,
        included: includedDumps,
      }
      await fs.promises.writeFile(path.join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2))
      await require('compressing').zip.compressDir(
        staging,
        fs.createWriteStream(partial, { flags: 'wx', mode: 0o600 }),
        { ignoreBase: true },
      )
      await fs.promises.rename(partial, destination)
      return manifest
    } finally {
      await fs.promises.rm(staging, { recursive: true, force: true })
      await fs.promises.rm(partial, { force: true })
    }
  }

  return {
    directory,
    crashDumps,
    start,
    sample,
    snapshot,
    trackWindow,
    record,
    exportBundle,
    stop: () => {
      clearInterval(timer)
      clearInterval(memoryTimer)
    },
  }
}

module.exports = {
  createRendererDiagnostics,
  settleWithin,
  HISTORY_LIMIT,
  INCIDENT_LIMIT,
  LOG_TAIL_BYTES,
  MEMORY_CHANNEL,
  MEMORY_HISTORY_LIMIT,
}
