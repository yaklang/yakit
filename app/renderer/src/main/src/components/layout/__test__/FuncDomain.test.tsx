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

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  useI18nNamespaces: () => ({ t: tMock, i18n: { language: 'zh' }, i18nRefresh: 0 }),
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
    screenRecorderInfo: { token: 't', isRecording: screenRecorderState.isRecording },
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
    { stop: vi.fn(), start: vi.fn(), reset: vi.fn(), cancel: vi.fn() },
  ],
}))

import { FuncDomain, MoreYaklangVersion, UIOpNotice } from '../FuncDomain'
import type { FuncDomainProp } from '../FuncDomain'
import { yakitUILayout } from '@/services/electronBridge'
import emiter from '@/utils/eventBus/eventBus'
import { yakitNotify } from '@/utils/notification'

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

describe('FuncDomain 引擎Console终端图标下拉', () => {
  const openConsole = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    queryRisks.mockResolvedValue({ Data: [] })
  })

  it('点击终端图标展开四种打开方式并回调 onOpenConsole', async () => {
    render(<FuncDomain {...baseProps} onOpenConsole={openConsole} />)

    fireEvent.click(screen.getByTestId('engine-console-trigger'))
    // i18n mock 的 t 返回 key 本身
    expect(await screen.findByText('FuncDomain.engineConsoleFloat')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.engineConsoleLeft')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.engineConsoleRight')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.engineConsoleBottom')).toBeInTheDocument()

    fireEvent.click(screen.getByText('FuncDomain.engineConsoleBottom'))
    await waitFor(() => expect(openConsole).toHaveBeenCalledWith('bottom'))
  })

  it('当前打开方式的菜单项带选中标记', async () => {
    render(<FuncDomain {...baseProps} onOpenConsole={openConsole} consoleType="right" />)

    fireEvent.click(screen.getByTestId('engine-console-trigger'))
    await screen.findByText('FuncDomain.engineConsoleFloat', { selector: 'span' })
    // 仅当前 consoleType 的菜单项渲染 CheckOutlined 的 svg
    const checked = [
      'FuncDomain.engineConsoleFloat',
      'FuncDomain.engineConsoleLeft',
      'FuncDomain.engineConsoleRight',
      'FuncDomain.engineConsoleBottom',
    ]
      .map((label) => screen.getByText(label).closest('div'))
      .filter((div) => div?.querySelector('svg'))
    expect(checked).toHaveLength(1)
    expect(checked[0]).toHaveTextContent('FuncDomain.engineConsoleRight')
  })
})

describe('FuncDomain 设置菜单（UIOpSetting）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryRisks.mockResolvedValue({ Data: [] })
    screenRecorderState.isRecording = false
  })

  /** 设置入口（UIOpSetting 触发按钮）；定位用 testid，勿用 class 选择器（根 vitest 配置会把 scss stub 成空对象） */
  const openSettingMenu = () => {
    fireEvent.click(screen.getByTestId('ui-op-setting-trigger'))
  }

  it('设置菜单按顺序展示 i18n 后的菜单项', async () => {
    render(<FuncDomain {...baseProps} />)
    openSettingMenu()

    expect(await screen.findByText('FuncDomain.pcapfix')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.project')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.dbCacheManager')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.cveDatabase')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.explab')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.link')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.refreshMenu')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.performanceSampling')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.logs')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.diagnoseNetwork')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.screen')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.screenshot')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.settings')).toBeInTheDocument()
    expect(screen.getByText('HelpDoc.officialWebsite')).toBeInTheDocument()
    expect(screen.getByText('Github')).toBeInTheDocument()
    expect(screen.getByText('HelpDoc.aboutUs')).toBeInTheDocument()
  })

  it('点击「刷新菜单」触发 refreshMainMenu', async () => {
    render(<FuncDomain {...baseProps} />)
    openSettingMenu()

    fireEvent.click(await screen.findByText('FuncDomain.refreshMenu'))
    await waitFor(() => expect(yakitUILayout.refreshMainMenu).toHaveBeenCalled())
  })

  it('父级菜单标题点击不动作：点「切换连接模式」不触发切换也不收层', async () => {
    const onEngineModeChange = vi.fn()
    render(<FuncDomain {...baseProps} onEngineModeChange={onEngineModeChange} />)
    openSettingMenu()

    fireEvent.click(await screen.findByText('FuncDomain.link'))
    expect(onEngineModeChange).not.toHaveBeenCalled()
    // 弹层未收起
    expect(screen.getByText('FuncDomain.pcapfix')).toBeInTheDocument()
  })

  it('点击「全局设置」发出 openPage 事件', async () => {
    render(<FuncDomain {...baseProps} />)
    openSettingMenu()

    fireEvent.click(await screen.findByText('FuncDomain.settings'))
    const calls = (emiter.emit as ReturnType<typeof vi.fn>).mock.calls.filter(([name]) => name === 'openPage')
    expect(calls.length).toBeGreaterThan(0)
    const payload = calls[calls.length - 1][1] as string
    // route 枚举序列化形式与转换器有关，只断言锚点参数
    expect(payload).toContain('"anchor":"general"')
  })
})

