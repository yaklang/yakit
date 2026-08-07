import { open, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const ELECTRON_RENDERER_TRACE_BUFFER_KB = 16 * 1024
export const MAX_ELECTRON_RENDERER_TRACE_BYTES = 64 * 1024 * 1024
export const ELECTRON_RENDERER_LONG_TASK_THRESHOLD_MS = 50
const TRACE_STOP_TIMEOUT_MS = 30_000
const MAX_REPORTED_LONG_TASKS = 30
const MAX_REPORTED_EVENT_GROUPS = 40
const MAX_REPORTED_SOURCE_HINTS = 30
const MAX_REPORTED_NESTED_EVENTS_PER_TASK = 12
const TRACE_STREAM_CHUNK_BYTES = 1024 * 1024
const MAIN_RENDERER_URL_FRAGMENT = '/renderer/pages/main/index.html'
let activeRendererTrace

const TRACE_CATEGORIES = [
  'blink.user_timing',
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'toplevel',
  'v8',
]

const finite = (value) => (Number.isFinite(Number(value)) ? Number(value) : undefined)
const microsecondsToMilliseconds = (value) => finite(value) / 1_000
const rounded = (value) => (Number.isFinite(value) ? Math.round(value * 1_000) / 1_000 : undefined)

const distribution = (values) => {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right)
  if (!sorted.length) return { count: 0 }
  const at = (ratio) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))]
  return {
    count: sorted.length,
    min: rounded(sorted[0]),
    p50: rounded(at(0.5)),
    p95: rounded(at(0.95)),
    p99: rounded(at(0.99)),
    max: rounded(sorted[sorted.length - 1]),
  }
}

const assertAbsoluteArtifactPath = (filePath, label) => {
  if (!path.isAbsolute(filePath)) throw new Error(`${label} must be absolute: ${filePath}`)
}

export const createElectronRendererTraceConfig = () => ({
  excludedCategories: ['*'],
  includedCategories: [...TRACE_CATEGORIES],
  recordMode: 'recordUntilFull',
  traceBufferSizeInKb: ELECTRON_RENDERER_TRACE_BUFFER_KB,
})

const withTimeout = async (promise, timeoutMs, label) => {
  let timeout
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timeout)
  }
}

const withDeadline = (promise, deadline, label) => {
  const remainingMs = deadline - Date.now()
  if (remainingMs <= 0) throw new Error(`${label} exceeded the trace stop deadline`)
  return withTimeout(promise, remainingMs, label)
}

export const startElectronRendererTrace = async () => {
  if (activeRendererTrace) throw new Error('An Electron Renderer trace is already active')
  const puppeteerBrowser = await browser.getPuppeteer()
  const targets = puppeteerBrowser
    .targets()
    .filter((target) => target.type() === 'page' && target.url().includes(MAIN_RENDERER_URL_FRAGMENT))
  if (targets.length !== 1) {
    throw new Error(`Electron Renderer trace expected one Yakit main target, found ${targets.length}`)
  }
  const target = targets[0]
  const session = await target.createCDPSession()
  const traceConfig = createElectronRendererTraceConfig()
  const state = {
    session,
    bufferUsage: undefined,
    bufferUsageListener: undefined,
  }
  state.bufferUsageListener = (usage) => {
    state.bufferUsage = usage
  }
  session.on('Tracing.bufferUsage', state.bufferUsageListener)
  try {
    await withTimeout(
      session.send('Tracing.start', {
        transferMode: 'ReturnAsStream',
        streamFormat: 'json',
        streamCompression: 'none',
        bufferUsageReportingInterval: 250,
        traceConfig,
      }),
      TRACE_STOP_TIMEOUT_MS,
      'Electron Renderer CDP trace start',
    )
  } catch (error) {
    session.off('Tracing.bufferUsage', state.bufferUsageListener)
    await session.detach().catch(() => undefined)
    throw error
  }
  activeRendererTrace = state
  return {
    startedAt: new Date().toISOString(),
    transport: 'renderer-cdp-stream',
    target: {
      id: target._targetId,
      type: target.type(),
      url: target.url(),
    },
    config: traceConfig,
  }
}

