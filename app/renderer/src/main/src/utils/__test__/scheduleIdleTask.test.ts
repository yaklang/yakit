import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startIdleVisibleInterval } from '../scheduleIdleTask'

describe('startIdleVisibleInterval', () => {
  let mockHidden = false

  const setHidden = (hidden: boolean) => {
    mockHidden = hidden
  }
  const becomeVisible = () => {
    mockHidden = false
    document.dispatchEvent(new Event('visibilitychange'))
  }

  beforeEach(() => {
    vi.useFakeTimers()
    // jsdom 无 requestIdleCallback，显式禁用以固定走 setTimeout fallback，避免环境差异
    vi.stubGlobal('requestIdleCallback', undefined)
    vi.stubGlobal('cancelIdleCallback', undefined)
    mockHidden = false
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => mockHidden })
  })

  afterEach(() => {
    delete (document as any).hidden
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('空闲后再按周期执行，默认不立即执行回调', () => {
    const cb = vi.fn()
    startIdleVisibleInterval(cb, 1000)

    // 空闲回调（fallback 1ms）触发并启动 interval，但首tick要等一个周期
    vi.advanceTimersByTime(1)
    expect(cb).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(cb).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1000)
    expect(cb).toHaveBeenCalledTimes(2)
  })

  it('runImmediately 时启动后立即执行一次', () => {
    const cb = vi.fn()
    startIdleVisibleInterval(cb, 1000, { runImmediately: true })

    vi.advanceTimersByTime(1)
    expect(cb).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1000)
    expect(cb).toHaveBeenCalledTimes(2)
  })

  it('页面隐藏时跳过 tick，重新可见时立即补一次', () => {
    const cb = vi.fn()
    startIdleVisibleInterval(cb, 1000)
    vi.advanceTimersByTime(1) // 启动 interval

    setHidden(true)
    vi.advanceTimersByTime(3000)
    expect(cb).not.toHaveBeenCalled()

    becomeVisible()
    expect(cb).toHaveBeenCalledTimes(1)

    // 可见后恢复周期执行
    vi.advanceTimersByTime(1000)
    expect(cb).toHaveBeenCalledTimes(2)
  })

  it('未启动（空闲回调触发前）时 visibilitychange 不触发回调', () => {
    const cb = vi.fn()
    startIdleVisibleInterval(cb, 1000)

    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(1) // 空闲回调触发、interval 启动（无 runImmediately）
    vi.advanceTimersByTime(999) // 尚未到第一个周期
    expect(cb).not.toHaveBeenCalled()
  })

  it('cancel 后停止周期与可见补偿', () => {
    const cb = vi.fn()
    const cancel = startIdleVisibleInterval(cb, 1000, { runImmediately: true })
    vi.advanceTimersByTime(1)
    expect(cb).toHaveBeenCalledTimes(1)

    cancel()
    vi.advanceTimersByTime(5000)
    becomeVisible()
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('启动前 cancel 则回调永不执行', () => {
    const cb = vi.fn()
    const cancel = startIdleVisibleInterval(cb, 1000, { runImmediately: true })

    cancel()
    vi.advanceTimersByTime(5000)
    expect(cb).not.toHaveBeenCalled()
  })

  it('requestIdleCallback 环境下由空闲回调触发启动', () => {
    let idleCb: (() => void) | undefined
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      idleCb = cb
      return 1
    })
    vi.stubGlobal('cancelIdleCallback', vi.fn())
    const cb = vi.fn()
    startIdleVisibleInterval(cb, 1000, { runImmediately: true })

    // 空闲回调未触发前不启动
    vi.advanceTimersByTime(5000)
    expect(cb).not.toHaveBeenCalled()

    idleCb!()
    expect(cb).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1000)
    expect(cb).toHaveBeenCalledTimes(2)
  })

  it('cancel 会取消尚未触发的空闲回调', () => {
    let idleCb: (() => void) | undefined
    const cancelIdle = vi.fn()
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      idleCb = cb
      return 7
    })
    vi.stubGlobal('cancelIdleCallback', cancelIdle)
    const cb = vi.fn()

    const cancel = startIdleVisibleInterval(cb, 1000)
    cancel()

    expect(cancelIdle).toHaveBeenCalledWith(7)
    // 即使空闲回调被误触发，也被 cancelled 标志拦截
    idleCb!()
    vi.advanceTimersByTime(5000)
    expect(cb).not.toHaveBeenCalled()
  })
})
