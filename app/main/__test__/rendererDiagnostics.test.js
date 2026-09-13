// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { createRendererDiagnostics, HISTORY_LIMIT, INCIDENT_LIMIT, LOG_TAIL_BYTES } from '../rendererDiagnostics'

const require = createRequire(import.meta.url)

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
