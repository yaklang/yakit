import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createChatStore } from '@/pages/ai-re-act/hooks/chatStore'
import { DefaultPlanItemDetailsData } from '@/pages/ai-re-act/hooks/defaultConstant'
import AIRunningStatus from '../AIRunningStatus/AIRunningStatus'
import emiter from '@/utils/eventBus/eventBus'

let store: ReturnType<typeof createChatStore>
const meta = { syncIDMap: new Map<string, boolean>() }
const { onSend, setSetting, currentSessionId } = vi.hoisted(() => ({
  onSend: vi.fn(),
  setSetting: vi.fn(),
  currentSessionId: vi.fn(),
}))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend, setSetting }) }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: currentSessionId }))
const serverTime = 1795413600
const initialPolicy = {
  server_time: serverTime,
  multi_agent: { enabled: true, effective: true, max_concurrency: 6, prefer_dispatch: false },
  goal: {
    enabled: true,
    effective: true,
    time_limit: { mode: 'deadline', configured_duration_seconds: 3600, deadline_at: 1795415400 },
  },
}
const rawData = {
  agentPolicySnapshot: initialPolicy as typeof initialPolicy | undefined,
  agentPolicySnapshotReceivedAtMs: 0,
  pendingGoalDurationSeconds: undefined as number | undefined,
}
const execution = { ...DefaultPlanItemDetailsData.execution, status: 'processing', execution_seconds: 756 }
const snapshot = { revision: 1, updated_at: 1, background_processes: [], execution }
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => store,
  useCurrentRawData: () => rawData,
  useCurrentMeta: () => meta,
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
  }),
}))

beforeEach(() => {
  meta.syncIDMap.clear()
  onSend.mockReset().mockReturnValue(true)
  setSetting.mockClear()
  currentSessionId.mockReturnValue('running-session')
  store = createChatStore()
  rawData.agentPolicySnapshot = initialPolicy
  rawData.pendingGoalDurationSeconds = undefined
  rawData.agentPolicySnapshotReceivedAtMs = performance.now()
})

it.each([
  [59, '59s'],
  [60, '1m0s'],
  [3599, '59m59s'],
  [3600, '1h0m'],
  [2 * 3600 + 30 * 60 + 43, '2h30m'],
  [86400, '1d0h'],
  [86400 + 2 * 3600 + 30 * 60 + 43, '1d2h'],
] as const)('shows at most two elapsed units on the badge for %i seconds', (seconds, expected) => {
  store.setState({
    sessionSnapshot: { ...snapshot, current_round: 2, execution: { ...execution, execution_seconds: seconds } },
  })
  render(<AIRunningStatus />)
  const trigger = screen.getByRole('button', { name: `AIRunningStatus.label 2 ${expected}` })
  expect(trigger).toHaveTextContent(new RegExp(`· ${expected}$`))
})

