vi.hoisted(() => {
  ;(window as any).require = (id: string) => {
    if (id === 'electron') {
      return {
        ipcRenderer: {
          invoke: async () => ({}),
          on: () => {},
          off: () => {},
          send: () => {},
          removeAllListeners: () => {},
        },
      }
    }
    return {}
  }
  ;(window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })
})

import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  startIdleVisibleInterval,
  grpcFetchYakInstallResult,
  headerState,
  watchdogCallbacks,
  enterpriseUsageStatistics,
  layoutStore,
} = vi.hoisted(() => ({
  headerState: {
    system: 'Darwin',
    portable: true,
    ready: true,
    community: true,
    projectManage: false,
    engineMode: 'remote',
  },
  watchdogCallbacks: {
    onReady: undefined as (() => void) | undefined,
    onFailed: undefined as ((count: number) => void) | undefined,
  },
  startIdleVisibleInterval: vi.fn(() => vi.fn()),
  grpcFetchYakInstallResult: vi.fn().mockResolvedValue(true),
  enterpriseUsageStatistics: vi.fn(),
  layoutStore: {
    userInfo: { isLogin: false, token: undefined as string | undefined },
    eeSystemConfig: [] as Array<{ configName: string; isOpen: boolean }>,
  },
}))

vi.mock('@/utils/scheduleIdleTask', () => ({ startIdleVisibleInterval }))

vi.mock('@/apiUtils/grpc', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    grpcFetchYakInstallResult,
    grpcFetchLatestYakVersion: vi.fn().mockResolvedValue(''),
  }
})

vi.mock('@/components/layout/YaklangEngineWatchDog', () => ({
  YaklangEngineWatchDog: ({ onReady, onFailed }: { onReady?: () => void; onFailed?: (count: number) => void }) => {
    watchdogCallbacks.onReady = onReady
    watchdogCallbacks.onFailed = onFailed
    const { useEffect } = require('react')
    useEffect(() => {
      if (headerState.ready) onReady?.()
    }, [])
    return null
  },
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' }, i18nRefresh: 0 }),
}))

vi.mock('@/utils/envfile', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    isEnpriTraceAgent: () => headerState.portable,
    isEnpriTrace: () => false,
    isEnterpriseEdition: () => false,
    isCommunityYakit: () => false,
    isCommunityEdition: () => headerState.community,
    isMemfit: () => false,
    isIRify: () => false,
    getReleaseEditionName: () => 'Yakit',
    GetConnectPort: () => 9011,
  }
})

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn().mockResolvedValue(''),
  setRemoteValue: vi.fn(),
  getLocalValue: vi.fn().mockResolvedValue(''),
  setLocalValue: vi.fn(),
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  yakitFailed: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('@/store', () => ({
  useStore: () => ({ userInfo: layoutStore.userInfo }),
  useYakitDynamicStatus: () => ({
    dynamicStatus: { isDynamicStatus: false },
    setDynamicStatus: vi.fn(),
  }),
  useEeSystemConfig: () => ({ eeSystemConfig: layoutStore.eeSystemConfig }),
}))

vi.mock('../useEnterpriseUsageStatistics', () => ({
  useEnterpriseUsageStatistics: enterpriseUsageStatistics,
}))

vi.mock('@/store/temporaryProject', () => ({
  useTemporaryProjectStore: () => ({
    setTemporaryProjectNoPromptFlag: vi.fn(),
    temporaryProjectId: '',
  }),
}))

vi.mock('@/store/screenRecorder', () => ({
  useScreenRecorder: () => ({
    screenRecorderInfo: { isRecording: false, token: '' },
    setRecording: vi.fn(),
  }),
}))

vi.mock('@/store/performanceSampling', () => ({
  usePerformanceSampling: () => ({
    performanceSamplingInfo: { isSampling: false, log: [] },
    resetPerformanceSampling: vi.fn(),
  }),
}))

vi.mock('@/store/yakMcpStream', () => ({
  useSyncYakMcpStream: () => ({
    mcpStreamInfo: { mcpCurrent: null, mcpServerUrl: '' },
  }),
}))

vi.mock('@/constants/hardware', () => ({
  SystemInfo: {
    get isDev() {
      return !headerState.projectManage
    },
  },
  handleFetchArchitecture: vi.fn(),
  handleFetchIsDev: vi.fn(),
}))

