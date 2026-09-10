import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface MockTaskData {
  uuid: string
  taskId: string
  execution?: {
    task_name?: string
  }
}

interface MockRawData {
  taskDetailsMap: Map<string, MockTaskData>
}

const hoisted = vi.hoisted(() => ({
  currentSessionId: { value: 'session-a' },
  sessions: new Map<string, MockRawData>(),
}))

vi.mock('../useCurrentDataBySession', () => ({
  useCurrentRawData: () => {
    const rawData = hoisted.sessions.get(hoisted.currentSessionId.value)
    if (!rawData) throw new Error(`未找到测试会话：${hoisted.currentSessionId.value}`)
    return rawData
  },
}))

vi.mock('../useCurrentSessionId', () => ({
  default: () => hoisted.currentSessionId.value,
}))

import useCurrentTaskData from '../useCurrentTaskData/useCurrentTaskData'
import useCurrentTaskExecution from '../useCurrentTaskData/useCurrentTaskExecution'

const createRawData = (): MockRawData => ({ taskDetailsMap: new Map() })

const createTaskData = (taskId: string, uuid: string, taskName: string): MockTaskData => ({
  uuid,
  taskId,
  execution: { task_name: taskName },
})

const getSession = (sessionId: string): MockRawData => {
  const rawData = hoisted.sessions.get(sessionId)
  if (!rawData) throw new Error(`未找到测试会话：${sessionId}`)
  return rawData
}

beforeEach(() => {
  vi.useFakeTimers()
  hoisted.currentSessionId.value = 'session-a'
  hoisted.sessions.clear()
  hoisted.sessions.set('session-a', createRawData())
  hoisted.sessions.set('session-b', createRawData())
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useCurrentTaskData', () => {
  it('条目从不存在变成默认空 uuid 条目时会刷新', () => {
    const session = getSession('session-a')
    const { result } = renderHook(() => useCurrentTaskData('task-1', 1)?.taskId ?? 'missing')

    expect(result.current).toBe('missing')

    session.taskDetailsMap.set('task-1', createTaskData('task-1', '', 'task-1'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toBe('task-1')
  })

  it('uuid 变化时会重新执行派生读取', () => {
    const session = getSession('session-a')
    const taskData = createTaskData('task-1', 'uuid-1', 'before')
    session.taskDetailsMap.set('task-1', taskData)

    const { result } = renderHook(() => useCurrentTaskData('task-1', 1)?.execution?.task_name ?? 'missing')
    expect(result.current).toBe('before')

    taskData.execution = { task_name: 'after' }
    taskData.uuid = 'uuid-2'
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current).toBe('after')
  })

  it('切换会话后会读取新会话的同名任务', () => {
    getSession('session-a').taskDetailsMap.set('shared-task', createTaskData('shared-task', 'same-uuid', 'session-a'))
    getSession('session-b').taskDetailsMap.set('shared-task', createTaskData('shared-task', 'same-uuid', 'session-b'))

    const { result, rerender } = renderHook(
      () => useCurrentTaskData('shared-task', 60)?.execution?.task_name ?? 'missing',
    )
    expect(result.current).toBe('session-a')

    act(() => {
      hoisted.currentSessionId.value = 'session-b'
      rerender()
    })

    expect(result.current).toBe('session-b')
  })
})

describe('useCurrentTaskExecution', () => {
  it('切换 taskId 后会读取新任务的 execution，即使 uuid 相同', () => {
    const session = getSession('session-a')
    session.taskDetailsMap.set('task-a', createTaskData('task-a', '', 'task-a'))
    session.taskDetailsMap.set('task-b', createTaskData('task-b', '', 'task-b'))

    const { result, rerender } = renderHook(
      ({ taskId }: { taskId: string }) => useCurrentTaskExecution(taskId, 60)?.task_name ?? 'missing',
      { initialProps: { taskId: 'task-a' } },
    )
    expect(result.current).toBe('task-a')

    rerender({ taskId: 'task-b' })

    expect(result.current).toBe('task-b')
  })

  it('切换会话后会读取新会话的 execution，即使 uuid 相同', () => {
    getSession('session-a').taskDetailsMap.set('shared-task', createTaskData('shared-task', 'same-uuid', 'session-a'))
    getSession('session-b').taskDetailsMap.set('shared-task', createTaskData('shared-task', 'same-uuid', 'session-b'))

    const { result, rerender } = renderHook(() => useCurrentTaskExecution('shared-task', 60)?.task_name ?? 'missing')
    expect(result.current).toBe('session-a')

    act(() => {
      hoisted.currentSessionId.value = 'session-b'
      rerender()
    })

    expect(result.current).toBe('session-b')
  })
})