it('ticks from execution_seconds independently of the goal deadline and its adjustments', async () => {
  vi.useFakeTimers()
  try {
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
    rawData.agentPolicySnapshot = { ...initialPolicy, server_time: initialPolicy.goal.time_limit.deadline_at - 3541 }
    rawData.agentPolicySnapshotReceivedAtMs = performance.now()
    store.setState({ sessionSnapshot: { ...snapshot, current_round: 1 }, sessionSnapshotReceivedAtMs: Date.now() })
    const view = render(<AIRunningStatus />)
    const trigger = screen.getByRole('button', { name: 'AIRunningStatus.label 1 12m36s' })
    expect(trigger).toHaveAttribute('data-ai-running-status')
    expect(trigger.querySelector(':scope > [aria-hidden="true"] > .anticon svg')).toBeInTheDocument()
    expect(trigger).toHaveTextContent('· 12m36s')
    fireEvent.click(trigger)
    expect(screen.getByText(/^AIRunningStatus.workSchedule/)).toHaveTextContent(/59m1s$/)
    expect(screen.queryByRole('progressbar')).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(trigger).toHaveTextContent('· 12m37s')
    expect(screen.getByText(/^AIRunningStatus.workSchedule/)).toHaveTextContent(/59m0s$/)
    act(() => {
      rawData.agentPolicySnapshot = { ...initialPolicy, server_time: initialPolicy.goal.time_limit.deadline_at - 1 }
      rawData.agentPolicySnapshotReceivedAtMs = performance.now()
      store.getState().updateStateCount('agentPolicySnapshotUpdate')
    })
    expect(screen.getByText(/^AIRunningStatus.workSchedule/)).toHaveTextContent(/1s$/)
    const shorten = screen.getByRole('button', { name: '-15m' })
    expect(shorten).toBeEnabled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    const reached = screen.getByText('AIRunningStatus.targetReached')
    expect(
      reached.parentElement?.querySelector('[aria-hidden="true"] svg, svg[aria-hidden="true"]'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^AIRunningStatus.workSchedule/)).toBeNull()
    expect(shorten).toBeDisabled()
    fireEvent.click(shorten)
    expect(onSend).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '+15m' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'AIRunningStatus.stopAfterRound' })).toBeEnabled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(reached).toBeVisible()
    expect(trigger).toHaveTextContent('· 12m39s')
    act(() => {
      const deadline = initialPolicy.goal.time_limit.deadline_at
      rawData.agentPolicySnapshot = {
        ...initialPolicy,
        server_time: deadline + 1,
        goal: {
          ...initialPolicy.goal,
          time_limit: {
            ...initialPolicy.goal.time_limit,
            deadline_at: deadline + 900,
          },
        },
      }
      rawData.agentPolicySnapshotReceivedAtMs = performance.now()
      store.getState().updateStateCount('agentPolicySnapshotUpdate')
    })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByText('AIRunningStatus.targetReached')).toBeNull()
    expect(screen.getByText(/^AIRunningStatus.workSchedule/)).toHaveTextContent(/14m59s$/)
    expect(shorten).toBeEnabled()
    view.unmount()
  } finally {
    vi.useRealTimers()
  }
})

it('recalibrates elapsed time when only the snapshot receipt timestamp changes', () => {
  vi.useFakeTimers()
  try {
    rawData.agentPolicySnapshotReceivedAtMs = performance.now()
    const receive = (seconds?: number) =>
      act(() => {
        store.setState({
          sessionSnapshot: { ...snapshot, current_round: 1, execution: { ...execution, execution_seconds: seconds } },
          sessionSnapshotReceivedAtMs: Date.now(),
        })
      })
    receive(10)
    const view = render(<AIRunningStatus />)
    const trigger = screen.getByRole('button', { name: /^AIRunningStatus.label 1 / })
    expect(trigger).toHaveTextContent(/· 10s$/)
    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(trigger).toHaveTextContent(/· 12s$/)
    act(() => {
      store.setState({ sessionSnapshotReceivedAtMs: Date.now() })
    })
    expect(trigger).toHaveTextContent(/· 10s$/)
    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(trigger).toHaveTextContent(/· 10s$/)
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(trigger).toHaveTextContent(/· 11s$/)
    receive(30)
    expect(trigger).toHaveTextContent(/· 30s$/)
    receive(0)
    expect(trigger).toHaveTextContent(/· 0s$/)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(trigger).toHaveTextContent(/· 1s$/)
    receive()
    expect(trigger).toHaveTextContent(/· —$/)
    view.unmount()
  } finally {
    vi.useRealTimers()
  }
})

it('counts down across forward and backward system clock changes, including while unmounted', () => {
  vi.useFakeTimers()
  try {
    rawData.agentPolicySnapshotReceivedAtMs = performance.now()
    store.setState({ sessionSnapshot: snapshot })
    const view = render(<AIRunningStatus />)
    const openPanel = () => fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.state/ }))
    openPanel()
    expect(screen.getByText(/^AIRunningStatus.workSchedule/)).toHaveTextContent(/30m0s$/)
    act(() => {
      vi.setSystemTime(Date.now() + 600000)
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText(/^AIRunningStatus.workSchedule/)).toHaveTextContent(/29m59s$/)
    view.unmount()
    vi.setSystemTime(Date.now() - 1200000)
    vi.advanceTimersByTime(2000)
    const resumed = render(<AIRunningStatus />)
    openPanel()
    expect(screen.getByText(/^AIRunningStatus.workSchedule/)).toHaveTextContent(/29m57s$/)
    resumed.unmount()
  } finally {
    vi.useRealTimers()
  }
})

