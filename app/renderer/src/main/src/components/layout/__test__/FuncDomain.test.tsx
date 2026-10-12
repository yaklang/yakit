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

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  startIdleVisibleInterval,
  queryRisks,
  edition,
  messageState,
  userInfo,
  menuActions,
  eeConfig,
  versionSlots,
  engineList,
  engineFetchList,
} = vi.hoisted(() => {
  // UIOpNotice 更新链路的可变 mock 状态（describe「UIOpNotice 更新按钮状态与文案」中按用例赋值）
  const eeConfig = { value: [] as Array<{ configName: string; isOpen: boolean }> }
  const versionSlots = {
    latestYakit: { version: 'v1.4.9', ok: true },
    localYakit: '1.4.9',
    latestYak: '1.4.9',
    intranetFile: '',
  }
  const engineList = { value: [] as string[] }
  return {
    startIdleVisibleInterval: vi.fn(() => vi.fn()),
    queryRisks: vi.fn(),
    edition: { community: true, yakit: true, enterprise: false },
    messageState: { unread: 0, menuOpen: false },
    menuActions: {
      setDynamicMenuOpen: vi.fn(),
      setCeUserMenuShow: vi.fn(),
      setLoginShow: vi.fn(),
      onUpdateApiKey: vi.fn(),
    },
    userInfo: { isLogin: false, platform: 'github' },
    eeConfig,
    versionSlots,
    engineList,
    engineFetchList: vi.fn(() => Promise.resolve(engineList.value.join('\n'))),
  }
})

vi.mock('@/utils/scheduleIdleTask', () => ({ startIdleVisibleInterval }))

vi.mock('@/services/electronBridge', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
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
      { fetchYaklangVersionList: engineFetchList },
      {
        get: (target, prop) => {
          if (Object.prototype.hasOwnProperty.call(target, prop)) {
            return (target as Record<string, unknown>)[prop as string]
          }
          if (String(prop).startsWith('on')) return vi.fn(() => vi.fn())
          return vi.fn().mockResolvedValue(undefined)
        },
      },
    ),
  }
})

vi.mock('@/apiUtils/grpc', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    grpcFetchLatestYakitVersion: vi.fn(() =>
      versionSlots.latestYakit.ok
        ? Promise.resolve(versionSlots.latestYakit.version)
        : Promise.reject(new Error('network unreachable')),
    ),
    grpcFetchLatestYakVersion: vi.fn(() => Promise.resolve(versionSlots.latestYak)),
    grpcFetchLocalYakVersion: vi.fn(() => Promise.resolve(versionSlots.latestYak)),
    grpcFetchLocalYakitVersion: vi.fn(() => Promise.resolve(versionSlots.localYakit)),
    grpcFetchIntranetYakitVersion: vi.fn(() =>
      versionSlots.intranetFile ? Promise.resolve(versionSlots.intranetFile) : Promise.reject(new Error('no file')),
    ),
  }
})

vi.mock('@/utils/kv', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    getLocalValue: vi.fn(() => Promise.resolve(undefined)),
    setLocalValue: vi.fn(() => Promise.resolve(undefined)),
  }
})

vi.mock('@/services/fetch', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    NetWorkApi: vi.fn(() => Promise.resolve(undefined)),
  }
})

vi.mock('@/utils/visitorsStatistics', () => ({
  visitorsStatisticsFun: vi.fn(),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' }, i18nRefresh: 0 }),
}))

vi.mock('@/utils/duplex/duplex', () => ({
  serverPushStatus: false,
}))

vi.mock('@/utils/envfile', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    isIRify: () => false,
    isCommunityEdition: () => true,
    isCommunityYakit: () => edition.community,
    isEnpriTrace: () => edition.enterprise,
    isEnpriTraceAgent: () => false,
    isMemfit: () => false,
    isYakit: () => edition.yakit,
    showDevTool: () => false,
    getReleaseEditionName: () => 'Yakit',
    getCurrentVersionSource: () => 'community',
  }
})

vi.mock('@/store', () => ({
  useStore: () => ({ userInfo }),
  useYakitDynamicStatus: () => ({
    dynamicStatus: { isDynamicStatus: false },
  }),
  useEeSystemConfig: () => ({ eeSystemConfig: eeConfig.value }),
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
    userMenu: [{ key: 'message-center', label: 'FuncDomain.messageCenter' }],
    ceUserMenuShow: messageState.menuOpen,
    setCeUserMenuShow: menuActions.setCeUserMenuShow,
    usageStatisticsShow: false,
    setUsageStatisticsShow: vi.fn(),
    rechargeVisible: false,
    setRechargeVisible: vi.fn(),
    apiKeys: '',
    apiKeysInfo: {},
    apiKeysInfoLoading: false,
    onUpdateApiKey: menuActions.onUpdateApiKey,
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
    dynamicMenuOpen: messageState.menuOpen,
    setDynamicMenuOpen: menuActions.setDynamicMenuOpen,
    robotControlModal: false,
    setRobotControlModal: vi.fn(),
    imControlBadge: 0,
    imControlStatus: '',
    refreshIMControlStatus: vi.fn(),
    onUserMenuClick: vi.fn(),
    loginShow: false,
    setLoginShow: menuActions.setLoginShow,
  }),
}))

