import { readFileSync } from 'node:fs'
import classNames from 'classnames'
import ts from 'typescript'
import debounce from 'lodash/debounce'
import isEqual from 'lodash/isEqual'
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
  const js = ts.transpileModule(code, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText
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

const setupTabActions = () => {
  const fixed = { route: 'ai', routeKey: 'ai' }
  const knowledge = { route: 'knowledge', routeKey: 'knowledge' }
  const first = { route: 'ai', routeKey: 'ai-first' }
  const second = { route: 'ai', routeKey: 'ai-second' }
  const fuzzer = { route: 'wf', routeKey: 'wf' }
  const settings = { route: 'settings', routeKey: 'settings' }
  const tabs = [fixed, knowledge, first, fuzzer, second, settings]
  const aiPage = {
    routeKey: 'ai',
    singleNode: true,
    currentSelectPageId: first.routeKey,
    pageList: [fixed, first, second].map((tab, index) => ({
      pageId: tab.routeKey,
      pageName: tab.routeKey,
      pageParamsInfo: {},
      sortFieId: index,
    })),
  }
  const store = {
    pages: new Map([['ai', aiPage]]),
    setPagesData: vi.fn(),
    removePagesDataCacheById: vi.fn(),
    clearDataByRoute: vi.fn(),
  }
  const destroy = vi.fn()
  const confirm = vi.fn((_options: { onOk: () => void; onCancel?: () => void }) => ({ destroy }))
  const bindings = {
    pageCache: tabs,
    useMemoizedFn: (fn: unknown) => fn,
    usePageInfo: { getState: () => store },
    YakitRoute: { AI_Agent: 'ai', HTTPFuzzer: 'wf' },
    getDefaultFixedTabs: () => ['ai', 'knowledge'],
    isRouteKeyScopedTab: (route: string) => route === 'ai',
    softMode: 'classic',
    setPageCache: vi.fn(),
    setCurrentTabKey: vi.fn(),
    clearFuzzerSequence: vi.fn(),
    YakitModalConfirm: confirm,
    React: { createElement: vi.fn() },
    ExclamationCircleOutlined: () => null,
    reorder: execute(`return ${declaration('reorder')!.initializer!.getText(source)}`, {}),
  }
  const callback = (name: 'onDragEnd' | 'onRemoveAllTabs' | 'onRemoveOtherTabs') =>
    execute(`return ${declaration(name)!.initializer!.getText(source)}`, bindings)
  return {
    tabs,
    fixed,
    knowledge,
    first,
    second,
    fuzzer,
    settings,
    aiPage,
    store,
    bindings,
    confirm,
    destroy,
    callback,
  }
}

describe('MainOperatorContent first-level tab actions', () => {
  it('persists AI ordering from the actual drag result while preserving page metadata', () => {
    const app = setupTabActions()
    app.callback('onDragEnd')({
      source: { droppableId: 'droppable1', index: 4 },
      destination: { droppableId: 'droppable1', index: 2 },
    })

    expect(app.bindings.setPageCache).toHaveBeenCalledExactlyOnceWith([
      app.fixed,
      app.knowledge,
      app.second,
      app.first,
      app.fuzzer,
      app.settings,
    ])
    expect(app.store.setPagesData).toHaveBeenCalledExactlyOnceWith('ai', {
      ...app.aiPage,
      pageList: app.aiPage.pageList.map((node, index) => ({ ...node, sortFieId: [0, 3, 2][index] })),
    })
    expect(app.aiPage.pageList.map((node) => node.sortFieId)).toEqual([0, 1, 2])
  })

  it.each([undefined, { droppableId: 'droppable2', index: 0 }])(
    'does not update tabs or cache for a cancelled or unrelated drag: %s',
    (destination) => {
      const app = setupTabActions()
      app.callback('onDragEnd')({ source: { droppableId: 'droppable1', index: 2 }, destination })
      expect(app.bindings.setPageCache).not.toHaveBeenCalled()
      expect(app.store.setPagesData).not.toHaveBeenCalled()
    },
  )

  it('closes all optional tabs and retains both fixed Memfit pages', () => {
    const app = setupTabActions()
    app.callback('onRemoveAllTabs')(app.first, 2)
    app.confirm.mock.calls[0][0].onOk()

    expect(app.bindings.setPageCache).toHaveBeenCalledExactlyOnceWith([app.fixed, app.knowledge])
    expect(app.bindings.setCurrentTabKey).toHaveBeenCalledExactlyOnceWith('knowledge')
    expect(app.store.removePagesDataCacheById.mock.calls).toEqual([
      ['ai', 'ai-first'],
      ['ai', 'ai-second'],
    ])
    expect(app.store.clearDataByRoute.mock.calls).toEqual([['wf'], ['settings']])
    expect(app.bindings.clearFuzzerSequence).toHaveBeenCalledTimes(1)
    expect(app.destroy).toHaveBeenCalledTimes(1)
  })

  it.each(['first', 'fixed', 'fuzzer'] as const)(
    'closes other tabs while retaining the selected %s and fixed pages without duplicates',
    (selection) => {
      const app = setupTabActions()
      const selected = app[selection]
      app.callback('onRemoveOtherTabs')(selected)
      app.confirm.mock.calls[0][0].onOk()

      const expectedTabs = selection === 'fixed' ? [app.knowledge, app.fixed] : [app.fixed, app.knowledge, selected]
      expect(app.bindings.setPageCache).toHaveBeenCalledExactlyOnceWith(expectedTabs)
      expect(app.bindings.setCurrentTabKey).toHaveBeenCalledExactlyOnceWith(selected.routeKey)
      expect(app.store.removePagesDataCacheById.mock.calls).toEqual(
        selection === 'first'
          ? [['ai', 'ai-second']]
          : [
              ['ai', 'ai-first'],
              ['ai', 'ai-second'],
            ],
      )
      expect(app.store.clearDataByRoute.mock.calls).toEqual(
        selection === 'fuzzer' ? [['settings']] : [['wf'], ['settings']],
      )
      expect(app.bindings.clearFuzzerSequence).toHaveBeenCalledTimes(selection === 'fuzzer' ? 0 : 1)
      expect(app.destroy).toHaveBeenCalledTimes(1)
    },
  )

  it.each(['onRemoveAllTabs', 'onRemoveOtherTabs'] as const)(
    '%s leaves tabs and persisted state untouched when confirmation is cancelled',
    (name) => {
      const app = setupTabActions()
      app.callback(name)(app.first, 2)
      expect(app.confirm).toHaveBeenCalledTimes(1)
      app.confirm.mock.calls[0][0].onCancel?.()

      expect(app.bindings.setPageCache).not.toHaveBeenCalled()
      expect(app.bindings.setCurrentTabKey).not.toHaveBeenCalled()
      expect(app.store.removePagesDataCacheById).not.toHaveBeenCalled()
      expect(app.store.clearDataByRoute).not.toHaveBeenCalled()
      expect(app.bindings.clearFuzzerSequence).not.toHaveBeenCalled()
    },
  )
})

// 拖拽克隆预览是渲染函数，无法像回调那样直接执行：按组件源码原位转译，替换 React.createElement 后收集 JSX 结构。
const setupDragClone = (subPage: any, draggableId: string, selectSubMenu?: { id: string }) => {
  const nodes: any[] = []
  const createElement = (type: unknown, props: Record<string, any> | null, ...children: unknown[]) => {
    const node = {
      type,
      props: props || {},
      children: children.filter((child) => typeof child !== 'boolean'),
    }
    nodes.push(node)
    return node
  }
  // CSS Modules key 经 Proxy 原样返回为类名字符串，可直接断言
  const styles = new Proxy({}, { get: (_target, key: string) => key }) as Record<string, string>
  const bindings = {
    classNames,
    getPageItemById: execute(`return ${declaration('getPageItemById')!.initializer!.getText(source)}`, {}),
    useWebFuzzerGroupColorStyle: (color?: string) => (color ? { 'group-color': color } : {}),
    React: { createElement, memo: (fn: unknown) => fn },
    XSolid: 'XSolid',
    styles,
  }
  const DroppableClone = execute(`return (${declaration('DroppableClone')!.initializer!.getText(source)})`, bindings)
  DroppableClone({ subPage, selectSubMenu, draggableId })
  const classesOf = (node: any) => `${node.props.className || ''}`.split(' ').filter(Boolean)
  const container = () => nodes.find((node) => classesOf(node).includes('tab-menu-sub-item'))
  const line = () => nodes.find((node) => classesOf(node).includes('tab-menu-sub-item-line'))
  const verbose = () => nodes.find((node) => node.props.className === 'content-ellipsis')
  return { nodes, classesOf, container, line, verbose }
}

describe('MainOperatorContent drag clone preview', () => {
  const subPage = [
    {
      id: 'wf-group',
      verbose: '分组',
      groupId: 'wf-group',
      color: '#F49E4C',
      groupChildren: [
        { id: 'wf-1', verbose: '请求一', groupId: 'wf-group', sortFieId: 1 },
        { id: 'wf-2', verbose: '请求二', groupId: 'wf-group', sortFieId: 2 },
      ],
    },
  ]

  it('renders the dragged tab label with active styling while the tab is selected', () => {
    const { classesOf, container, line, verbose } = setupDragClone(subPage, 'wf-2', { id: 'wf-2' })

    expect(classesOf(container())).toEqual(
      expect.arrayContaining([
        'tab-menu-sub-item',
        'tab-menu-sub-item-active',
        'tab-menu-sub-item-dragging',
        'tab-menu-sub-item-combine-custom-color',
      ]),
    )
    expect(container().props.style).toEqual({ 'group-color': '#F49E4C' })
    expect(classesOf(line())).toContain('tab-menu-sub-item-line')
    expect(verbose().children).toEqual(['请求二'])
    // 预览内容只含标签名文本，回归引入文档图标时此断言与源断言同时失败
    expect(source.text).not.toContain('SolidDocumentTextIcon')
  })

  it('renders the dragged tab label without active styling while another tab is selected', () => {
    const { classesOf, container, line, verbose } = setupDragClone(subPage, 'wf-2', { id: 'wf-1' })

    expect(classesOf(container())).not.toContain('tab-menu-sub-item-active')
    expect(classesOf(container())).toContain('tab-menu-sub-item-combine-custom-color')
    expect(line()).toBeUndefined()
    expect(verbose().children).toEqual(['请求二'])
  })

  it('falls back to the empty placeholder when the dragged id is missing', () => {
    const empty = [{ id: 'wf-group', verbose: '分组', groupId: 'wf-group', groupChildren: [] }]
    const { classesOf, container, verbose } = setupDragClone(empty, 'missing')

    expect(classesOf(container())).not.toContain('tab-menu-sub-item-active')
    expect(classesOf(container())).not.toContain('tab-menu-sub-item-combine-custom-color')
    expect(container().props.style).toEqual({})
    expect(verbose().children).toEqual([''])
  })
})

describe('MainOperatorContent within-group tab reorder', () => {
  it.each([
    { from: 1, to: 0, order: ['wf-2', 'wf-1', 'wf-3'] },
    { from: 0, to: 2, order: ['wf-2', 'wf-3', 'wf-1'] },
  ])('applies the new order and refreshes tab state with store sorting ($from->$to)', ({ from, to, order }) => {
    const subPage = [
      {
        id: 'wf-group',
        verbose: '分组',
        groupId: 'wf-group',
        groupChildren: [
          { id: 'wf-1', verbose: '请求一', groupId: 'wf-group', sortFieId: 1 },
          { id: 'wf-2', verbose: '请求二', groupId: 'wf-group', sortFieId: 2 },
          { id: 'wf-3', verbose: '请求三', groupId: 'wf-group', sortFieId: 3 },
        ],
      },
    ]
    const setSubPage = vi.fn()
    const onUpdatePageCache = vi.fn()
    const onUpdateSorting = vi.fn()
    const emiter = { emit: vi.fn() }
    const movingWithinSameGroup = execute(
      `return (${declaration('movingWithinSameGroup')!.initializer!.getText(source)})`,
      {
        useMemoizedFn: (fn: unknown) => fn,
        reorder: execute(`return ${declaration('reorder')!.initializer!.getText(source)}`, {}),
        subPage,
        setSubPage,
        onUpdatePageCache,
        onUpdateSorting,
        emiter,
        pageRouteKey: 'wf',
      },
    )

    // 事件在 200ms 延迟后发出：先启用 fake timers 再触发拖拽，setTimeout 才会注册到 fake timer 上
    vi.useFakeTimers()
    movingWithinSameGroup({
      draggableId: 'wf-1',
      source: { droppableId: 'wf-group', index: from },
      destination: { droppableId: 'wf-group', index: to },
    })

    // 数据层：组内顺序已重排
    expect(subPage[0].groupChildren.map((item: any) => item.id)).toEqual(order)
    // 渲染层：原地赋值不改变引用，必须以新数组触发 SubTabList 重渲染，否则拖拽会被弹回原位
    expect(setSubPage).toHaveBeenCalledOnce()
    expect((setSubPage.mock.calls[0][0] as any[])[0].groupChildren.map((item: any) => item.id)).toEqual(order)
    expect(onUpdatePageCache).toHaveBeenCalledOnce()
    // 持久化：全量重排 sortFieId，而非只交换两个端点项
    expect(onUpdateSorting).toHaveBeenCalledExactlyOnceWith(subPage, 'wf')
    // 通知订阅方（记事本/SimpleDetect 等同步 tab 名）
    vi.advanceTimersByTime(200)
    vi.useRealTimers()
    expect(emiter.emit).toHaveBeenCalledExactlyOnceWith('secondMenuTabDataChange', '')
  })
})

describe('MainOperatorContent loose-tab reorder', () => {
  it('renumbers store sorting for a cross-distance move among loose tabs', () => {
    const subPage = [
      { id: 'wf-1', verbose: '请求一', groupId: '0', sortFieId: 1 },
      { id: 'wf-2', verbose: '请求二', groupId: '0', sortFieId: 2 },
      { id: 'wf-3', verbose: '请求三', groupId: '0', sortFieId: 3 },
    ]
    const setSubPage = vi.fn()
    const onUpdatePageCache = vi.fn()
    const onUpdateSorting = vi.fn()
    const emiter = { emit: vi.fn() }
    const movingBetweenOutsideGroups = execute(
      `return (${declaration('movingBetweenOutsideGroups')!.initializer!.getText(source)})`,
      {
        useMemoizedFn: (fn: unknown) => fn,
        reorder: execute(`return ${declaration('reorder')!.initializer!.getText(source)}`, {}),
        subPage,
        setSubPage,
        onUpdatePageCache,
        onUpdateSorting,
        emiter,
        pageRouteKey: 'wf',
      },
    )

    // 事件在 200ms 延迟后发出：先启用 fake timers 再触发拖拽，setTimeout 才会注册到 fake timer 上
    vi.useFakeTimers()
    movingBetweenOutsideGroups({
      draggableId: 'wf-1',
      source: { droppableId: 'droppable2', index: 0 },
      destination: { droppableId: 'droppable2', index: 2 },
    })

    // 渲染层顺序与持久化全量重排均以重排后的列表为准
    expect(setSubPage).toHaveBeenCalledOnce()
    expect((setSubPage.mock.calls[0][0] as any[]).map((item: any) => item.id)).toEqual(['wf-2', 'wf-3', 'wf-1'])
    expect(onUpdateSorting).toHaveBeenCalledExactlyOnceWith(setSubPage.mock.calls[0][0], 'wf')
    expect(onUpdatePageCache).toHaveBeenCalledOnce()
    // 通知订阅方（记事本/SimpleDetect 等同步 tab 名）
    vi.advanceTimersByTime(200)
    vi.useRealTimers()
    expect(emiter.emit).toHaveBeenCalledExactlyOnceWith('secondMenuTabDataChange', '')
  })
})

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
    _: { isEqual },
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
    saveAIAgentCache: Object.assign(vi.fn(), { cancel: vi.fn(), flush: vi.fn() }),
    saveFuzzerCache: Object.assign(vi.fn(), { cancel: vi.fn() }),
    getRemoteProjectValue: vi.fn(() => ai.promise),
    mergeAIAgentPageTabs: vi.fn((current) => current),
    RemoteAIAgentGV: { AIAgentTabs: 'ai-tabs' },
    RemoteGV: { SelectFirstMenuTabKey: 'selected' },
    JSONParseLog: JSON.parse,
    setPagesData: vi.fn(),
    setCurrentTabKey: vi.fn(),
    yakitNotify: vi.fn(),
    showYakitModal: vi.fn((_props: Record<string, any>) => ({ destroy: vi.fn() })),
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

  it.each(['unmount', 'switch-project'] as const)('preserves final AI caches on %s', async (action) => {
    // 执行生产保存函数，保留真实的 500ms 防抖，仅替换项目缓存的读写边界。
    const cacheSource = ts.createSourceFile(
      'pageInfo.ts',
      readFileSync('app/renderer/src/main/src/store/pageInfo.ts', 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    )
    const saver = cacheSource.statements
      .filter(ts.isVariableStatement)
      .flatMap((statement) => [...statement.declarationList.declarations])
      .find((node) => node.name.getText(cacheSource) === 'saveAIAgentCache')!
    const targetCache = JSON.stringify([
      { pageId: 'target-ai', pageName: 'Target conversation', pageParamsInfo: {}, sortFieId: 1 },
    ])
    const projectCaches = new Map([
      ['original', '[]'],
      ['target', targetCache],
    ])
    let activeProject = 'original'
    let cacheAtSwitch: string | undefined
    const write = vi.fn(async (_key: string, value: string) => {
      const project = activeProject
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
      projectCaches.set(project, value)
    })
    const app = setup({ memfit: false })
    Object.assign(app.bindings, {
      saveAIAgentCache: execute(`return ${saver.initializer!.getText(cacheSource)}`, {
        debounce,
        setRemoteProjectValue: write,
        RemoteAIAgentGV: app.bindings.RemoteAIAgentGV,
        yakitNotify: app.bindings.yakitNotify,
        tOriginal: app.bindings.t,
      }),
    })
    app.bindings.getRemoteProjectValue.mockImplementation(async () => projectCaches.get(activeProject)!)
    app.mount()
    app.wf.resolve('[]')
    await settle()

    const sync = app.bindings.usePageInfo.subscribe.mock.calls[0][1] as (page: unknown) => void
    const removed = { pageId: 'removed-ai', pageName: 'Old conversation', pageParamsInfo: {}, sortFieId: 1 }
    const added = {
      pageId: 'new-ai',
      pageName: 'New conversation',
      pageParamsInfo: { aiAgentPageInfo: { session: { SessionID: 'new-session', Title: 'New conversation' } } },
      sortFieId: 2,
    }
    const updated = {
      ...added,
      pageName: 'Final title',
      pageParamsInfo: { aiAgentPageInfo: { session: { SessionID: 'new-session', Title: 'Final title' } } },
    }
    sync({ pageList: [removed] })
    sync({ pageList: [removed, added] })
    sync({ pageList: [added] })
    sync({ pageList: [updated] })
    expect(projectCaches.get('original')).toBe('[]')
    await vi.advanceTimersByTimeAsync(100)
    expect(write).toHaveBeenCalledOnce()
    expect(JSON.parse(projectCaches.get('original')!)).toEqual([removed])

    let switching: Promise<void> | undefined
    if (action === 'switch-project') {
      const layoutSource = ts.createSourceFile(
        'UILayout.tsx',
        readFileSync('app/renderer/src/main/src/components/layout/UILayout.tsx', 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      )
      let switchProjectDeclaration: ts.VariableDeclaration | undefined
      const visit = (node: ts.Node) => {
        if (ts.isVariableDeclaration(node) && node.name.getText(layoutSource) === 'onOkEnterProjectMag') {
          switchProjectDeclaration = node
        }
        ts.forEachChild(node, visit)
      }
      visit(layoutSource)
      // 执行真实切库入口；模拟切库请求先完成，随后页面提交触发卸载的合法顺序。
      const switchProject = execute(`return ${switchProjectDeclaration!.initializer!.getText(layoutSource)}`, {
        useMemoizedFn: (fn: unknown) => fn,
        saveAIAgentCache: app.bindings.saveAIAgentCache,
        yakitProject: {
          setCurrentProject: vi.fn(async () => {
            cacheAtSwitch = projectCaches.get('original')
            activeProject = 'target'
          }),
        },
        getEnvTypeByProjects: () => 'project',
        setYakitMode: vi.fn(),
        showProjectManage: false,
        emiter: { emit: vi.fn() },
        setShowProjectManage: (visible: boolean) => {
          if (visible) app.dispose()
        },
        setCurrentProject: vi.fn(),
        setNowProjectDescription: vi.fn(),
      })
      switching = switchProject()
    } else {
      app.dispose()
    }
    await vi.advanceTimersByTimeAsync(100)
    await switching
    if (action === 'switch-project') expect.soft(JSON.parse(cacheAtSwitch!)).toEqual([updated])
    expect(write).toHaveBeenCalledTimes(2)
    expect.soft(JSON.parse(projectCaches.get('original')!)).toEqual([updated])
    expect.soft(projectCaches.get('target')).toBe(targetCache)

    const restored = setup({ memfit: false })
    restored.bindings.getRemoteProjectValue.mockImplementation(async () => projectCaches.get('original')!)
    restored.mount()
    restored.wf.resolve('[]')
    await settle()
    expect
      .soft(restored.bindings.setPagesData)
      .toHaveBeenCalledExactlyOnceWith('ai', expect.objectContaining({ pageList: [updated] }))
    expect(write).toHaveBeenCalledTimes(2)
    restored.dispose()
  })

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
      expect(app.bindings.setPagesData).not.toHaveBeenCalled()
      expect(app.bindings.aiCacheLoaded.current).toBe(false)
      expect(app.bindings.showYakitModal).toHaveBeenCalledOnce()
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
    'preserves the saved cache after read failure while allowing local title sync (Memfit=%s)',
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
      expect(app.bindings.setPagesData).not.toHaveBeenCalled()
      expect(app.bindings.saveAIAgentCache).not.toHaveBeenCalled()
      expect(app.bindings.showYakitModal).toHaveBeenCalledOnce()
      expect(app.locked()).toBe(false)

      const sync = app.bindings.usePageInfo.subscribe.mock.calls[0][1] as (page: unknown) => void
      const local = { pageId: 'local', pageName: 'New title', sortFieId: 1, pageParamsInfo: {} }
      sync({ pageList: [local] })
      expect(app.bindings.mergeAIAgentPageTabs).toHaveBeenLastCalledWith(expect.any(Array), { pageList: [local] })
      expect(app.bindings.saveAIAgentCache).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(6000)
      expect(app.bindings.getRemoteProjectValue).toHaveBeenCalledOnce()
      app.dispose()
    },
  )

  it.each(['{', '{}'])('aborts restoration and opens recovery for invalid cache data: %s', async (raw) => {
    const app = setup({ memfit: false })
    app.mount()
    app.ai.resolve(raw)
    app.wf.resolve('[]')
    await settle()
    expect(app.bindings.setPagesData).not.toHaveBeenCalled()
    expect(app.bindings.aiCacheLoaded.current).toBe(false)
    expect(app.bindings.saveAIAgentCache).not.toHaveBeenCalled()
    expect(app.bindings.showYakitModal).toHaveBeenCalledOnce()
    expect(app.locked()).toBe(false)
    expect(app.bindings.yakitNotify).toHaveBeenCalledOnce()
    app.dispose()
  })

  it('retries AI recovery without losing local tabs or unlocking while WF is pending', async () => {
    const app = setup({ memfit: false })
    app.bindings.setPagesData.mockImplementation((route, page) => {
      app.bindings.usePageInfo.getState().pages.set(route, page)
      const sync = app.bindings.usePageInfo.subscribe.mock.calls[0][1] as (page: unknown) => void
      sync(page)
    })
    app.mount()
    app.ai.reject(new Error('read failed'))
    await settle()
    const local = { pageId: 'local', pageName: 'Local title', sortFieId: 2, pageParamsInfo: {} }
    app.bindings.usePageInfo.getState().pages.set('ai', { pageList: [local] })
    const cached = { pageId: 'cached', sortFieId: 1, pageParamsInfo: {} }
    app.bindings.getRemoteProjectValue.mockResolvedValue(JSON.stringify([cached]))
    const modal = app.bindings.showYakitModal.mock.calls[0][0]
    expect(modal.title((key: string) => key)).toBe('MainOperatorContent.restoreTab')
    const retry = modal.onOk()
    await settle()
    expect(app.locked()).toBe(true)
    expect(app.bindings.saveAIAgentCache).toHaveBeenCalledWith(expect.objectContaining({ pageList: [cached, local] }))
    app.wf.resolve('[]')
    await retry
    expect(app.locked()).toBe(false)
    expect(app.bindings.aiCacheLoaded.current).toBe(true)
    app.dispose()
  })

  it('keeps interaction locked if WF finishes before the AI retry', async () => {
    const app = setup()
    const pending = deferred()
    app.mount()
    app.ai.reject(new Error('read failed'))
    await settle()
    app.bindings.getRemoteProjectValue.mockReturnValue(pending.promise)
    const retry = app.bindings.showYakitModal.mock.calls[0][0].onOk()
    app.wf.resolve('[]')
    await settle()
    expect(app.locked()).toBe(true)
    pending.resolve('[]')
    await retry
    expect(app.locked()).toBe(false)
    app.dispose()
  })

  it('preserves live title updates received while an AI retry is pending', async () => {
    const app = setup({ memfit: false })
    const pending = deferred()
    app.mount()
    app.ai.reject(new Error('read failed'))
    app.wf.resolve('[]')
    await settle()
    const local = { pageId: 'local', pageName: 'Initial title', sortFieId: 1, pageParamsInfo: {} }
    app.bindings.usePageInfo.getState().pages.set('ai', { pageList: [local] })
    app.bindings.getRemoteProjectValue.mockReturnValue(pending.promise)
    const retry = app.bindings.showYakitModal.mock.calls[0][0].onOk()
    const updated = { ...local, pageName: 'Live title' }
    app.bindings.usePageInfo.getState().pages.set('ai', { pageList: [updated] })
    pending.resolve('[]')
    await retry
    expect(app.bindings.setPagesData).toHaveBeenCalledWith('ai', expect.objectContaining({ pageList: [updated] }))
    app.dispose()
  })

  it('ignores an AI retry response after unmount', async () => {
    const app = setup()
    const pending = deferred()
    app.mount()
    app.ai.reject(new Error('read failed'))
    app.wf.resolve('[]')
    await settle()
    app.bindings.getRemoteProjectValue.mockReturnValue(pending.promise)
    const retry = app.bindings.showYakitModal.mock.calls[0][0].onOk()
    app.dispose()
    app.bindings.setInitializing.mockClear()
    pending.resolve('[]')
    await retry
    expect(app.bindings.setInitializing).not.toHaveBeenCalled()
    expect(app.bindings.setPagesData).not.toHaveBeenCalled()
    expect(app.bindings.saveAIAgentCache).not.toHaveBeenCalled()
  })

  it('keeps cache writes disabled when a retry also fails and closes recovery on unmount', async () => {
    const app = setup()
    app.mount()
    app.ai.reject(new Error('read failed'))
    app.wf.resolve('[]')
    await settle()
    await app.bindings.showYakitModal.mock.calls[0][0].onOk()
    expect(app.bindings.showYakitModal).toHaveBeenCalledTimes(2)
    expect(app.bindings.saveAIAgentCache).not.toHaveBeenCalled()
    expect(app.bindings.aiCacheLoaded.current).toBe(false)
    const modal = app.bindings.showYakitModal.mock.results[1].value
    app.dispose()
    expect(modal.destroy).toHaveBeenCalled()
    await app.bindings.showYakitModal.mock.calls[1][0].onOk()
    expect(app.bindings.getRemoteProjectValue).toHaveBeenCalledTimes(2)
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

  it.each([false, true])(
    'migrates the fixed session without restoring the stale store copy (retry=%s)',
    async (retry) => {
      const app = setup()
      const old = {
        id: 'ai',
        pageId: 'ai',
        pageName: 'Old chat',
        sortFieId: 0,
        pageParamsInfo: { aiAgentPageInfo: { session: { SessionID: 'old-session' } } },
      }
      app.bindings.usePageInfo.getState().pages.set('ai', { pageList: [old] })
      app.mount()
      app.wf.resolve('[]')
      if (retry) {
        app.ai.reject(new Error('read failed'))
        await settle()
        app.bindings.getRemoteProjectValue.mockResolvedValue(JSON.stringify([old]))
        await app.bindings.showYakitModal.mock.calls[0][0].onOk()
      } else {
        app.ai.resolve(JSON.stringify([old]))
        await settle()
      }
      const restored = app.bindings.setPagesData.mock.calls[0][1].pageList
      expect(restored).toHaveLength(2)
      expect(restored.find((node: any) => node.pageId === 'ai').pageParamsInfo).toEqual({})
      expect(restored.filter((node: any) => node.pageParamsInfo.aiAgentPageInfo?.session)).toHaveLength(1)
      app.dispose()
    },
  )

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
    for (const route of ['ai', 'wf', 'other']) store.pages.set(route, { pageList: [] })
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

  it.each([false, true])(
    'preserves AI tabs restored while WF config is pending (existing WF=%s)',
    async (existingWF) => {
      let resolveConfig!: (value: object) => void
      const config = new Promise<object>((resolve) => {
        resolveConfig = resolve
      })
      const initial = existingWF ? [{ routeKey: 'wf', menuName: 'Web Fuzzer' }] : []
      let currentTabs: any[] = initial
      const updates: any[] = []
      const cached = [{ id: 'wf-1', groupId: '0', verbose: 'WF', sortFieId: 1, pageParams: {} }]
      const notify = vi.fn()
      const restore = execute(
        `return (${declaration('fetchFuzzerList')!.initializer!.getText(source)})(cached, false)`,
        {
          cached,
          useMemoizedFn: (fn: unknown) => fn,
          getFuzzerCacheData: () => config,
          clearDataByRoute: vi.fn(),
          clearFuzzerSequence: vi.fn(),
          YakitRoute: { HTTPFuzzer: 'wf' },
          YakitRouteToPageInfo: { wf: { label: 'Web Fuzzer' } },
          routeConvertKey: () => 'wf',
          routeKeyToLabel: new Map(),
          cloneDeep: structuredClone,
          defPage: { pageList: [] },
          getCurrentSelectPageId: () => '',
          adoptOrphanCacheTabs: (value: unknown) => value,
          randomString: () => 'random',
          defaultAdvancedConfigValue: {},
          sanitizeFuzzerCachePageParams: (value: unknown) => value,
          defaultPostTemplate: 'request',
          HotPatchDefaultContent: '',
          compareAsc: (a: any, b: any, key: string) => a[key] - b[key],
          pageCache: initial,
          getPageCache: () => currentTabs,
          setPagesData: vi.fn(),
          setPageCache: (value: any) => updates.push(value),
          isSecurityExpert: true,
          yakitNotify: notify,
          t: (key: string) => key,
        },
      )
      const ai = { routeKey: 'restored-ai', verbose: 'Saved AI conversation' }
      // 模拟 React 同批次排队：AI 已提交更新，但 getter 在渲染前仍返回旧值。
      updates.push((current: any[]) => [...current, ai])
      resolveConfig({})
      await restore
      for (const update of updates) currentTabs = typeof update === 'function' ? update(currentTabs) : update
      expect(notify).not.toHaveBeenCalled()
      expect(currentTabs.find((page) => page.routeKey === 'restored-ai')).toEqual(ai)
      expect(currentTabs.filter((page) => page.routeKey === 'wf')).toHaveLength(1)
      expect(currentTabs.find((page) => page.routeKey === 'wf').multipleNode[0].id).toBe('wf-1')
    },
  )

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