it.each([
  [new Date(2026, 10, 26, 23, 29, 42), '23:29', '29m42s'],
  [new Date(2026, 10, 26, 23, 59, 59), '23:59', '59m59s'],
  [new Date(2026, 10, 27, 0), 'AIRunningStatus.tomorrow 00：00：00', '1h0m0s'],
  [new Date(2026, 10, 27, 3, 15, 20), 'AIRunningStatus.tomorrow 03：15：20', '4h15m20s'],
  [new Date(2026, 10, 27, 4), 'AIRunningStatus.tomorrow 04：00：00', '5h0m0s'],
  [new Date(2026, 10, 27, 4, 0, 1), 'AIRunningStatus.tomorrow 04：00：01', undefined],
  [new Date(2026, 10, 28, 1, 2, 3), 'AIRunningStatus.dayAfterTomorrow 01：02：03', undefined],
  [new Date(2026, 10, 29, 0), 'AIRunningStatus.monthDay 11 29', undefined],
  [new Date(2026, 11, 1, 0), 'AIRunningStatus.monthDay 12 1', undefined],
] as const)('formats the calendar deadline and remaining duration for %s', (deadline, expectedDeadline, remaining) => {
  const now = new Date(2026, 10, 26, 23).getTime() / 1000
  rawData.agentPolicySnapshot = {
    ...initialPolicy,
    server_time: now,
    goal: {
      ...initialPolicy.goal,
      time_limit: {
        mode: 'deadline',
        configured_duration_seconds: 10800,
        deadline_at: deadline.getTime() / 1000,
      },
    },
  }
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.state/ }))
  const summary = remaining
    ? `AIRunningStatus.workSchedule ${expectedDeadline} ${remaining}`
    : `AIRunningStatus.workUntil ${expectedDeadline}`
  expect(screen.getByText(summary)).toBeInTheDocument()
})

it('switches the open panel deadline from tomorrow to today at midnight', () => {
  vi.useFakeTimers()
  try {
    const now = new Date(2026, 11, 31, 23, 59, 59).getTime() / 1000
    rawData.agentPolicySnapshot = {
      ...initialPolicy,
      server_time: now,
      goal: {
        ...initialPolicy.goal,
        time_limit: { ...initialPolicy.goal.time_limit, deadline_at: now + 120 },
      },
    }
    rawData.agentPolicySnapshotReceivedAtMs = performance.now()
    store.setState({ sessionSnapshot: snapshot })
    const view = render(<AIRunningStatus />)
    fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.state/ }))
    expect(screen.getByText(/^AIRunningStatus.workSchedule AIRunningStatus.tomorrow/)).toHaveTextContent(/2m0s$/)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText(/^AIRunningStatus.workSchedule 00:01 /)).toHaveTextContent(/1m59s$/)
    view.unmount()
  } finally {
    vi.useRealTimers()
  }
})

it('updates the panel countdown while the badge displays only elapsed time after deadline adjustments', () => {
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.state/ }))
  for (const [adjustment, remaining] of [
    [0, '30m0s'],
    [900, '45m0s'],
    [0, '30m0s'],
  ] as const) {
    act(() => {
      rawData.agentPolicySnapshot = {
        ...initialPolicy,
        goal: {
          ...initialPolicy.goal,
          time_limit: {
            ...initialPolicy.goal.time_limit,
            deadline_at: initialPolicy.goal.time_limit.deadline_at + adjustment,
          },
        },
      }
      store.getState().updateStateCount('agentPolicySnapshotUpdate')
    })
    expect(screen.getByRole('button', { name: /^AIRunningStatus.state/ })).toHaveTextContent(/12m36s$/)
    expect(screen.getByText(/^AIRunningStatus.workSchedule/)).toHaveTextContent(remaining)
  }
})