export const stopElectronRendererTrace = async ({ outputPath, started }) => {
  assertAbsoluteArtifactPath(outputPath, 'Electron Renderer trace output')
  const state = activeRendererTrace
  if (!state) throw new Error('No Electron Renderer trace is active')
  activeRendererTrace = undefined
  const { session } = state
  let traceStream
  let traceFile
  let bytes = 0
  let tracingCompleteListener
  const tracingComplete = new Promise((resolve) => {
    tracingCompleteListener = resolve
    session.once('Tracing.tracingComplete', tracingCompleteListener)
  })
  const stopDeadline = Date.now() + TRACE_STOP_TIMEOUT_MS
  try {
    await withDeadline(session.send('Tracing.end'), stopDeadline, 'Electron Renderer CDP trace end')
    const completion = await withDeadline(tracingComplete, stopDeadline, 'Electron Renderer CDP trace flush')
    traceStream = completion?.stream
    if (!traceStream) throw new Error('Electron Renderer CDP trace did not return an IO stream')
    traceFile = await open(outputPath, 'wx')
    let streamCompleted = false
    while (Date.now() < stopDeadline) {
      const chunk = await withDeadline(
        session.send('IO.read', {
          handle: traceStream,
          size: TRACE_STREAM_CHUNK_BYTES,
        }),
        stopDeadline,
        'Electron Renderer trace stream read',
      )
      const buffer = chunk.base64Encoded ? Buffer.from(chunk.data, 'base64') : Buffer.from(chunk.data)
      bytes += buffer.byteLength
      if (bytes > MAX_ELECTRON_RENDERER_TRACE_BYTES) {
        throw new Error(
          `Electron Renderer trace exceeds ${MAX_ELECTRON_RENDERER_TRACE_BYTES} bytes: more than ${bytes}`,
        )
      }
      if (buffer.byteLength) await traceFile.write(buffer)
      if (chunk.eof) {
        streamCompleted = true
        break
      }
    }
    if (!streamCompleted) {
      throw new Error(`Electron Renderer trace stream timed out after ${TRACE_STOP_TIMEOUT_MS}ms`)
    }
    if (!bytes) throw new Error('Electron Renderer CDP trace stream is empty')
    return {
      ...started,
      stoppedAt: new Date().toISOString(),
      status: 'completed',
      writtenPath: outputPath,
      bytes,
      bufferUsage: state.bufferUsage,
      dataLossOccurred: completion.dataLossOccurred === true,
      traceFormat: completion.traceFormat,
      streamCompression: completion.streamCompression,
    }
  } finally {
    state.session.off('Tracing.bufferUsage', state.bufferUsageListener)
    if (tracingCompleteListener) session.off('Tracing.tracingComplete', tracingCompleteListener)
    if (traceStream) {
      await withTimeout(
        session.send('IO.close', { handle: traceStream }),
        5_000,
        'Electron Renderer trace stream close',
      ).catch(() => undefined)
    }
    if (traceFile) await traceFile.close().catch(() => undefined)
    await withTimeout(session.detach(), 5_000, 'Electron Renderer trace session detach').catch(() => undefined)
  }
}

const metadataMaps = (events) => {
  const processNames = new Map()
  const threadNames = new Map()
  for (const event of events) {
    if (event?.ph !== 'M') continue
    if (event.name === 'process_name' && event.args?.name) processNames.set(Number(event.pid), event.args.name)
    if (event.name === 'thread_name' && event.args?.name) {
      threadNames.set(`${Number(event.pid)}:${Number(event.tid)}`, event.args.name)
    }
  }
  return { processNames, threadNames }
}

const isRendererMainThread = ({ pid, tid, processNames, threadNames, rendererProcessIds }) => {
  const threadName = String(threadNames.get(`${pid}:${tid}`) || '')
  if (!/(CrRendererMain|RendererMain)/i.test(threadName)) return false
  if (rendererProcessIds.has(pid)) return true
  return /renderer/i.test(String(processNames.get(pid) || '')) || rendererProcessIds.size === 0
}

const isTaskEnvelope = (event) => {
  const name = String(event.name || '')
  return /(^|::)RunTask$/.test(name) || /TaskQueueManager::ProcessTaskFromWorkQueue/.test(name)
}