vi.mock('@/services/electronBridge', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  const unsubscribe = () => undefined
  return {
    ...actual,
    yakitSystem: {
      ...(actual.yakitSystem as Record<string, unknown>),
      fetchSystemName: vi.fn(async () => headerState.system),
    },
    yakitProject: {
      ...(actual.yakitProject as Record<string, unknown>),
      getDefaultProjectEx: vi.fn().mockResolvedValue({ Id: 1, ProjectName: '[default]' }),
      getCurrentProjectEx: vi.fn().mockResolvedValue({ Id: 1, ProjectName: '[default]' }),
    },
    yakitUILayout: new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === 'onFromEngineLinkWindow') {
            return vi.fn((callback) => {
              callback({ credential: { Mode: headerState.engineMode } })
              return unsubscribe
            })
          }
          if (String(prop).startsWith('on')) return vi.fn(() => unsubscribe)
          return vi.fn().mockResolvedValue(undefined)
        },
      },
    ),
  }
})

vi.mock('lottie-web', () => ({ default: vi.fn() }))
vi.mock('../basics/NewYakitLoading', () => ({
  NewYakitLoading: () => null,
}))

vi.mock('@/utils/duplex/duplex', () => ({
  closeDuplexConn: vi.fn(),
  startupDuplexConn: vi.fn(),
  serverPushStatus: false,
}))

vi.mock('@/store/softMode', () => ({
  useSoftMode: () => ({ softMode: '', setSoftMode: vi.fn() }),
}))

vi.mock('@/utils/visitorsStatistics', () => ({
  visitorsStatisticsFun: vi.fn(),
}))

vi.mock('@/pages/dynamicControl/remoteOperation', () => ({
  remoteOperation: vi.fn(),
}))

vi.mock('@/pages/spaceEngine/utils', () => ({
  handleAIConfig: vi.fn(),
  apiGetGlobalNetworkConfig: vi.fn().mockResolvedValue({}),
  apiSetGlobalNetworkConfig: vi.fn(),
}))

vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: vi.fn(),
}))

vi.mock('@/utils/openWebsite', () => ({
  openABSFileLocated: vi.fn(),
}))

vi.mock('@/utils/logCollection', () => ({
  debugToPrintLog: vi.fn(),
}))

vi.mock('@/utils/getMainOperatorPageBodyContainer', () => ({
  getMainOperatorPageBodyContainer: () => document.body,
}))

vi.mock('../utils', () => ({
  apiSplitUpload: vi.fn(),
  grpcExportProject: vi.fn(),
  grpcGetProjects: vi.fn().mockResolvedValue({ Projects: [] }),
}))

vi.mock('@/pages/pluginHub/utils/grpc', () => ({
  grpcFetchLocalPluginDetail: vi.fn(),
}))

vi.mock('../MacUIOp', () => ({ MacUIOp: () => null }))
vi.mock('../WinUIOp', () => ({ WinUIOp: () => null, TemporaryProjectPop: () => null }))
vi.mock('../PerformanceDisplay', () => ({ PerformanceDisplay: () => null }))
vi.mock('../FuncDomain', () => ({
  FuncDomain: ({ homeIcon }: { homeIcon?: ReactNode }) => <>{homeIcon}</>,
  UIOpNotice: () => null,
}))
vi.mock('../YakitGlobalHost', () => ({ YakitGlobalHost: () => null }))
vi.mock('@yakit-libs/yakit-ui-icons/solid', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  HomeSolid: () => <svg aria-label="home" />,
}))
vi.mock('../MenuCollapseIcon', () => ({
  MenuCollapseIcon: () => <svg aria-label="park-above" />,
  MenuExpandIcon: () => <svg aria-label="park-above" />,
}))
vi.mock('../menuVisibilityGuide/MenuVisibilityGuide', () => ({
  MENU_VISIBILITY_GUIDE_HEADER_TARGET: 'menu-visibility-guide-header',
  MENU_VISIBILITY_GUIDE_TAB_ADD_TARGET: 'menu-visibility-guide-tab-add',
  MenuVisibilityGuide: () => null,
}))
vi.mock('../GlobalState', () => ({ GlobalState: () => null }))
vi.mock('../AllKillEngineConfirm', () => ({ AllKillEngineConfirm: () => null }))
vi.mock('../basics/YakitLoading', () => ({ EngineModeVerbose: () => 'local' }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children }: { children?: React.ReactNode }) => <button>{children}</button>,
}))
vi.mock('@/components/yakitUI/YakitHint/YakitHint', () => ({ YakitHint: () => null }))
vi.mock('@/components/yakitUI/YakitSpin/YakitSpin', () => ({
  YakitSpin: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/pages/softwareSettings/ProjectManage', () => ({
  default: () => null,
  NewProjectAndFolder: () => null,
  TransferProject: () => null,
}))
vi.mock('@/pages/softwareSettings/SoftwareSettings', () => ({
  SoftwareSettings: ({ onFinish }: { onFinish: () => void }) => (
    <div data-testid="project-manager">
      <button onClick={onFinish}>进入项目</button>
    </div>
  ),
}))
vi.mock('@/pages/mitm/MITMServerHijacking/MITMPluginOnline', () => ({
  YakitGetOnlinePlugin: () => null,
}))
vi.mock('@/pages/yakRunner/BottomEditorDetails/TerminalBox/TerminalMap', () => ({
  clearTerminalMap: vi.fn(),
  getMapAllTerminalKey: () => [],
}))
vi.mock('@/pages/pluginHub/hooks/useGetSetState', () => {
  const { useRef, useState } = require('react')
  const useGetSetState = (init?: unknown) => {
    const [v, setV] = useState(init)
    const ref = useRef(init)
    const set = (next: unknown) => {
      const value = typeof next === 'function' ? (next as (prev: unknown) => unknown)(ref.current) : next
      ref.current = value
      setV(value)
    }
    return [v, set, () => ref.current]
  }
  return { default: useGetSetState }
})