it('uses the adjusted deadline in the first policy snapshot after reconnecting', () => {
  const limit = initialPolicy.goal.time_limit
  rawData.agentPolicySnapshot = {
    ...initialPolicy,
    goal: { ...initialPolicy.goal, time_limit: { ...limit, deadline_at: limit.deadline_at + 900 } },
  }
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  const trigger = screen.getByRole('button', { name: /^AIRunningStatus.state/ })
  expect(trigger).toHaveTextContent(/12m36s$/)
  expect(trigger).not.toHaveTextContent('/')
  fireEvent.click(trigger)
  expect(screen.getByText(/^AIRunningStatus.workSchedule/)).toHaveTextContent(/45m0s$/)
  expect(screen.queryByText(/AIRunningStatus.limit/)).toBeNull()
  expect(screen.queryByRole('progressbar')).toBeNull()
})

it('includes time since snapshot receipt after remount, even past the deadline', () => {
  vi.useFakeTimers()
  try {
    rawData.agentPolicySnapshotReceivedAtMs = performance.now()
    store.setState({ sessionSnapshot: { ...snapshot, current_round: 1 }, sessionSnapshotReceivedAtMs: Date.now() })
    const initial = render(<AIRunningStatus />)
    initial.unmount()

    vi.advanceTimersByTime(10000)
    const resumed = render(<AIRunningStatus />)
    expect(screen.getByRole('button', { name: 'AIRunningStatus.label 1 12m46s' })).toBeInTheDocument()
    resumed.unmount()

    vi.advanceTimersByTime(1795000)
    const expired = render(<AIRunningStatus />)
    expect(screen.getByRole('button', { name: 'AIRunningStatus.label 1 42m41s' })).toBeInTheDocument()
    expired.unmount()
  } finally {
    vi.useRealTimers()
  }
})

it('opens and closes the deadline preview once the policy snapshot arrives', async () => {
  rawData.agentPolicySnapshot = undefined
  store.setState({ sessionSnapshot: { ...snapshot, current_round: 5 } })
  const focusInput = vi.fn()
  render(
    <div onClick={focusInput}>
      <AIRunningStatus />
    </div>,
  )
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.queryByRole('button')).toBeNull()
  act(() => {
    rawData.agentPolicySnapshot = initialPolicy
    store.getState().updateStateCount('agentPolicySnapshotUpdate')
  })
  const trigger = screen.getByRole('button', { name: /^AIRunningStatus.label 5 / })
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await waitFor(() => expect(screen.getByText(/^AIRunningStatus.workSchedule/)).toBeVisible())
  const extend = within(screen.getByRole('group', { name: 'AIRunningStatus.extend' }))
  const shorten = within(screen.getByRole('group', { name: 'AIRunningStatus.shorten' }))
  expect(extend.getAllByRole('button').map((item) => item.textContent)).toEqual([
    '+15m',
    '+30m',
    '+1h',
    'AIRunningStatus.unlimited',
  ])
  expect(shorten.getAllByRole('button').map((item) => item.textContent)).toEqual([
    '-15m',
    'AIRunningStatus.stopAfterRound',
  ])
  const option = extend.getByRole('button', { name: '+1h' })
  fireEvent.click(option)
  expect(focusInput).not.toHaveBeenCalled()
  fireEvent.keyDown(option, { key: 'Escape' })
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'))
})

