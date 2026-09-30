import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AIInputEventHotPatchTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { useAIRunMode } from '../useAIRunMode'
import emiter from '@/utils/eventBus/eventBus'

const onSend = vi.fn()
const setSetting = vi.fn()
const executeRef = { value: false }
const sessionIdRef = { value: 'token-1' }
const settingRef: {
  value: {
    EnablePlan: boolean
    Strategy: {
      EnableMultiAgent: boolean
      EnableGoalMode: boolean
      GoalMinIterations: number
      MaxSubAgents: number
      GoalDurationSeconds: number
      GoalAcceptanceCriteria: string
    }
  }
} = {
  value: {
    EnablePlan: false,
    Strategy: {
      EnableMultiAgent: false,
      EnableGoalMode: false,
      GoalMinIterations: 0,
      MaxSubAgents: 3,
      GoalDurationSeconds: 0,
      GoalAcceptanceCriteria: '',
    },
  },
}

vi.mock('@/pages/ai-agent/useContext/useStore', () => ({
  default: () => ({
    setting: settingRef.value,
    activeChat: sessionIdRef.value ? { SessionID: sessionIdRef.value, StartParams: {} } : undefined,
  }),
}))

vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({
    setSetting,
    onSend,
  }),
}))

vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => ({}),
}))

vi.mock('zustand', () => ({
  useStore: (_store: unknown, selector: (s: { execute: boolean }) => unknown) =>
    selector({ execute: executeRef.value }),
}))

vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({
  default: () => sessionIdRef.value,
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

describe('useAIRunMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    executeRef.value = false
    sessionIdRef.value = 'token-1'
    settingRef.value = {
      EnablePlan: false,
      Strategy: {
        EnableMultiAgent: false,
        EnableGoalMode: false,
        GoalMinIterations: 0,
        MaxSubAgents: 3,
        GoalDurationSeconds: 0,
        GoalAcceptanceCriteria: '',
      },
    }
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it.each(['plan', 'multiAgent', 'goal'] as const)(
    'pending 期间切换 %s 只更新本地设置，不使用空 SessionID 发送热补丁',
    (mode) => {
      executeRef.value = true
      sessionIdRef.value = ''
      const { result } = renderHook(() => useAIRunMode())

      act(() => result.current.onToggleMode(mode))

      expect(onSend).not.toHaveBeenCalled()
      expect(emiter.emit).not.toHaveBeenCalled()
      expect(setSetting).toHaveBeenCalledTimes(1)
      const updated = setSetting.mock.calls[0][0](settingRef.value)
      if (mode === 'plan') expect(updated.EnablePlan).toBe(true)
      else if (mode === 'multiAgent') expect(updated.Strategy.EnableMultiAgent).toBe(true)
      else expect(updated.Strategy.EnableGoalMode).toBe(true)
    },
  )

  it('pending 期间编辑 Strategy 子配置保留其他设置，不发送空 ID 热补丁', () => {
    executeRef.value = true
    sessionIdRef.value = ''
    const { result } = renderHook(() => useAIRunMode())

    act(() => result.current.onSetStrategy({ GoalMinIterations: 5, GoalAcceptanceCriteria: '通过验证' }))

    expect(onSend).not.toHaveBeenCalled()
    expect(emiter.emit).not.toHaveBeenCalled()
    expect(setSetting.mock.calls[0][0](settingRef.value).Strategy).toEqual({
      ...settingRef.value.Strategy,
      GoalMinIterations: 5,
      GoalAcceptanceCriteria: '通过验证',
    })
  })

  it('正式会话运行中切换 Plan 仍发送热补丁并同步会话配置', () => {
    executeRef.value = true
    const { result } = renderHook(() => useAIRunMode())

    act(() => result.current.onToggleMode('plan'))

    expect(onSend).toHaveBeenCalledExactlyOnceWith({
      token: 'token-1',
      type: '',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_EnablePlan,
        Params: { EnablePlan: true },
      },
    })
    expect(emiter.emit).toHaveBeenCalledExactlyOnceWith(
      'sessionData',
      JSON.stringify({
        type: 'updateSession',
        sessionId: 'token-1',
        updates: { StartParams: { EnablePlan: true } },
      }),
    )
  })

  it('pending 完成绑定后，再次切换模式会使用正式 SessionID', () => {
    executeRef.value = true
    sessionIdRef.value = ''
    const { result, rerender } = renderHook(() => useAIRunMode())
    act(() => result.current.onToggleMode('plan'))
    expect(onSend).not.toHaveBeenCalled()

    sessionIdRef.value = 'backend-session'
    rerender()
    act(() => result.current.onToggleMode('multiAgent'))

    expect(onSend).toHaveBeenCalledExactlyOnceWith({
      token: 'backend-session',
      type: '',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_Strategy,
        Params: { Strategy: { ...settingRef.value.Strategy, EnableMultiAgent: true } },
      },
    })
  })

  it('运行中切换 Strategy 会发送 ExecutionStrategy hotpatch', () => {
    executeRef.value = true
    const { result } = renderHook(() => useAIRunMode())

    expect(result.current).not.toHaveProperty('isModeLocked')

    act(() => {
      result.current.onSetStrategy({ EnableMultiAgent: true, MaxSubAgents: 3 })
    })

    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend.mock.calls[0][0]).toMatchObject({
      token: 'token-1',
      type: '',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: AIInputEventHotPatchTypeEnum.HotPatchType_Strategy,
        Params: {
          Strategy: expect.objectContaining({
            EnableMultiAgent: true,
            MaxSubAgents: 3,
          }),
        },
      },
    })
    expect(setSetting).toHaveBeenCalled()
  })

  it('未运行时切换 Strategy 只更新 setting，不发 hotpatch', () => {
    executeRef.value = false
    const { result } = renderHook(() => useAIRunMode())

    act(() => {
      result.current.onSetStrategy({ EnableGoalMode: true })
    })

    expect(onSend).not.toHaveBeenCalled()
    expect(setSetting).toHaveBeenCalled()
  })

  it('运行中仍可 toggle Multi-Agent（不再锁定）', () => {
    executeRef.value = true
    const { result } = renderHook(() => useAIRunMode())

    act(() => {
      result.current.onToggleMode('multiAgent')
    })

    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend.mock.calls[0][0].params.HotpatchType).toBe(AIInputEventHotPatchTypeEnum.HotPatchType_Strategy)
  })
})
