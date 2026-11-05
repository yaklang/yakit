import { readFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fuzzerRawStore, fuzzerSequenceScope, saveFuzzerRaw } from '../../fuzzerRawStore'

// Exercise the actual parameter builder and start guard without loading Monaco/Electron.
const source = ts.createSourceFile(
  'FuzzerSequence.tsx',
  readFileSync('app/renderer/src/main/src/pages/fuzzer/FuzzerSequence/FuzzerSequence.tsx', 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
)
const declarations = (names: string[]) => {
  const result: string[] = []
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some((declaration) => names.includes(declaration.name.getText(source)))
    )
      result.push(node.getText(source))
    ts.forEachChild(node, visit)
  }
  visit(source)
  expect(result).toHaveLength(names.length)
  return ts.transpileModule(result.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
}
const findOne = (predicate: (node: ts.Node) => boolean) => {
  const matches: ts.Node[] = []
  const visit = (node: ts.Node) => {
    if (predicate(node)) matches.push(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
  expect(matches).toHaveLength(1)
  return matches[0].getText(source)
}
// 序列发包的数据监听与释放队列，和 HTTPFuzzerPage 里的另一份实现分开执行
const sequenceStreamEffect = ts.transpileModule(
  findOne(
    (node) =>
      ts.isExpressionStatement(node) &&
      ts.isCallExpression(node.expression) &&
      node.expression.expression.getText(source) === 'useEffect' &&
      node.getText(source).includes('const RELEASE_GRACE_MS = 2000'),
  ),
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
).outputText

describe('browser gateway group execution boundary', () => {
  it.each([false, true])(
    'rejects an entire mixed group before state changes or IPC (concurrency=%s)',
    (isConcurrency) => {
      const selection = { deviceId: 'browser', profileId: 'profile', profileName: 'AES' }
      const pages = ['ordinary', 'gateway'].map((pageId) => ({
        pageId,
        pageParamsInfo: {
          webFuzzerPageInfo: {
            advancedConfigValue: { proxy: [], resNumlimit: 100 },
            request: 'POST /login',
            hotPatchCode: '',
            browserTransformSelection: pageId === 'gateway' ? selection : undefined,
          },
        },
      }))
      const bindings = {
        Buffer,
        isConcurrency,
        currentList: pages.map(({ pageId }) => ({ pageId, id: pageId })),
        useMemoizedFn: (fn: unknown) => fn,
        getCurrentGroupSequence: () => pages,
        yakitNotify: vi.fn(),
        t: (key: string) => key,
        setLoading: vi.fn(),
        onClearRef: vi.fn(),
        ipcRenderer: { invoke: vi.fn() },
        startConcurrency: vi.fn(),
        fuzzerTableMaxDataRef: { current: new Map() },
        hotPatchCodeWithParamGetterRef: { current: '' },
        getProxyValue: () => ({ proxyEndpoints: '' }),
        advancedConfigValueToFuzzerRequests: () => ({ Concurrent: 20, Extractors: [], Matchers: [] }),
        setRequest: vi.fn(),
        resetResponse: vi.fn(),
        updateConcurrentLoad: vi.fn(),
        resetDroppedCount: vi.fn(),
        cancelPendingRawDeletes: vi.fn(),
        rawScopesRef: { current: new Set<string>() },
        fuzzerRawStore,
        fuzzerSequenceScope,
        props: { groupId: 'group' },
        selectGroupId: 'group',
        droppedSequenceIndexMapRef: { current: new Map() },
        setShowAllRes: vi.fn(),
        setCurrentSelectResponse: vi.fn(),
        setCurrentList: vi.fn(),
        fuzzerIndexModeRef: { current: new Map() },
        pageGroupData: undefined,
        fuzzTokenRef: { current: 'token' },
        setHasExtractorRules: vi.fn(),
      }
      const api = new Function(
        ...Object.keys(bindings),
        `${declarations(['getHttpParams', 'onStartExecution'])}\nreturn {getHttpParams, onStartExecution}`,
      )(...Object.values(bindings))
      api.onStartExecution()
      expect(bindings.yakitNotify).toHaveBeenCalledWith('error', 'FuzzerSequence.browserGatewayUnsupported')
      expect(bindings.setLoading).not.toHaveBeenCalled()
      expect(bindings.onClearRef).not.toHaveBeenCalled()
      expect(bindings.ipcRenderer.invoke).not.toHaveBeenCalled()
      expect(bindings.startConcurrency).not.toHaveBeenCalled()
      expect(bindings.setRequest).not.toHaveBeenCalled()
      // Explicitly disabling the binding restores ordinary group parameter construction.
      pages[1].pageParamsInfo.webFuzzerPageInfo.browserTransformSelection = undefined
      expect(api.getHttpParams()).toEqual(
        pages.map(({ pageId }) =>
          expect.objectContaining({
            FuzzerTabIndex: pageId,
            Concurrent: 20,
            RequestRaw: Buffer.from('POST /login'),
          }),
        ),
      )
      api.onStartExecution()
      const requests = expect.objectContaining({
        Requests: expect.arrayContaining([
          expect.objectContaining({ FuzzerTabIndex: 'ordinary', Concurrent: 20 }),
          expect.objectContaining({ FuzzerTabIndex: 'gateway', Concurrent: 20 }),
        ]),
      })
      if (isConcurrency) expect(bindings.startConcurrency).toHaveBeenCalledWith(requests)
      else expect(bindings.ipcRenderer.invoke).toHaveBeenCalledWith('HTTPFuzzerSequence', requests, 'token')
      expect(bindings.cancelPendingRawDeletes).toHaveBeenCalledTimes(1)
      expect(bindings.fuzzerTableMaxDataRef.current.get('ordinary')).toBe(100)
      expect(bindings.fuzzerTableMaxDataRef.current.get('gateway')).toBe(100)
    },
  )
})

describe('FuzzerSequence response release queue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const alive = (rows: { RequestRaw: unknown; ResponseRaw: unknown }[]) =>
    rows.every((row) => row.RequestRaw !== null && row.ResponseRaw !== null)
  const releasedCount = (rows: { RequestRaw: unknown; ResponseRaw: unknown }[]) =>
    rows.filter((row) => row.RequestRaw === null && row.ResponseRaw === null).length

  const setup = () => {
    const ipc = new EventEmitter()
    let cleanup = () => {}
    const track = (list: any[]) => {
      const trimmed: any[] = []
      const shift = list.shift.bind(list)
      list.shift = () => {
        const item = shift()
        if (item) trimmed.push(item)
        return item
      }
      return trimmed
    }
    const rawEvictGenerationRef = { current: new Map<string, number>() }
    const alphaRows: any[] = []
    const betaRows: any[] = []
    const trimmedAlpha = track(alphaRows)
    const trimmedBeta = track(betaRows)
    const successBufferRef = {
      current: new Map<string, any[]>([
        ['alpha', alphaRows],
        ['beta', betaRows],
      ]),
    }
    const rawScopesRef = { current: new Set<string>() }
    const bindings: Record<string, any> = {
      useEffect: (fn: () => () => void) => {
        cleanup = fn() || (() => {})
      },
      fuzzTokenRef: { current: 'seq-token' },
      ipcRenderer: Object.assign(ipc, { invoke: vi.fn(), removeAllListeners: vi.fn() }),
      successCountRef: { current: new Map() },
      failedCountRef: { current: new Map() },
      onSetFirstAsSelected: vi.fn(),
      countRef: { current: new Map() },
      runtimeIdBufferRef: { current: new Map() },
      filterColorTag: () => undefined,
      successBufferRef,
      saveFuzzerRaw,
      fuzzerSequenceScope,
      fuzzerRawStore,
      props: { groupId: 'group' },
      selectGroupId: 'group',
      rawScopesRef,
      rawEvictGenerationRef,
      cancelPendingRawDeletes: (scopes?: string[]) => {
        const targets = scopes?.length ? scopes : [...rawScopesRef.current]
        targets.forEach((scope) => {
          const generations = rawEvictGenerationRef.current
          generations.set(scope, (generations.get(scope) || 0) + 1)
        })
      },
      fuzzerTableMaxDataRef: {
        current: new Map<string, number>([
          ['alpha', 100],
          ['beta', 100],
        ]),
      },
      DefFuzzerTableMaxData: 2000,
      failedBufferRef: { current: new Map() },
      fuzzerIndexArr: { current: [] as string[] },
      fuzzerResChartDataBufferRef: { current: new Map() },
      setLoading: vi.fn(),
      yakitNotify: vi.fn(),
      t: (key: string) => key,
    }
    new Function(...Object.keys(bindings), sequenceStreamEffect)(...Object.values(bindings))
    const send = (fuzzerIndex: string, id: string) =>
      ipc.emit(
        'seq-token-data',
        {},
        {
          Request: { FuzzerIndex: fuzzerIndex },
          Response: {
            UUID: id,
            Ok: true,
            RuntimeID: `runtime-${fuzzerIndex}`,
            RequestRaw: new Uint8Array([1]),
            ResponseRaw: new Uint8Array([2]),
          },
        },
      )
    return { bindings, send, trimmedAlpha, trimmedBeta, alphaRows, betaRows, dispose: () => cleanup() }
  }

  it('keeps in-use rows and releases staggered multi-index overflow after 2s in 500ms batches', () => {
    const { bindings, send, trimmedAlpha, trimmedBeta, alphaRows, betaRows, dispose } = setup()
    for (let i = 0; i < 160; i++) send('alpha', `alpha-${i}`)
    const early = trimmedAlpha.slice()
    expect(early).toHaveLength(60)
    expect(alphaRows).toHaveLength(100)

    // 2s 保护期内（含 500ms/1000ms/1500ms tick）不释放；此间错峰入队
    vi.advanceTimersByTime(1000)
    expect(alive(early)).toBe(true)
    for (let i = 0; i < 40; i++) send('alpha', `alpha-late-${i}`)
    for (let i = 0; i < 200; i++) send('beta', `beta-${i}`)
    const late = trimmedAlpha.slice(60)
    expect(late).toHaveLength(40)
    expect(trimmedBeta).toHaveLength(100)
    const inUseAlpha = alphaRows.slice()
    const inUseBeta = betaRows.slice()
    vi.advanceTimersByTime(999)
    expect(alive(early)).toBe(true)
    expect(alive(late)).toBe(true)
    expect(alive(trimmedBeta)).toBe(true)

    // t=2000：队列 200，本拍 batch = max(50, ceil(200/5)) = 50，只清已到期的队头
    vi.advanceTimersByTime(1)
    expect(releasedCount(early)).toBe(50)
    expect(alive(early.slice(50))).toBe(true)
    expect(alive(late)).toBe(true)
    expect(alive(trimmedBeta)).toBe(true)

    // 未到下一个 500ms tick 不再释放
    vi.advanceTimersByTime(499)
    expect(releasedCount(early)).toBe(50)
    // t=2500：batch 仍是 50，但队头之后的行未过保护期，只清掉剩余 10 条到期行
    vi.advanceTimersByTime(1)
    expect(releasedCount(early)).toBe(60)
    expect(alive(late)).toBe(true)
    expect(alive(trimmedBeta)).toBe(true)
    expect(alive(inUseAlpha)).toBe(true)
    expect(alive(inUseBeta)).toBe(true)

    // t=3000：后入队的 alpha/beta 一起到期，本拍只释放 50（40 条 late + 10 条 beta）
    vi.advanceTimersByTime(500)
    expect(releasedCount(late)).toBe(40)
    expect(releasedCount(trimmedBeta)).toBe(10)
    expect(alive(trimmedBeta.slice(10))).toBe(true)

    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    let guard = 0
    while (trimmedBeta.some((row) => row.RequestRaw !== null) && guard++ < 20) {
      vi.advanceTimersByTime(500)
    }
    expect(releasedCount(trimmedBeta)).toBe(100)
    expect(alive(inUseAlpha)).toBe(true)
    expect(alive(inUseBeta)).toBe(true)
    expect(alphaRows).toHaveLength(100)
    expect(betaRows).toHaveLength(100)
    expect(bindings.fuzzerIndexArr.current).toEqual(['alpha', 'beta'])
    vi.advanceTimersByTime(500)
    expect(clearIntervalSpy).toHaveBeenCalled()
    dispose()
  })

  it('keeps the request on the row and stores the response', async () => {
    const { bindings, send, alphaRows, dispose } = setup()
    send('alpha', 'alpha-body')
    const row = alphaRows[0]
    expect(Array.from(row.RequestRaw)).toEqual([1])
    expect(row.ResponseRaw).toHaveLength(0)
    expect(
      Array.from((await fuzzerRawStore.get(fuzzerSequenceScope('group', 'sequence', 'alpha'), 'alpha-body')) || []),
    ).toEqual([2])
    expect(bindings.rawScopesRef.current.has(fuzzerSequenceScope('group', 'sequence', 'alpha'))).toBe(true)
    dispose()
  })

  it('does not delete a newer response when sequence release runs after the next execution', async () => {
    const { bindings, send, trimmedAlpha, dispose } = setup()
    bindings.fuzzerTableMaxDataRef.current.set('alpha', 1)
    send('alpha', 'same')
    send('alpha', 'next')
    expect(trimmedAlpha.map((row) => row.UUID)).toEqual(['same'])
    const scope = fuzzerSequenceScope('group', 'sequence', 'alpha')
    bindings.cancelPendingRawDeletes([scope])
    await fuzzerRawStore.save(scope, 'same', new Uint8Array([9]))
    await vi.advanceTimersByTimeAsync(2500)
    expect(trimmedAlpha[0].ResponseRaw).toBeNull()
    expect(Array.from((await fuzzerRawStore.get(scope, 'same')) || [])).toEqual([9])
    dispose()
  })

  it('does not let a concurrency overflow timer delete the next run', async () => {
    const rawEvictGenerationRef = { current: new Map<string, number>() }
    const rawScopesRef = { current: new Set<string>() }
    const api = new Function(
      'useMemoizedFn',
      'fuzzerRawStore',
      'rawEvictGenerationRef',
      'rawScopesRef',
      `${declarations(['cancelPendingRawDeletes', 'scheduleOverflowDelete'])}\nreturn {cancelPendingRawDeletes, scheduleOverflowDelete}`,
    )((fn: unknown) => fn, fuzzerRawStore, rawEvictGenerationRef, rawScopesRef)
    const scope = fuzzerSequenceScope('group', 'concurrency', 'overflow')
    await fuzzerRawStore.save(scope, 'stale', new Uint8Array([1]))
    api.scheduleOverflowDelete(scope, 'stale')
    await vi.advanceTimersByTimeAsync(2000)
    expect(await fuzzerRawStore.get(scope, 'stale')).toBeUndefined()

    await fuzzerRawStore.save(scope, 'same', new Uint8Array([1]))
    api.scheduleOverflowDelete(scope, 'same')
    api.cancelPendingRawDeletes([scope])
    await fuzzerRawStore.save(scope, 'same', new Uint8Array([9]))
    await vi.advanceTimersByTimeAsync(2000)
    expect(Array.from((await fuzzerRawStore.get(scope, 'same')) || [])).toEqual([9])
  })

  it('still deletes another scope when only one scope starts again', async () => {
    const rawEvictGenerationRef = { current: new Map<string, number>() }
    const rawScopesRef = { current: new Set<string>() }
    const api = new Function(
      'useMemoizedFn',
      'fuzzerRawStore',
      'rawEvictGenerationRef',
      'rawScopesRef',
      `${declarations(['cancelPendingRawDeletes', 'scheduleOverflowDelete'])}\nreturn {cancelPendingRawDeletes, scheduleOverflowDelete}`,
    )((fn: unknown) => fn, fuzzerRawStore, rawEvictGenerationRef, rawScopesRef)
    const rerun = fuzzerSequenceScope('group', 'concurrency', 'rerun')
    const other = fuzzerSequenceScope('group', 'concurrency', 'other')
    await fuzzerRawStore.save(rerun, 'old', new Uint8Array([1]))
    await fuzzerRawStore.save(other, 'old', new Uint8Array([2]))
    api.scheduleOverflowDelete(rerun, 'old')
    api.scheduleOverflowDelete(other, 'old')
    api.cancelPendingRawDeletes([rerun])
    await fuzzerRawStore.save(rerun, 'old', new Uint8Array([9]))
    await vi.advanceTimersByTimeAsync(2000)
    expect(Array.from((await fuzzerRawStore.get(rerun, 'old')) || [])).toEqual([9])
    expect(await fuzzerRawStore.get(other, 'old')).toBeUndefined()
  })

  it('drops the previous concurrency responses on batch rematch and keeps another mode', async () => {
    const rawEvictGenerationRef = { current: new Map<string, number>() }
    const rawScopesRef = { current: new Set<string>() }
    const currentList = [
      { id: 'node-a', pageId: 'page-a' },
      { id: 'node-b', pageId: 'page-b' },
    ]
    const bindings = {
      useMemoizedFn: (fn: unknown) => fn,
      fuzzerRawStore,
      fuzzerSequenceScope,
      rawEvictGenerationRef,
      rawScopesRef,
      props: { groupId: 'group' },
      currentList,
      pageGroupData: { pageParamsInfo: { ConcurrencyAdvancedConfigValue: { matchers: [], extractors: [] } } },
      getHttpParams: () => [{ FuzzerIndex: 'node-a' }],
      onClearRef: vi.fn(),
      resetResponse: vi.fn(),
      resetDroppedCount: vi.fn(),
      droppedSequenceIndexMapRef: { current: new Map() },
      updateConcurrentLoad: vi.fn(),
      getAllConcurrencyResponse: () => ({ successFuzzer: [{ TaskId: 'task' }] }),
      startConcurrency: vi.fn(),
      setHasExtractorRules: vi.fn(),
      yakitFailed: vi.fn(),
    }
    const submit = new Function(
      ...Object.keys(bindings),
      `${declarations(['cancelPendingRawDeletes', 'onConcurrencyMatchSubmit'])}\nreturn onConcurrencyMatchSubmit`,
    )(...Object.values(bindings))
    const scopeA = fuzzerSequenceScope('group', 'concurrency', 'node-a')
    const scopeB = fuzzerSequenceScope('group', 'concurrency', 'node-b')
    const sequenceScope = fuzzerSequenceScope('group', 'sequence', 'node-a')
    rawScopesRef.current.add(scopeA)
    rawScopesRef.current.add(scopeB)
    rawScopesRef.current.add(sequenceScope)
    await fuzzerRawStore.save(scopeA, 'old-a', new Uint8Array([1]))
    await fuzzerRawStore.save(scopeB, 'old-b', new Uint8Array([2]))
    await fuzzerRawStore.save(sequenceScope, 'keep', new Uint8Array([3]))
    submit()
    await vi.advanceTimersByTimeAsync(400)
    expect(await fuzzerRawStore.get(scopeA, 'old-a')).toBeUndefined()
    expect(await fuzzerRawStore.get(scopeB, 'old-b')).toBeUndefined()
    expect(Array.from((await fuzzerRawStore.get(sequenceScope, 'keep')) || [])).toEqual([3])
    await fuzzerRawStore.save(scopeA, 'new-a', new Uint8Array([9]))
    expect(Array.from((await fuzzerRawStore.get(scopeA, 'new-a')) || [])).toEqual([9])
    expect(bindings.startConcurrency).toHaveBeenCalled()
  })
})