it.each([
  ['+15m', { Action: 'AI_GOAL_TIME_ACTION_EXTEND', ExtendSeconds: 900 }],
  ['+30m', { Action: 'AI_GOAL_TIME_ACTION_EXTEND', ExtendSeconds: 1800 }],
  ['+1h', { Action: 'AI_GOAL_TIME_ACTION_EXTEND', ExtendSeconds: 3600 }],
  ['AIRunningStatus.unlimited', { Action: 'AI_GOAL_TIME_ACTION_NEVER_ENDING' }],
  ['-15m', { Action: 'AI_GOAL_TIME_ACTION_EXTEND', ExtendSeconds: -900 }],
  ['AIRunningStatus.stopAfterRound', { Action: 'AI_GOAL_TIME_ACTION_DISABLE' }],
] as const)('sends %s immediately, then requests a policy snapshot with a SyncID', (name, patch) => {
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.state/ }))
  fireEvent.click(screen.getByRole('button', { name }))
  expect(onSend).toHaveBeenNthCalledWith(1, {
    token: 'running-session',
    type: '',
    params: { IsConfigHotpatch: true, HotpatchType: 'GoalTime', GoalTimePatch: patch },
  })
  expect(onSend).toHaveBeenNthCalledWith(2, {
    token: 'running-session',
    type: '',
    params: { IsSyncMessage: true, SyncType: 'agent_policy_snapshot_sync', SyncID: expect.any(String) },
  })
  expect(onSend).toHaveBeenCalledTimes(2)
  if (patch.Action === 'AI_GOAL_TIME_ACTION_NEVER_ENDING') expect(rawData.pendingGoalDurationSeconds).toBe(-1)
  if (patch.Action === 'AI_GOAL_TIME_ACTION_DISABLE') expect(rawData.pendingGoalDurationSeconds).toBe(0)
})

it('keeps adjustments disabled across reopening until the matching sync receipt arrives', async () => {
  onSend.mockImplementation(({ params }) => {
    if (params.SyncID) {
      meta.syncIDMap.set(params.SyncID, true)
      store.getState().updateStateCount('syncIDUpdate')
    }
    return true
  })
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  const trigger = screen.getByRole('button', { name: /^AIRunningStatus.state/ })
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('button', { name: '+15m' }))
  const syncId = onSend.mock.calls[1][0].params.SyncID
  expect(screen.getByRole('button', { name: '+15m' })).toBeDisabled()
  fireEvent.click(trigger)
  fireEvent.click(trigger)
  const other = screen.getByRole('button', { name: '-15m' })
  expect(other).toBeDisabled()
  fireEvent.click(other)
  expect(onSend).toHaveBeenCalledTimes(2)
  act(() => store.getState().updateStateCount('syncIDUpdate'))
  expect(other.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true')
  act(() => {
    meta.syncIDMap.delete(syncId)
    store.getState().updateStateCount('syncIDUpdate')
  })
  await waitFor(() => expect(other).toBeEnabled())
  expect(other.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false')
})

it.each(['deadline', 'never_ending', 'disabled'])(
  'hides a processing session with a round when Goal is off in %s mode',
  (mode) => {
    rawData.agentPolicySnapshot = {
      ...initialPolicy,
      goal: { ...initialPolicy.goal, enabled: false, time_limit: { ...initialPolicy.goal.time_limit, mode } },
    }
    store.setState({ sessionSnapshot: { ...snapshot, current_round: 0 } })
    render(<AIRunningStatus />)
    expect(screen.queryByRole('status')).toBeNull()
  },
)

it('ticks the elapsed time in a non-deadline status and keeps only the round when elapsed time is unavailable', () => {
  vi.useFakeTimers()
  try {
    rawData.agentPolicySnapshot = {
      ...initialPolicy,
      goal: { ...initialPolicy.goal, time_limit: { ...initialPolicy.goal.time_limit, mode: 'not_started' } },
    }
    const withRound = { ...snapshot, current_round: 5 }
    store.setState({ sessionSnapshot: withRound, sessionSnapshotReceivedAtMs: Date.now() })
    render(<AIRunningStatus />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(/· 12m36s$/)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(status).toHaveTextContent(/· 12m37s$/)

    act(() => {
      store.setState({ sessionSnapshot: { ...withRound, execution: { ...execution, execution_seconds: undefined } } })
    })
    expect(status).toHaveTextContent(/AIRunningStatus.round 5$/)
    act(() => store.setState({ sessionSnapshot: snapshot, sessionSnapshotReceivedAtMs: Date.now() }))
    expect(status).toHaveTextContent('12m36s')
    expect(screen.queryByRole('button')).toBeNull()
  } finally {
    vi.useRealTimers()
  }
})

it.each([
  ['AIRunningStatus.unlimited', 'never_ending', -1],
  ['AIRunningStatus.stopAfterRound', 'disabled', 0],
] as const)('shows the duration editor after the policy snapshot confirms %s', (action, mode, seconds) => {
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  const trigger = screen.getByRole('button', { name: 'AIRunningStatus.state 12m36s' })
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('button', { name: action }))
  expect(screen.queryByText('AIRunningStatus.resetDurationHint')).toBeNull()
  expect(onSend).toHaveBeenCalledTimes(2)

  act(() => {
    rawData.agentPolicySnapshot = {
      ...initialPolicy,
      goal: {
        ...initialPolicy.goal,
        effective: mode === 'never_ending',
        time_limit: { mode, configured_duration_seconds: seconds, deadline_at: 0 },
      },
    }
    store.getState().updateStateCount('agentPolicySnapshotUpdate')
  })
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText('AIRunningStatus.resetDurationHint')).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'AIMilkdownModeSlash.duration' })).toBeInTheDocument()
  expect(screen.queryByRole('group', { name: 'AIRunningStatus.extend' })).toBeNull()
  fireEvent.click(trigger)
  expect(onSend).toHaveBeenCalledTimes(2)
  expect(setSetting).not.toHaveBeenCalled()

  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('button', { name: '30m' }))
  expect(onSend).toHaveBeenCalledTimes(2)
  fireEvent.click(trigger)
  expect(onSend).toHaveBeenCalledTimes(3)
  expect(onSend).toHaveBeenLastCalledWith(
    expect.objectContaining({
      token: 'running-session',
      params: expect.objectContaining({
        GoalTimePatch: expect.objectContaining({ Action: 'AI_GOAL_TIME_ACTION_SET_DEADLINE' }),
        Params: { Strategy: expect.objectContaining({ GoalDurationSeconds: 1800 }) },
      }),
    }),
  )
  expect(setSetting).toHaveBeenCalledOnce()
})