vi.mock('../hooks/useEngineConsole/useEngineConsole', () => ({
  default: () => undefined,
}))

vi.mock('../update/useDownloadYakit', () => ({
  // UIOpNotice 按 [state, { onDownloadStart }] 数组解构
  useDownloadYakit: () => [{ downloadProgress: 0 }, { onDownloadStart: vi.fn() }],
}))

vi.mock('../../MessageCenter/useEETaskNotificationHook', () => ({
  // UIOpNotice 按 [loading, taskModalInfo, taskErrModalInfo, debugTaskEvent] 数组解构
  useEETaskNotificationHook: () => [
    false,
    { visible: false, title: '', okButtonText: '', data: [] },
    { visible: false, title: '', okButtonText: '', data: [] },
    { startT: vi.fn(), sureT: vi.fn(), coverP: vi.fn(), waitP: vi.fn() },
  ],
}))

vi.mock('@/pages/layout/NotepadMenu/NotepadMenu', () => ({
  NotepadMenu: () => null,
}))

vi.mock('../userMenu/UserMenuModals', () => ({
  UserMenuModals: () => null,
}))

vi.mock('../userMenu/UserAvatarIMBadge', () => ({
  UserAvatarIMBadge: ({ hasUnreadMessage }: { hasUnreadMessage: boolean }) => (
    <span data-testid="avatar-unread" data-unread={String(hasUnreadMessage)} />
  ),
}))

