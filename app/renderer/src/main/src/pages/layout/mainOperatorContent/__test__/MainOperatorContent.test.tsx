import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 执行实际初始化 Effect、AI 恢复方法和新开入口；不加载 Electron、Monaco，也不模拟浏览器的 inert 行为。
const source = ts.createSourceFile(
  'MainOperatorContent.tsx',
  readFileSync('app/renderer/src/main/src/pages/layout/mainOperatorContent/MainOperatorContent.tsx', 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
)
const find = (predicate: (node: ts.Node) => boolean) => {
  const matches: ts.Node[] = []
  const visit = (node: ts.Node) => {
    if (predicate(node)) matches.push(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return matches
}
const declaration = (name: string) =>
  find(
    (node) =>
      ts.isVariableDeclaration(node) &&
      (node.name.getText(source) === name || node.name.getText(source) === `[${name}, setInitializing]`),
  )[0] as ts.VariableDeclaration | undefined
const effect = find(
  (node) =>
    ts.isExpressionStatement(node) &&
    ts.isCallExpression(node.expression) &&
    node.expression.expression.getText(source) === 'useEffect' &&
    node.getText(source).includes('const aiReady ='),
)[0].getText(source)
const execute = (code: string, bindings: Record<string, unknown>) => {
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  return new Function(...Object.keys(bindings), js)(...Object.values(bindings))
}
const attribute = (tag: string, name: string, bindings: Record<string, unknown>) => {
  const node = find(
    (node) => ts.isJsxOpeningElement(node) && node.tagName.getText(source) === tag,
  )[0] as ts.JsxOpeningElement
  const attr = node.attributes.properties.find(
    (prop) => ts.isJsxAttribute(prop) && prop.name.getText(source) === name,
  ) as ts.JsxAttribute | undefined
  if (!attr?.initializer || !ts.isJsxExpression(attr.initializer)) return undefined
  return execute(`return ${attr.initializer.expression!.getText(source)}`, bindings)
}
const deferred = () => {
  let resolve!: (value: string) => void
  let reject!: (error: Error) => void
  const promise = new Promise<string>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const settle = () => vi.advanceTimersByTimeAsync(500)

const setup = ({ mode = 'classic', savedKey = '', memfit = true, enterprise = false } = {}) => {
  const ai = deferred()
  const wf = deferred()
  const fixed = { route: 'ai', routeKey: 'ai', verbose: 'AI' }
  let pages = [fixed]
  let initializing = declaration('initializing')
    ? execute(`return ${declaration('initializing')!.initializer!.getText(source)}[0]`, {
        useState: (v: unknown) => [v],
      })
    : false
  let cleanup = () => {}
  const storedPages = new Map<string, unknown>()
  const store = {
    pages: storedPages,
    clearAllData: vi.fn(() => storedPages.clear()),
    clearOtherDataByRoute: vi.fn((routes: string | string[]) => {
      const kept = Array.isArray(routes) ? routes : [routes]
      for (const route of storedPages.keys()) if (!kept.includes(route)) storedPages.delete(route)
    }),
  }
  const setInitializing = vi.fn((value: boolean) => {
    initializing = value
  })
  const bindings = {
    useEffect: (fn: () => () => void) => {
      cleanup = fn()
    },
    useMemoizedFn: (fn: unknown) => fn,
    clearAllData: store.clearAllData,
    clearOtherDataByRoute: store.clearOtherDataByRoute,
    setInitializing,
    softMode: mode,
    currentTabKey: 'ai',
    YakitRoute: { AI_Agent: 'ai', HTTPFuzzer: 'wf', Settings: 'settings' },
    YakitModeEnum: { SecurityExpert: 'expert', Classic: 'classic', Scan: 'scan' },
    usePageInfo: {
      getState: () => store,
      subscribe: vi.fn((_selector: unknown, _listener: unknown) => vi.fn()),
    },
    isEnterpriseEdition: () => enterprise,
    clearFuzzerSequence: vi.fn(),
    isMemfit: () => memfit,
    isWFCacheEdition: () => true,
    getPageCache: () => pages,
    getInitPageCache: () =>
      memfit ? [fixed] : mode === 'expert' ? [{ route: 'wf', routeKey: 'wf', verbose: 'Web Fuzzer' }] : [],
    getInitActiveTabKey: () => 'default-page',
    setPageCache: vi.fn((value) => {
      pages = typeof value === 'function' ? value(pages) : value
    }),
    aiCacheLoaded: { current: false },
    defPage: {},
    YakitRouteToPageInfo: { ai: { label: 'AI' } },
    saveAIAgentCache: Object.assign(vi.fn(), { cancel: vi.fn() }),
    saveFuzzerCache: Object.assign(vi.fn(), { cancel: vi.fn() }),
    getRemoteProjectValue: vi.fn(() => ai.promise),
    mergeAIAgentPageTabs: vi.fn((current) => current),
    RemoteAIAgentGV: { AIAgentTabs: 'ai-tabs' },
    RemoteGV: { SelectFirstMenuTabKey: 'selected' },
    JSONParseLog: JSON.parse,
    setPagesData: vi.fn(),
    setCurrentTabKey: vi.fn(),
    yakitNotify: vi.fn(),
    onInitFuzzer: vi.fn(() => wf.promise),
    isSecurityExpert: mode === 'expert',
    getRemoteValue: vi.fn(async () => savedKey),
    getAIAgentNextTabIndex: () => 2,
    generateTabIdentity: () => ({ tabId: 'new-ai' }),
    routeConvertKey: () => 'ai',
    onSetPageInfoDataOfSingle: vi.fn(),
    t: (key: string) => key,
  }
  const locked = () => attribute('Content', 'inert', { initializing }) === true
  const spinning = () => attribute('YakitSpin', 'spinning', { initializing, loading: false })
  const open = () =>
    execute(`return (${declaration('openAIAgentExtraTab')!.initializer!.getText(source)})()`, {
      ...bindings,
      pageCache: pages,
      initializing,
    })
  const mount = () => execute(`const ${declaration('onInitAIAgent')!.getText(source)};\n${effect}`, bindings)
  return { ai, wf, bindings, locked, spinning, open, mount, dispose: () => cleanup() }
}

describe('MainOperatorContent initial cache loading', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it('locks the default Memfit page before the restore effect runs', () => {
    const app = setup()
    expect(app.locked()).toBe(true)
    expect(app.spinning()).toBe(true)
  })

  it.each(['ai', 'wf'] as const)('keeps the page locked when only %s has finished', async (first) => {
    const app = setup()
    app.mount()
    app[first].resolve('[]')
    await settle()
    expect(app.locked()).toBe(true)
    expect(app.spinning()).toBe(true)
    app[first === 'ai' ? 'wf' : 'ai'].resolve('[]')
    await settle()
    expect(app.locked()).toBe(false)
    expect(app.spinning()).toBe(false)
    app.dispose()
  })

  it('blocks external new-tab requests until restored tabs are installed', async () => {
    const app = setup()
    app.mount()
    app.open()
    expect(app.bindings.onSetPageInfoDataOfSingle).not.toHaveBeenCalled()
    const cached = { pageId: 'restored-ai', pageParamsInfo: {}, sortFieId: 1 }
    app.ai.resolve(JSON.stringify([cached]))
    app.wf.resolve('[]')
    await settle()
    expect(app.bindings.setPagesData).toHaveBeenCalledWith(
      'ai',
      expect.objectContaining({
        pageList: expect.arrayContaining([cached]),
      }),
    )
    app.open()
    expect(app.bindings.onSetPageInfoDataOfSingle).toHaveBeenCalledOnce()
    app.dispose()
  })

  it.each(['ai', 'wf'] as const)('releases interaction after %s fails and the other task finishes', async (failed) => {
    const app = setup()
    app.mount()
    await settle()
    app[failed].reject(new Error('read failed'))
    await settle()
    expect(app.bindings.yakitNotify).toHaveBeenCalledOnce()
    expect(app.locked()).toBe(true)
    app[failed === 'ai' ? 'wf' : 'ai'].resolve('[]')
    await settle()
    expect(app.locked()).toBe(false)
    expect(app.spinning()).toBe(false)
    app.open()
    expect(app.bindings.onSetPageInfoDataOfSingle).toHaveBeenCalledOnce()
    if (failed === 'ai') {
      expect(app.bindings.setPagesData).toHaveBeenCalledWith(
        'ai',
        expect.objectContaining({
          pageList: [expect.objectContaining({ pageId: 'ai' })],
        }),
      )
      expect(app.bindings.aiCacheLoaded.current).toBe(true)
    }
    app.dispose()
  })

  it('releases interaction when both restore tasks fail', async () => {
    const app = setup()
    app.mount()
    await settle()
    app.ai.reject(new Error('AI read failed'))
    app.wf.reject(new Error('WF read failed'))
    await settle()
    expect(app.bindings.yakitNotify).toHaveBeenCalledTimes(2)
    expect(app.locked()).toBe(false)
    expect(app.spinning()).toBe(false)
    app.open()
    expect(app.bindings.onSetPageInfoDataOfSingle).toHaveBeenCalledOnce()
    app.dispose()
  })

  it.each([true, false])(
    'initializes an empty cache after read failure and keeps syncing and saving (Memfit=%s)',
    async (memfit) => {
      const app = setup({ memfit })
      app.bindings.setPagesData.mockImplementation((route, page) => {
        app.bindings.usePageInfo.getState().pages.set(route, page)
        const sync = app.bindings.usePageInfo.subscribe.mock.calls[0][1] as (page: unknown) => void
        sync(page)
      })
      app.mount()
      app.ai.reject(new Error('read failed'))
      app.wf.resolve('[]')
      await settle()
      const initial = app.bindings.setPagesData.mock.lastCall![1]
      expect(initial.pageList).toEqual(memfit ? [expect.objectContaining({ pageId: 'ai', pageParamsInfo: {} })] : [])
      expect(app.bindings.saveAIAgentCache).toHaveBeenCalledWith(initial)
      expect(app.locked()).toBe(false)

      const sync = app.bindings.usePageInfo.subscribe.mock.calls[0][1] as (page: unknown) => void
      const local = { pageId: 'local', pageName: 'New title', sortFieId: 1, pageParamsInfo: {} }
      sync({ pageList: [local] })
      expect(app.bindings.mergeAIAgentPageTabs).toHaveBeenLastCalledWith(expect.any(Array), { pageList: [local] })
      expect(app.bindings.saveAIAgentCache).toHaveBeenLastCalledWith({ pageList: [local] })
      await vi.advanceTimersByTimeAsync(6000)
      expect(app.bindings.getRemoteProjectValue).toHaveBeenCalledOnce()
      app.dispose()
    },
  )

  it.each(['{', '{}'])('treats invalid cache data as empty and completes initialization: %s', async (raw) => {
    const app = setup({ memfit: false })
    app.mount()
    app.ai.resolve(raw)
    app.wf.resolve('[]')
    await settle()
    expect(app.bindings.setPagesData).toHaveBeenCalledWith('ai', expect.objectContaining({ pageList: [] }))
    expect(app.bindings.aiCacheLoaded.current).toBe(true)
    expect(app.locked()).toBe(false)
    expect(app.bindings.yakitNotify).toHaveBeenCalledOnce()
    app.dispose()
  })

  it('appends a new AI tab after surviving tabs with larger historical sort values', () => {
    const existing = { pageId: 'C', sortFieId: 8 }
    const added = { id: 'D', verbose: 'D', groupId: '0', pageParams: {} }
    const addPagesDataCache = vi.fn()
    execute(`return (${declaration('onSetYakAIAgent')!.initializer!.getText(source)})(node)`, {
      useMemoizedFn: (fn: unknown) => fn,
      getPageCache: () => [{ routeKey: 'C' }],
      usePageInfo: { getState: () => ({ pages: new Map([['ai', { pageList: [existing] }]]) }) },
      YakitRoute: { AI_Agent: 'ai' },
      randomString: () => 'random',
      addPagesDataCache,
      node: added,
    })
    const created = addPagesDataCache.mock.calls[0][1]
    expect(created.sortFieId).toBeGreaterThan(existing.sortFieId)
    expect([existing, created].sort((a, b) => a.sortFieId - b.sortFieId).map((node) => node.pageId)).toEqual(['C', 'D'])
  })

  it('moves the cached fixed-page session into a separate tab and keeps the default page blank', async () => {
    const app = setup()
    const session = { SessionID: 'old-default-session' }
    app.mount()
    app.ai.resolve(
      JSON.stringify([
        {
          id: 'ai',
          pageId: 'ai',
          pageName: 'Existing chat',
          pageParamsInfo: { aiAgentPageInfo: { session } },
          sortFieId: 5,
        },
      ]),
    )
    app.wf.resolve('[]')
    await settle()
    const restored = app.bindings.setPagesData.mock.calls[0][1].pageList
    expect(restored).toHaveLength(2)
    expect(restored[0]).toMatchObject({ pageId: 'ai', pageParamsInfo: {} })
    expect(restored[1]).toMatchObject({ pageName: 'Existing chat', pageParamsInfo: { aiAgentPageInfo: { session } } })
    expect(restored[1].pageId).toBe('new-ai')
    expect(restored[1].id).toBe(restored[1].pageId)
    expect(app.bindings.setCurrentTabKey).toHaveBeenLastCalledWith(restored[1].pageId)
    app.dispose()
  })

  it.each([{ cached: [] }, { cached: [{ pageId: 'ai', pageParamsInfo: {}, sortFieId: 0 }] }])(
    'restores exactly one blank default page when no session tabs were cached ($cached)',
    async ({ cached }) => {
      const app = setup()
      app.mount()
      app.ai.resolve(JSON.stringify(cached))
      app.wf.resolve('[]')
      await settle()
      expect(app.bindings.setPagesData).toHaveBeenCalledWith(
        'ai',
        expect.objectContaining({
          pageList: [expect.objectContaining({ pageId: 'ai', pageParamsInfo: {} })],
        }),
      )
      expect(app.bindings.setCurrentTabKey).toHaveBeenLastCalledWith('ai')
      app.dispose()
    },
  )

  it('sorts cached tabs and selects the final restored tab', async () => {
    const app = setup()
    const cached = [
      { pageId: 'later', sortFieId: 10, pageParamsInfo: { aiAgentPageInfo: { session: { SessionID: 's1' } } } },
      { pageId: 'earlier', sortFieId: 2, pageParamsInfo: { aiAgentPageInfo: { session: { SessionID: 's2' } } } },
    ]
    app.mount()
    app.ai.resolve(JSON.stringify(cached))
    app.wf.resolve('[]')
    await settle()
    expect(app.bindings.setPagesData.mock.calls[0][1].pageList).toEqual([
      expect.objectContaining({ pageId: 'ai' }),
      cached[1],
      cached[0],
    ])
    expect(app.bindings.setCurrentTabKey).toHaveBeenLastCalledWith('later')
    app.dispose()
  })

  it('syncs already loaded AI state without reading project cache again', async () => {
    const app = setup()
    const page = { routeKey: 'ai', pageList: [] }
    app.bindings.aiCacheLoaded.current = true
    app.bindings.usePageInfo.getState().pages.set('ai', page)
    app.mount()
    app.wf.resolve('[]')
    await settle()
    expect(app.bindings.getRemoteProjectValue).not.toHaveBeenCalled()
    expect(app.bindings.saveAIAgentCache).toHaveBeenCalledExactlyOnceWith(page)
    expect(app.bindings.yakitNotify).not.toHaveBeenCalled()
    expect(app.locked()).toBe(false)
    app.dispose()
  })

  it.each(['success', 'failure'])('ignores late cache %s after unmount', async (result) => {
    const app = setup()
    app.mount()
    app.dispose()
    app.bindings.setInitializing.mockClear()
    if (result === 'success') app.ai.resolve('[]')
    else app.ai.reject(new Error('read failed'))
    app.wf.resolve('[]')
    await settle()
    expect(app.bindings.setPagesData).not.toHaveBeenCalled()
    expect(app.bindings.setInitializing).not.toHaveBeenCalled()
    expect(app.bindings.onInitFuzzer).not.toHaveBeenCalled()
    expect(app.bindings.yakitNotify).not.toHaveBeenCalled()
  })

  it('resets both AI and WF tabs to the mode defaults before restoring caches', () => {
    const app = setup({ mode: 'scan', memfit: false })
    app.bindings.setPageCache([
      { route: 'ai', routeKey: 'ai-extra', verbose: 'chat' },
      { route: 'wf', routeKey: 'wf', verbose: 'Web Fuzzer' },
    ])
    app.mount()
    expect(app.bindings.getPageCache()).toEqual(app.bindings.getInitPageCache())
    app.dispose()
  })

  it.each([false, true])('cleans AI and WF store data with the same edition rule (enterprise=%s)', (enterprise) => {
    const app = setup({ enterprise })
    const store = app.bindings.usePageInfo.getState()
    for (const route of ['ai', 'wf', 'other']) store.pages.set(route, {})
    app.mount()
    expect([...store.pages.keys()]).toEqual(enterprise ? [] : ['ai', 'wf'])
    expect(app.bindings.clearFuzzerSequence).toHaveBeenCalledTimes(enterprise ? 1 : 0)
    app.dispose()
  })

  it('reloads previously loaded AI cache after enterprise cleanup without saving the empty state', async () => {
    const app = setup({ enterprise: true, memfit: false })
    const cached = { pageId: 'restored-ai', sortFieId: 0, pageParamsInfo: {} }
    app.bindings.aiCacheLoaded.current = true
    app.bindings.usePageInfo.getState().pages.set('ai', { pageList: [cached] })
    app.mount()
    expect(app.bindings.getRemoteProjectValue).toHaveBeenCalledExactlyOnceWith('ai-tabs')
    expect(app.bindings.saveAIAgentCache).not.toHaveBeenCalled()
    app.ai.resolve(JSON.stringify([cached]))
    app.wf.resolve('[]')
    await settle()
    expect(app.bindings.setPagesData).toHaveBeenCalledWith('ai', expect.objectContaining({ pageList: [cached] }))
    expect(app.bindings.yakitNotify).not.toHaveBeenCalled()
    expect(app.locked()).toBe(false)
    app.dispose()
  })

  it.each(['classic', 'scan'])('selects the %s default and skips WF for another saved route', async (mode) => {
    const app = setup({ mode, savedKey: 'other-route', memfit: false })
    app.mount()
    expect(app.bindings.setCurrentTabKey).toHaveBeenCalledWith('default-page')
    app.ai.resolve('[]')
    await settle()
    expect(app.bindings.getRemoteValue).toHaveBeenCalledWith('selected')
    expect(app.bindings.onInitFuzzer).not.toHaveBeenCalled()
    expect(app.locked()).toBe(false)
    app.dispose()
  })

  it.each(['', 'wf'])('delays WF restore for an empty or WF selection (%s)', async (savedKey) => {
    const app = setup({ savedKey, memfit: false })
    app.mount()
    await vi.advanceTimersByTimeAsync(499)
    expect(app.bindings.onInitFuzzer).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(app.bindings.onInitFuzzer).toHaveBeenCalledExactlyOnceWith(false)
    app.dispose()
  })

  it('forces WF restoration after 500ms in security expert mode', async () => {
    const app = setup({ mode: 'expert', savedKey: 'other-route', memfit: false })
    app.mount()
    await vi.advanceTimersByTimeAsync(499)
    expect(app.bindings.onInitFuzzer).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(app.bindings.onInitFuzzer).toHaveBeenCalledExactlyOnceWith(true)
    expect(app.bindings.getRemoteValue).not.toHaveBeenCalled()
    app.dispose()
  })

  it('does not cancel pending WF cache writes during effect cleanup', () => {
    const app = setup()
    app.mount()
    app.dispose()
    expect(app.bindings.saveFuzzerCache.cancel).not.toHaveBeenCalled()
  })

  it('skips unchanged empty WF routes and saves populated WF updates', () => {
    const app = setup()
    app.mount()
    const [select, listener] = app.bindings.usePageInfo.subscribe.mock.calls[1] as [
      (state: { pages: Map<string, unknown> }) => unknown,
      (next: unknown, previous: unknown) => void,
    ]
    expect(select({ pages: new Map() })).toEqual([])
    listener([], [])
    expect(app.bindings.saveFuzzerCache).not.toHaveBeenCalled()
    const page = { routeKey: 'wf', pageList: [{ pageId: 'request' }] }
    listener(page, [])
    expect(app.bindings.saveFuzzerCache).toHaveBeenCalledExactlyOnceWith(page)
    app.dispose()
  })

  it('restores WF with the default page selection behavior', async () => {
    const fetchFuzzerList = vi.fn(async () => {})
    const code = `return (${declaration('onInitFuzzer')!.initializer!.getText(source)})(false)`
    const cache = [{ pageId: 'wf-cached' }]
    await execute(code, {
      useMemoizedFn: (fn: unknown) => fn,
      isWFCacheEdition: () => true,
      pageCache: [],
      YakitRoute: { HTTPFuzzer: 'wf' },
      FuzzerRemoteGV: { FuzzerCache: 'wf-cache' },
      setLoading: vi.fn(),
      getRemoteProjectValue: async () => JSON.stringify(cache),
      safeParseFuzzerCache: JSON.parse,
      fetchFuzzerList,
      getFuzzerSequenceCache: vi.fn(async () => {}),
      getPageCache: () => [],
      yakitNotify: vi.fn(),
      onRestoreHistory: vi.fn(),
    })
    expect(fetchFuzzerList).toHaveBeenCalledExactlyOnceWith(cache, false)
    await vi.advanceTimersByTimeAsync(300)
  })
})