it('shows that the current time limit was removed when Goal is enabled with a disabled time limit', async () => {
  rawData.agentPolicySnapshot = {
    ...initialPolicy,
    goal: {
      ...initialPolicy.goal,
      enabled: true,
      effective: false,
      time_limit: { mode: 'disabled', configured_duration_seconds: 0, deadline_at: 0 },
    },
  }
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  fireEvent.click(screen.getByRole('button', { name: 'AIRunningStatus.state 12m36s' }))
  const removed = screen.getByText('AIRunningStatus.timeLimitRemoved')
  await waitFor(() => expect(removed).toBeVisible())
  expect(removed.querySelector('svg')).toBeInTheDocument()
  expect(screen.queryByText('AIRunningStatus.remaining')).toBeNull()
  expect(screen.getByText('AIRunningStatus.resetDurationHint')).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'AIMilkdownModeSlash.duration' })).toBeInTheDocument()
  expect(screen.queryByRole('group', { name: 'AIRunningStatus.shorten' })).toBeNull()
  expect(onSend).not.toHaveBeenCalled()
})

it('shows elapsed time and the deadline preview without a round', async () => {
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  const trigger = screen.getByRole('button', { name: 'AIRunningStatus.state 12m36s' })
  expect(trigger).toHaveTextContent('12m36s')
  expect(trigger).not.toHaveTextContent(/AIRunningStatus.round|—|·/)
  fireEvent.click(trigger)
  await waitFor(() => expect(screen.getByText(/^AIRunningStatus.workSchedule/)).toBeVisible())
  expect(screen.queryByText(/^AIRunningStatus.round/)).toBeNull()
})

it('keeps the deadline preview available when the remaining time cannot be calculated', async () => {
  rawData.agentPolicySnapshot = { ...initialPolicy, goal: { ...initialPolicy.goal, effective: false } }
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  fireEvent.click(screen.getByRole('button', { name: 'AIRunningStatus.state 12m36s' }))
  expect(screen.getByText('AIRunningStatus.remaining').nextElementSibling).toHaveTextContent('—')
  await waitFor(() => expect(screen.getByRole('button', { name: '+15m' })).toBeVisible())
})

