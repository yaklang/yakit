import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSessionSnapshotExecutionClocks, hasSessionSnapshotExecutionClock } from '../sessionSnapshotExecution'
import {
  isSessionSnapshotClockActive,
  useSessionSnapshotExecutionDuration,
} from '../useSessionSnapshotExecutionDuration'
import { AITaskStatus } from '../grpcApi'

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
    expect(hasSessionSnapshotExecutionClock('task:10')).toBe(false)
    expect(hasSessionSnapshotExecutionClock('task:100')).toBe(true)
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
    expect(hasSessionSnapshotExecutionClock('session:task:40')).toBe(true)
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

  it('会话不再执行时即使快照仍为 processing 也停在后端秒数', () => {
    vi.useFakeTimers()
    const execution = { status: 'processing', execution_seconds: 10 }
    const { result, rerender } = renderHook(
      ({ sessionActive }) => useSessionSnapshotExecutionDuration(execution, labels, 'task:close', sessionActive),
      { initialProps: { sessionActive: true } },
    )
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current).toBe('13s')

    rerender({ sessionActive: false })
    expect(result.current).toBe('10s')
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(result.current).toBe('10s')
  })

  it('两个实例共用 clockKey 时，一方换 key 或停止后另一方锚点仍在', () => {
    vi.useFakeTimers()
    const execution = { status: 'processing', execution_seconds: 10 }
    const panel = renderHook(
      ({ execution: current, clockKey }) => useSessionSnapshotExecutionDuration(current, labels, clockKey),
      { initialProps: { execution, clockKey: 'shared' } },
    )
    const details = renderHook(
      ({ execution: current, clockKey }) => useSessionSnapshotExecutionDuration(current, labels, clockKey),
      { initialProps: { execution, clockKey: 'shared' } },
    )

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(panel.result.current).toBe('13s')
    expect(details.result.current).toBe('13s')

    details.rerender({ execution: { status: 'processing', execution_seconds: 4 }, clockKey: 'other' })
    expect(hasSessionSnapshotExecutionClock('shared')).toBe(true)
    expect(panel.result.current).toBe('13s')
    expect(details.result.current).toBe('4s')

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(panel.result.current).toBe('15s')
    expect(details.result.current).toBe('6s')

    details.rerender({ execution, clockKey: 'shared' })
    expect(panel.result.current).toBe('15s')
    expect(details.result.current).toBe('15s')

    details.rerender({ execution: { status: 'completed', execution_seconds: 10 }, clockKey: 'shared' })
    expect(hasSessionSnapshotExecutionClock('shared')).toBe(true)
    expect(details.result.current).toBe('10s')
    expect(panel.result.current).toBe('15s')

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(panel.result.current).toBe('17s')
    expect(details.result.current).toBe('10s')
  })

  it('同 clockKey 结束后再恢复 processing 时从后端秒数重新计', () => {
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
    expect(hasSessionSnapshotExecutionClock('task:10')).toBe(false)

    rerender({ execution: { status: 'processing', execution_seconds: 10 }, clockKey: 'task:10' })
    expect(result.current).toBe('10s')
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current).toBe('12s')
  })

  it('isSessionSnapshotClockActive：关连接、问题结束都不加，提问等待或进行中才加', () => {
    expect(isSessionSnapshotClockActive({ execute: true, chatStatus: AITaskStatus.inProgress })).toBe(true)
    expect(isSessionSnapshotClockActive({ execute: true, pendingReply: true })).toBe(true)
    expect(isSessionSnapshotClockActive({ execute: false, chatStatus: AITaskStatus.inProgress })).toBe(false)
    expect(isSessionSnapshotClockActive({ execute: true, chatStatus: AITaskStatus.success })).toBe(false)
  })
})