describe('FuncDomain 设置菜单录屏/截屏', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryRisks.mockResolvedValue({ Data: [] })
    screenRecorderState.isRecording = false
  })

  /** 设置入口（UIOpSetting 触发按钮）；定位用 testid，勿用 class 选择器（根 vitest 配置会把 scss stub 成空对象） */
  const openSettingMenu = () => {
    fireEvent.click(screen.getByTestId('ui-op-setting-trigger'))
  }

  it('一级「录屏」与二级「录屏」点击同效：未录制时拉起录屏弹窗', async () => {
    render(<FuncDomain {...baseProps} />)
    openSettingMenu()

    expect(await screen.findByText('FuncDomain.screen')).toBeInTheDocument()
    expect(screen.getByText('FuncDomain.screenshot')).toBeInTheDocument()

    // 点击一级「录屏」标题（parentTitleClick 与二级同效）
    fireEvent.click(screen.getByText('FuncDomain.screen'))
    await waitFor(() => expect(yakitUILayout.requestOpenScreenCapModal).toHaveBeenCalled())
  })

  it('录制中一级与二级显示停止录屏，点击即停止', async () => {
    screenRecorderState.isRecording = true
    render(<FuncDomain {...baseProps} />)
    openSettingMenu()

    // 一级「录屏」变为停止录屏
    const stopItem = await screen.findByText('FuncDomain.stopScreen')
    fireEvent.click(stopItem)
    await waitFor(() => expect(yakitUILayout.cancelScreenRecorder).toHaveBeenCalledWith('t'))
  })

  it('点击截屏触发 activateScreenshot，1 秒内 loading 不重复触发', async () => {
    render(<FuncDomain {...baseProps} />)
    openSettingMenu()

    const screenshotItem = await screen.findByText('FuncDomain.screenshot')
    fireEvent.click(screenshotItem)
    await waitFor(() => expect(yakitUILayout.activateScreenshot).toHaveBeenCalledTimes(1))

    // loading 期间再次点击不触发第二次
    fireEvent.click(screen.getByText('FuncDomain.screenshot'))
    expect(yakitUILayout.activateScreenshot).toHaveBeenCalledTimes(1)
  })
})

