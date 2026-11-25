import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { createChatStore } from '@/pages/ai-re-act/hooks/chatStore'
import { DefaultPlanItemDetailsData } from '@/pages/ai-re-act/hooks/defaultConstant'
import AIRunningStatus from '../AIRunningStatus/AIRunningStatus'

let store: ReturnType<typeof createChatStore>
const { onSend, currentSessionId } = vi.hoisted(() => ({ onSend: vi.fn(), currentSessionId: vi.fn() }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend }) }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: currentSessionId }))
const serverTime = 1795413600
const initialPolicy = {
  server_time: serverTime,
  goal: {
    effective: true,
    time_limit: { mode: 'deadline', configured_duration_seconds: 3600, deadline_at: 1795415400 },
  },
}
const rawData = { agentPolicySnapshot: initialPolicy, agentPolicySnapshotReceivedAt: 0 }
const execution = { ...DefaultPlanItemDetailsData.execution, status: 'processing', execution_seconds: 756 }
const snapshot = { revision: 1, updated_at: 1, background_processes: [], execution }
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => store,
  useCurrentRawData: () => rawData,
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
  }),
}))

beforeEach(() => {
  onSend.mockClear()
  currentSessionId.mockReturnValue('running-session')
  store = createChatStore()
  rawData.agentPolicySnapshot = initialPolicy
  rawData.agentPolicySnapshotReceivedAt = Date.now() / 1000
})

it('uses the deadline to refresh elapsed and remaining time every second', async () => {
  vi.useFakeTimers()
  try {
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
    rawData.agentPolicySnapshot = { ...initialPolicy, server_time: initialPolicy.goal.time_limit.deadline_at - 3541 }
    rawData.agentPolicySnapshotReceivedAt = Date.now() / 1000
    store.setState({ sessionSnapshot: { ...snapshot, current_round: 1 } })
    const view = render(<AIRunningStatus />)
    const trigger = screen.getByRole('button', { name: 'AIRunningStatus.label 1 59s 1h' })
    expect(trigger).toHaveTextContent('· 59s / 1h')
    fireEvent.click(trigger)
    const progress = screen.getByRole('progressbar')
    expect(screen.getByText('AIRunningStatus.used').nextElementSibling).toHaveTextContent(/^59s$/)
    expect(screen.getByText('AIRunningStatus.remaining').nextElementSibling).toHaveTextContent(/^59m1s$/)
    expect(progress).toHaveAttribute('aria-valuetext', 'AIRunningStatus.used 59s · AIRunningStatus.remaining 59m1s')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(trigger).toHaveTextContent('· 1m0s / 1h')
    expect(screen.getByText('AIRunningStatus.remaining').nextElementSibling).toHaveTextContent(/^59m0s$/)
    expect(progress).toHaveAttribute('aria-valuetext', 'AIRunningStatus.used 1m0s · AIRunningStatus.remaining 59m0s')
    act(() => {
      rawData.agentPolicySnapshot = { ...initialPolicy, server_time: initialPolicy.goal.time_limit.deadline_at - 1 }
      rawData.agentPolicySnapshotReceivedAt = Date.now() / 1000
      store.getState().updateStateCount('agentPolicySnapshotUpdate')
    })
    expect(progress).toHaveAttribute('aria-valuetext', 'AIRunningStatus.used 59m59s · AIRunningStatus.remaining 1s')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(progress).toHaveAttribute('aria-valuetext', 'AIRunningStatus.used 60m0s · AIRunningStatus.remaining 0s')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(progress).toHaveAttribute('aria-valuetext', 'AIRunningStatus.used 1h0m1s · AIRunningStatus.remaining 0s')
    expect(progress).toHaveAttribute('aria-valuenow', '100')
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
            configured_duration_seconds: 4500,
          },
        },
      }
      rawData.agentPolicySnapshotReceivedAt = Date.now() / 1000
      store.getState().updateStateCount('agentPolicySnapshotUpdate')
    })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(progress).toHaveAttribute('aria-valuetext', 'AIRunningStatus.used 1h0m1s · AIRunningStatus.remaining 14m59s')
    view.unmount()
  } finally {
    vi.useRealTimers()
  }
})

