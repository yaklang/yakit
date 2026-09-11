import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { YakitGlobalHost } from '../YakitGlobalHost'
import { yakitEngine } from '@/services/electronBridge'

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

  it('引擎未连接时展示占位且不轮询地址', () => {
    render(<YakitGlobalHost isEngineLink={false} />)

    expect(screen.getAllByText('??')).toHaveLength(2)
    expect(yakitEngine.fetchYaklangEngineAddr).not.toHaveBeenCalled()
  })

  it('引擎已连接后轮询并展示地址', async () => {
    render(<YakitGlobalHost isEngineLink={true} />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
      await Promise.resolve()
    })
    expect(yakitEngine.fetchYaklangEngineAddr).toHaveBeenCalled()
    expect(screen.getByText(/127\.0\.0\.1/)).toBeInTheDocument()
    expect(screen.getByText('9011')).toBeInTheDocument()
  })

  it('断开连接后停止轮询并回到占位', async () => {
    const { rerender } = render(<YakitGlobalHost isEngineLink={true} />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
      await Promise.resolve()
    })
    expect(screen.getByText(/127\.0\.0\.1/)).toBeInTheDocument()
    const calls = vi.mocked(yakitEngine.fetchYaklangEngineAddr).mock.calls.length

    rerender(<YakitGlobalHost isEngineLink={false} />)
    expect(screen.getAllByText('??')).toHaveLength(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(yakitEngine.fetchYaklangEngineAddr).toHaveBeenCalledTimes(calls)
  })
})