const eventCategory = (event) => {
  const source = `${event.name || ''} ${event.cat || ''}`
  if (/(MinorGC|MajorGC|V8\.GC|GarbageCollect|\bgc\b)/i.test(source)) return 'gc'
  if (/(UpdateLayoutTree|RecalculateStyle|RecalculateStyles|\bLayout\b|HitTest)/i.test(source)) {
    return 'style-layout'
  }
  if (/(PrePaint|\bPaint\b|Composite|Commit|Layerize|Raster)/i.test(source)) return 'paint-composite'
  if (
    /(FunctionCall|EvaluateScript|EventDispatch|TimerFire|FireIdleCallback|RunMicrotasks|V8\.|Script|Compile|Parse)/i.test(
      source,
    )
  ) {
    return 'javascript'
  }
  if (/(ipc|mojo|MessagePipe)/i.test(source)) return 'ipc'
  return 'other'
}

const eventSourceHint = (event) => {
  const data = event.args?.data || event.args?.beginData || event.args || {}
  const functionName = data.functionName || data.name
  const url = data.url || data.scriptName || data.fileName
  const lineNumber = finite(data.lineNumber ?? data.line)
  const columnNumber = finite(data.columnNumber ?? data.column)
  if (!functionName && !url) return undefined
  return {
    functionName: functionName || '(anonymous)',
    url,
    ...(Number.isFinite(lineNumber) ? { lineNumber } : {}),
    ...(Number.isFinite(columnNumber) ? { columnNumber } : {}),
  }
}

const aggregateEvents = (events, keyFor, limit) => {
  const groups = new Map()
  for (const event of events) {
    const key = keyFor(event)
    if (!key) continue
    const durationMs = microsecondsToMilliseconds(event.dur)
    if (!Number.isFinite(durationMs) || durationMs <= 0) continue
    const current = groups.get(key.id) || { ...key.value, count: 0, inclusiveDurationMs: 0, maxDurationMs: 0 }
    current.count += 1
    current.inclusiveDurationMs += durationMs
    current.maxDurationMs = Math.max(current.maxDurationMs, durationMs)
    groups.set(key.id, current)
  }
  return [...groups.values()]
    .map((entry) => ({
      ...entry,
      inclusiveDurationMs: rounded(entry.inclusiveDurationMs),
      maxDurationMs: rounded(entry.maxDurationMs),
    }))
    .sort((left, right) => right.inclusiveDurationMs - left.inclusiveDurationMs)
    .slice(0, limit)
}

const selectNonNestedTasks = (tasks) => {
  const sorted = [...tasks].sort((left, right) => left.ts - right.ts || right.dur - left.dur)
  const selected = []
  for (const task of sorted) {
    const taskEnd = task.ts + task.dur
    if (selected.some((parent) => task.ts >= parent.ts && taskEnd <= parent.ts + parent.dur)) continue
    selected.push(task)
  }
  return selected
}

const taskOrigin = (events) => {
  const envelope = events
    .filter((event) => isTaskEnvelope(event) && (event.args?.src_file || event.args?.src_func))
    .sort((left, right) => Number(right.dur) - Number(left.dur))[0]
  if (!envelope) return undefined
  return {
    sourceFile: envelope.args?.src_file,
    sourceFunction: envelope.args?.src_func,
  }
}

const traceEventDetails = (event) => {
  const details = {}
  const mojo = event.args?.chrome_mojo_event_info
  if (mojo) {
    details.ipcInterface = mojo.mojo_interface_tag
    const payloadBytes = finite(mojo.payload_size)
    const dataBytes = finite(mojo.data_num_bytes)
    if (Number.isFinite(payloadBytes)) details.payloadBytes = payloadBytes
    if (Number.isFinite(dataBytes)) details.dataBytes = dataBytes
  }
  const data = event.args?.data || event.args?.beginData
  const elementCount = finite(event.args?.elementCount)
  const dirtyObjects = finite(data?.dirtyObjects)
  const totalObjects = finite(data?.totalObjects)
  if (Number.isFinite(elementCount)) details.elementCount = elementCount
  if (Number.isFinite(dirtyObjects)) details.dirtyObjects = dirtyObjects
  if (Number.isFinite(totalObjects)) details.totalObjects = totalObjects
  if (typeof data?.partialLayout === 'boolean') details.partialLayout = data.partialLayout
  const layoutRoots = event.args?.endData?.layoutRoots
  if (Array.isArray(layoutRoots) && layoutRoots.length) {
    details.layoutRoots = layoutRoots.slice(0, 10).map((root) => ({
      nodeId: finite(root?.nodeId),
      depth: finite(root?.depth),
    }))
  }
  if (data?.type) details.eventType = data.type
  return Object.keys(details).length ? details : undefined
}