it('shows hours, minutes and seconds for a remaining time over one hour', () => {
  rawData.agentPolicySnapshot = {
    ...initialPolicy,
    goal: {
      effective: true,
      time_limit: {
        mode: 'deadline',
        configured_duration_seconds: 10800,
        deadline_at: serverTime + 10652,
      },
    },
  }
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.label/ }))
  expect(screen.getByText('AIRunningStatus.remaining').nextElementSibling).toHaveTextContent('2h57m32s')
})

it('reads the limit from the configured duration independently of deadline changes', () => {
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.label/ }))
  for (const [adjustment, configured, total] of [
    [1800, 3600, '1h'],
    [-900, 7200, '2h'],
  ] as const) {
    act(() => {
      rawData.agentPolicySnapshot = {
        ...initialPolicy,
        goal: {
          ...initialPolicy.goal,
          time_limit: {
            ...initialPolicy.goal.time_limit,
            configured_duration_seconds: configured,
            deadline_at: initialPolicy.goal.time_limit.deadline_at + adjustment,
          },
        },
      }
      store.getState().updateStateCount('agentPolicySnapshotUpdate')
    })
    expect(screen.getByRole('button', { name: /^AIRunningStatus.label/ })).toHaveTextContent(`/ ${total}`)
    expect(screen.getByText(/AIRunningStatus.limit/)).toHaveTextContent(`(AIRunningStatus.limit ${total})`)
  }
})

it('shows the configured limit when first attached in the middle of a countdown', () => {
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  const trigger = screen.getByRole('button', { name: /^AIRunningStatus.label/ })
  expect(trigger).toHaveTextContent('30m0s / 1h')
  fireEvent.click(trigger)
  expect(screen.getByText('AIRunningStatus.remaining').nextElementSibling).toHaveTextContent('30m0s')
  expect(screen.getByText(/AIRunningStatus.limit/)).toHaveTextContent('(AIRunningStatus.limit 1h)')
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
})

it('resumes the same deadline after remount, including time spent past the deadline', () => {
  vi.useFakeTimers()
  try {
    rawData.agentPolicySnapshotReceivedAt = Date.now() / 1000
    store.setState({ sessionSnapshot: { ...snapshot, current_round: 1 } })
    const initial = render(<AIRunningStatus />)
    initial.unmount()

    vi.advanceTimersByTime(10000)
    const resumed = render(<AIRunningStatus />)
    expect(screen.getByRole('button', { name: 'AIRunningStatus.label 1 30m10s 1h' })).toBeInTheDocument()
    resumed.unmount()

    vi.advanceTimersByTime(1795000)
    const expired = render(<AIRunningStatus />)
    expect(screen.getByRole('button', { name: 'AIRunningStatus.label 1 1h0m5s 1h' })).toBeInTheDocument()
    expired.unmount()
  } finally {
    vi.useRealTimers()
  }
})

it('opens the run time preview, shows both adjustment groups and closes with Escape', async () => {
  rawData.agentPolicySnapshot = {
    ...initialPolicy,
    goal: { effective: true, time_limit: { mode: 'not_started', configured_duration_seconds: 10800, deadline_at: 0 } },
  }
  store.setState({ sessionSnapshot: { ...snapshot, current_round: 5 } })
  const focusInput = vi.fn()
  render(
    <div onClick={focusInput}>
      <AIRunningStatus />
    </div>,
  )
  const trigger = screen.getByRole('button', { name: 'AIRunningStatus.label 5 12m36s 3h' })
  expect(trigger).toHaveTextContent('12m36s / 3h')
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(trigger)
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const summary = screen.getByText('AIRunningStatus.used').parentElement
  expect(summary).toHaveTextContent(
    'AIRunningStatus.used 12m36s · AIRunningStatus.target 3h · AIRunningStatus.notStarted',
  )
  await waitFor(() => expect(summary).toBeVisible())
  expect(screen.queryByRole('progressbar')).toBeNull()
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

it('sends each time adjustment as a GoalTime hotpatch for the current session', () => {
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.label/ }))
  const cases = [
    ['+15m', { Action: 'AI_GOAL_TIME_ACTION_EXTEND', ExtendSeconds: 900 }],
    ['+30m', { Action: 'AI_GOAL_TIME_ACTION_EXTEND', ExtendSeconds: 1800 }],
    ['+1h', { Action: 'AI_GOAL_TIME_ACTION_EXTEND', ExtendSeconds: 3600 }],
    ['AIRunningStatus.unlimited', { Action: 'AI_GOAL_TIME_ACTION_NEVER_ENDING' }],
    ['-15m', { Action: 'AI_GOAL_TIME_ACTION_EXTEND', ExtendSeconds: -900 }],
    ['AIRunningStatus.stopAfterRound', { Action: 'AI_GOAL_TIME_ACTION_DISABLE' }],
  ] as const
  for (const [name, patch] of cases) {
    fireEvent.click(screen.getByRole('button', { name }))
    expect(onSend).toHaveBeenLastCalledWith({
      token: 'running-session',
      type: '',
      params: { IsConfigHotpatch: true, HotpatchType: 'GoalTime', GoalTimePatch: patch },
    })
  }
  expect(onSend).toHaveBeenCalledTimes(cases.length)
})

