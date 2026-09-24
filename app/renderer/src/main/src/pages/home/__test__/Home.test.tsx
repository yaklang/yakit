const { ipcRendererMock, inViewport } = vi.hoisted(() => {
  const ipcRendererMock = {
    invoke: vi.fn().mockImplementation(async (channel: string) => {
      if (channel === 'QueryAvailableRiskLevel') return { Values: [] }
      if (channel === 'QueryHTTPFlows') return { Total: 0 }
      if (channel === 'fetch-system-name') return 'Windows_NT'
      if (channel === 'IsPrivileged') return { IsPrivileged: true }
      return {}
    }),
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
    removeAllListeners: vi.fn(),
  }
  ;(window as any).require = (id: string) => {
    if (id === 'electron') return { ipcRenderer: ipcRendererMock }
    return {}
  }
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(window as any).ResizeObserver = ResizeObserverStub
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
  return { ipcRendererMock, inViewport: { current: true } }
})

import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { startIdleVisibleInterval, pendingRef } = vi.hoisted(() => ({
  startIdleVisibleInterval: vi.fn(() => vi.fn()),
  pendingRef: { current: [] as { id: string }[] },
}))

vi.mock('@/utils/scheduleIdleTask', () => ({ startIdleVisibleInterval }))

vi.mock('ahooks', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useInViewport: () => [inViewport.current],
  }
})

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn().mockResolvedValue(''),
  setRemoteValue: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/utils/envfile', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    getReleaseEditionName: () => 'Yakit',
    isCommunityYakit: () => true,
    isEnpriTrace: () => false,
    isEnpriTraceAgent: () => false,
  }
})

vi.mock('@/store/publicMenu', () => ({
  usePluginToId: () => ({ pluginToId: {} }),
}))

vi.mock('@/store/softMode', () => ({
  useSoftMode: () => ({ softMode: '' }),
  YakitModeEnum: {},
}))

vi.mock('@/store/screenRecorder', () => ({
  useScreenRecorder: () => ({ screenRecorderInfo: { isRecording: false } }),
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
}))

vi.mock('../../ai-agent/browserInstances/browserInstanceStore', () => ({
  useBrowserInstances: () => ({
    instances: [],
    pending: pendingRef.current,
    selectedId: '',
    loading: false,
    error: '',
  }),
}))

vi.mock('@/pages/plugins/utils', () => ({
  apiQueryYakScriptTotal: vi.fn().mockResolvedValue({ Total: 0 }),
}))

vi.mock('@/pages/assetViewer/PortTable/utils', () => ({
  apiQueryPortsBase: vi.fn().mockResolvedValue({ Total: 0 }),
}))

vi.mock('@/pages/layout/NotepadMenu/utils', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    getNotepadAdd: () => 'add',
    getNotepadManage: () => 'manage',
  }
})

vi.mock('lottie-web', () => ({
  default: {
    loadAnimation: () => ({ destroy: () => undefined, play: () => undefined, stop: () => undefined }),
  },
}))

vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({ firstNode, secondNode }: { firstNode?: React.ReactNode; secondNode?: React.ReactNode }) => (
    <div>
      {firstNode}
      {secondNode}
    </div>
  ),
}))

import Home from '../Home'
import { yakitNotify } from '@/utils/notification'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { AIAgentTabListEnum, SwitchAIAgentTabEventEnum } from '../../ai-agent/defaultConstant'

describe('Home 离开首页停止轮询', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    inViewport.current = true
    startIdleVisibleInterval.mockClear()
    ipcRendererMock.invoke.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('首页在视口内时启动证书/网卡轮询', async () => {
    render(<Home />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(startIdleVisibleInterval).toHaveBeenCalled()
  })

  it('离开首页后停止轮询', async () => {
    const { rerender } = render(<Home />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    const cancel = startIdleVisibleInterval.mock.results[0]?.value as ReturnType<typeof vi.fn>
    expect(cancel).toEqual(expect.any(Function))

    inViewport.current = false
    rerender(<Home />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    expect(cancel).toHaveBeenCalled()
    const callsAfterLeave = startIdleVisibleInterval.mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(startIdleVisibleInterval).toHaveBeenCalledTimes(callsAfterLeave)
  })
})

describe('Home 浏览器配对全局提示', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    pendingRef.current = []
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    pendingRef.current = []
  })

  it('初次出现 pending id 时通知，点击依次打开 AI Agent 浏览器页签', async () => {
    const { rerender } = render(<Home />)
    expect(yakitNotify).not.toHaveBeenCalled()

    pendingRef.current = [{ id: 'pair-1' }]
    await act(async () => {
      rerender(<Home />)
    })
    expect(yakitNotify).toHaveBeenCalledTimes(1)
    expect(yakitNotify).toHaveBeenCalledWith(
      'info',
      expect.objectContaining({
        onClick: expect.any(Function),
      }),
    )

    const payload = vi.mocked(yakitNotify).mock.calls[0][1] as { onClick: () => void }
    payload.onClick()
    expect(emiter.emit).toHaveBeenCalledWith('menuOpenPage', JSON.stringify({ route: YakitRoute.AI_Agent }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(emiter.emit).toHaveBeenCalledWith(
      'switchAIAgentTab',
      JSON.stringify({
        type: SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE,
        params: { active: AIAgentTabListEnum.Browser, show: true },
      }),
    )
  })

  it('pending 更新但无新 id 时不重复通知', async () => {
    const { rerender } = render(<Home />)
    pendingRef.current = [{ id: 'pair-1' }]
    await act(async () => {
      rerender(<Home />)
    })
    expect(yakitNotify).toHaveBeenCalledTimes(1)

    pendingRef.current = [{ id: 'pair-1' }]
    await act(async () => {
      rerender(<Home />)
    })
    expect(yakitNotify).toHaveBeenCalledTimes(1)
  })
})