vi.mock('../../MessageCenter/useMessageUnread', () => ({
  useMessageUnread: () => messageState.unread,
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

import { FuncDomain, MoreYaklangVersion, UIOpNotice } from '../FuncDomain'
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
  onOpenConsole: vi.fn(),
  consoleType: 'float',
}

describe('MoreYaklangVersion 轻量选项', () => {
  beforeEach(() => {
    edition.community = true
    edition.yakit = true
  })

  const slimRadio = () => screen.getByRole('radio', { name: 'MoreYaklangVersion.slimVersion' })

  it('社区版初始为轻量，当前引擎变成全量后仍保持轻量', () => {
    const { rerender } = render(
      <MoreYaklangVersion moreYaklangVersionList={['1.4.8-beta19']} currentBuildType="slim" onClosePop={vi.fn()} />,
    )
    expect(slimRadio()).toBeChecked()

    rerender(
      <MoreYaklangVersion moreYaklangVersionList={['1.4.8-beta19']} currentBuildType="full" onClosePop={vi.fn()} />,
    )
    expect(slimRadio()).toBeChecked()
  })

  it('非社区版初始为全量', () => {
    edition.community = false
    render(
      <MoreYaklangVersion moreYaklangVersionList={['1.4.8-beta19']} currentBuildType="full" onClosePop={vi.fn()} />,
    )
    expect(screen.getByRole('radio', { name: 'MoreYaklangVersion.standardVersion' })).toBeChecked()
  })
})

describe('FuncDomain 风险轮询卸载竞态', () => {
  beforeEach(() => {
    edition.community = true
    edition.yakit = true
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

describe('FuncDomain 头像消息提示接线', () => {
  afterEach(() => {
    userInfo.isLogin = false
    messageState.unread = 0
    messageState.menuOpen = false
  })

  it.each(['github', 'company'])('%s 头像随未读状态更新，未读消除后移除红点', (platform) => {
    userInfo.isLogin = true
    userInfo.platform = platform
    messageState.unread = 3
    queryRisks.mockResolvedValue({ Data: [] })
    const { rerender } = render(<FuncDomain {...baseProps} isJudgeLicense={false} />)
    expect(screen.getByTestId('avatar-unread')).toHaveAttribute('data-unread', 'true')
    messageState.unread = 0
    rerender(<FuncDomain {...baseProps} isJudgeLicense={false} onDevToolRefresh={vi.fn()} />)
    expect(screen.getByTestId('avatar-unread')).toHaveAttribute('data-unread', 'false')
  })

  it.each([
    ['github', 0, null],
    ['github', 12, '12'],
    ['github', 99, '99'],
    ['github', 120, '99+'],
    ['company', 0, null],
    ['company', 12, '12'],
    ['company', 99, '99'],
    ['company', 120, '99+'],
  ] as const)('%s 消息菜单显示未读总数 %s', async (platform, count, display) => {
    userInfo.isLogin = true
    userInfo.platform = platform
    messageState.unread = count
    messageState.menuOpen = true
    queryRisks.mockResolvedValue({ Data: [] })
    render(<FuncDomain {...baseProps} isJudgeLicense={false} />)
    expect(await screen.findByText('FuncDomain.messageCenter')).toBeInTheDocument()
    if (display) {
      expect(await screen.findByLabelText(`FuncDomain.unreadMessages: ${count}`)).toHaveTextContent(display)
    } else {
      expect(screen.queryByLabelText(/FuncDomain.unreadMessages:/)).not.toBeInTheDocument()
    }
  })
})

describe('FuncDomain 头像按钮点击区域', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryRisks.mockResolvedValue({ Data: [] })
  })

  afterEach(() => {
    userInfo.isLogin = false
    userInfo.platform = 'github'
  })

  it.each(['company', 'github'])('%s 点击头像周围留白也打开菜单', (platform) => {
    userInfo.isLogin = true
    userInfo.platform = platform
    render(<FuncDomain {...baseProps} isJudgeLicense={false} />)
    fireEvent.click(screen.getByTestId('user-menu-trigger'))
    expect(
      platform === 'company' ? menuActions.setDynamicMenuOpen : menuActions.setCeUserMenuShow,
    ).toHaveBeenCalledWith(true)
    if (platform === 'github') expect(menuActions.onUpdateApiKey).toHaveBeenCalledOnce()
  })

  it('未登录时点击头像周围留白打开登录', () => {
    userInfo.isLogin = false
    render(<FuncDomain {...baseProps} isJudgeLicense={false} />)
    fireEvent.click(screen.getByTestId('user-menu-trigger'))
    expect(menuActions.setLoginShow).toHaveBeenCalledWith(true)
  })
})

describe('UIOpNotice 更新按钮状态与文案', () => {
  beforeEach(() => {
    edition.community = true
    edition.yakit = true
    edition.enterprise = false
    eeConfig.value = []
    versionSlots.latestYakit = { version: 'v1.4.9', ok: true }
    versionSlots.localYakit = '1.4.9'
    versionSlots.latestYak = '1.4.9'
    versionSlots.intranetFile = ''
    engineList.value = []
    // 挂载时立即执行一次版本拉取（替代真实轮询的 runImmediately）
    ;(startIdleVisibleInterval as unknown as { mockImplementation: (fn?: () => void) => unknown }).mockImplementation(
      (fn?: () => void) => {
        fn?.()
        return () => {}
      },
    )
  })

  afterEach(() => {
    ;(startIdleVisibleInterval as unknown as { mockImplementation: (fn?: () => void) => unknown }).mockImplementation(
      () => () => {},
    )
    edition.enterprise = false
    eeConfig.value = []
  })

  // css modules 在 vitest 中被 stub 为空对象（见 vitest.config.ts stub-style-modules），
  // 无法断言 yakit-button-primary 类名，这里以按钮文案区分：有更新显示“更新”，无更新显示版本号。
  it('社区版官方有新版时按钮显示更新', async () => {
    versionSlots.latestYakit = { version: 'v1.4.10', ok: true }
    render(<UIOpNotice isEngineLink={true} isRemoteMode={false} />)
    expect(await screen.findByRole('button', { name: 'FuncDomain.update' })).toBeInTheDocument()
  })

  it('社区版无更新时按钮显示官方最新版本号', async () => {
    render(<UIOpNotice isEngineLink={true} isRemoteMode={false} />)
    expect(await screen.findByRole('button', { name: 'v1.4.9' })).toBeInTheDocument()
  })

  it('官方版本拉取失败时按钮回退显示本地版本号', async () => {
    versionSlots.latestYakit = { version: '', ok: false }
    render(<UIOpNotice isEngineLink={true} isRemoteMode={false} />)
    expect(await screen.findByRole('button', { name: 'v1.4.9' })).toBeInTheDocument()
  })

  it('引擎低于主推版本时按钮显示更新', async () => {
    engineList.value = ['v1.4.9', 'v1.4.8']
    render(<UIOpNotice isEngineLink={true} isRemoteMode={false} />)
    expect(await screen.findByRole('button', { name: 'FuncDomain.update' })).toBeInTheDocument()
  })

  it('内网模式下官方不可达但内网有新版时按钮仍显示更新', async () => {
    edition.enterprise = true
    eeConfig.value = [{ configName: 'clientUpdateType', isOpen: true }]
    versionSlots.latestYakit = { version: '', ok: false }
    versionSlots.intranetFile = 'D:/release/EnpriTrace-1.4.10-windows-amd64.exe'
    render(<UIOpNotice isEngineLink={true} isRemoteMode={false} />)
    // 内网配置经 200ms 防抖生效后再拉取内网版本号
    expect(await screen.findByRole('button', { name: 'FuncDomain.update' }, { timeout: 3000 })).toBeInTheDocument()
  })

  it('内网模式下无更新时按钮显示内网版本号', async () => {
    edition.enterprise = true
    eeConfig.value = [{ configName: 'clientUpdateType', isOpen: true }]
    versionSlots.intranetFile = 'D:/release/EnpriTrace-1.4.9-windows-amd64.exe'
    render(<UIOpNotice isEngineLink={true} isRemoteMode={false} />)
    expect(await screen.findByRole('button', { name: 'v1.4.9' }, { timeout: 3000 })).toBeInTheDocument()
  })
})