it.each([3600, -1])('hides the open status at zero limit and restores it closed at %i', (nextLimit) => {
  store.setState({ sessionSnapshot: snapshot })
  render(<AIRunningStatus />)
  fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.label/ }))
  expect(screen.getByRole('progressbar')).toBeInTheDocument()

  const updateLimit = (seconds: number) =>
    act(() => {
      rawData.agentPolicySnapshot = {
        ...initialPolicy,
        goal: {
          effective: true,
          time_limit: {
            ...initialPolicy.goal.time_limit,
            mode: seconds === -1 ? 'never_ending' : 'deadline',
            configured_duration_seconds: seconds,
          },
        },
      }
      store.getState().updateStateCount('agentPolicySnapshotUpdate')
    })
  updateLimit(0)
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.queryByRole('progressbar')).toBeNull()

  updateLimit(nextLimit)
  const trigger = screen.getByRole('button', { name: /^AIRunningStatus.label/ })
  expect(trigger).toHaveTextContent(nextLimit === -1 ? '∞' : '1h')
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
})

it('tracks processing snapshots and policy updates, including inactive and unlimited goals', async () => {
  render(<AIRunningStatus />)
  expect(screen.queryByRole('status')).toBeNull()
  act(() => store.setState({ sessionSnapshot: { ...snapshot, current_round: 2 } }))
  fireEvent.click(screen.getByRole('button', { name: /^AIRunningStatus.label 2 / }))
  const progress = await screen.findByRole('progressbar')
  act(() => {
    rawData.agentPolicySnapshot = { ...initialPolicy, goal: { ...initialPolicy.goal, effective: false } }
    store.setState({ sessionSnapshot: { ...snapshot, current_round: 3 } })
  })
  expect(progress).toHaveAttribute('aria-valuetext', expect.not.stringContaining('—'))
  act(() => store.getState().updateStateCount('agentPolicySnapshotUpdate'))
  expect(screen.queryByRole('progressbar')).toBeNull()
  expect(screen.getByText('AIRunningStatus.remaining').nextElementSibling).toHaveTextContent('—')
  act(() => {
    rawData.agentPolicySnapshot = {
      ...initialPolicy,
      goal: { effective: true, time_limit: { mode: 'never_ending', configured_duration_seconds: -1, deadline_at: 0 } },
    }
    store.getState().updateStateCount('agentPolicySnapshotUpdate')
  })
  expect(screen.queryByRole('progressbar')).toBeNull()
  const summary = screen.getByText('AIRunningStatus.used').parentElement
  await waitFor(() => expect(summary).toBeVisible())
  expect(summary).toHaveTextContent('AIRunningStatus.used 12m36s · AIRunningStatus.infinite')
  expect(screen.getByRole('button', { name: '-15m' })).toBeVisible()
  act(() => {
    rawData.agentPolicySnapshot = {
      ...initialPolicy,
      goal: { effective: false, time_limit: { ...initialPolicy.goal.time_limit, mode: 'disabled' } },
    }
    store.getState().updateStateCount('agentPolicySnapshotUpdate')
  })
  expect(summary).toHaveTextContent('AIRunningStatus.used 12m36s · AIRunningStatus.noTimeLimit')
  expect(screen.queryByRole('progressbar')).toBeNull()
  act(() => {
    rawData.agentPolicySnapshot = initialPolicy
    store.getState().updateStateCount('agentPolicySnapshotUpdate')
  })
  expect(screen.getByRole('progressbar')).toBeVisible()
  act(() => store.setState({ sessionSnapshot: { ...snapshot, execution: { ...execution, status: 'completed' } } }))
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.queryByRole('progressbar')).toBeNull()
})
