// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import {
  createRendererDiagnostics,
  HISTORY_LIMIT,
  INCIDENT_LIMIT,
  LOG_TAIL_BYTES,
  MEMORY_PAGE_SCRIPT,
  MEMORY_HISTORY_LIMIT,
  WORKING_SET_WARN_KB,
  WORKING_SET_PRESSURE_INTERVAL_MS,
} from '../rendererDiagnostics'

const require = createRequire(import.meta.url)

describe('MEMORY_PAGE_SCRIPT', () => {
  const sample = (performance) => vm.runInNewContext(MEMORY_PAGE_SCRIPT, { performance })

  it('reads performance.memory and rounds bytes to KiB', () => {
    const memory = {
      usedJSHeapSize: 90 * 1024 + 512,
      jsHeapSizeLimit: 256 * 1024,
    }
    let reads = 0
    expect(
      sample({
        get memory() {
          reads += 1
          return memory
        },
      }),
    ).toEqual({ usedHeapKB: 91, heapLimitKB: 256 })
    expect(reads).toBe(1)
    expect(sample({ memory: { usedJSHeapSize: 0, jsHeapSizeLimit: 1024 } })).toEqual({
      usedHeapKB: 0,
      heapLimitKB: 1,
    })
  })

  it('returns null when the page heap API is missing', () => {
    expect(sample(undefined)).toBeNull()
    expect(sample({})).toBeNull()
    expect(sample({ memory: null })).toBeNull()
    expect(sample({ memory: undefined })).toBeNull()
  })

  it('returns null for non-finite usage or a non-positive heap limit', () => {
    const jsHeapSizeLimit = 4096
    expect(sample({ memory: { usedJSHeapSize: Number.NaN, jsHeapSizeLimit } })).toBeNull()
    expect(sample({ memory: { usedJSHeapSize: Number.POSITIVE_INFINITY, jsHeapSizeLimit } })).toBeNull()
    expect(sample({ memory: { usedJSHeapSize: undefined, jsHeapSizeLimit } })).toBeNull()
    expect(sample({ memory: { usedJSHeapSize: 2048, jsHeapSizeLimit: 0 } })).toBeNull()
    expect(sample({ memory: { usedJSHeapSize: 2048, jsHeapSizeLimit: -1024 } })).toBeNull()
  })
})

