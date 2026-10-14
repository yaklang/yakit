import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { EditerMenuFunParams } from '../fizzMenu/editerMenuFun'
import type { YakitIMonacoEditor } from '../YakitEditorType'

vi.mock('@/theme/antdTheme', () => ({
  YakitAntdProvider: ({ children }: { children?: ReactNode }) => (
    <div data-testid="yakit-antd-provider">{children}</div>
  ),
}))

vi.mock('react-monaco-editor', () => ({
  monaco: { editor: { EditorOption: { lineHeight: 19 } } },
}))

vi.mock('@/pages/fuzzer/HTTPFuzzerEditorMenu', () => ({
  HTTPFuzzerClickEditorMenu: () => <div data-testid="default-click-menu" />,
  HTTPFuzzerRangeEditorMenu: () => <div data-testid="default-range-menu" />,
  HTTPFuzzerRangeReadOnlyEditorMenu: () => <div data-testid="default-range-readonly-menu" />,
}))

vi.mock('@/pages/fuzzer/InsertFileFuzzTag', () => ({
  insertFileFuzzTag: vi.fn(),
  insertTemporaryFileFuzzTag: vi.fn(),
}))

vi.mock('@/pages/fuzzer/fuzzerTemplates', () => ({ monacoEditorWrite: vi.fn() }))

