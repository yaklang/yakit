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

import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { startIdleVisibleInterval, grpcFetchYakInstallResult } = vi.hoisted(() => ({
  startIdleVisibleInterval: vi.fn(() => vi.fn()),
  grpcFetchYakInstallResult: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/utils/scheduleIdleTask', () => ({ startIdleVisibleInterval }))

vi.mock('@/apiUtils/grpc', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/apiUtils/grpc')>()
  return {
    ...actual,
    grpcFetchYakInstallResult,
    grpcFetchLatestYakVersion: vi.fn().mockResolvedValue(''),
  }
})

vi.mock('@/components/layout/YaklangEngineWatchDog', () => ({
  YaklangEngineWatchDog: ({ onReady }: { onReady?: () => void }) => {
    const { useEffect } = require('react') as typeof import('react')
    useEffect(() => {
      onReady?.()
    }, [])
    return null
  },
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' }, i18nRefresh: 0 }),
}))

vi.mock('@/utils/envfile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/envfile')>()
  return {
    ...actual,
    isEnpriTraceAgent: () => true,
    isEnpriTrace: () => false,
    isEnterpriseEdition: () => false,
    isCommunityYakit: () => false,
    isCommunityEdition: () => false,
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
  yakitDynamicStatus: () => ({
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
  const actual = await importOriginal<typeof import('@/services/electronBridge')>()
  const unsubscribe = () => undefined
  return {
    ...actual,
    yakitUILayout: new Proxy(
      {},
      {
        get: (_target, prop) => {
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
vi.mock('../FuncDomain', () => ({ FuncDomain: () => null, UIOpNotice: () => null }))
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
vi.mock('@/pages/pluginHub/hooks/useGetSetState', () => ({
  default: (init: unknown) => {
    const React = require('react') as typeof import('react')
    const [v, setV] = React.useState(init)
    const get = () => v
    return [v, setV, get]
  },
}))

import UILayout from '../UILayout'

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
