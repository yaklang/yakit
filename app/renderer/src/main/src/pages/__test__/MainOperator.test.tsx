const { ipcRendererMock } = vi.hoisted(() => {
  const ipcRendererMock = {
    invoke: vi.fn().mockResolvedValue(false),
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
    removeAllListeners: vi.fn(),
  }
  ;(window as any).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer: ipcRendererMock }
    return {}
  }
  return { ipcRendererMock }
})

import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { startIdleVisibleInterval } = vi.hoisted(() => ({
  startIdleVisibleInterval: vi.fn((cb: () => void) => {
    const id = setInterval(cb, 15000)
    return () => clearInterval(id)
  }),
}))

vi.mock('@/utils/scheduleIdleTask', () => ({ startIdleVisibleInterval }))

const { autoEnableMock } = vi.hoisted(() => ({ autoEnableMock: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/store/globalHotPatch', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return { ...actual, autoEnableGlobalHotPatch: autoEnableMock }
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))

vi.mock('@/store', () => ({
  useStore: () => ({ userInfo: { isLogin: false }, setStoreUserInfo: vi.fn() }),
  useYakitDynamicStatus: () => ({
    dynamicStatus: { isDynamicStatus: false, isDynamicSelfStatus: false },
    setDynamicStatus: vi.fn(),
  }),
  useEeSystemConfig: () => ({ eeSystemConfig: [] }),
}))

vi.mock('@/store/screenRecorder', () => ({
  useScreenRecorder: () => ({ screenRecorderInfo: { isRecording: false } }),
}))

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn().mockResolvedValue(''),
  setRemoteValue: vi.fn(),
  getLocalValue: vi.fn().mockResolvedValue(''),
  setLocalValue: vi.fn(),
}))

const edition = vi.hoisted(() => ({ memfit: false }))

vi.mock('@/utils/envfile', () => ({
  isCommunityEdition: () => true,
  isCommunityIRify: () => false,
  isEnpriTrace: () => false,
  isEnpriTraceAgent: () => false,
  isEnterpriseOrSimpleEdition: () => false,
  isIRify: () => false,
  isMemfit: () => edition.memfit,
  globalUserLogin: vi.fn(),
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
  success: vi.fn(),
  yakitFailed: vi.fn(),
}))

vi.mock('@/hook/useGetColorsByTheme', () => ({
  default: () => ({ colorPrimary: '#000' }),
}))

vi.mock('@/pages/layout/HeardMenu/HeardMenu', () => ({ default: () => null }))
vi.mock('@/pages/layout/publicMenu/PublicMenu', () => ({
  default: ({ defaultExpand }: { defaultExpand: boolean }) => (
    <div data-testid="public-menu" data-expanded={defaultExpand} />
  ),
}))
vi.mock('@/pages/layout/mainOperatorContent/MainOperatorContent', () => ({
  MainOperatorContent: () => null,
}))
vi.mock('@/pages/Login', () => ({ default: () => null }))
vi.mock('@/pages/SetPassword', () => ({ default: () => null }))
vi.mock('@/pages/customizeMenu/CustomizeMenu', () => ({ default: () => null }))
vi.mock('@/pages/dynamicControl/DynamicControl', () => ({ ControlOperation: () => null }))
vi.mock('@/components/yakChat/chatCS', () => ({ YakChatCS: () => null }))
vi.mock('@/components/MessageCenter/MessageCenter', () => ({ MessageCenterModal: () => null }))
vi.mock('@/components/yakitUI/YakitHint/YakitHint', () => ({ YakitHint: () => null }))
vi.mock('@/components/yakitUI/YakitHint/YakitHintModal', () => ({ YakitHintModal: () => null }))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({ YakitModal: () => null }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children }: { children?: React.ReactNode }) => <button>{children}</button>,
}))
vi.mock('@/pages/YakRunnerProjectManager/YakRunnerProjectManager', () => ({
  IRifyUpdateProjectManagerModal: () => null,
}))
vi.mock('@/pages/ai-re-act/hooks/persist/aiChatPersistStore', () => ({
  default: {
    open: () => Promise.resolve(),
    close: () => Promise.resolve(),
    getState: () => ({}),
  },
}))

vi.mock('antd', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    Watermark: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  }
})

import Main from '../MainOperator'

describe('MainOperator 远程控制轮询', () => {
  let mockHidden = false

  beforeEach(() => {
    edition.memfit = false
    vi.useFakeTimers()
    vi.stubGlobal('requestIdleCallback', undefined)
    vi.stubGlobal('cancelIdleCallback', undefined)
    mockHidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => mockHidden })
    startIdleVisibleInterval.mockClear()
    autoEnableMock.mockClear()
    ipcRendererMock.invoke.mockImplementation(async (channel: string) => {
      if (channel === 'GetYakitCompletionRaw') return { RawJson: new Uint8Array([123, 125]) }
      if (channel === 'GetYakVMBuildInMethodCompletion') return { Suggestions: [] }
      if (channel === 'alive-dynamic-control-status') return false
      return undefined
    })
  })

  afterEach(() => {
    delete (document as any).hidden
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('Memfit 默认展开图标菜单，不读取历史折叠设置', async () => {
    edition.memfit = true
    const { getRemoteValue } = await import('@/utils/kv')
    await act(async () => {
      render(<Main />)
    })
    expect(screen.getByTestId('public-menu')).toHaveAttribute('data-expanded', 'true')
    expect(getRemoteValue).not.toHaveBeenCalledWith('menu-expand')
  })

  it('挂载后启动远程控制状态轮询', () => {
    render(<Main />)
    expect(startIdleVisibleInterval).toHaveBeenCalled()
  })

  it('首页挂载时触发全局热加载自启动', () => {
    render(<Main />)
    expect(autoEnableMock).toHaveBeenCalledTimes(1)
  })

  it('卸载后停止轮询，不再请求 alive-dynamic-control-status', async () => {
    const { unmount } = render(<Main />)
    const cancel = startIdleVisibleInterval.mock.results[0]?.value as () => void
    unmount()
    expect(cancel).toEqual(expect.any(Function))

    ipcRendererMock.invoke.mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(ipcRendererMock.invoke).not.toHaveBeenCalledWith('alive-dynamic-control-status')
  })

  it('首屏挂载不请求 GetYakitCompletionRaw（Monaco 延后到编辑器首次导入）', async () => {
    render(<Main />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(ipcRendererMock.invoke).not.toHaveBeenCalledWith('GetYakitCompletionRaw')
    expect(ipcRendererMock.invoke).not.toHaveBeenCalledWith('GetYakVMBuildInMethodCompletion', expect.anything())
  })
})
