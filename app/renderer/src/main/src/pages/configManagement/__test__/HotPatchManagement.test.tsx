import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { YakitMenuProp } from '@/components/yakitUI/YakitMenu/YakitMenu'
import type { ExportHotPatchTemplateStreamRequest } from '../components/type'

const { ipcRendererMock, mocks } = vi.hoisted(() => {
  const ipcRendererMock = {
    invoke: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
    removeAllListeners: vi.fn(),
  }
  ;(window as unknown as { require: (id: string) => unknown }).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer: ipcRendererMock }
    throw new Error(`Unexpected require: ${id}`)
  }
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(window as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = ResizeObserverStub
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia

  return {
    ipcRendererMock,
    mocks: {
      exportOpen: vi.fn(),
      showByRightContext: vi.fn(),
      netWorkApi: vi.fn(),
      capturedMenu: { current: null as YakitMenuProp | null },
      userRole: { current: 'admin' },
    },
  }
})

vi.mock('ahooks', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useInViewport: () => [true],
  }
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
  yakitFailed: vi.fn(),
}))

vi.mock('@/utils/openWebsite', () => ({
  openConsoleNewWindow: vi.fn(),
  openABSFileLocated: vi.fn(),
}))

vi.mock('@/utils/envfile', () => ({
  isEnpriTrace: () => true,
}))

vi.mock('@/store', () => ({
  useStore: (selector: (s: { userInfo: { role: string; isLogin: boolean } }) => unknown) =>
    selector({ userInfo: { role: mocks.userRole.current, isLogin: true } }),
}))

vi.mock('@/store/globalHotPatch', () => {
  const loadGlobalHotPatchConfig = vi.fn().mockResolvedValue(undefined)
  const useGlobalHotPatch = Object.assign(
    () => ({
      globalHotPatchConfig: { Enabled: false, Version: '', Items: [] },
      loadGlobalHotPatchConfig,
    }),
    {
      getState: () => ({
        enableGlobalHotPatch: vi.fn().mockResolvedValue(undefined),
        disableGlobalHotPatch: vi.fn().mockResolvedValue(undefined),
      }),
    },
  )
  return {
    DEFAULT_GLOBAL_TEMPLATE_CONTENT: '',
    DEFAULT_GLOBAL_TEMPLATES: [],
    useGlobalHotPatch,
    useGlobalHotPatchTag: () => ({ globalEnabledTemplateName: '' }),
  }
})

vi.mock('@/defaultConstants/HTTPFuzzerPage', () => ({
  HotPatchDefaultContent: '',
  HotPatchTempDefault: [],
}))

vi.mock('@/defaultConstants/mitm', () => ({
  MITMHotPatchTempDefault: [],
  AnalyzeHotPatchTempDefault: [],
}))

vi.mock('@/pages/invoker/data/MITMPluginTamplate', () => ({
  HotPatchTemplate: '',
}))

vi.mock('@/pages/fuzzer/hotPatchShared', () => ({
  AddHotCodeTemplate: () => null,
}))

vi.mock('@/services/fetch', () => ({
  NetWorkApi: (...args: unknown[]) => mocks.netWorkApi(...args),
}))

vi.mock('@/utils/globalShortcutKey/events/useShortcutKeyTrigger', () => ({
  default: vi.fn(),
}))

vi.mock('@/utils/globalShortcutKey/utils', () => ({
  registerShortcutKeyHandle: vi.fn(),
  unregisterShortcutKeyHandle: vi.fn(),
}))

vi.mock('@/utils/globalShortcutKey/events/page/hotPatchManagement', () => ({
  getStorageHotPatchManagementShortcutKeyEvents: vi.fn(),
}))

vi.mock('@/utils/globalShortcutKey/events/pageMaps', () => ({
  ShortcutKeyPage: { HotPatchManagement: 'HotPatchManagement' },
}))

vi.mock('@/components/yakitUI/YakitMenu/showByRightContext', () => ({
  showByRightContext: (props: YakitMenuProp) => {
    mocks.capturedMenu.current = props
    mocks.showByRightContext(props)
  },
}))

vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({
  YakitEditor: () => <div data-testid="editor" />,
}))

vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({ firstNode, secondNode }: { firstNode?: React.ReactNode; secondNode?: React.ReactNode }) => (
    <div>
      {firstNode}
      {secondNode}
    </div>
  ),
}))

vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: () => null,
}))

vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({
  YakitTag: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: (props: Record<string, unknown>) => <input {...props} />,
}))

vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    onClick,
    icon,
    disabled,
  }: {
    children?: React.ReactNode
    onClick?: React.MouseEventHandler
    icon?: React.ReactNode
    disabled?: boolean
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {icon}
      {children}
    </button>
  ),
}))

vi.mock('@/components/yakitUI/YakitRadioButtons/YakitRadioButtons', () => ({
  YakitRadioButtons: ({
    options,
    onChange,
    value,
  }: {
    options?: Array<{ label: string; value: string }>
    onChange?: (e: { target: { value: string } }) => void
    value?: string
  }) => (
    <div>
      {(options || []).map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-testid={`radio-${opt.value}`}
          data-checked={value === opt.value ? 'true' : 'false'}
          onClick={() => onChange?.({ target: { value: opt.value } })}
        >
          {opt.label}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('antd', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    Tooltip: ({ title, children }: { title?: React.ReactNode; children?: React.ReactNode }) => (
      <span data-testid={typeof title === 'string' ? title : 'tooltip'}>{children}</span>
    ),
  }
})

vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  PlusOutlined: () => <span />,
  TrashOutlined: () => <span />,
  PencilAltOutlined: () => <span />,
  TerminalOutlined: () => <span />,
  InformationCircleOutlined: () => <span />,
  PlusCircleOutlined: () => <span />,
  DocumentAddOutlined: () => <span />,
  MinusCircleOutlined: () => <span />,
  FigmaIcon2017756Outlined: () => <span data-testid="export-icon" />,
  FigmaIcon6480193584Outlined: () => <span data-testid="import-icon" />,
}))

vi.mock('@yakit-libs/yakit-ui-icons/solid', () => ({
  ChevronRightSolid: () => <span />,
  DotsVerticalSolid: (props: { onClick?: React.MouseEventHandler; className?: string }) => (
    <button type="button" data-testid="template-more" className={props.className} onClick={props.onClick} />
  ),
  PlaySolid: () => <span />,
  StopSolid: () => <span />,
}))

vi.mock('../components/BatchExportHotPatchTemplate', async () => {
  const React = await import('react')
  return {
    BatchExportHotPatchTemplate: React.forwardRef(
      (_props: unknown, ref: React.Ref<{ open: typeof mocks.exportOpen }>) => {
        React.useImperativeHandle(ref, () => ({ open: mocks.exportOpen }))
        return <div data-testid="batch-export" />
      },
    ),
  }
})

vi.mock('../components/BatchImportHotPatchTemplate', () => ({
  BatchImportHotPatchTemplate: () => <div data-testid="batch-import" />,
}))

import { HotPatchManagement } from '../HotPatchManagement'

const LOCAL_GLOBAL = 'local-global-tpl'
const LOCAL_MITM = 'local-mitm-tpl'
const LOCAL_FUZZER = 'local-fuzzer-tpl'
const ONLINE_FUZZER = 'online-fuzzer-tpl'

const templatesByType: Record<string, Array<{ Name: string; Content: string; Type: string; Tags: string[] }>> = {
  global: [{ Name: LOCAL_GLOBAL, Content: 'global-code', Type: 'global', Tags: [] }],
  mitm: [{ Name: LOCAL_MITM, Content: 'mitm-code', Type: 'mitm', Tags: [] }],
  fuzzer: [{ Name: LOCAL_FUZZER, Content: 'fuzzer-code', Type: 'fuzzer', Tags: [] }],
  'httpflow-analyze': [{ Name: 'local-analyze-tpl', Content: 'analyze-code', Type: 'httpflow-analyze', Tags: [] }],
}

const lastExportParams = () => mocks.exportOpen.mock.calls.at(-1)?.[0] as Partial<ExportHotPatchTemplateStreamRequest>

const clickTooltipButton = (testId: string) => {
  const button = screen.getByTestId(testId).querySelector('button')
  expect(button).not.toBeNull()
  fireEvent.click(button as HTMLButtonElement)
}

const clickExportAllAt = (index: number) => {
  const wrap = screen.getAllByTestId('HotPatchTemplateImportExport.export_all')[index]
  const button = wrap.querySelector('button')
  expect(button).not.toBeNull()
  fireEvent.click(button as HTMLButtonElement)
}

const openTemplateContextMenu = (name: string) => {
  mocks.capturedMenu.current = null
  fireEvent.contextMenu(screen.getByTitle(name).parentElement as HTMLElement, { clientX: 12, clientY: 24 })
  expect(mocks.capturedMenu.current).toBeTruthy()
}

const menuKeys = () => ((mocks.capturedMenu.current?.data || []) as Array<{ key?: string }>).map((item) => item.key)

const triggerMenuExport = () => {
  mocks.capturedMenu.current?.onClick?.({ key: 'export', keyPath: ['export'] } as never)
}

