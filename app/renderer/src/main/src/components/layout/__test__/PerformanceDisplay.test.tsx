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
})

import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PerformanceDisplay } from '../PerformanceDisplay'
import { yakitPerf } from '@/services/electronBridge'

vi.mock('@/services/electronBridge', () => ({
  yakitPerf: {
    startComputePercent: vi.fn(),
    clearComputePercent: vi.fn(),
    fetchComputePercent: vi.fn(),
  },
  yakitEngine: {
    listYakGrpc: vi.fn().mockResolvedValue([]),
    fetchYaklangEngineAddr: vi.fn().mockResolvedValue({ addr: '127.0.0.1:9011' }),
    killYakGrpc: vi.fn(),
  },
  yakitApp: {},
  yakitUILayout: {},
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { on: vi.fn(), off: vi.fn() },
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('@/store/runNode', () => ({
  useRunNodeStore: () => ({ runNodeList: new Map() }),
}))

vi.mock('@/store/temporaryProject', () => ({
  useTemporaryProjectStore: () => ({ delTemporaryProject: vi.fn() }),
}))

vi.mock('@/store', () => ({
  yakitDynamicStatus: () => ({
    dynamicStatus: { isDynamicStatus: false },
  }),
}))

vi.mock('@/utils/envfile', () => ({
  getReleaseEditionName: () => 'Yakit',
  isEnpriTraceAgent: () => false,
}))

vi.mock('../YakitGlobalHost', () => ({
  YakitGlobalHost: () => null,
}))

vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children }: { children?: React.ReactNode }) => <button>{children}</button>,
}))

vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({
  YakitTag: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/yakitUI/YakitPopconfirm/YakitPopconfirm', () => ({
  YakitPopconfirm: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  showYakitModal: vi.fn(),
}))

vi.mock('react-sparklines', () => ({
  Sparklines: () => null,
  SparklinesCurve: () => null,
}))

describe('PerformanceDisplay CPU 采集', () => {
  let mockHidden = false

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestIdleCallback', undefined)
    vi.stubGlobal('cancelIdleCallback', undefined)
    mockHidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => mockHidden })
    vi.mocked(yakitPerf.startComputePercent).mockReset()
    vi.mocked(yakitPerf.clearComputePercent).mockReset()
    vi.mocked(yakitPerf.fetchComputePercent).mockReset()
    vi.mocked(yakitPerf.fetchComputePercent).mockResolvedValue([10])
  })

  afterEach(() => {
    delete (document as any).hidden
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('空闲后启动 CPU 采集', async () => {
    render(<PerformanceDisplay engineMode="local" typeCallback={vi.fn()} engineLink />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(yakitPerf.startComputePercent).toHaveBeenCalledTimes(1)
    expect(yakitPerf.fetchComputePercent).toHaveBeenCalled()
  })

  it('页面隐藏时停止采集且不再拉取', async () => {
    render(<PerformanceDisplay engineMode="local" typeCallback={vi.fn()} engineLink />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    const fetches = vi.mocked(yakitPerf.fetchComputePercent).mock.calls.length

    mockHidden = true
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(yakitPerf.clearComputePercent).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(yakitPerf.fetchComputePercent).toHaveBeenCalledTimes(fetches)
  })

  it('卸载时停止 CPU 采集', async () => {
    const { unmount } = render(<PerformanceDisplay engineMode="local" typeCallback={vi.fn()} engineLink />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    unmount()
    expect(yakitPerf.clearComputePercent).toHaveBeenCalledTimes(1)
  })
})