const describeLongTask = (event, rendererEvents, traceStartUs) => {
  const start = Number(event.ts)
  const end = start + Number(event.dur)
  const containedEvents = rendererEvents.filter((candidate) => {
    if (candidate === event) return false
    const candidateStart = Number(candidate.ts)
    const candidateEnd = candidateStart + Number(candidate.dur)
    return candidateStart >= start && candidateEnd <= end
  })
  const topNestedEvents = containedEvents
    .filter((candidate) => !isTaskEnvelope(candidate))
    .sort((left, right) => Number(right.dur) - Number(left.dur))
    .slice(0, MAX_REPORTED_NESTED_EVENTS_PER_TASK)
    .map((candidate) => ({
      category: eventCategory(candidate),
      name: candidate.name || '(unnamed)',
      durationMs: rounded(microsecondsToMilliseconds(candidate.dur)),
      ...(traceEventDetails(candidate) ? { details: traceEventDetails(candidate) } : {}),
    }))
  return {
    pid: Number(event.pid),
    tid: Number(event.tid),
    name: event.name,
    startedAtTraceMs: rounded(microsecondsToMilliseconds(start - traceStartUs)),
    durationMs: rounded(microsecondsToMilliseconds(event.dur)),
    ...(taskOrigin(containedEvents) ? { origin: taskOrigin(containedEvents) } : {}),
    topNestedEvents,
  }
}

export const analyzeElectronRendererTraceEvents = (trace, { rendererProcessIds = [] } = {}) => {
  const events = Array.isArray(trace?.traceEvents) ? trace.traceEvents : undefined
  if (!events) throw new Error('Electron Renderer trace has no traceEvents array')
  const { processNames, threadNames } = metadataMaps(events)
  const requestedRendererProcessIds = new Set(rendererProcessIds.map(Number).filter(Number.isInteger))
  const completeEvents = events.filter(
    (event) =>
      event?.ph === 'X' &&
      Number.isFinite(finite(event.pid)) &&
      Number.isFinite(finite(event.tid)) &&
      Number.isFinite(finite(event.ts)) &&
      finite(event.dur) > 0,
  )
  const rendererEvents = completeEvents.filter((event) =>
    isRendererMainThread({
      pid: Number(event.pid),
      tid: Number(event.tid),
      processNames,
      threadNames,
      rendererProcessIds: requestedRendererProcessIds,
    }),
  )
  const rendererThreads = [...new Set(rendererEvents.map((event) => `${event.pid}:${event.tid}`))].map((key) => {
    const [pid, tid] = key.split(':').map(Number)
    return {
      pid,
      tid,
      processName: processNames.get(pid),
      threadName: threadNames.get(key),
    }
  })
  if (!rendererThreads.length) throw new Error('Electron trace contains no Renderer main-thread events')

  const thresholdUs = ELECTRON_RENDERER_LONG_TASK_THRESHOLD_MS * 1_000
  const taskEvents = selectNonNestedTasks(
    rendererEvents.filter((event) => isTaskEnvelope(event) && Number(event.dur) >= thresholdUs),
  )
  const taskIntervals = taskEvents.map((event) => ({
    event,
    start: Number(event.ts),
    end: Number(event.ts) + Number(event.dur),
  }))
  const nestedEvents = rendererEvents.filter((event) => {
    if (isTaskEnvelope(event)) return false
    const start = Number(event.ts)
    const end = start + Number(event.dur)
    return taskIntervals.some((task) => start >= task.start && end <= task.end)
  })

  const eventGroups = aggregateEvents(
    nestedEvents,
    (event) => ({
      id: `${eventCategory(event)}\u0000${event.name || '(unnamed)'}`,
      value: { category: eventCategory(event), name: event.name || '(unnamed)' },
    }),
    MAX_REPORTED_EVENT_GROUPS,
  )
  const sourceHints = aggregateEvents(
    nestedEvents,
    (event) => {
      const hint = eventSourceHint(event)
      if (!hint) return undefined
      return {
        id: `${hint.functionName}\u0000${hint.url || ''}\u0000${hint.lineNumber ?? ''}\u0000${hint.columnNumber ?? ''}`,
        value: hint,
      }
    },
    MAX_REPORTED_SOURCE_HINTS,
  )
  const categoryGroups = aggregateEvents(
    nestedEvents,
    (event) => ({ id: eventCategory(event), value: { category: eventCategory(event) } }),
    10,
  )
  let traceStartUs
  let traceEndUs
  for (const event of completeEvents) {
    const start = Number(event.ts)
    const end = start + Number(event.dur)
    traceStartUs = traceStartUs === undefined ? start : Math.min(traceStartUs, start)
    traceEndUs = traceEndUs === undefined ? end : Math.max(traceEndUs, end)
  }

  return {
    eventCount: events.length,
    completeEventCount: completeEvents.length,
    rendererMainEventCount: rendererEvents.length,
    traceDurationMs:
      Number.isFinite(traceStartUs) && Number.isFinite(traceEndUs)
        ? rounded(microsecondsToMilliseconds(traceEndUs - traceStartUs))
        : undefined,
    rendererMainThreads: rendererThreads,
    longTasks: {
      thresholdMs: ELECTRON_RENDERER_LONG_TASK_THRESHOLD_MS,
      durationMs: distribution(taskEvents.map((event) => microsecondsToMilliseconds(event.dur))),
      totalDurationMs: rounded(taskEvents.reduce((sum, event) => sum + microsecondsToMilliseconds(event.dur), 0)),
      tasks: taskEvents
        .map((event) => describeLongTask(event, rendererEvents, traceStartUs))
        .sort((left, right) => right.durationMs - left.durationMs)
        .slice(0, MAX_REPORTED_LONG_TASKS),
      inclusiveAttribution: {
        note: 'Nested trace durations are inclusive and can overlap; totals are diagnostic, not additive.',
        categories: categoryGroups,
        events: eventGroups,
        sourceHints,
      },
    },
  }
}