vi.mock('@/pages/fuzzer/HTTPFuzzerPage', () => ({
  onInsertYakFuzzer: vi.fn(),
  showDictsAndSelect: vi.fn(),
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

// editerMenuFun 模块顶层会 window.require('electron')，先备好桩再动态引入被测模块
window.require = (() => ({ ipcRenderer: { invoke: vi.fn() } })) as unknown as typeof window.require
const { editerMenuFun } = await import('../fizzMenu/editerMenuFun')

type FizzWidget = { getId: () => string; getDomNode: () => HTMLElement }
type ListenerDisposable = { dispose: ReturnType<typeof vi.fn> }

const SELECT_ID_PREFIX = 'monaco.fizz.select.widget-'
const RANGE_ID_PREFIX = 'monaco.fizz.range.widget-'

/** root.unmount 走 queueMicrotask 延迟执行，等一个宏任务再断言 */
const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

const createMockEditor = () => {
  // editerMenuFun 初始化时会先 close 一轮，两个小部件对象可从 removeContentWidget 捕获
  const removedWidgets: FizzWidget[] = []
  const listeners: ListenerDisposable[] = []
  const trackListener = () => {
    const listener = { dispose: vi.fn() }
    listeners.push(listener)
    return listener
  }
  const editor = {
    addContentWidget: vi.fn(),
    removeContentWidget: vi.fn((widget: FizzWidget) => {
      removedWidgets.push(widget)
    }),
    layoutContentWidget: vi.fn(),
    getPosition: vi.fn(() => ({ lineNumber: 3, column: 7 })),
    getModel: vi.fn(() => undefined),
    getSelection: vi.fn(),
    getOption: vi.fn(() => 19),
    getDomNode: vi.fn(() => document.createElement('div')),
    getScrolledVisiblePosition: vi.fn(() => ({ top: 0, left: 0, height: 19 })),
    onMouseMove: vi.fn(trackListener),
    onMouseDown: vi.fn(trackListener),
    onMouseUp: vi.fn(trackListener),
    onDidScrollChange: vi.fn(trackListener),
    onDidChangeCursorPosition: vi.fn(trackListener),
  }
  return { editor, removedWidgets, listeners }
}

let menuSeq = 0
let capturedClose: (() => void) | undefined

const createParams = (
  editor: ReturnType<typeof createMockEditor>['editor'],
  overrides: Partial<EditerMenuFunParams> = {},
) => {
  const params: EditerMenuFunParams = {
    editor: editor as unknown as YakitIMonacoEditor,
    selectNode: (close: () => void) => {
      capturedClose = close
      return <div data-testid={`fizz-menu-${++menuSeq}`}>menu</div>
    },
    readOnly: false,
    overLine: 2,
    getShowActionBar: () => true,
    editorInfoRef: { current: undefined },
    fizzSelectTimeoutIdRef: { current: undefined },
    fizzRangeTimeoutIdRef: { current: undefined },
    downPosYRef: { current: undefined },
    upPosYRef: { current: undefined },
    onScrollTopRef: { current: undefined },
    onOpenSmartDecode: vi.fn(),
    ...overrides,
  }
  return params
}

const findWidget = (widgets: FizzWidget[], idPrefix: string) => {
  const widget = widgets.find((w) => w.getId().startsWith(idPrefix))
  expect(widget, `未从 removeContentWidget 捕获到 ${idPrefix} 小部件`).toBeDefined()
  return widget as FizzWidget
}

const mountWidget = (widget: FizzWidget) => {
  let domNode!: HTMLElement
  act(() => {
    domNode = widget.getDomNode()
  })
  document.body.appendChild(domNode)
  return domNode
}

describe('editerMenuFun 浮层生命周期', () => {
  const disposers: (() => void)[] = []

  beforeEach(() => {
    menuSeq = 0
    capturedClose = undefined
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    disposers.splice(0).forEach((dispose) => {
      try {
        dispose()
      } catch {
        // 收尾清理不阻塞用例
      }
    })
    await flush()
    document.body.innerHTML = ''
  })

  it('浮层内容渲染在 YakitAntdProvider 内（自定义 selectNode 与默认 range 菜单两分支）', () => {
    const { editor, removedWidgets } = createMockEditor()
    disposers.push(editerMenuFun(createParams(editor)))
    const selectWidget = findWidget(removedWidgets, SELECT_ID_PREFIX)
    const rangeWidget = findWidget(removedWidgets, RANGE_ID_PREFIX)

    mountWidget(selectWidget)
    mountWidget(rangeWidget)

    // selectNode 自定义分支：内容必须包在 Provider 里，独立 createRoot 才有主题
    const providers = screen.getAllByTestId('yakit-antd-provider')
    expect(providers.length).toBe(2)
    expect(providers[0]).toContainElement(screen.getByTestId('fizz-menu-1'))
    // 默认 range 菜单分支同样被 Provider 包裹
    expect(providers[1]).toContainElement(screen.getByTestId('default-range-menu'))
  })

  it('close 幂等：连续两次关闭与卸载后再关闭均不抛错、不重复卸载', async () => {
    const { editor, removedWidgets } = createMockEditor()
    const dispose = editerMenuFun(createParams(editor))
    disposers.push(dispose)
    const selectWidget = findWidget(removedWidgets, SELECT_ID_PREFIX)
    const domNode = mountWidget(selectWidget)
    expect(screen.getByTestId('fizz-menu-1')).toBeInTheDocument()

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // 双击式连关两次
    act(() => {
      capturedClose?.()
      capturedClose?.()
    })
    await flush()
    // 卸载完成后再关一次（root 已置空，不应再触发 unmount）
    expect(() => capturedClose?.()).not.toThrow()
    await flush()

    expect(domNode.innerHTML).toBe('')
    expect(screen.queryByTestId('fizz-menu-1')).not.toBeInTheDocument()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('关闭后立即重开：延迟卸载只清旧 root，新浮层不受影响', async () => {
    const { editor, removedWidgets } = createMockEditor()
    disposers.push(editerMenuFun(createParams(editor)))
    const selectWidget = findWidget(removedWidgets, SELECT_ID_PREFIX)
    const domA = mountWidget(selectWidget)
    expect(screen.getByTestId('fizz-menu-1')).toBeInTheDocument()

    // 关闭来自浮层内点击，unmount 延迟到微任务：同步时刻旧内容必须还在
    act(() => {
      capturedClose?.()
    })
    expect(screen.getByTestId('fizz-menu-1')).toBeInTheDocument()

    // 未等微任务就重开：新 root 挂到新 domNode
    const domB = mountWidget(selectWidget)
    expect(screen.getByTestId('fizz-menu-2')).toBeInTheDocument()

    await flush()
    expect(domA.innerHTML).toBe('')
    expect(screen.queryByTestId('fizz-menu-1')).not.toBeInTheDocument()
    expect(screen.getByTestId('fizz-menu-2')).toBeInTheDocument()
  })

  it('未关闭连续重开：旧 root 被延迟卸载，不留残留', async () => {
    const { editor, removedWidgets } = createMockEditor()
    disposers.push(editerMenuFun(createParams(editor)))
    const selectWidget = findWidget(removedWidgets, SELECT_ID_PREFIX)
    const domA = mountWidget(selectWidget)
    const domB = mountWidget(selectWidget)

    await flush()
    expect(domA.innerHTML).toBe('')
    expect(screen.queryByTestId('fizz-menu-1')).not.toBeInTheDocument()
    expect(screen.getByTestId('fizz-menu-2')).toBeInTheDocument()
  })

  it('编辑器卸载清理：卸载两个浮层、移除小部件并释放全部 Monaco 监听器', async () => {
    const { editor, removedWidgets, listeners } = createMockEditor()
    const dispose = editerMenuFun(createParams(editor, { selectNode: undefined }))
    disposers.push(dispose)
    const selectWidget = findWidget(removedWidgets, SELECT_ID_PREFIX)
    const rangeWidget = findWidget(removedWidgets, RANGE_ID_PREFIX)
    const selectDom = mountWidget(selectWidget)
    const rangeDom = mountWidget(rangeWidget)
    expect(screen.getByTestId('default-click-menu')).toBeInTheDocument()
    expect(screen.getByTestId('default-range-menu')).toBeInTheDocument()

    dispose()
    await flush()

    expect(selectDom.innerHTML).toBe('')
    expect(rangeDom.innerHTML).toBe('')
    expect(screen.queryByTestId('default-click-menu')).not.toBeInTheDocument()
    expect(screen.queryByTestId('default-range-menu')).not.toBeInTheDocument()
    const removedIds = editor.removeContentWidget.mock.calls.map(([widget]) => widget.getId())
    expect(removedIds).toEqual(expect.arrayContaining([selectWidget.getId(), rangeWidget.getId()]))
    // 5 个监听器全部 dispose：编辑器实例仍存活时（如关闭浮层菜单功能），旧回调不能再开浮层
    expect(listeners).toHaveLength(5)
    listeners.forEach((listener) => expect(listener.dispose).toHaveBeenCalledTimes(1))
    // 清理函数幂等
    expect(() => dispose()).not.toThrow()
  })
})
