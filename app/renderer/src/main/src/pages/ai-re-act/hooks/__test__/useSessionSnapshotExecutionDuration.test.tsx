import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSessionSnapshotExecutionClocks } from '../sessionSnapshotExecution'
import { useSessionSnapshotExecutionDuration } from '../useSessionSnapshotExecutionDuration'

const labels = { empty: '无数据', running: '执行中' }

describe('useSessionSnapshotExecutionDuration', () => {
  afterEach(() => {
    clearSessionSnapshotExecutionClocks()
    vi.useRealTimers()
  })

  it('processing 时每秒加 1，后端推送新快照后改用后端秒数', () => {
    vi.useFakeTimers()
    const first = { status: 'processing', execution_seconds: 10 }
    const { result, rerender } = renderHook(
      ({ execution, clockKey }) => useSessionSnapshotExecutionDuration(execution, labels, clockKey),
      { initialProps: { execution: first, clockKey: 'task:10' } },
    )
    expect(result.current).toBe('10s')

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current).toBe('13s')

    rerender({ execution: { status: 'processing', execution_seconds: 100 }, clockKey: 'task:100' })
    expect(result.current).toBe('1m40s')

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current).toBe('1m42s')
  })

  it('卸载后再挂载时从墙钟继续累加，不回到后端秒数', () => {
    vi.useFakeTimers()
    const execution = { status: 'processing', execution_seconds: 40 }
    const { result, unmount } = renderHook(() =>
      useSessionSnapshotExecutionDuration(execution, labels, 'session:task:40'),
    )
    expect(result.current).toBe('40s')

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current).toBe('43s')

    unmount()
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    const next = renderHook(() => useSessionSnapshotExecutionDuration(execution, labels, 'session:task:40'))
    expect(next.result.current).toBe('45s')
  })

  it('结束后停在后端秒数', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() =>
      useSessionSnapshotExecutionDuration({ status: 'completed', execution_seconds: 10 }, labels, 'done'),
    )
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current).toBe('10s')
  })
})
