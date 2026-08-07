// @vitest-environment node

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it } from 'vitest'
import {
  analyzeElectronRendererTrace,
  analyzeElectronRendererTraceEvents,
  createElectronRendererTraceConfig,
  ELECTRON_RENDERER_TRACE_BUFFER_KB,
  startElectronRendererTrace,
  stopElectronRendererTrace,
} from '../electron/electron-content-trace.mjs'

const syntheticTrace = () => ({
  traceEvents: [
    { ph: 'M', name: 'process_name', pid: 20, tid: 0, args: { name: 'Renderer' } },
    { ph: 'M', name: 'thread_name', pid: 20, tid: 21, args: { name: 'CrRendererMain' } },
    { ph: 'M', name: 'process_name', pid: 30, tid: 0, args: { name: 'Browser' } },
    { ph: 'M', name: 'thread_name', pid: 30, tid: 31, args: { name: 'CrBrowserMain' } },
    {
      ph: 'X',
      cat: 'toplevel',
      name: 'ThreadControllerImpl::RunTask',
      pid: 20,
      tid: 21,
      ts: 1_000,
      dur: 80_000,
    },
    {
      ph: 'X',
      cat: 'devtools.timeline',
      name: 'FunctionCall',
      pid: 20,
      tid: 21,
      ts: 2_000,
      dur: 40_000,
      args: { data: { functionName: 'flushVisibleRows', url: 'file:///renderer.js', lineNumber: 40 } },
    },
    {
      ph: 'X',
      cat: 'toplevel',
      name: 'RunTask',
      pid: 20,
      tid: 21,
      ts: 3_000,
      dur: 60_000,
      args: { src_file: 'ipc/ipc_mojo_bootstrap.cc', src_func: 'Accept' },
    },
    {
      ph: 'X',
      cat: 'devtools.timeline',
      name: 'Layout',
      pid: 20,
      tid: 21,
      ts: 43_000,
      dur: 20_000,
      args: {
        elementCount: 2204,
        beginData: { dirtyObjects: 2907, totalObjects: 3100, partialLayout: false },
        endData: { layoutRoots: [{ nodeId: 1, depth: 0 }] },
      },
    },
    { ph: 'X', cat: 'devtools.timeline', name: 'Paint', pid: 20, tid: 21, ts: 64_000, dur: 5_000 },
    { ph: 'X', cat: 'toplevel', name: 'RunTask', pid: 20, tid: 21, ts: 100_000, dur: 49_000 },
    { ph: 'X', cat: 'toplevel', name: 'RunTask', pid: 20, tid: 21, ts: 200_000, dur: 60_000 },
    {
      ph: 'X',
      cat: 'toplevel',
      name: 'Receive mojo reply',
      pid: 20,
      tid: 21,
      ts: 201_000,
      dur: 40_000,
      args: {
        chrome_mojo_event_info: {
          mojo_interface_tag: 'electron.mojom.ElectronApiIPC',
          payload_size: 4096,
          data_num_bytes: 4128,
        },
      },
    },
    { ph: 'X', cat: 'v8', name: 'MajorGC', pid: 20, tid: 21, ts: 205_000, dur: 10_000 },
    { ph: 'X', cat: 'toplevel', name: 'RunTask', pid: 30, tid: 31, ts: 1_000, dur: 500_000 },
  ],
})

