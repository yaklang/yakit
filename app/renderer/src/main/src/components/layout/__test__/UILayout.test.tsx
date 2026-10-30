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

const { startIdleVisibleInterval, grpcFetchYakInstallResult, headerState } = vi.hoisted(() => ({
  headerState: { system: 'Darwin', portable: true, ready: true, community: true },
  startIdleVisibleInterval: vi.fn(() => vi.fn()),
  grpcFetchYakInstallResult: vi.fn().mockResolvedValue(true),
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
  YaklangEngineWatchDog: ({ onReady }: { onReady?: () => void }) => {
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
  useStore: () => ({ userInfo: { isLogin: false } }),
  useYakitDynamicStatus: () => ({
    dynamicStatus: { isDynamicStatus: false },
    setDynamicStatus: vi.fn(),
  }),
  useEeSystemConfig: () => ({ eeSystemConfig: [] }),
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
  SystemInfo: { isDev: false },
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
    yakitUILayout: new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (prop === 'onFromEngineLinkWindow') {
            return vi.fn((callback) => {
              callback({ credential: { Mode: 'remote' } })
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
  ParkAboveSolid: () => <svg aria-label="park-above" />,
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

import { useMenuHeight } from '@/store/menuHeight'
import UILayout from '../UILayout'
import styles from '../uiLayout.module.scss'

beforeEach(() => useMenuHeight.setState({ isMenuVisible: true }))
afterEach(() => {
  cleanup()
  useMenuHeight.setState({ isMenuVisible: true })
})

describe('UILayout 引擎连接后的安装探测轮询', () => {
  beforeEach(() => {
    startIdleVisibleInterval.mockClear()
    grpcFetchYakInstallResult.mockClear()
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
    expect(button).not.toHaveAttribute('role')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveClass(styles['park-above-icon-active'])
    fireEvent.click(button)
    expect(useMenuHeight.getState().isMenuVisible).toBe(false)
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).not.toHaveClass(styles['park-above-icon-active'])
    expect(header).toHaveStyle({ borderBottomWidth: '0px' })
    fireEvent.mouseEnter(button)
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('UILayout.showMenu'))
    fireEvent.mouseLeave(button)
    fireEvent.click(button)
    expect(useMenuHeight.getState().isMenuVisible).toBe(true)
    expect(header.style.borderBottomWidth).toBe('')
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveClass(styles['park-above-icon-active'])
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
  })
})