// 根级 Vitest 将样式映射为空对象，固定本测试依赖的类名以保留 DOM 断言。
vi.mock('../uiLayout.module.scss', () => ({
  default: {
    'mac-header-body': 'mac-header-body',
    'header-body': 'header-body',
    'header-navigation-wrapper': 'header-navigation-wrapper',
    'yakit-mode-icon': 'yakit-mode-icon',
    'yakit-mode-icon-reverse': 'yakit-mode-icon-reverse',
    'park-above-icon-active': 'park-above-icon-active',
  },
}))

import {
  MENU_VISIBLE_LARGE_SCREEN_MIN_HEIGHT,
  MENU_VISIBLE_LARGE_SCREEN_MIN_WIDTH,
  useMenuHeight,
} from '@/store/menuHeight'
import { CodeGV } from '@/yakitGV'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import UILayout from '../UILayout'
import styles from '../uiLayout.module.scss'

beforeEach(() => {
  vi.stubGlobal('innerWidth', MENU_VISIBLE_LARGE_SCREEN_MIN_WIDTH + 140)
  vi.stubGlobal('innerHeight', MENU_VISIBLE_LARGE_SCREEN_MIN_HEIGHT + 200)
  useMenuHeight.getState().toggleMenuVisibility.cancel()
  headerState.projectManage = false
  headerState.engineMode = 'remote'
  watchdogCallbacks.onReady = undefined
  watchdogCallbacks.onFailed = undefined
  useMenuHeight.setState({ isMenuVisible: true, isMenuVisibilityLoading: true })
  vi.mocked(getRemoteValue).mockReset().mockResolvedValue('')
  vi.mocked(setRemoteValue).mockReset().mockResolvedValue(undefined)
})
afterEach(() => {
  cleanup()
  useMenuHeight.getState().toggleMenuVisibility.cancel()
  useMenuHeight.setState({ isMenuVisible: true })
  vi.unstubAllGlobals()
})