it('hides the status and closes its preview when Goal is disabled or execution finishes', () => {
  store.setState({ sessionSnapshot: { ...snapshot, current_round: 2 } })
  render(<AIRunningStatus />)
  fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.label 2 / }))
  expect(screen.getByText(/^AIRunningStatus.workSchedule/)).toBeInTheDocument()
  act(() => {
    rawData.agentPolicySnapshot = {
      ...initialPolicy,
      goal: {
        ...initialPolicy.goal,
        enabled: false,
        time_limit: { ...initialPolicy.goal.time_limit, mode: 'disabled' },
      },
    }
    store.getState().updateStateCount('agentPolicySnapshotUpdate')
  })
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.queryByText('AIRunningStatus.title')).toBeNull()
  expect(screen.queryByRole('button')).toBeNull()

  act(() => {
    rawData.agentPolicySnapshot = initialPolicy
    store.getState().updateStateCount('agentPolicySnapshotUpdate')
  })
  expect(screen.getByRole('button', { name: /^AIRunningStatus.label 2 / })).toHaveAttribute('aria-expanded', 'false')
  act(() => {
    store.setState({
      sessionSnapshot: { ...snapshot, current_round: 2, execution: { ...execution, status: 'completed' } },
    })
  })
  expect(screen.queryByRole('status')).toBeNull()
})

