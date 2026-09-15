import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YakitGlobalHost } from '../YakitGlobalHost'
import { yakitEngine } from '@/services/electronBridge'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))
vi.mock('@/services/electronBridge', () => ({
  yakitEngine: {
    fetchYaklangEngineAddr: vi.fn(),
  },
}))

describe('YakitGlobalHost', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestIdleCallback', undefined)
    vi.stubGlobal('cancelIdleCallback', undefined)
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    vi.mocked(yakitEngine.fetchYaklangEngineAddr).mockReset()
    vi.mocked(yakitEngine.fetchYaklangEngineAddr).mockResolvedValue({ addr: '127.0.0.1:9011' })
  })

  afterEach(() => {
    delete (document as any).hidden
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('引擎未连接时展示断开文案且不轮询地址', () => {
    render(<YakitGlobalHost isEngineLink={false} />)

    expect(screen.getByText('EngineManagement.disconnected')).toBeInTheDocument()
    expect(yakitEngine.fetchYaklangEngineAddr).not.toHaveBeenCalled()
  })

  it('引擎已连接后轮询并展示远程地址', async () => {
    render(<YakitGlobalHost isEngineLink={true} />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
      await Promise.resolve()
    })
    expect(yakitEngine.fetchYaklangEngineAddr).toHaveBeenCalled()
    expect(screen.getByText(/EngineManagement\.remote · 127\.0\.0\.1:9011/)).toBeInTheDocument()
  })

  it('托管引擎实例展示传输方式与端点', async () => {
    vi.mocked(yakitEngine.fetchYaklangEngineAddr).mockResolvedValue({
      addr: '',
      instance: {
        id: 'inst-1',
        transport: 'tcp',
        displayEndpoint: '127.0.0.1:8000',
        state: 'ready',
        ownership: 'managed',
        current: true,
        actions: { stop: true, connect: false },
        actionReason: 'connection_settings_required',
      },
    })
    render(<YakitGlobalHost isEngineLink={true} />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
      await Promise.resolve()
    })
    expect(screen.getByText('EngineManagement.local_tcp · 127.0.0.1:8000')).toBeInTheDocument()
  })

  it('断开连接后停止轮询并回到断开文案', async () => {
    const { rerender } = render(<YakitGlobalHost isEngineLink={true} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
      await Promise.resolve()
    })
    expect(screen.getByText(/127\.0\.0\.1:9011/)).toBeInTheDocument()
    const calls = vi.mocked(yakitEngine.fetchYaklangEngineAddr).mock.calls.length

    rerender(<YakitGlobalHost isEngineLink={false} />)
    expect(screen.getByText('EngineManagement.disconnected')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(yakitEngine.fetchYaklangEngineAddr).toHaveBeenCalledTimes(calls)
  })
})
