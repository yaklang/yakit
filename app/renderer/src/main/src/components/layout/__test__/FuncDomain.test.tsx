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

vi.mock('lottie-web', () => ({ default: vi.fn() }))

import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { startIdleVisibleInterval, queryRisks } = vi.hoisted(() => ({
  startIdleVisibleInterval: vi.fn(() => vi.fn()),
  queryRisks: vi.fn(),
}))

vi.mock('@/utils/scheduleIdleTask', () => ({ startIdleVisibleInterval }))

vi.mock('@/services/electronBridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/electronBridge')>()
  return {
    ...actual,
    yakitRisk: {
      queryRisks,
      fetchLatestInfo: vi.fn().mockResolvedValue({ Data: [], Total: 0, NewRiskTotal: 0, Unread: 0 }),
    },
    yakitStream: {
      onData: vi.fn(() => vi.fn()),
      onError: vi.fn(() => vi.fn()),
      onEnd: vi.fn(() => vi.fn()),
    },
    yakitUILayout: {
      cancelScreenRecorder: vi.fn(),
      onOpenScreenCapModal: vi.fn(() => vi.fn()),
      isScreenRecorderReady: vi.fn().mockResolvedValue({ Ok: false, Reason: '' }),
      refreshMainMenu: vi.fn(),
      requestOpenScreenCapModal: vi.fn(),
      activateScreenshot: vi.fn(),
    },
    yakitEngine: new Proxy(
      {},
      {
        get: (_target, prop) => {
          if (String(prop).startsWith('on')) return vi.fn(() => vi.fn())
          return vi.fn().mockResolvedValue(undefined)
        },
      },
    ),
  }
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' }, i18nRefresh: 0 }),
}))

vi.mock('@/utils/duplex/duplex', () => ({
  serverPushStatus: false,
}))

vi.mock('@/utils/envfile', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/envfile')>()
  return {
    ...actual,
    isIRify: () => false,
    isCommunityEdition: () => true,
    isCommunityYakit: () => true,
    isEnpriTrace: () => false,
    isEnpriTraceAgent: () => false,
    isMemfit: () => false,
    isYakit: () => true,
    showDevTool: () => false,
    getReleaseEditionName: () => 'Yakit',
    getCurrentVersionSource: () => 'community',
  }
})

vi.mock('@/store', () => ({
  useStore: () => ({ userInfo: { isLogin: false } }),
  yakitDynamicStatus: () => ({
    dynamicStatus: { isDynamicStatus: false },
  }),
  useEeSystemConfig: () => ({ eeSystemConfig: [] }),
}))

vi.mock('@/store/screenRecorder', () => ({
  useScreenRecorder: () => ({
    screenRecorderInfo: { token: 't', isRecording: false },
    setRecording: vi.fn(),
  }),
}))

vi.mock('@/store/runNode', () => ({
  useRunNodeStore: () => ({ runNodeList: new Map() }),
}))

vi.mock('@/store/temporaryProject', () => ({
  useTemporaryProjectStore: () => ({ delTemporaryProject: vi.fn() }),
}))

vi.mock('@/store/performanceSampling', () => ({
  usePerformanceSampling: () => ({
    performanceSamplingInfo: { isSampling: false, isPerformanceSampling: false, token: '', log: [] },
    setPerformanceSamplingLog: vi.fn(),
    setSampling: vi.fn(),
  }),
}))

vi.mock('../userMenu/useUserMenu', () => ({
  useUserMenu: () => ({
    userMenu: [],
    ceUserMenuShow: false,
    setCeUserMenuShow: vi.fn(),
    usageStatisticsShow: false,
    setUsageStatisticsShow: vi.fn(),
    rechargeVisible: false,
    setRechargeVisible: vi.fn(),
    apiKeys: '',
    apiKeysInfo: {},
    apiKeysInfoLoading: false,
    onUpdateApiKey: vi.fn(),
    passwordShow: false,
    setPasswordShow: vi.fn(),
    passwordClose: vi.fn(),
    uploadModalShow: false,
    setUploadModalShow: vi.fn(),
    dynamicControlModal: false,
    setDynamicControlModal: vi.fn(),
    controlMyselfModal: false,
    setControlMyselfModal: vi.fn(),
    controlOtherModal: false,
    setControlOtherModal: vi.fn(),
    dynamicMenuOpen: false,
    setDynamicMenuOpen: vi.fn(),
    robotControlModal: false,
    setRobotControlModal: vi.fn(),
    imControlBadge: 0,
    imControlStatus: '',
    refreshIMControlStatus: vi.fn(),
    onUserMenuClick: vi.fn(),
    loginShow: false,
    setLoginShow: vi.fn(),
  }),
}))

vi.mock('../hooks/useEngineConsole/useEngineConsole', () => ({
  default: () => undefined,
}))

vi.mock('../update/useDownloadYakit', () => ({
  useDownloadYakit: () => ({ downloadProgress: 0 }),
}))

vi.mock('../../MessageCenter/useEETaskNotificationHook', () => ({
  useEETaskNotificationHook: () => ({
    taskModalInfo: {},
    taskErrModalInfo: {},
    debugTaskEvent: {},
  }),
}))

vi.mock('@/pages/layout/NotepadMenu/NotepadMenu', () => ({
  NotepadMenu: () => null,
}))

vi.mock('../userMenu/UserMenuModals', () => ({
  UserMenuModals: () => null,
}))

vi.mock('../userMenu/UserAvatarIMBadge', () => ({
  UserAvatarIMBadge: () => null,
}))

vi.mock('../../CeUserMenu/CeRechargeModal', () => ({
  default: () => null,
}))

vi.mock('../userMenu/constants', () => ({
  randomAvatarColor: () => '#000',
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

vi.mock('@/hook/useHoldGRPCStream/useHoldGRPCStream', () => ({
  default: () => [
    { progressState: [], logState: [] },
    { stop: vi.fn(), start: vi.fn(), reset: vi.fn() },
  ],
}))

import { FuncDomain } from '../FuncDomain'
import type { FuncDomainProp } from '../FuncDomain'

const baseProps: FuncDomainProp = {
  isEngineLink: true,
  engineMode: 'local',
  isRemoteMode: false,
  onEngineModeChange: vi.fn(),
  typeCallback: vi.fn(),
  runDynamicControlRemote: vi.fn(),
  isJudgeLicense: true,
  system: 'Windows_NT',
  onDevToolRefresh: vi.fn(),
  showProjectManage: false,
}

describe('FuncDomain 风险轮询卸载竞态', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('queryRisks 完成前卸载则不再启动轮询', async () => {
    let resolveQuery: ((value: { Data: { Id: number }[] }) => void) | undefined
    queryRisks.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveQuery = resolve
        }),
    )

    const { unmount } = render(<FuncDomain {...baseProps} />)
    expect(queryRisks).toHaveBeenCalled()
    expect(startIdleVisibleInterval).not.toHaveBeenCalled()

    unmount()
    await act(async () => {
      resolveQuery?.({ Data: [] })
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(startIdleVisibleInterval).not.toHaveBeenCalled()
  })

  it('引擎已连接且请求完成后启动轮询', async () => {
    queryRisks.mockResolvedValue({ Data: [] })
    render(<FuncDomain {...baseProps} />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(startIdleVisibleInterval).toHaveBeenCalled()
  })
})
