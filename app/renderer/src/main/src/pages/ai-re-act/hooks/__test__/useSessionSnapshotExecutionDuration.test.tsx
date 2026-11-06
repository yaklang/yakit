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

  it('processing 转为 completed 后停在后端秒数，不再累加', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ execution }) => useSessionSnapshotExecutionDuration(execution, labels, 'task:10'),
      { initialProps: { execution: { status: 'processing', execution_seconds: 10 } } },
    )
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current).toBe('13s')

    rerender({ execution: { status: 'completed', execution_seconds: 10 } })
    expect(result.current).toBe('10s')

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current).toBe('10s')
  })

  it('processing 转为 aborted 后停在后端秒数，不再累加', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ execution }) => useSessionSnapshotExecutionDuration(execution, labels, 'task:abort'),
      { initialProps: { execution: { status: 'processing', execution_seconds: 8 } } },
    )
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current).toBe('10s')

    rerender({ execution: { status: 'aborted', execution_seconds: 8 } })
    expect(result.current).toBe('8s')
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(result.current).toBe('8s')
  })

  it('快照保持 processing 时继续累加（关闭会话若不改 execution 即为此）', () => {
    vi.useFakeTimers()
    const execution = { status: 'processing', execution_seconds: 10 }
    const { result } = renderHook(() => useSessionSnapshotExecutionDuration(execution, labels, 'task:close'))
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current).toBe('13s')
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(result.current).toBe('17s')
  })

  it('同 clockKey 从 completed 再恢复 processing 时沿用旧锚点，停顿计入时长', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ execution, clockKey }) => useSessionSnapshotExecutionDuration(execution, labels, clockKey),
      { initialProps: { execution: { status: 'processing', execution_seconds: 10 }, clockKey: 'task:10' } },
    )
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current).toBe('13s')

    rerender({ execution: { status: 'completed', execution_seconds: 10 }, clockKey: 'task:10' })
    expect(result.current).toBe('10s')
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current).toBe('10s')

    rerender({ execution: { status: 'processing', execution_seconds: 10 }, clockKey: 'task:10' })
    expect(result.current).toBe('18s')
  })
})