describe('renderer diagnostics', () => {
  let root
  let recorder
  let app
  let crashReporter
  let writeLog
  let flushLogs
  let logs

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'yakit-diagnostics-test-'))
    app = {
      getPath: () => root,
      setPath: vi.fn(),
      getName: () => 'yakit-test',
      getVersion: () => 'test-version',
      getGPUInfo: vi.fn(async (kind) => ({ kind, gpuDevice: [{ deviceId: 1 }] })),
      getGPUFeatureStatus: vi.fn(() => ({ gpu_compositing: 'enabled' })),
      getAppMetrics: vi.fn(() => [
        { pid: 321, creationTime: 123, type: 'Tab', cpu: { percentCPUUsage: 1 }, memory: { workingSetSize: 2048 } },
      ]),
    }
    crashReporter = { start: vi.fn() }
    writeLog = vi.fn()
    flushLogs = vi.fn(async () => undefined)
    logs = {}
  })

  function create() {
    recorder = createRendererDiagnostics({ app, crashReporter, writeLog, flushLogs, getLogFiles: () => logs })
    return recorder
  }

  // Queue-driven page sampler: queued values feed the next executeJavaScript call; without a
  // queued value the page never answers, so pending-state and timeout behavior stay observable.
  function memoryWindow(id = 1) {
    const pageSamples = []
    const window = Object.assign(new EventEmitter(), { id, isDestroyed: () => false })
    window.webContents = Object.assign(new EventEmitter(), {
      id,
      executeJavaScript: vi.fn((script) => {
        expect(script).toBe(MEMORY_PAGE_SCRIPT)
        return pageSamples.length ? Promise.resolve(pageSamples.shift()) : new Promise(() => {})
      }),
      isDestroyed: () => false,
      isCrashed: vi.fn(() => false),
      getOSProcessId: vi.fn(() => id * 100),
    })
    window.pushPageSample = (value) => pageSamples.push(value)
    recorder.trackWindow(window, id === 1 ? 'mainWin' : 'engineLinkWin')
    return window
  }

  function respond(window, usedHeapKB = 90_000, heapLimitKB = 100_000) {
    window.pushPageSample(usedHeapKB === null ? null : { usedHeapKB, heapLimitKB })
  }

  async function flushPromises() {
    for (let i = 0; i < 10; i++) await Promise.resolve()
  }

  afterEach(() => {
    recorder?.stop()
    vi.useRealTimers()
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('starts local-only Crashpad before sampling and writes resolved GPU/process data', async () => {
    create()
    expect(crashReporter.start).toHaveBeenCalledWith({ uploadToServer: false })
    expect(app.setPath).toHaveBeenCalledWith('crashDumps', path.join(recorder.directory, 'Crashpad'))
    await recorder.start()
    const snapshot = JSON.parse(JSON.stringify(recorder.snapshot()))
    expect(snapshot.base.appVersion).toBe('test-version')
    expect(snapshot.gpu.gpuInfoBasic.kind).toBe('basic')
    expect(snapshot.gpu.gpuInfoComplete.kind).toBe('complete')
    expect(snapshot.current.processes[0].workingSetSizeKB).toBe(2048)
    expect(snapshot.current.processes[0].peakWorkingSetSizeKB).toBeNull()
  })

  it('bounds stuck/rejected GPU queries and reports sampling errors explicitly', async () => {
    vi.useFakeTimers()
    app.getGPUInfo.mockImplementation((kind) =>
      kind === 'basic' ? Promise.reject(new Error('GPU unavailable')) : new Promise(() => {}),
    )
    app.getAppMetrics.mockImplementation(() => {
      throw new Error('metrics unavailable')
    })
    const started = create().start()
    await vi.advanceTimersByTimeAsync(1500)
    await started
    expect(recorder.snapshot().gpu).toMatchObject({
      gpuInfoBasic: { error: 'GPU unavailable' },
      gpuInfoComplete: { error: 'timeout' },
    })
    expect(recorder.snapshot().current.processes).toEqual({ error: 'metrics unavailable' })
  })

  it('keeps a bounded pre-crash history and preserves the dead renderer PID', async () => {
    create()
    const window = Object.assign(new EventEmitter(), { id: 1, isDestroyed: () => false })
    window.webContents = Object.assign(new EventEmitter(), {
      id: 2,
      isDestroyed: () => false,
      isCrashed: vi.fn(() => false),
      getOSProcessId: vi.fn(() => 321),
    })
    recorder.trackWindow(window, 'mainWin')
    for (let i = 0; i < 30; i++) recorder.sample()
    window.webContents.isCrashed.mockReturnValue(true)
    window.webContents.getOSProcessId.mockReturnValue(0)
    app.getAppMetrics.mockReturnValue([])
    const incident = recorder.record('render-process-gone', { reason: 'crashed', exitCode: 10 }, window)
    expect(incident.window.rendererPid).toBe(321)
    expect(incident.snapshot.current.processes).toEqual([])
    expect(incident.snapshot.history).toHaveLength(HISTORY_LIMIT)
    expect(incident.snapshot.history.some((entry) => entry.processes[0]?.pid === 321)).toBe(true)
    const persisted = JSON.parse(fs.readFileSync(path.join(recorder.directory, `${incident.id}.json`), 'utf8'))
    expect(persisted.details).toEqual({ reason: 'crashed', exitCode: 10 })
    expect(persisted.time).toBeTruthy()
  })

  it('retains only ten incident records', () => {
    create()
    for (let i = 0; i < 25; i++) recorder.record('test', { sequence: i })
    expect(fs.readdirSync(recorder.directory).filter((file) => file.endsWith('.json'))).toHaveLength(INCIDENT_LIMIT)
  })

  it('records bounded heap pressure evidence independently for Main and Link', async () => {
    vi.useFakeTimers()
    create()
    const main = memoryWindow()
    const link = memoryWindow(2)
    await recorder.start()
    for (let i = 0; i < 75; i++) {
      respond(main)
      respond(link, 1000)
      await vi.advanceTimersByTimeAsync(1000)
    }
    const incident = recorder.record('render-process-gone', { reason: 'crashed', exitCode: 5 }, main)
    expect(incident.memoryAssessment).toMatchObject({ status: 'suspected-js-heap-pressure', heapUsedRatio: 0.9 })
    expect(incident.snapshot.rendererMemory[0].samples).toHaveLength(MEMORY_HISTORY_LIMIT)
    expect(incident.snapshot.rendererMemory[1].samples.at(-1).usedHeapKB).toBe(1000)
    expect(recorder.record('render-process-gone', { reason: 'killed' }, link).memoryAssessment.status).toBe(
      'no-js-heap-pressure-observed',
    )
    const pressureRecords = writeLog.mock.calls.filter(([line]) => line.includes('"event":"renderer-memory-pressure"'))
    expect(pressureRecords).toHaveLength(2) // no repeated disk writes for every high sample
  })

  it('records working-set pressure once per debounce window for an oversized renderer', async () => {
    vi.useFakeTimers()
    create()
    const main = memoryWindow() // webContents.getOSProcessId() => 100
    app.getAppMetrics.mockReturnValue([
      { pid: 100, creationTime: 1, type: 'Tab', cpu: {}, memory: { workingSetSize: WORKING_SET_WARN_KB } },
    ])
    await recorder.start()
    const count = () =>
      writeLog.mock.calls.filter(([line]) => line.includes('"event":"renderer-working-set-pressure"')).length
    expect(count()).toBe(1)
    // 持续高于阈值：去抖窗口内不重复记录
    await vi.advanceTimersByTimeAsync(60_000)
    expect(count()).toBe(1)
    // 跨过去抖窗口后补记一次
    await vi.advanceTimersByTimeAsync(WORKING_SET_PRESSURE_INTERVAL_MS)
    expect(count()).toBe(2)
  })

  it('does not record working-set pressure for untracked, small, or dead renderers', async () => {
    create()
    const main = memoryWindow() // webContents.getOSProcessId() => 100
    // PID 对不上（指标里只有 321 的小进程）
    await recorder.start()
    const count = () =>
      writeLog.mock.calls.filter(([line]) => line.includes('"event":"renderer-working-set-pressure"')).length
    expect(count()).toBe(0)
    // PID 对上但低于阈值
    app.getAppMetrics.mockReturnValue([
      { pid: 100, creationTime: 1, type: 'Tab', cpu: {}, memory: { workingSetSize: WORKING_SET_WARN_KB - 1 } },
    ])
    recorder.record('probe', {})
    expect(count()).toBe(0)
    // PID 对上且超阈值，但窗口已销毁：残留旧 PID 不得触发
    main.webContents.isDestroyed = () => true
    app.getAppMetrics.mockReturnValue([
      { pid: 100, creationTime: 1, type: 'Tab', cpu: {}, memory: { workingSetSize: WORKING_SET_WARN_KB } },
    ])
    recorder.record('probe', {})
    expect(count()).toBe(0)
  })

  it('keeps one unresolved execution until it settles and does not stack queries', async () => {
    vi.useFakeTimers()
    create()
    const window = memoryWindow()
    let resolveHang
    window.webContents.executeJavaScript.mockImplementationOnce(() => new Promise((resolve) => (resolveHang = resolve)))
    await recorder.start()
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(window.webContents.executeJavaScript).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(window.webContents.executeJavaScript).toHaveBeenCalledTimes(1)
    expect(recorder.snapshot().rendererMemory[0].samples).toHaveLength(0)
    resolveHang?.({ usedHeapKB: 90_000, heapLimitKB: 100_000 })
    await flushPromises()
    expect(recorder.snapshot().rendererMemory[0].samples.at(-1).usedHeapKB).toBe(90_000)
    respond(window)
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(window.webContents.executeJavaScript.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(recorder.snapshot().rendererMemory[0].samples.at(-1).usedHeapKB).toBe(90_000)
  })

  it('rejects null results and survives executeJavaScript rejection', async () => {
    vi.useFakeTimers()
    create()
    const window = memoryWindow()
    await recorder.start()
    respond(window, null)
    await vi.advanceTimersByTimeAsync(1000)
    window.webContents.executeJavaScript.mockImplementationOnce(() => Promise.reject(new Error('frame disposed')))
    await vi.advanceTimersByTimeAsync(1000)
    respond(window)
    await vi.advanceTimersByTimeAsync(1000)
    const samples = recorder.snapshot().rendererMemory[0].samples
    expect(samples).toHaveLength(1)
    expect(samples[0].usedHeapKB).toBe(90_000)
  })

  it('does not attribute old PID or stale heap samples to an early or subsequent crash', async () => {
    vi.useFakeTimers()
    create()
    const window = memoryWindow()
    expect(recorder.record('render-process-gone', { reason: 'crashed' }, window).memoryAssessment.status).toBe(
      'unknown',
    )
    // Queue before dom-ready so executeJavaScript consumes a real sample (not a hung empty call).
    respond(window)
    window.webContents.emit('dom-ready')
    await flushPromises()
    expect(recorder.snapshot().rendererMemory[0].samples).toHaveLength(1)
    expect(recorder.snapshot().rendererMemory[0].samples[0].usedHeapKB).toBe(90_000)
    expect(recorder.record('render-process-gone', { reason: 'killed' }, window).memoryAssessment.status).toBe(
      'suspected-js-heap-pressure',
    )
    // No further answers; the accepted sample ages past MEMORY_FRESH_MS.
    await vi.advanceTimersByTimeAsync(12_000)
    expect(recorder.record('render-process-gone', { reason: 'killed' }, window).memoryAssessment.status).toBe('unknown')
    // Fresh sample with the current PID so the next assertion cannot pass solely because the sample is stale.
    respond(window, 1_000)
    window.webContents.emit('dom-ready')
    await flushPromises()
    expect(recorder.snapshot().rendererMemory[0].samples.at(-1).usedHeapKB).toBe(1_000)
    expect(recorder.record('render-process-gone', { reason: 'killed' }, window).memoryAssessment.status).toBe(
      'no-js-heap-pressure-observed',
    )
    // New renderer PID: identity updates on the hung query, but history still has the prior PID's sample.
    window.webContents.getOSProcessId.mockReturnValue(999)
    window.webContents.emit('dom-ready')
    await flushPromises()
    expect(recorder.record('render-process-gone', { reason: 'crashed' }, window).memoryAssessment.status).toBe(
      'unknown',
    )
    expect(recorder.record('render-process-gone', { reason: 'oom' }, window).memoryAssessment.status).toBe(
      'reported-oom',
    )
    window.emit('closed')
    expect(recorder.snapshot().rendererMemory).toHaveLength(0)
  })

  it('drops resolutions from a pre-navigation page instance and accepts sampling before application-ready', async () => {
    vi.useFakeTimers()
    create()
    const window = memoryWindow()
    let resolveFirst
    window.webContents.executeJavaScript.mockImplementationOnce(
      () => new Promise((resolve) => (resolveFirst = resolve)),
    )
    await recorder.start()
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(window.webContents.executeJavaScript).toHaveBeenCalledTimes(1)
    // New page instance answers with a low sample so history has a known baseline.
    respond(window, 1000)
    window.webContents.emit('did-start-loading')
    window.webContents.emit('dom-ready')
    await flushPromises()
    expect(window.webContents.executeJavaScript).toHaveBeenCalledTimes(2)
    expect(recorder.snapshot().rendererMemory[0].samples).toHaveLength(1)
    expect(recorder.snapshot().rendererMemory[0].samples[0].usedHeapKB).toBe(1000)
    const pressureBefore = writeLog.mock.calls.filter(([line]) =>
      line.includes('"event":"renderer-memory-pressure"'),
    ).length
    // Stale pre-navigation query resolves with a *valid* high-pressure payload (not null).
    // Generation must discard it: history stays at the post-nav sample, no pressure event.
    resolveFirst?.({ usedHeapKB: 95_000, heapLimitKB: 100_000 })
    await flushPromises()
    expect(recorder.snapshot().rendererMemory[0].samples).toHaveLength(1)
    expect(recorder.snapshot().rendererMemory[0].samples[0].usedHeapKB).toBe(1000)
    expect(writeLog.mock.calls.filter(([line]) => line.includes('"event":"renderer-memory-pressure"'))).toHaveLength(
      pressureBefore,
    )
    expect(recorder.record('render-process-gone', {}, window).window.rendererPid).toBe(100)
  })

  it('a late resolution from an older query must not free the newer query slot', async () => {
    vi.useFakeTimers()
    create()
    const window = memoryWindow()
    let resolveFirst
    let resolveSecond
    window.webContents.executeJavaScript
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockImplementationOnce(() => new Promise((resolve) => (resolveSecond = resolve)))
    await recorder.start()
    window.webContents.emit('dom-ready') // query #1 hangs under test control
    window.webContents.emit('did-start-loading')
    window.webContents.emit('dom-ready') // query #2 hangs and owns the slot
    await Promise.resolve() // requestMemory schedules executeJavaScript in a microtask
    expect(window.webContents.executeJavaScript).toHaveBeenCalledTimes(2)
    // Late resolve of #1 with a valid high-pressure payload must not clear #2's pending,
    // must not append samples (wrong generation), and must not fire pressure.
    const pressureBefore = writeLog.mock.calls.filter(([line]) =>
      line.includes('"event":"renderer-memory-pressure"'),
    ).length
    resolveFirst?.({ usedHeapKB: 95_000, heapLimitKB: 100_000 })
    await flushPromises()
    expect(recorder.snapshot().rendererMemory[0].samples).toHaveLength(0)
    expect(writeLog.mock.calls.filter(([line]) => line.includes('"event":"renderer-memory-pressure"'))).toHaveLength(
      pressureBefore,
    )
    await vi.advanceTimersByTimeAsync(1000) // interval tick must skip: query #2 still in flight
    expect(window.webContents.executeJavaScript).toHaveBeenCalledTimes(2)
    // After the live query settles, sampling can resume and record a current-generation sample.
    resolveSecond?.({ usedHeapKB: 2_000, heapLimitKB: 100_000 })
    await flushPromises()
    expect(recorder.snapshot().rendererMemory[0].samples).toHaveLength(1)
    expect(recorder.snapshot().rendererMemory[0].samples[0].usedHeapKB).toBe(2_000)
    respond(window, 3_000)
    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()
    expect(window.webContents.executeJavaScript.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(recorder.snapshot().rendererMemory[0].samples.at(-1).usedHeapKB).toBe(3_000)
  })

  it('survives reporter, filesystem and log-sink failures', () => {
    crashReporter.start.mockImplementation(() => {
      throw new Error('Crashpad unavailable')
    })
    writeLog.mockImplementation(() => {
      throw new Error('sink unavailable')
    })
    create()
    fs.rmSync(recorder.directory, { recursive: true })
    fs.writeFileSync(recorder.directory, 'not a directory')
    expect(() => recorder.record('render-process-gone', { reason: 'oom' })).not.toThrow()
    expect(recorder.snapshot().reporter).toMatchObject({ enabled: false, error: 'Crashpad unavailable' })
  })

  it('exports an OOM incident even without a dump and with a failed log flush', async () => {
    create()
    const incident = recorder.record('render-process-gone', { reason: 'oom', exitCode: -1 })
    flushLogs.mockRejectedValue(new Error('disk unavailable'))
    const destination = path.join(root, 'oom-no-dump.zip')
    const manifest = await recorder.exportBundle(destination)
    expect(manifest.dumpCollection).toEqual({ status: 'no-dump-found', candidates: 0, included: 0 })
    expect(manifest.flush).toEqual({ error: 'disk unavailable' })
    const unpacked = path.join(root, 'oom-unpacked')
    await require('compressing').zip.uncompress(destination, unpacked)
    expect(JSON.parse(fs.readFileSync(path.join(unpacked, `${incident.id}.json`))).memoryAssessment.status).toBe(
      'reported-oom',
    )
  })

  it('exports current-session log tails, incidents, bounded dumps and a manifest', async () => {
    create()
    logs = {
      render: path.join(root, 'render.txt'),
      print: path.join(root, 'print.txt'),
      engine: path.join(root, 'engine.txt'),
    }
    fs.writeFileSync(logs.render, 'render log\n')
    fs.writeFileSync(logs.print, 'x'.repeat(LOG_TAIL_BYTES + 8))
    fs.writeFileSync(logs.engine, 'engine log\n')
    flushLogs.mockImplementation(async () => fs.appendFileSync(logs.render, 'last buffered crash\n'))
    const incident = recorder.record('render-process-gone', { reason: 'crashed', exitCode: 10 })
    const reports = path.join(recorder.crashDumps, 'reports')
    fs.mkdirSync(reports)
    fs.writeFileSync(path.join(reports, 'fixture.dmp'), 'fixture, not a native dump')
    fs.writeFileSync(path.join(reports, 'do-not-copy.lock'), 'Crashpad metadata')
    const destination = path.join(root, 'bundle.zip')
    const manifest = await recorder.exportBundle(destination)
    expect(flushLogs).toHaveBeenCalledTimes(1)
    expect(manifest.files.find((file) => file.name === 'print-log.txt')).toMatchObject({
      truncated: true,
      includedBytes: LOG_TAIL_BYTES,
    })
    const unpacked = path.join(root, 'unpacked')
    await require('compressing').zip.uncompress(destination, unpacked)
    expect(fs.readFileSync(path.join(unpacked, 'render-log.txt'), 'utf8')).toContain('last buffered crash')
    expect(fs.existsSync(path.join(unpacked, `${incident.id}.json`))).toBe(true)
    expect(fs.existsSync(path.join(unpacked, 'fixture.dmp'))).toBe(true)
    expect(fs.existsSync(path.join(unpacked, 'do-not-copy.lock'))).toBe(false)
    expect(fs.existsSync(path.join(unpacked, 'manifest.json'))).toBe(true)
  })

  it('records missing logs without preventing export', async () => {
    create()
    logs = { engine: path.join(root, 'missing.txt') }
    const manifest = await recorder.exportBundle(path.join(root, 'missing-logs.zip'))
    expect(manifest.files[0].error).toContain('ENOENT')
  })

  it('limits dump selection and reports oversized dumps instead of exporting them', async () => {
    create()
    for (let i = 0; i < 5; i++) {
      const file = path.join(recorder.crashDumps, `fixture-${i}.dmp`)
      fs.writeFileSync(file, 'test fixture')
      if (i === 4) fs.truncateSync(file, 32 * 1024 * 1024 + 1)
      fs.utimesSync(file, 100 + i, 100 + i)
    }
    const manifest = await recorder.exportBundle(path.join(root, 'bounded.zip'))
    expect(manifest.files.map((file) => file.name)).toEqual(['fixture-4.dmp', 'fixture-3.dmp', 'fixture-2.dmp'])
    expect(manifest.files[0].omitted).toBe('exceeds 32 MiB export limit')
    expect(manifest.files.slice(1).every((file) => file.includedBytes > 0)).toBe(true)
  })

  it('cleans up failed ZIP exports without damaging an existing destination', async () => {
    create()
    const destination = path.join(root, 'existing-directory')
    fs.mkdirSync(destination)
    fs.writeFileSync(path.join(destination, 'keep.txt'), 'keep')
    await expect(recorder.exportBundle(destination)).rejects.toThrow()
    expect(fs.readFileSync(path.join(destination, 'keep.txt'), 'utf8')).toBe('keep')
    expect(fs.readdirSync(root).some((file) => file.endsWith('.partial'))).toBe(false)
  })
})
