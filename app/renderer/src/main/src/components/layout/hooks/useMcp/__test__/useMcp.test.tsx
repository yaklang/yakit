import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@/services/electronBridge', () => ({
  yakitStream: {
    onData: vi.fn(() => vi.fn()),
    onError: vi.fn(() => vi.fn()),
    onEnd: vi.fn(() => vi.fn()),
    cancel: vi.fn(),
  },
  yakitMcp: {
    startServer: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))

vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(),
  setRemoteValue: vi.fn(),
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: vi.fn(),
}))

vi.mock('@/constants/hardware', () => ({
  SystemInfo: { mode: 'local' },
}))

import useMcpStream from '../useMcp'
import { getRemoteValue } from '@/utils/kv'
import { yakitMcp } from '@/services/electronBridge'

const getRemoteValueMock = vi.mocked(getRemoteValue)
const yakitMcpMock = vi.mocked(yakitMcp)

describe('useMcpStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getRemoteValueMock.mockResolvedValue('')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('引擎连接后从缓存恢复启动地址', async () => {
    getRemoteValueMock.mockResolvedValue(
      JSON.stringify({
        autoStart: false,
        url: '127.0.0.1:9011',
        enableLegacyMcpTools: true,
        enableAIToolFramework: true,
        enableBridgeExternalMcp: false,
      }),
    )

    const { result } = renderHook(() => useMcpStream({ engineLink: true }))

    await waitFor(() => {
      expect(result.current[0].mcpUrl).toBe('127.0.0.1:9011')
    })
    expect(getRemoteValueMock).toHaveBeenCalled()
  })

  it('引擎连接且缓存自启动为 true 时自动启动 MCP', async () => {
    getRemoteValueMock.mockResolvedValue(
      JSON.stringify({
        autoStart: true,
        url: '127.0.0.1:11432',
        enableLegacyMcpTools: true,
        enableAIToolFramework: true,
        enableBridgeExternalMcp: false,
      }),
    )

    const { result } = renderHook(() => useMcpStream({ engineLink: true }))

    await waitFor(() => {
      expect(yakitMcpMock.startServer).toHaveBeenCalled()
    })
    expect(result.current[0].mcpUrl).toBe('127.0.0.1:11432')
  })

  it('缓存自启动为 false 时不自动启动 MCP', async () => {
    getRemoteValueMock.mockResolvedValue(
      JSON.stringify({
        autoStart: false,
        url: '127.0.0.1:11432',
        enableLegacyMcpTools: true,
        enableAIToolFramework: true,
        enableBridgeExternalMcp: false,
      }),
    )

    renderHook(() => useMcpStream({ engineLink: true }))

    await waitFor(() => {
      expect(getRemoteValueMock).toHaveBeenCalled()
    })
    expect(yakitMcpMock.startServer).not.toHaveBeenCalled()
  })

  it('远程模式下使用默认远程地址', async () => {
    const { SystemInfo } = await import('@/constants/hardware')
    ;(SystemInfo as any).mode = 'remote'
    getRemoteValueMock.mockResolvedValue(
      JSON.stringify({
        autoStart: false,
        url: '127.0.0.1:9011',
        enableLegacyMcpTools: true,
        enableAIToolFramework: true,
        enableBridgeExternalMcp: false,
      }),
    )

    const { result } = renderHook(() => useMcpStream({ engineLink: true }))

    await waitFor(() => {
      expect(result.current[0].mcpUrl).toBe('0.0.0.0:11432')
    })
  })
})
