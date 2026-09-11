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

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RemoteGV } from '@/yakitGV'

const { startIdleVisibleInterval, setRemoteValue, getRemoteValue } = vi.hoisted(() => ({
  startIdleVisibleInterval: vi.fn(() => vi.fn()),
  setRemoteValue: vi.fn().mockResolvedValue(undefined),
  getRemoteValue: vi.fn().mockResolvedValue(''),
}))

vi.mock('@/utils/scheduleIdleTask', () => ({ startIdleVisibleInterval }))

vi.mock('@/utils/kv', () => ({
  getRemoteValue,
  setRemoteValue,
  getLocalValue: vi.fn().mockResolvedValue(''),
  setLocalValue: vi.fn(),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' }, i18nRefresh: 0 }),
}))

vi.mock('@/utils/envfile', () => ({
  isEnpriTraceAgent: () => false,
  isIRify: () => false,
}))

vi.mock('@/utils/duplex/duplex', () => ({
  serverPushStatus: false,
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}))

vi.mock('@/utils/notification', () => ({
  failed: vi.fn(),
  info: vi.fn(),
  yakitFailed: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('@/store/runNode', () => ({
  useRunNodeStore: () => ({ runNodeList: new Map() }),
}))

vi.mock('@/services/electronBridge', () => ({
  yakitApp: { setZoomFactor: vi.fn() },
  yakitHost: {},
  yakitPlugin: { queryYakScript: vi.fn().mockResolvedValue({ Total: 1, Data: [] }) },
  yakitReverse: {
    config: vi.fn().mockResolvedValue({}),
    setYakBridgeLogServer: vi.fn().mockResolvedValue({}),
    getGlobalReverseServer: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/components/yakitUI/YakitInputNumber/YakitInputNumber', () => ({
  YakitInputNumber: ({
    onChange,
    value,
    formatter,
  }: {
    onChange?: (v: number) => void
    value?: number
    formatter?: (v: number) => string
  }) => (
    <input
      data-testid={String(formatter?.(1) || '').includes('s') ? 'time-interval' : 'zoom-scale'}
      value={value}
      onChange={(e) => onChange?.(Number(e.target.value))}
    />
  ),
}))

vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ children, content }: { children?: React.ReactNode; content?: React.ReactNode }) => (
    <div>
      {children}
      {content}
    </div>
  ),
}))

vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

vi.mock('@/components/yakitUI/YakitHint/YakitHint', () => ({
  YakitHint: () => null,
}))

vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({
  YakitTag: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/yakitUI/YakitCheckbox/YakitCheckbox', () => ({
  YakitCheckbox: () => null,
}))

vi.mock('@/pages/mitm/MITMServerHijacking/MITMPluginOnline', () => ({
  YakitGetOnlinePlugin: () => null,
}))

vi.mock('@/apiUtils/grpc', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    grpcFetchBuildInYakVersion: vi.fn().mockResolvedValue('dev'),
    grpcFetchLocalYakVersion: vi.fn().mockResolvedValue('dev'),
    grpcFetchSpecifiedYakVersionHash: vi.fn().mockResolvedValue(''),
    grpcFetchLocalYakVersionHash: vi.fn().mockResolvedValue(''),
  }
})

import { GlobalState } from '../GlobalState'

const mcp = {
  mcpStreamInfo: {
    mcpCurrent: null,
    mcpServerUrl: '',
  },
} as any

describe('GlobalState 间隔持久化与连接状态', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    startIdleVisibleInterval.mockClear()
    setRemoteValue.mockClear()
    getRemoteValue.mockClear()
    getRemoteValue.mockResolvedValue('')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('修改刷新间隔会写入 remote 配置', async () => {
    render(<GlobalState isEngineLink={false} system="Windows_NT" mcp={mcp} />)

    const input = screen.getByTestId('time-interval')
    fireEvent.change(input, { target: { value: '8' } })
    expect(setRemoteValue).toHaveBeenCalledWith(RemoteGV.GlobalStateTimeInterval, '8')
  })

  it('引擎连接时读取间隔配置，断开时停止沿用连接态副作用', async () => {
    const { rerender } = render(<GlobalState isEngineLink system="Windows_NT" mcp={mcp} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(getRemoteValue).toHaveBeenCalledWith(RemoteGV.GlobalStateTimeInterval)

    getRemoteValue.mockClear()
    rerender(<GlobalState isEngineLink={false} system="Windows_NT" mcp={mcp} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(getRemoteValue).not.toHaveBeenCalledWith(RemoteGV.GlobalStateTimeInterval)
  })
})
