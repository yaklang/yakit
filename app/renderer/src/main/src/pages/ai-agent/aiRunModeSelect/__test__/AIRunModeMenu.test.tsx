import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ButtonHTMLAttributes, ChangeEvent, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  sessionId: 'session-a',
  enablePlan: false,
  enableMultiAgent: false,
  enableGoalMode: false,
  maxSubAgents: 0,
  goalMinIterations: 0,
  goalDurationSeconds: 0,
  goalAcceptanceCriteria: '',
  onSetPlan: vi.fn(),
  onSetStrategy: vi.fn(),
}))

vi.mock('../useAIRunMode', () => ({
  useAIRunMode: () => ({
    ...state,
    selectedModes: [],
    strategy: {
      EnableMultiAgent: state.enableMultiAgent,
      MaxSubAgents: state.maxSubAgents,
      EnableGoalMode: state.enableGoalMode,
      GoalMinIterations: state.goalMinIterations,
      GoalDurationSeconds: state.goalDurationSeconds,
      GoalAcceptanceCriteria: state.goalAcceptanceCriteria,
    },
    isModeSelected: (key: 'plan' | 'multiAgent' | 'goal') =>
      ({ plan: state.enablePlan, multiAgent: state.enableMultiAgent, goal: state.enableGoalMode })[key],
  }),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    icon,
    children,
    type,
    isActive,
    ...props
  }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
    icon?: ReactNode
    type?: string
    isActive?: boolean
  }) => (
    <button {...props} data-variant={type} data-active={isActive}>
      {icon}
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitSwitch/YakitSwitch', () => ({
  YakitSwitch: ({
    checked,
    onChange,
    'aria-label': label,
    disabled,
  }: {
    checked: boolean
    onChange: (checked: boolean) => void
    'aria-label': string
    disabled?: boolean
  }) => (
    <input
      type="checkbox"
      role="switch"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
  ),
}))
vi.mock('@/components/yakitUI/YakitInputNumber/YakitInputNumber', () => ({
  YakitInputNumber: ({
    value,
    onChange,
    'aria-label': label,
    min,
    disabled,
  }: {
    value: number
    onChange: (value: number) => void
    'aria-label': string
    min?: number
    disabled?: boolean
  }) => (
    <input
      type="number"
      aria-label={label}
      value={value}
      min={min}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: {
    TextArea: ({
      value,
      onChange,
      'aria-label': label,
    }: {
      value: string
      onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
      'aria-label': string
    }) => <textarea aria-label={label} value={value} onChange={onChange} />,
  },
}))
import { AIRunModeMenu } from '../AIRunModeMenu'
import AIRunModeSelect from '../AIRunModeSelect'

const toggleMenu = (expanded: boolean) => fireEvent.click(screen.getByRole('button', { expanded }))

const openMenu = () => {
  const view = render(<AIRunModeSelect key={state.sessionId} />)
  toggleMenu(false)
  return {
    close: () => toggleMenu(true),
    refresh: () => view.rerender(<AIRunModeSelect key={state.sessionId} />),
    unmount: view.unmount,
  }
}

const label = (key: string) => `AIMilkdownModeSlash.${key}`

afterEach(cleanup)
beforeEach(() => {
  vi.resetAllMocks()
  Object.assign(state, {
    sessionId: 'session-a',
    enablePlan: false,
    enableMultiAgent: false,
    enableGoalMode: false,
    maxSubAgents: 0,
    goalMinIterations: 0,
    goalDurationSeconds: 0,
    goalAcceptanceCriteria: '',
  })
})

describe('AIRunModeMenu', () => {
  it('shows three unchecked switches and no inactive configuration', () => {
    const { unmount } = render(<AIRunModeMenu />)
    expect(screen.getByText('AIRunModeSelect.configuration')).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(3)
    screen.getAllByRole('switch').forEach((control) => expect(control).not.toBeChecked())
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'AIRunModeSelect.stopCondition' })).not.toBeInTheDocument()
    unmount()
    expect(state.onSetPlan).not.toHaveBeenCalled()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it('collects Plan, Multi-Agent and Goal edits and submits the final values only on close', () => {
    const { close, unmount } = openMenu()
    fireEvent.click(screen.getByRole('switch', { name: label('plan') }))
    fireEvent.click(screen.getByRole('switch', { name: label('multiAgent') }))
    fireEvent.change(screen.getByRole('spinbutton', { name: label('subAgentCount') }), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('switch', { name: label('goal') }))
    fireEvent.click(screen.getByRole('button', { name: label('duration') }))
    for (const preset of ['30m', '3h']) fireEvent.click(screen.getByRole('button', { name: preset }))
    screen.getAllByRole('switch').forEach((control) => expect(control).toBeChecked())
    expect(screen.getByRole('button', { name: '3h' })).toHaveAttribute('aria-pressed', 'true')
    expect(state.onSetPlan).not.toHaveBeenCalled()
    expect(state.onSetStrategy).not.toHaveBeenCalled()

    close()
    expect(state.onSetPlan).toHaveBeenCalledExactlyOnceWith(true)
    expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith(
      { EnableMultiAgent: true, MaxSubAgents: 5, EnableGoalMode: true, GoalDurationSeconds: 10800 },
      true,
    )
    unmount()
    expect(state.onSetPlan).toHaveBeenCalledTimes(1)
    expect(state.onSetStrategy).toHaveBeenCalledTimes(1)
  })

  it('keeps the existing iteration choice exclusive and stages its edited limit', () => {
    state.enableGoalMode = true
    state.goalMinIterations = 2
    const { close } = openMenu()
    expect(
      within(screen.getByRole('group', { name: 'AIRunModeSelect.stopCondition' })).getAllByRole('button'),
    ).toHaveLength(3)
    expect(screen.getByRole('button', { name: label('minIterations'), pressed: true })).toHaveAttribute(
      'data-variant',
      'primary',
    )
    expect(screen.getByRole('button', { name: label('duration'), pressed: false })).toHaveAttribute(
      'data-variant',
      'secondary2',
    )
    fireEvent.change(screen.getByRole('spinbutton', { name: label('minIterations') }), { target: { value: '4' } })
    expect(screen.getByRole('spinbutton', { name: label('minIterations') })).toHaveValue(4)
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    close()
    expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith({ GoalMinIterations: 4 }, true)
  })

  it.each([0, -2, 1, 3])('shows a minimum iteration value of 1 for stored value %s', (iterations) => {
    state.enableGoalMode = true
    state.goalMinIterations = iterations
    render(<AIRunModeMenu />)
    const input = screen.getByRole('spinbutton', { name: label('minIterations') })
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveValue(Math.max(1, iterations))
  })

  it.each(['0', '-3'])('clamps an iteration edit of %s and saves it on close', (value) => {
    state.enableGoalMode = true
    state.goalMinIterations = 2
    const { close } = openMenu()
    fireEvent.change(screen.getByRole('spinbutton', { name: label('minIterations') }), { target: { value } })
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    close()
    expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith({ GoalMinIterations: 1 }, true)
  })

  it.each(['acceptance', 'duration'])('opens an existing %s constraint', (mode) => {
    state.enableGoalMode = true
    if (mode === 'acceptance') state.goalAcceptanceCriteria = 'existing'
    else state.goalDurationSeconds = 3600
    render(<AIRunModeMenu />)
    expect(screen.getByRole('button', { name: label(mode) })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: label('minIterations') })).toHaveAttribute('aria-pressed', 'false')
  })

  it.each([
    ['30m', 1800],
    ['1h', 3600],
    ['3h', 10800],
    ['AIMilkdownModeSlash.durationNever', -1],
  ] as const)('stages the %s duration preset until close', (preset, seconds) => {
    state.enableGoalMode = true
    state.goalDurationSeconds = 7200
    const { close } = openMenu()
    fireEvent.click(screen.getByRole('button', { name: preset }))
    expect(screen.getByRole('button', { name: preset })).toHaveAttribute('aria-pressed', 'true')
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    close()
    expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith({ GoalDurationSeconds: seconds }, true)
  })

  it('switches multiple Goal constraints locally and submits only the final changed fields', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'existing'
    const { close } = openMenu()
    fireEvent.click(screen.getByRole('button', { name: label('minIterations') }))
    expect(screen.getByRole('spinbutton', { name: label('minIterations') })).toHaveValue(1)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: label('duration') }))
    expect(screen.getByRole('button', { name: '1h' })).toHaveAttribute('aria-pressed', 'true')
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    close()
    expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith(
      { GoalDurationSeconds: 3600, GoalAcceptanceCriteria: '' },
      true,
    )
  })

  it('shows an empty acceptance field after selecting acceptance', () => {
    state.enableGoalMode = true
    render(<AIRunModeMenu />)
    fireEvent.click(screen.getByRole('button', { name: label('acceptance') }))
    expect(screen.getByRole('button', { name: label('acceptance') })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toHaveValue('')
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it.each(['final criteria', ''])('saves the final acceptance edit %j only on close', (finalValue) => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'old criteria'
    const { close, unmount } = openMenu()
    const input = screen.getByRole('textbox', { name: label('acceptance') })
    vi.useFakeTimers()
    try {
      for (const value of ['new', 'new criteria', finalValue]) {
        fireEvent.change(input, { target: { value } })
        expect(input).toHaveValue(value)
      }
      fireEvent.blur(input)
      act(() => vi.advanceTimersByTime(1000))
      expect(state.onSetStrategy).not.toHaveBeenCalled()
      close()
      unmount()
      expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith({ GoalAcceptanceCriteria: finalValue }, true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('discards a pending acceptance edit after Goal is disabled and submits the disabled configuration', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'existing'
    const { close } = openMenu()
    fireEvent.change(screen.getByRole('textbox', { name: label('acceptance') }), { target: { value: 'pending' } })
    fireEvent.click(screen.getByRole('switch', { name: label('goal') }))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    close()
    expect(state.onSetPlan).not.toHaveBeenCalled()
    expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith(
      { EnableGoalMode: false, GoalAcceptanceCriteria: '' },
      true,
    )
  })

  it('skips submitting Plan and strategy edits reverted to their original values', () => {
    state.enableGoalMode = true
    state.goalDurationSeconds = 3600
    state.enableMultiAgent = true
    state.maxSubAgents = 2
    const { close } = openMenu()
    fireEvent.click(screen.getByRole('switch', { name: label('plan') }))
    fireEvent.click(screen.getByRole('switch', { name: label('plan') }))
    fireEvent.click(screen.getByRole('button', { name: '3h' }))
    fireEvent.click(screen.getByRole('button', { name: '1h' }))
    const subAgents = screen.getByRole('spinbutton', { name: label('subAgentCount') })
    fireEvent.change(subAgents, { target: { value: '5' } })
    fireEvent.change(subAgents, { target: { value: '2' } })
    close()
    expect(state.onSetPlan).not.toHaveBeenCalled()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it('skips saving an acceptance draft reverted to its original value', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'original'
    const { close } = openMenu()
    const input = screen.getByRole('textbox', { name: label('acceptance') })
    fireEvent.change(input, { target: { value: 'draft' } })
    fireEvent.change(input, { target: { value: 'original' } })
    close()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it('reflects external changes to an untouched acceptance field', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'existing'
    const { refresh, close } = openMenu()
    state.goalAcceptanceCriteria = 'updated externally'
    refresh()
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toHaveValue('updated externally')
    close()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it('keeps the edited field while merging an unrelated external strategy update', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'existing'
    const { refresh, close } = openMenu()
    fireEvent.change(screen.getByRole('textbox', { name: label('acceptance') }), { target: { value: 'draft' } })
    state.enableMultiAgent = true
    state.maxSubAgents = 7
    refresh()
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toHaveValue('draft')
    expect(screen.getByRole('spinbutton', { name: label('subAgentCount') })).toHaveValue(7)
    close()
    expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith({ GoalAcceptanceCriteria: 'draft' }, true)
  })

  it('drops the previous session drafts when switching sessions', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'original'
    const { refresh, close } = openMenu()
    fireEvent.click(screen.getByRole('switch', { name: label('plan') }))
    fireEvent.change(screen.getByRole('textbox', { name: label('acceptance') }), {
      target: { value: 'session A draft' },
    })
    state.sessionId = 'session-b'
    state.goalAcceptanceCriteria = 'session B criteria'
    refresh()
    expect(state.onSetPlan).not.toHaveBeenCalled()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    toggleMenu(false)
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toHaveValue('session B criteria')
    expect(screen.getByRole('switch', { name: label('plan') })).not.toBeChecked()
    close()
    expect(state.onSetPlan).not.toHaveBeenCalled()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it.each([
    [8100, 2, 15],
    [18000, 5, 0],
  ])('opens %i stored seconds as custom hours and minutes', (seconds, hours, minutes) => {
    state.enableGoalMode = true
    state.goalDurationSeconds = seconds
    render(<AIRunModeMenu />)
    expect(screen.getByRole('button', { name: 'AIRunModeSelect.customDuration' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationHours' })).toHaveValue(hours)
    expect(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationMinutes' })).toHaveValue(minutes)
  })

  it('preserves never duration and stages switching to custom', () => {
    state.enableGoalMode = true
    state.goalDurationSeconds = -1
    const { close } = openMenu()
    expect(screen.getByRole('button', { name: label('durationNever') })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'AIRunModeSelect.customDuration' }))
    expect(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationHours' })).toHaveValue(1)
    expect(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationMinutes' })).toHaveValue(0)
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    close()
    expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith({ GoalDurationSeconds: 3600 }, true)
  })

  it('offers never between 3h and custom for a positive duration', () => {
    state.enableGoalMode = true
    state.goalDurationSeconds = 3600
    render(<AIRunModeMenu />)
    expect(
      within(screen.getByRole('group', { name: label('duration') }))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['30m', '1h', '3h', label('durationNever'), 'AIRunModeSelect.customDuration'])
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('merges custom hour and minute edits and restores the saved values when reopened', () => {
    state.enableGoalMode = true
    state.goalDurationSeconds = 3600
    const { close } = openMenu()
    fireEvent.click(screen.getByRole('button', { name: 'AIRunModeSelect.customDuration' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationHours' }), {
      target: { value: '2' },
    })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationMinutes' }), {
      target: { value: '15' },
    })
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    close()
    expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith({ GoalDurationSeconds: 8100 }, true)
    state.goalDurationSeconds = 8100
    toggleMenu(false)
    expect(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationHours' })).toHaveValue(2)
    expect(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationMinutes' })).toHaveValue(15)
  })

  it.each([
    ['durationHours', '-2', 60, 60],
    ['durationMinutes', '-1', 60, 60],
    ['durationMinutes', '80', 60, 3540],
    ['durationHours', '0', 3600, 60],
  ] as const)('bounds custom %s input %s before saving', (field, value, stored, expected) => {
    state.enableGoalMode = true
    state.goalDurationSeconds = stored
    const { close } = openMenu()
    fireEvent.click(screen.getByRole('button', { name: 'AIRunModeSelect.customDuration' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.' + field }), { target: { value } })
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    close()
    if (stored === expected) expect(state.onSetStrategy).not.toHaveBeenCalled()
    else expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith({ GoalDurationSeconds: expected }, true)
  })

  it.each([false, true])('stages resetting every configured field with Plan enabled=%s', (enablePlan) => {
    state.enablePlan = enablePlan
    state.enableMultiAgent = true
    state.enableGoalMode = true
    state.goalMinIterations = 2
    const { close } = openMenu()
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.reset' }))
    screen.getAllByRole('switch').forEach((control) => expect(control).not.toBeChecked())
    expect(state.onSetPlan).not.toHaveBeenCalled()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    close()
    expect(state.onSetPlan.mock.calls).toEqual(enablePlan ? [[false]] : [])
    expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith(
      { EnableMultiAgent: false, EnableGoalMode: false, GoalMinIterations: 0 },
      true,
    )
  })
})