describe('Electron Renderer content trace', () => {
  afterEach(() => {
    delete globalThis.browser
  })

  it('creates a bounded Renderer CDP trace config', () => {
    expect(createElectronRendererTraceConfig()).toMatchObject({
      recordMode: 'recordUntilFull',
      traceBufferSizeInKb: ELECTRON_RENDERER_TRACE_BUFFER_KB,
      includedCategories: expect.arrayContaining(['devtools.timeline', 'toplevel', 'v8']),
    })
  })

  it('deduplicates nested task envelopes and attributes Renderer main-thread work', () => {
    const analysis = analyzeElectronRendererTraceEvents(syntheticTrace(), { rendererProcessIds: [20] })
    expect(analysis.rendererMainThreads).toEqual([
      { pid: 20, tid: 21, processName: 'Renderer', threadName: 'CrRendererMain' },
    ])
    expect(analysis.longTasks.durationMs).toMatchObject({ count: 2, min: 60, max: 80 })
    expect(analysis.longTasks.totalDurationMs).toBe(140)
    expect(analysis.longTasks.tasks[0]).toMatchObject({
      durationMs: 80,
      origin: { sourceFile: 'ipc/ipc_mojo_bootstrap.cc', sourceFunction: 'Accept' },
    })
    expect(analysis.longTasks.tasks[1].topNestedEvents[0]).toMatchObject({
      category: 'ipc',
      name: 'Receive mojo reply',
      durationMs: 40,
      details: { ipcInterface: 'electron.mojom.ElectronApiIPC', payloadBytes: 4096, dataBytes: 4128 },
    })
    expect(analysis.longTasks.tasks[0].topNestedEvents.find((entry) => entry.name === 'Layout')).toMatchObject({
      category: 'style-layout',
      durationMs: 20,
      details: {
        elementCount: 2204,
        dirtyObjects: 2907,
        totalObjects: 3100,
        partialLayout: false,
        layoutRoots: [{ nodeId: 1, depth: 0 }],
      },
    })
    expect(analysis.longTasks.inclusiveAttribution.categories.map((entry) => entry.category)).toEqual(
      expect.arrayContaining(['javascript', 'style-layout', 'paint-composite', 'gc', 'ipc']),
    )
    expect(analysis.longTasks.inclusiveAttribution.sourceHints[0]).toMatchObject({
      functionName: 'flushVisibleRows',
      url: 'file:///renderer.js',
      lineNumber: 40,
    })
  })

  it('enforces the artifact byte limit before parsing and writes a compact summary', async () => {
    const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'yakit-renderer-trace-test-'))
    try {
      const tracePath = path.join(temporaryDirectory, 'renderer-trace.json')
      await writeFile(tracePath, JSON.stringify(syntheticTrace()))
      const summary = await analyzeElectronRendererTrace({
        tracePath,
        artifactsDirectory: temporaryDirectory,
        capture: { rendererProcessIds: [20], startedAt: '2026-01-01T00:00:00.000Z' },
      })
      expect(summary).toMatchObject({
        diagnosticOnly: true,
        analysis: { longTasks: { durationMs: { count: 2 }, totalDurationMs: 140 } },
        artifacts: { trace: 'renderer-trace.json', summary: 'renderer-trace-summary.json' },
      })
      expect(
        JSON.parse(await readFile(path.join(temporaryDirectory, 'renderer-trace-summary.json'), 'utf8')),
      ).toMatchObject({ kind: 'yakit-electron-renderer-content-trace' })
      await expect(
        analyzeElectronRendererTrace({
          tracePath,
          artifactsDirectory: temporaryDirectory,
          capture: { rendererProcessIds: [20] },
          maxBytes: 1,
        }),
      ).rejects.toThrow(/exceeds/)
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true })
    }
  })

  it('rejects traces without a Renderer main thread', () => {
    expect(() => analyzeElectronRendererTraceEvents({ traceEvents: [] })).toThrow(/no Renderer main-thread/)
  })

  it('streams a bounded trace through the existing Renderer CDP connection', async () => {
    const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'yakit-renderer-cdp-trace-test-'))
    try {
      const outputPath = path.join(temporaryDirectory, 'renderer-trace.json')
      const session = new EventEmitter()
      session.send = async (method) => {
        if (method === 'Tracing.start') {
          queueMicrotask(() => session.emit('Tracing.bufferUsage', { percentFull: 0.2, eventCount: 10 }))
          return {}
        }
        if (method === 'Tracing.end') {
          queueMicrotask(() =>
            session.emit('Tracing.tracingComplete', {
              stream: 'trace-stream',
              dataLossOccurred: false,
              traceFormat: 'json',
              streamCompression: 'none',
            }),
          )
          return {}
        }
        if (method === 'IO.read') return { data: JSON.stringify(syntheticTrace()), eof: true }
        if (method === 'IO.close') return {}
        throw new Error(`Unexpected CDP method ${method}`)
      }
      session.detach = async () => undefined
      const target = {
        _targetId: 'main-target',
        type: () => 'page',
        url: () => 'file:///app/renderer/pages/main/index.html',
        createCDPSession: async () => session,
      }
      globalThis.browser = {
        getPuppeteer: async () => ({ targets: () => [target] }),
      }

      const started = await startElectronRendererTrace()
      await expect(stopElectronRendererTrace({ outputPath, started })).resolves.toMatchObject({
        status: 'completed',
        transport: 'renderer-cdp-stream',
        writtenPath: outputPath,
        bufferUsage: { percentFull: 0.2, eventCount: 10 },
        dataLossOccurred: false,
      })
      expect(JSON.parse(await readFile(outputPath, 'utf8'))).toMatchObject({ traceEvents: expect.any(Array) })
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true })
    }
  })
})
