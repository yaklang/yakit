import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AIInputEventHotPatchTypeEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { useAIRunMode } from '../useAIRunMode'

const onSend = vi.fn()
const setSetting = vi.fn()
const executeRef = { value: false }
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
    activeChat: { SessionID: 'sess-1', StartParams: {} },
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
  default: () => 'token-1',
}))

vi.mock('@/utils/eventBus/eventBus', () => ({
  default: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

describe('useAIRunMode', () => {
  beforeEach(() => {
    onSend.mockClear()
    setSetting.mockClear()
    executeRef.value = false
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