const flushAsync = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

const renderPage = async () => {
  const view = render(<HotPatchManagement />)
  await waitFor(() => {
    expect(screen.getByTitle(LOCAL_GLOBAL)).toBeInTheDocument()
    expect(screen.getByTitle(LOCAL_MITM)).toBeInTheDocument()
  })
  await flushAsync()
  return view
}

const switchToFuzzerPanel = async () => {
  fireEvent.click(screen.getByTestId('radio-fuzzer'))
  await waitFor(() => {
    expect(screen.getByTitle(LOCAL_FUZZER)).toBeInTheDocument()
    expect(screen.getByTitle(ONLINE_FUZZER)).toBeInTheDocument()
  })
  await flushAsync()
}

describe('HotPatchManagement 导出入口', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.capturedMenu.current = null
    mocks.userRole.current = 'admin'
    mocks.netWorkApi.mockResolvedValue({
      data: [{ name: ONLINE_FUZZER, content: 'online-code' }],
    })
    ipcRendererMock.invoke.mockImplementation(async (channel: string, params?: { Type?: string; Name?: string[] }) => {
      if (channel === 'QueryHotPatchTemplate') {
        if (params?.Name?.length) {
          return {
            Data: [
              {
                Name: params.Name[0],
                Content: `${params.Name[0]}-code`,
                Type: params.Type,
                Tags: [],
              },
            ],
          }
        }
        return { Data: templatesByType[params?.Type || ''] || [] }
      }
      return undefined
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('本地来源：编辑器头部显示单个导出，open 传入 Filter.Type / Name / OutputFilename', async () => {
    await renderPage()

    expect(screen.getByTestId('HotPatchTemplateImportExport.export_single')).toBeInTheDocument()
    clickTooltipButton('HotPatchTemplateImportExport.export_single')
    expect(lastExportParams()).toEqual({
      OutputFilename: LOCAL_GLOBAL,
      Filter: { Type: 'global', Name: [LOCAL_GLOBAL] },
    })

    await switchToFuzzerPanel()
    fireEvent.click(screen.getByTitle(LOCAL_FUZZER))
    await flushAsync()
    clickTooltipButton('HotPatchTemplateImportExport.export_single')
    expect(lastExportParams()).toEqual({
      OutputFilename: LOCAL_FUZZER,
      Filter: { Type: 'fuzzer', Name: [LOCAL_FUZZER] },
    })
  })

  it('本地来源：右键菜单含导出项，open 传入 Filter.Type / Name / OutputFilename', async () => {
    await renderPage()

    openTemplateContextMenu(LOCAL_GLOBAL)
    expect(menuKeys()).toContain('export')
    triggerMenuExport()
    expect(lastExportParams()).toEqual({
      OutputFilename: LOCAL_GLOBAL,
      Filter: { Type: 'global', Name: [LOCAL_GLOBAL] },
    })

    await switchToFuzzerPanel()
    openTemplateContextMenu(LOCAL_FUZZER)
    expect(menuKeys()).toContain('export')
    triggerMenuExport()
    expect(lastExportParams()).toEqual({
      OutputFilename: LOCAL_FUZZER,
      Filter: { Type: 'fuzzer', Name: [LOCAL_FUZZER] },
    })
  })

  it('全部导出按钮按分区 Type 调用 open，且不传 Name / OutputFilename', async () => {
    await renderPage()

    expect(screen.getAllByTestId('HotPatchTemplateImportExport.export_all')).toHaveLength(2)

    clickExportAllAt(0)
    expect(lastExportParams()).toEqual({ Filter: { Type: 'global' } })

    clickExportAllAt(1)
    expect(lastExportParams()).toEqual({ Filter: { Type: 'mitm' } })

    await switchToFuzzerPanel()
    clickExportAllAt(1)
    expect(lastExportParams()).toEqual({ Filter: { Type: 'fuzzer' } })
  })

  it('线上来源：隐藏单个导出按钮，右键菜单不含导出项', async () => {
    await renderPage()
    await switchToFuzzerPanel()

    fireEvent.click(screen.getByTitle(ONLINE_FUZZER))
    await flushAsync()
    expect(screen.queryByTestId('HotPatchTemplateImportExport.export_single')).toBeNull()
    expect(screen.getAllByTestId('HotPatchTemplateImportExport.export_all')).toHaveLength(2)

    openTemplateContextMenu(ONLINE_FUZZER)
    expect(menuKeys()).not.toContain('export')
    expect(mocks.exportOpen).not.toHaveBeenCalled()
  })
})
