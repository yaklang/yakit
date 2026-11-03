import React from 'react'
import { cleanup, render, act } from '@testing-library/react'
import { createStore } from 'zustand/vanilla'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../ai-re-act/hooks/__test__/setupElectron'
import type { AIAgentSetting } from '../../aiAgentType'
import type { AISession } from '../../type/aiChat'

const fixture = vi.hoisted(() => ({
  setting: {} as AIAgentSetting,
  active: undefined as AISession | undefined,
  id: 'session-a',
  send: vi.fn(),
  emit: vi.fn(),
  setSetting: vi.fn(),
  setActive: vi.fn(),
}))
let sessionStore = createStore(() => ({ execute: false }))
vi.mock('../../useContext/useStore', () => ({
  default: () => ({ setting: fixture.setting, activeChat: fixture.active }),
}))
vi.mock('../../useContext/useDispatcher', () => ({
  default: () => ({
    getSetting: () => fixture.setting,
    setSetting: fixture.setSetting,
    setActiveChat: fixture.setActive,
    onSend: fixture.send,
  }),
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => sessionStore }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => fixture.id }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: fixture.emit } }))

import { useAIRunMode } from '../useAIRunMode'
import { buildGoalCondition } from '../goalStrategy'

let mode: ReturnType<typeof useAIRunMode>
const Probe = () => {
  mode = useAIRunMode()
  return null
}

beforeEach(() => {
  fixture.setting = {
    Strategy: {
      EnableMultiAgent: true,
      MaxSubAgents: 3,
      EnableGoalMode: true,
      GoalMinIterations: 4,
      GoalDurationSeconds: 0,
      GoalAcceptanceCriteria: '',
    },
  }
  fixture.active = {
    SessionID: 'session-a',
    StartParams: {
      ForgeName: 'employee-forge',
      RuntimeContextSizeLimit: 614400,
      Strategy: { ...fixture.setting.Strategy },
    },
  } as AISession
  fixture.id = 'session-a'
  fixture.send.mockReset().mockReturnValue(true)
  fixture.emit.mockClear()
  fixture.setSetting.mockReset().mockImplementation((update) => {
    fixture.setting = update(fixture.setting)
  })
  fixture.setActive.mockReset().mockImplementation((update) => {
    fixture.active = update(fixture.active)
  })
  sessionStore = createStore(() => ({ execute: false }))
})
afterEach(cleanup)

describe('Goal / Plan / Multi-Agent session updates', () => {
  it('applies a duration to stopped-session startup parameters without starting a stream', () => {
    render(<Probe />)
    act(() => {
      expect(mode.onSetStrategy(buildGoalCondition('duration', 600)!)).toBe(true)
    })
    expect(fixture.send).not.toHaveBeenCalled()
    expect(fixture.setting.Strategy).toMatchObject({
      EnableMultiAgent: true,
      MaxSubAgents: 3,
      GoalMinIterations: 0,
      GoalDurationSeconds: 600,
      GoalAcceptanceCriteria: '',
    })
    expect(fixture.active?.StartParams).toMatchObject({
      ForgeName: 'employee-forge',
      RuntimeContextSizeLimit: 614400,
      Strategy: fixture.setting.Strategy,
    })
  })

  it('uses the official ExecutionStrategy hotpatch for only the running session', () => {
    sessionStore.setState({ execute: true })
    render(<Probe />)
    act(() => {
      mode.onSetStrategy(buildGoalCondition('acceptance', 'evidence report')!)
    })
    expect(fixture.send).toHaveBeenCalledTimes(1)
    expect(fixture.send).toHaveBeenCalledWith({
      token: 'session-a',
      type: '',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'ExecutionStrategy',
        Params: { Strategy: fixture.setting.Strategy },
      },
    })
    expect(fixture.active?.StartParams?.Strategy).toMatchObject({
      GoalAcceptanceCriteria: 'evidence report',
      GoalMinIterations: 0,
      GoalDurationSeconds: 0,
    })
    expect(fixture.active?.StartParams?.ForgeName).toBe('employee-forge')
  })

  it.each(['rejected', 'missing-id', 'mismatched-id', 'pending'] as const)(
    'keeps both settings and session unchanged when %s',
    (reason) => {
      sessionStore.setState({ execute: true })
      if (reason === 'rejected') fixture.send.mockReturnValue(false)
      if (reason === 'missing-id') fixture.id = ''
      if (reason === 'mismatched-id') fixture.id = 'session-b'
      if (reason === 'pending') fixture.active = undefined
      const oldSetting = fixture.setting
      const oldActive = fixture.active
      render(<Probe />)
      act(() => {
        expect(mode.onSetStrategy(buildGoalCondition('duration', 600)!)).toBe(false)
      })
      expect(fixture.setting).toBe(oldSetting)
      expect(fixture.active).toBe(oldActive)
      expect(fixture.emit).not.toHaveBeenCalled()
    },
  )

  it('disabling Goal clears all conditions while preserving Multi-Agent and Plan', () => {
    fixture.setting.EnablePlan = true
    fixture.setting.Strategy = {
      ...fixture.setting.Strategy,
      GoalDurationSeconds: -1,
      GoalAcceptanceCriteria: 'legacy',
    }
    render(<Probe />)
    act(() => {
      mode.onToggleMode('goal')
    })
    expect(fixture.setting.Strategy).toMatchObject({
      EnableGoalMode: false,
      GoalDurationSeconds: 0,
      GoalMinIterations: 0,
      GoalAcceptanceCriteria: '',
      EnableMultiAgent: true,
      MaxSubAgents: 3,
    })
    expect(fixture.setting.EnablePlan).toBe(true)
  })

  it('keeps consecutive strategy edits even before React rerenders', () => {
    render(<Probe />)
    act(() => {
      mode.onSetStrategy(buildGoalCondition('duration', 600)!)
      mode.onSetStrategy({ MaxSubAgents: 7 })
    })
    expect(fixture.setting.Strategy).toMatchObject({ GoalDurationSeconds: 600, MaxSubAgents: 7 })
    expect(fixture.active?.StartParams?.Strategy).toMatchObject({ GoalDurationSeconds: 600, MaxSubAgents: 7 })
  })

  it('rejects Plan changes without overwriting a running session', () => {
    sessionStore.setState({ execute: true })
    fixture.send.mockReturnValue(false)
    const original = fixture.setting
    render(<Probe />)
    act(() => {
      mode.onToggleMode('plan')
    })
    expect(fixture.setting).toBe(original)
    expect(fixture.emit).not.toHaveBeenCalled()
  })

  it('directs a new edit to the newly selected session', () => {
    sessionStore.setState({ execute: true })
    const { rerender } = render(<Probe />)
    fixture.id = 'session-b'
    fixture.active = { SessionID: 'session-b', StartParams: { ForgeName: 'forge-b' } } as AISession
    rerender(<Probe />)
    act(() => {
      mode.onSetStrategy(buildGoalCondition('duration', 1200)!)
    })
    expect(fixture.send.mock.calls[0][0].token).toBe('session-b')
    expect(fixture.active?.StartParams?.ForgeName).toBe('forge-b')
  })
})