describe('FuncDomain 性能采样与崩溃日志', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryRisks.mockResolvedValue({ Data: [] })
    grpcFetchLocalPluginDetail.mockRejectedValue(new Error('not found'))
  })

  /** 设置入口（UIOpSetting 触发按钮）；定位用 testid，勿用 class 选择器（根 vitest 配置会把 scss stub 成空对象） */
  const openSettingMenu = () => {
    fireEvent.click(screen.getByTestId('ui-op-setting-trigger'))
  }

  it('插件不存在时性能采样提示带原文插件名', async () => {
    render(<FuncDomain {...baseProps} />)
    openSettingMenu()

    fireEvent.click(await screen.findByText('FuncDomain.performanceSampling'))
    await waitFor(() => expect(grpcFetchLocalPluginDetail).toHaveBeenCalledWith({ Name: '核心引擎性能采样' }, true))
    // 插件名不进翻译，作为插值原样传入
    await waitFor(() =>
      expect(yakitNotify).toHaveBeenCalledWith('info', 'FuncDomain.samplingPluginNotFound?name=核心引擎性能采样'),
    )
  })

  it('onUIOpSettingMenuSelect 事件可触发崩溃日志收集（Home.tsx 复用路径）', async () => {
    render(<FuncDomain {...baseProps} />)

    // UIOpSetting 通过 emiter 监听 onUIOpSettingMenuSelect；直接调用监听回调等价于 emit
    const calls = (emiter.on as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([name]) => name === 'onUIOpSettingMenuSelect',
    )
    expect(calls.length).toBeGreaterThan(0)
    const handler = calls[calls.length - 1][1] as (key: string) => void
    await act(async () => {
      handler('crash-log')
    })
    await waitFor(() => expect(grpcFetchLocalPluginDetail).toHaveBeenCalledWith({ Name: '崩溃日志收集' }, true))
    await waitFor(() =>
      expect(yakitNotify).toHaveBeenCalledWith('info', 'FuncDomain.crashLogPluginNotFound?name=崩溃日志收集'),
    )
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
  // 冷缓存环境首例要承担模块懒编译成本，测试超时给足余量（CI 同为冷环境）。
  it('社区版官方有新版时按钮显示更新', async () => {
    versionSlots.latestYakit = { version: 'v1.4.10', ok: true }
    render(<UIOpNotice isEngineLink={true} isRemoteMode={false} />)
    expect(await screen.findByRole('button', { name: 'FuncDomain.update' }, { timeout: 3000 })).toBeInTheDocument()
  }, 15000)

  it('社区版无更新时按钮显示当前本地版本号', async () => {
    render(<UIOpNotice isEngineLink={true} isRemoteMode={false} />)
    expect(await screen.findByRole('button', { name: 'v1.4.9' }, { timeout: 3000 })).toBeInTheDocument()
  }, 15000)

  it('官方版本拉取失败时按钮仍显示本地版本号', async () => {
    versionSlots.latestYakit = { version: '', ok: false }
    render(<UIOpNotice isEngineLink={true} isRemoteMode={false} />)
    expect(await screen.findByRole('button', { name: 'v1.4.9' }, { timeout: 3000 })).toBeInTheDocument()
  }, 15000)

  it('引擎低于主推版本时按钮显示更新', async () => {
    engineList.value = ['v1.4.9', 'v1.4.8']
    render(<UIOpNotice isEngineLink={true} isRemoteMode={false} />)
    expect(await screen.findByRole('button', { name: 'FuncDomain.update' }, { timeout: 3000 })).toBeInTheDocument()
  }, 15000)

  it('内网模式下官方不可达但内网有新版时按钮仍显示更新', async () => {
    edition.enterprise = true
    eeConfig.value = [{ configName: 'clientUpdateType', isOpen: true }]
    versionSlots.latestYakit = { version: '', ok: false }
    versionSlots.intranetFile = 'D:/release/EnpriTrace-1.4.10-windows-amd64.exe'
    render(<UIOpNotice isEngineLink={true} isRemoteMode={false} />)
    // 内网配置经 200ms 防抖生效后再拉取内网版本号
    expect(await screen.findByRole('button', { name: 'FuncDomain.update' }, { timeout: 3000 })).toBeInTheDocument()
  }, 15000)

  it('内网模式下无更新时按钮显示本地版本号', async () => {
    edition.enterprise = true
    eeConfig.value = [{ configName: 'clientUpdateType', isOpen: true }]
    versionSlots.intranetFile = 'D:/release/EnpriTrace-1.4.9-windows-amd64.exe'
    render(<UIOpNotice isEngineLink={true} isRemoteMode={false} />)
    expect(await screen.findByRole('button', { name: 'v1.4.9' }, { timeout: 3000 })).toBeInTheDocument()
  }, 15000)
})
