import { readFileSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import ts from 'typescript'
import _ from 'lodash'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHTTPFuzzerRun } from '../httpFuzzerRun'
import { createMcpWebFuzzerExecutionSlot } from '../mcpWebFuzzerExecutionSlot'

// Execute the real page control paths without loading Monaco and the Electron UI.
// This tests IPC/state integration, not React rendering or end-to-end traffic.
const source = ts.createSourceFile(
  'HTTPFuzzerPage.tsx',
  readFileSync('app/renderer/src/main/src/pages/fuzzer/HTTPFuzzerPage.tsx', 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
)
const findOne = (predicate: (node: ts.Node) => boolean) => {
  const matches: ts.Node[] = []
  const visit = (node: ts.Node) => {
    predicate(node) && matches.push(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
  expect(matches).toHaveLength(1)
  return matches[0].getText(source)
}
const controls = ['resetResponse', 'cancelCurrentHTTPFuzzer', 'submitToHTTPFuzzer', 'resumeAndPause', 'loadHistory']
const declarations = controls.map((name) =>
  findOne(
    (node) =>
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some((declaration) => declaration.name.getText(source) === name),
  ),
)
const streamEffect = findOne(
  (node) =>
    ts.isExpressionStatement(node) &&
    ts.isCallExpression(node.expression) &&
    node.expression.expression.getText(source) === 'useEffect' &&
    node.getText(source).includes('const dataToken = `${token}-data`'),
)
const executable = ts.transpileModule([...declarations, streamEffect].join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText

const setup = () => {
  const ipc = new EventEmitter()
  const invoke = vi.fn(async (channel: string) => {
    if (channel === 'GetHistoryHTTPFuzzerTask') return { OriginRequest: { Request: 'GET /history' } }
  })
  const tokenRef = { current: 'test-token' }
  let tokenSequence = 0
  let firstResponse: any = { RequestRaw: [] }
  let cleanup: () => void = () => {}
  let streamEffectFn: () => () => void = () => () => {}
  const bindings: Record<string, any> = {
    _,
    createHTTPFuzzerRun,
    useMemoizedFn: (fn: unknown) => fn,
    useEffect: (fn: () => () => void) => {
      streamEffectFn = fn
      cleanup = fn()
    },
    // 模拟 token 变化驱动 effect 重挂：先走旧清理（摘旧监听/cancel 旧流/dispose 旧 run），再按新 token 重挂
    setStreamToken: (value: string) => {
      tokenRef.current = value
      cleanup()
      cleanup = streamEffectFn()
    },
    // effect 依赖数组的自由变量，值本身不被使用
    streamToken: 'test-token',
    ipcRenderer: Object.assign(ipc, { invoke }),
    emptyFuzzer: { RequestRaw: [] },
    setFirstResponse: vi.fn((value) => {
      firstResponse = value
    }),
    getFirstResponse: () => firstResponse,
    setLoading: vi.fn(),
    setIsPause: vi.fn(),
    setLoadingText: vi.fn(),
    setSuccessCount: vi.fn(),
    setFailedCount: vi.fn(),
    setFuzzerListVersion: vi.fn(),
    setCurrentSelectId: vi.fn(),
    updateConcurrentLoad: vi.fn(),
    setRedirectedResponse: vi.fn(),
    getNewCurrentPage: vi.fn(),
    syncTotal: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
    logger: vi.fn(),
    httpFuzzerLog: (value: unknown) => value,
    yakitNotify: vi.fn(),
    yakitFailed: vi.fn(),
    t: (value: string) => value,
    filterColorTag: () => undefined,
    // 每次发送（resetResponse 轮换 token）都会消耗一个新 token
    randomString: () => `token-${(tokenSequence += 1)}`,
    ChunkedDataDirection: { UNSPECIFIED: 0 },
    setDefaultResponseSearch: vi.fn(),
    setDroppedCount: vi.fn(),
    setFuzzerTableMaxData: vi.fn(),
    advancedConfigValue: { resNumlimit: 100, proxy: [] },
    checkProxyEndpoints: vi.fn(),
    setRemoteValue: vi.fn(),
    FuzzerRemoteGV: {},
    getFuzzerRequestParams: () => ({ Request: 'GET /new', RequestRaw: new Uint8Array([1]) }),
    fuzzerTaskId: '42',
    setHasExtractorRules: vi.fn(),
    onSaveHTTPFuzzerByPageId: vi.fn(),
    isPause: true,
    onSetFuzzerConfig: vi.fn(),
    refreshRequest: vi.fn(),
    Uint8ArrayToString: () => 'GET /history',
  }
  const refs = {
    streamRunRef: null,
    tokenRef,
    taskIDRef: '',
    runtimeIdRef: '',
    dCountRef: 0,
    successFuzzerRef: [],
    failedFuzzerRef: [],
    fuzzerResChartDataBufferRef: [],
    successCountRef: 0,
    failedCountRef: 0,
    retryRef: false,
    matchRef: false,
    setNewCurrentPageRef: true,
    inViewportRef: true,
    fuzzerTableMaxDataRef: 100,
    responseSearchDraftRef: '',
    requestRef: '',
    loadingRef: false,
    mcpExecutionSlotRef: createMcpWebFuzzerExecutionSlot(),
    startMcpExecutionRef: () => {},
  }
  Object.entries(refs).forEach(([key, current]) => {
    bindings[key] = key === 'tokenRef' ? tokenRef : { current }
  })
  const api = new Function(...Object.keys(bindings), `${executable}\nreturn { ${controls.join(', ')} }`)(
    ...Object.values(bindings),
  )
  const token = () => tokenRef.current as string
  const send = (id: string, ok = true) =>
    ipc.emit(
      `${token()}-data`,
      {},
      {
        UUID: id,
        TaskId: '42',
        RuntimeID: 'runtime-a',
        Ok: ok,
        RequestRaw: new Uint8Array([1]),
        ResponseRaw: new Uint8Array([2]),
      },
    )
  const emitError = (details = 'stream failed') => ipc.emit(`${token()}-error`, {}, details)
  const emitEnd = () => ipc.emit(`${token()}-end`)
  return { api, bindings, ipc, invoke, send, emitError, emitEnd, token, dispose: () => cleanup() }
}

describe('HTTPFuzzerPage real IPC control paths', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('stops A and sends B with fresh counters and row indexes without receiving end', async () => {
    const { api, bindings: b, send, dispose } = setup()
    api.submitToHTTPFuzzer()
    send('a1')
    send('a2')
    send('a3', false)
    await api.cancelCurrentHTTPFuzzer()
    expect(b.setLoading).toHaveBeenLastCalledWith(false)
    expect(b.taskIDRef.current).toBe('')
    expect(b.successFuzzerRef.current).toHaveLength(2)
    expect(b.getNewCurrentPage).not.toHaveBeenCalled()
    api.submitToHTTPFuzzer()
    send('b1')
    vi.advanceTimersByTime(500)
    expect(b.setSuccessCount).toHaveBeenLastCalledWith(1)
    expect(b.setFailedCount).toHaveBeenLastCalledWith(0)
    expect(b.successFuzzerRef.current.map((r: any) => [r.UUID, r.Count])).toEqual([['b1', 0]])
    expect(b.failedFuzzerRef.current).toEqual([])
    dispose()
  })

  it('handles terminal error immediately, preserves rows and allows another send', () => {
    const { api, bindings: b, send, emitError, dispose } = setup()
    api.submitToHTTPFuzzer()
    send('a1')
    emitError('unavailable')
    expect(b.yakitNotify).toHaveBeenCalled()
    expect(b.setLoading).toHaveBeenLastCalledWith(false)
    expect(b.setIsPause).toHaveBeenLastCalledWith(true)
    expect(b.taskIDRef.current).toBe('')
    expect(b.stop).toHaveBeenCalled()
    expect(b.successFuzzerRef.current).toHaveLength(1)
    expect(b.getNewCurrentPage).not.toHaveBeenCalled()
    send('late')
    expect(b.successFuzzerRef.current).toHaveLength(1)
    api.submitToHTTPFuzzer()
    send('b1')
    expect(b.successFuzzerRef.current[0].Count).toBe(0)
    dispose()
  })

  it('cancels delayed completion and old first-response updates on a fresh send', () => {
    const { api, bindings: b, send, emitEnd, dispose } = setup()
    api.submitToHTTPFuzzer()
    send('a1')
    b.inViewportRef.current = false
    send('a1')
    expect(b.streamRunRef.current.state.firstResponseDirty).toBe(true)
    emitEnd()
    api.submitToHTTPFuzzer()
    expect(b.taskIDRef.current).toBe('')
    expect(b.streamRunRef.current.state.pendingFirstResponse).toBeNull()
    b.inViewportRef.current = true
    vi.advanceTimersByTime(500)
    expect(b.setLoading).toHaveBeenLastCalledWith(true)
    expect(b.getFirstResponse().RequestRaw).toEqual([])
    expect(b.getNewCurrentPage).not.toHaveBeenCalled()
    send('b1')
    expect(b.getFirstResponse().UUID).toBe('b1')
    dispose()
  })

  it('does not auto-select latest history when cancellation precedes a history load', async () => {
    const { api, bindings: b, invoke, send, emitEnd, token, dispose } = setup()
    api.submitToHTTPFuzzer()
    send('a1')
    emitEnd()
    await api.cancelCurrentHTTPFuzzer()
    api.loadHistory(7)
    await vi.runAllTimersAsync()
    expect(invoke).toHaveBeenCalledWith('HTTPFuzzer', { HistoryWebFuzzerId: 7 }, token())
    expect(b.setCurrentSelectId).toHaveBeenLastCalledWith(7)
    expect(b.getNewCurrentPage).not.toHaveBeenCalled()
    dispose()
  })

  it('preserves retry/rematch parameters and runtime IDs without resetting on pause', async () => {
    const { api, bindings: b, invoke, send, token, dispose } = setup()
    b.runtimeIdRef.current = 'runtime-old'
    b.retryRef.current = true
    api.submitToHTTPFuzzer()
    expect(invoke).toHaveBeenLastCalledWith('HTTPFuzzer', { RetryTaskID: 42 }, token())
    expect(b.runtimeIdRef.current).toBe('runtime-old')
    send('retry1')
    await api.resumeAndPause()
    expect(invoke).toHaveBeenLastCalledWith(
      'HTTPFuzzer',
      {
        PauseTaskID: '42',
        IsPause: true,
        SetPauseStatus: true,
      },
      token(),
    )
    expect(b.successFuzzerRef.current).toHaveLength(1)
    expect(b.streamRunRef.current.isActive()).toBe(true)
    b.matchRef.current = true
    api.submitToHTTPFuzzer()
    expect(invoke).toHaveBeenLastCalledWith(
      'HTTPFuzzer',
      expect.objectContaining({
        ReMatch: true,
        HistoryWebFuzzerId: '42',
        Request: 'GET /new',
      }),
      token(),
    )
    expect(b.runtimeIdRef.current).toBe('')
    dispose()
  })

  it('ignores a late error from the previous stream after a fresh send (A→B)', () => {
    const { api, bindings: b, ipc, invoke, send, emitError, token, dispose } = setup()
    api.submitToHTTPFuzzer()
    send('a1')
    const staleToken = token()
    api.submitToHTTPFuzzer()
    expect(invoke).toHaveBeenCalledWith('cancel-HTTPFuzzer', staleToken)
    // A 的迟到 error/end/data 都落在已摘除监听的旧频道上
    ipc.emit(`${staleToken}-error`, {}, 'stale stream failure')
    ipc.emit(`${staleToken}-end`)
    ipc.emit(
      `${staleToken}-data`,
      {},
      {
        UUID: 'late-a',
        TaskId: '42',
        RuntimeID: 'runtime-a',
        Ok: true,
        RequestRaw: new Uint8Array([1]),
        ResponseRaw: new Uint8Array([2]),
      },
    )
    expect(b.yakitNotify).not.toHaveBeenCalled()
    expect(b.setLoading).toHaveBeenLastCalledWith(true)
    expect(b.streamRunRef.current.isActive()).toBe(true)
    expect(b.successFuzzerRef.current).toEqual([])
    // B 的数据仍被正常接受
    send('b1')
    expect(b.successFuzzerRef.current.map((r: any) => r.UUID)).toEqual(['b1'])
    // B 自己的 error 仍会被正常接受并终止 B
    emitError('real failure')
    expect(b.yakitNotify).toHaveBeenCalled()
    expect(b.setLoading).toHaveBeenLastCalledWith(false)
    expect(b.streamRunRef.current.isActive()).toBe(false)
    dispose()
  })
})