export const analyzeElectronRendererTrace = async ({
  tracePath,
  artifactsDirectory,
  capture,
  maxBytes = MAX_ELECTRON_RENDERER_TRACE_BYTES,
}) => {
  assertAbsoluteArtifactPath(tracePath, 'Electron Renderer trace')
  assertAbsoluteArtifactPath(artifactsDirectory, 'Electron Renderer trace artifacts directory')
  const relativeTracePath = path.relative(artifactsDirectory, tracePath)
  if (relativeTracePath.startsWith('..') || path.isAbsolute(relativeTracePath)) {
    throw new Error(`Electron Renderer trace must be inside its artifacts directory: ${tracePath}`)
  }
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_ELECTRON_RENDERER_TRACE_BYTES) {
    throw new Error(
      `Electron Renderer trace byte limit must be between 1 and ${MAX_ELECTRON_RENDERER_TRACE_BYTES}: ${maxBytes}`,
    )
  }
  const traceStat = await stat(tracePath)
  if (!traceStat.isFile() || traceStat.size < 1) throw new Error('Electron Renderer trace artifact is empty')
  if (traceStat.size > maxBytes) {
    throw new Error(`Electron Renderer trace exceeds ${maxBytes} bytes: ${traceStat.size}`)
  }
  const trace = JSON.parse(await readFile(tracePath, 'utf8'))
  const analysis = analyzeElectronRendererTraceEvents(trace, {
    rendererProcessIds: capture?.rendererProcessIds,
  })
  const summary = {
    schemaVersion: 1,
    kind: 'yakit-electron-renderer-content-trace',
    generatedAt: new Date().toISOString(),
    diagnosticOnly: true,
    capture: {
      ...capture,
      bytes: traceStat.size,
      traceFile: path.basename(tracePath),
    },
    analysis,
    artifacts: {
      trace: path.basename(tracePath),
      summary: 'renderer-trace-summary.json',
    },
  }
  await writeFile(path.join(artifactsDirectory, summary.artifacts.summary), `${JSON.stringify(summary, null, 2)}\n`)
  return summary
}