describe('UILayout 引擎连接后的安装探测轮询', () => {
  beforeEach(() => {
    startIdleVisibleInterval.mockClear()
    grpcFetchYakInstallResult.mockClear()
    enterpriseUsageStatistics.mockClear()
    layoutStore.userInfo = { isLogin: false, token: undefined }
    layoutStore.eeSystemConfig = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('探活 Ready 后置 engineLink 并启动引擎安装探测', async () => {
    render(<UILayout />)
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(startIdleVisibleInterval).toHaveBeenCalled()
  })

  it('将企业采集配置和登录凭证接入使用统计 hook', () => {
    layoutStore.userInfo = { isLogin: true, token: 'enterprise-token' }
    layoutStore.eeSystemConfig = [{ configName: 'collectData', isOpen: true }]

    render(<UILayout />)

    expect(enterpriseUsageStatistics).toHaveBeenCalledWith(true, true, 'enterprise-token')
  })
})

describe('UILayout 标题栏导航图标', () => {
  beforeEach(() => {
    headerState.portable = false
    headerState.ready = true
    headerState.community = true
  })

  afterEach(() => {
    cleanup()
    headerState.portable = true
    headerState.ready = true
    headerState.system = 'Darwin'
    headerState.community = true
    vi.clearAllMocks()
  })

  it.each(['Darwin', 'Windows_NT', 'Linux'])('%s 中 Home 后展示 Park，点击切换菜单状态和选中背景', async (system) => {
    headerState.system = system
    const { container } = render(<UILayout />)
    await waitFor(() => expect(screen.getByLabelText('park-above')).toBeInTheDocument())
    await waitFor(() =>
      expect(container.querySelector('.' + styles['mac-header-body']) !== null).toBe(system === 'Darwin'),
    )
    const navigation = container.querySelector('.' + styles['header-navigation-wrapper'])
    expect(navigation).not.toBeNull()
    const home = screen.getByLabelText('home').closest('.' + styles['yakit-mode-icon'])!
    if (system === 'Darwin') {
      expect(home).not.toHaveClass(styles['yakit-mode-icon-reverse'])
    } else {
      expect(home).toHaveClass(styles['yakit-mode-icon-reverse'])
    }
    expect(Array.from(navigation!.querySelectorAll('svg')).map((icon) => icon.getAttribute('aria-label'))).toEqual([
      'home',
      'park-above',
    ])
    const header = container.querySelector('.' + styles['header-body']) as HTMLElement
    expect(header.style.borderBottomWidth).toBe('')
    const button = screen.getByLabelText('UILayout.toggleMenu')
    fireEvent.mouseEnter(button)
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('UILayout.hideMenu'))
    fireEvent.mouseLeave(button)
    expect(button.tagName).toBe('DIV')
    expect(button).toContainElement(screen.getByLabelText('park-above'))
    expect(button).not.toHaveAttribute('role')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveClass(styles['park-above-icon-active'])
    fireEvent.click(button)
    expect(useMenuHeight.getState().isMenuVisible).toBe(false)
    expect(setRemoteValue).toHaveBeenCalledWith(CodeGV.MenuVisible, 'false')
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).not.toHaveClass(styles['park-above-icon-active'])
    expect(header).toHaveStyle({ borderBottomWidth: '0px' })
    fireEvent.mouseEnter(button)
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('UILayout.showMenu'))
    fireEvent.mouseLeave(button)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500))
    })
    fireEvent.click(button)
    expect(useMenuHeight.getState().isMenuVisible).toBe(true)
    expect(setRemoteValue).toHaveBeenCalledWith(CodeGV.MenuVisible, 'true')
    expect(header.style.borderBottomWidth).toBe('')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveClass(styles['park-above-icon-active'])
  })

  it.each(['true', 'false'])('引擎连接后从缓存 %s 恢复菜单显隐', async (cached) => {
    vi.mocked(getRemoteValue).mockImplementation((key) => Promise.resolve(key === CodeGV.MenuVisible ? cached : ''))

    render(<UILayout />)

    await waitFor(() => expect(screen.getByLabelText('UILayout.toggleMenu')).toHaveAttribute('aria-pressed', cached))
    expect(getRemoteValue).toHaveBeenCalledWith(CodeGV.MenuVisible)
    expect(setRemoteValue).not.toHaveBeenCalledWith(CodeGV.MenuVisible, expect.anything())
  })

  it('缓存恢复完成前不显示菜单开关', async () => {
    let resolveCache!: (value: string) => void
    const cache = new Promise<string>((resolve) => {
      resolveCache = resolve
    })
    vi.mocked(getRemoteValue).mockImplementation((key) => (key === CodeGV.MenuVisible ? cache : Promise.resolve('')))

    render(<UILayout />)

    await waitFor(() => expect(getRemoteValue).toHaveBeenCalledWith(CodeGV.MenuVisible))
    expect(screen.queryByLabelText('UILayout.toggleMenu')).not.toBeInTheDocument()
    await act(async () => resolveCache('false'))
    await waitFor(() => expect(screen.getByLabelText('UILayout.toggleMenu')).toHaveAttribute('aria-pressed', 'false'))
  })

  it('切换后重新挂载布局会恢复已保存的显隐状态', async () => {
    let cached = 'false'
    vi.mocked(getRemoteValue).mockImplementation((key) => Promise.resolve(key === CodeGV.MenuVisible ? cached : ''))
    vi.mocked(setRemoteValue).mockImplementation(async (key, value) => {
      if (key === CodeGV.MenuVisible) cached = value
    })
    const first = render(<UILayout />)
    await waitFor(() => expect(screen.getByLabelText('UILayout.toggleMenu')).toHaveAttribute('aria-pressed', 'false'))

    fireEvent.click(screen.getByLabelText('UILayout.toggleMenu'))
    expect(cached).toBe('true')
    first.unmount()
    useMenuHeight.setState({ isMenuVisible: false })
    render(<UILayout />)

    await waitFor(() => expect(screen.getByLabelText('UILayout.toggleMenu')).toHaveAttribute('aria-pressed', 'true'))
  })

  it('本地引擎恢复时复用未完成的初始化，成功后才能切换菜单', async () => {
    headerState.engineMode = 'local'
    let resolveCache!: (value: string) => void
    const cache = new Promise<string>((resolve) => {
      resolveCache = resolve
    })
    const readMenuCache = vi.fn().mockReturnValue(cache)
    vi.mocked(getRemoteValue).mockImplementation((key) =>
      key === CodeGV.MenuVisible ? readMenuCache() : Promise.resolve(''),
    )

    render(<UILayout />)
    await waitFor(() => expect(readMenuCache).toHaveBeenCalledTimes(1))
    expect(screen.queryByLabelText('UILayout.toggleMenu')).not.toBeInTheDocument()

    act(() => watchdogCallbacks.onFailed?.(1))
    act(() => watchdogCallbacks.onReady?.())
    expect(readMenuCache).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('UILayout.toggleMenu')).not.toBeInTheDocument()
    expect(useMenuHeight.getState().isMenuVisibilityLoading).toBe(true)

    await act(async () => resolveCache('false'))
    await waitFor(() => expect(screen.getByLabelText('UILayout.toggleMenu')).toHaveAttribute('aria-pressed', 'false'))
    expect(screen.getByLabelText('UILayout.toggleMenu')).toHaveAttribute('aria-disabled', 'false')
    expect(screen.getByLabelText('UILayout.toggleMenu')).toHaveAttribute('aria-busy', 'false')

    fireEvent.click(screen.getByLabelText('UILayout.toggleMenu'))
    expect(screen.getByLabelText('UILayout.toggleMenu')).toHaveAttribute('aria-pressed', 'true')
    expect(setRemoteValue).toHaveBeenCalledExactlyOnceWith(CodeGV.MenuVisible, 'true')

    expect(useMenuHeight.getState().isMenuVisible).toBe(true)
  })

  it('菜单初始化期间按钮 loading 且不能切换，成功后恢复点击', async () => {
    render(<UILayout />)
    const button = await screen.findByLabelText('UILayout.toggleMenu')
    let resolveCache!: (value: string) => void
    vi.mocked(getRemoteValue).mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveCache = resolve
      }),
    )
    let initialization!: Promise<void>
    act(() => {
      initialization = useMenuHeight.getState().initMenuVisibility()
    })

    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(button)
    expect(setRemoteValue).not.toHaveBeenCalled()

    await act(async () => {
      resolveCache('false')
      await initialization
    })

    expect(button).toHaveAttribute('aria-disabled', 'false')
    expect(button).toHaveAttribute('aria-busy', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(setRemoteValue).toHaveBeenCalledExactlyOnceWith(CodeGV.MenuVisible, 'true')
  })

  it.each(['Darwin', 'Windows_NT', 'Linux'])('%s 非社区版保留 Home，隐藏 Park', async (system) => {
    headerState.system = system
    headerState.community = false
    const { container } = render(<UILayout />)
    await waitFor(() => expect(screen.getByLabelText('home')).toBeInTheDocument())
    await waitFor(() =>
      expect(container.querySelector('.' + styles['mac-header-body']) !== null).toBe(system === 'Darwin'),
    )
    expect(screen.queryByLabelText('park-above')).not.toBeInTheDocument()
    expect(getRemoteValue).not.toHaveBeenCalledWith(CodeGV.MenuVisible)
  })

  it.each(['Darwin', 'Windows_NT', 'Linux'])('%s 项目管理界面隐藏 Park，进入项目后恢复', async (system) => {
    headerState.system = system
    headerState.projectManage = true
    render(
      <UILayout>
        <div data-testid="workbench" />
      </UILayout>,
    )

    await screen.findByTestId('project-manager')
    expect(screen.getByLabelText('home')).toBeInTheDocument()
    expect(screen.queryByLabelText('park-above')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('UILayout.toggleMenu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '进入项目' }))

    await screen.findByTestId('workbench')
    expect(screen.getByLabelText('park-above')).toBeInTheDocument()
    expect(screen.getByLabelText('UILayout.toggleMenu')).toBeInTheDocument()
  })

  it.each(['Darwin', 'Windows_NT', 'Linux'])('%s 便携企业版隐藏 Home 和 Park', async (system) => {
    headerState.system = system
    headerState.portable = true
    render(<UILayout />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.queryByLabelText('home')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('park-above')).not.toBeInTheDocument()
  })

  it('引擎未连接时隐藏 Home 和 Park', async () => {
    headerState.ready = false
    render(<UILayout />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.queryByLabelText('home')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('park-above')).not.toBeInTheDocument()
    expect(getRemoteValue).not.toHaveBeenCalledWith(CodeGV.MenuVisible)
  })
})