describe('editing stop conditions while the goal is unlimited', () => {
  const emit = vi.spyOn(emiter, 'emit')

  beforeEach(() => {
    emit.mockClear()
    vi.useFakeTimers({ toFake: ['Date', 'performance'] })
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
    rawData.agentPolicySnapshot = {
      ...initialPolicy,
      goal: {
        ...initialPolicy.goal,
        time_limit: { mode: 'never_ending', configured_duration_seconds: -1, deadline_at: 0 },
      },
    }
    rawData.agentPolicySnapshotReceivedAtMs = performance.now() - 30000
    store.setState({ sessionSnapshot: { ...snapshot, current_round: 1 } })
    render(<AIRunningStatus />)
    fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.label/ }))
  })

  afterEach(() => vi.useRealTimers())

  const expectStopConditionPatches = (seconds: number, iterations: number, acceptance: string) => {
    expect(onSend).toHaveBeenCalledExactlyOnceWith({
      token: 'running-session',
      type: '',
      params: {
        IsConfigHotpatch: true,
        HotpatchType: 'ExecutionStrategy',
        GoalTimePatch:
          seconds > 0
            ? { Action: 'AI_GOAL_TIME_ACTION_SET_DEADLINE', DeadlineUnix: serverTime + 30 + seconds }
            : { Action: 'AI_GOAL_TIME_ACTION_DISABLE' },
        Params: {
          Strategy: {
            EnableMultiAgent: true,
            MaxSubAgents: 6,
            EnableGoalMode: true,
            GoalMinIterations: iterations,
            GoalDurationSeconds: seconds,
            GoalAcceptanceCriteria: acceptance,
          },
        },
      },
    })
    const goalStrategy = {
      EnableGoalMode: true,
      GoalMinIterations: iterations,
      GoalAcceptanceCriteria: acceptance,
      GoalDurationSeconds: seconds,
    }
    expect(setSetting).toHaveBeenCalledTimes(1)
    const previous = { EnablePlan: true, Strategy: { EnableMultiAgent: true, MaxSubAgents: 8 } }
    expect(setSetting.mock.calls[0][0](previous)).toEqual({
      ...previous,
      Strategy: { ...previous.Strategy, ...goalStrategy },
    })
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith(
      'sessionData',
      JSON.stringify({
        type: 'updateSession',
        sessionId: 'running-session',
        updates: { StartParams: { Strategy: goalStrategy } },
      }),
    )
  }

  it('applies a duration preset when the trigger closes the popover', () => {
    fireEvent.click(screen.getByRole('button', { name: 'AIMilkdownModeSlash.duration' }))
    fireEvent.click(screen.getByRole('button', { name: '3h' }))
    expect(onSend).not.toHaveBeenCalled()
    const trigger = screen.getByRole('button', { name: /^AIRunningStatus.label/ })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expectStopConditionPatches(10800, 0, '')
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(setSetting).toHaveBeenCalledTimes(1)
  })

  it('shows all duration options and skips the hotpatch when returning to never ending', () => {
    const options = within(screen.getByRole('group', { name: 'AIMilkdownModeSlash.duration' }))
    expect(options.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '30m',
      '1h',
      '3h',
      'AIMilkdownModeSlash.durationNever',
      'AIRunModeSelect.customDuration',
    ])
    const never = options.getByRole('button', { name: 'AIMilkdownModeSlash.durationNever' })
    expect(never).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(options.getByRole('button', { name: '1h' }))
    expect(never).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(never)
    expect(never).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.label/ }))
    expect(onSend).not.toHaveBeenCalled()
  })

  it('applies edited minimum iterations when Escape closes the popover', () => {
    fireEvent.click(screen.getByRole('button', { name: 'AIMilkdownModeSlash.minIterations' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIMilkdownModeSlash.minIterations' }), {
      target: { value: '4' },
    })
    expect(onSend).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'YakitButton.ok' })).toBeNull()
    fireEvent.keyDown(screen.getByRole('spinbutton', { name: 'AIMilkdownModeSlash.minIterations' }), { key: 'Escape' })
    expectStopConditionPatches(0, 4, '')
  })

  it('applies edited acceptance criteria when clicking outside closes the popover', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'AIMilkdownModeSlash.acceptance' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'AIMilkdownModeSlash.acceptance' }), {
      target: { value: 'Complete the summary' },
    })
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.mouseDown(document.body)
    fireEvent.click(document.body)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^AIRunningStatus.label/ })).toHaveAttribute('aria-expanded', 'false'),
    )
    expectStopConditionPatches(0, 0, 'Complete the summary')
  })

  it('submits custom hours and minutes as one finite deadline on close', () => {
    fireEvent.click(screen.getByRole('button', { name: 'AIMilkdownModeSlash.duration' }))
    fireEvent.click(screen.getByRole('button', { name: 'AIRunModeSelect.customDuration' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationHours' }), {
      target: { value: '2' },
    })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationMinutes' }), {
      target: { value: '15' },
    })
    expect(onSend).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.label/ }))
    expectStopConditionPatches(8100, 0, '')
  })

  it('closes without submitting when no condition was edited', () => {
    fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.label/ }))
    expect(onSend).not.toHaveBeenCalled()
    expect(setSetting).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
  })

  it('does not submit empty acceptance criteria', () => {
    fireEvent.click(screen.getByRole('button', { name: 'AIMilkdownModeSlash.acceptance' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'AIMilkdownModeSlash.acceptance' }), {
      target: { value: '   ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.label/ }))
    expect(onSend).not.toHaveBeenCalled()
    expect(setSetting).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
  })

  it('does not submit a custom duration of zero', () => {
    fireEvent.click(screen.getByRole('button', { name: 'AIRunModeSelect.customDuration' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationHours' }), {
      target: { value: '0' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.label/ }))
    expect(onSend).not.toHaveBeenCalled()
    expect(setSetting).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
  })

  it('discards an old session draft when switching to another session', () => {
    fireEvent.click(screen.getByRole('button', { name: '3h' }))
    currentSessionId.mockReturnValue('other-session')
    act(() => store.setState({ sessionSnapshot: { ...snapshot, current_round: 2 } }))
    fireEvent.keyDown(screen.getByRole('button', { name: /^AIRunningStatus.label/ }), { key: 'Escape' })
    expect(onSend).not.toHaveBeenCalled()
    expect(setSetting).not.toHaveBeenCalled()
    expect(emit).not.toHaveBeenCalled()
  })
})
