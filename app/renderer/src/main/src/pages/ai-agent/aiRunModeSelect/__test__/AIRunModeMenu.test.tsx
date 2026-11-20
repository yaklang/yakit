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
  onToggleMode: vi.fn(),
  onSetStrategy: vi.fn(),
}))

vi.mock('../useAIRunMode', () => ({
  useAIRunMode: () => ({
    ...state,
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
    ...props
  }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & { icon?: ReactNode; type?: string }) => (
    <button {...props} data-variant={type}>
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
  it('shows three unchecked mode switches and no inactive settings', () => {
    render(<AIRunModeMenu />)
    expect(screen.getByText('AIRunModeSelect.configuration')).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(3)
    screen.getAllByRole('switch').forEach((control) => expect(control).not.toBeChecked())
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'AIRunModeSelect.stopCondition' })).not.toBeInTheDocument()
  })

  it.each([
    ['plan', 'plan'],
    ['multiAgent', 'multiAgent'],
    ['goal', 'goal'],
  ])('toggles %s using the existing mode action', (key, translation) => {
    render(<AIRunModeMenu />)
    fireEvent.click(screen.getByRole('switch', { name: label(translation) }))
    expect(state.onToggleMode).toHaveBeenCalledWith(key)
  })

  it('updates the sub-agent count when Multi-Agent is enabled', () => {
    state.enableMultiAgent = true
    state.maxSubAgents = 3
    render(<AIRunModeMenu />)
    expect(screen.getByRole('spinbutton', { name: label('subAgentCount') })).toHaveValue(3)
    fireEvent.change(screen.getByRole('spinbutton', { name: label('subAgentCount') }), { target: { value: '5' } })
    expect(state.onSetStrategy).toHaveBeenCalledWith(expect.objectContaining({ MaxSubAgents: 5 }))
  })

  it('keeps Goal choices exclusive and updates the active iteration limit', () => {
    state.enableGoalMode = true
    state.goalMinIterations = 2
    render(<AIRunModeMenu />)
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
    expect(state.onSetStrategy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        GoalMinIterations: 4,
      }),
    )
  })

  it('defaults to the minimum iteration option when Goal is enabled without a configured constraint', () => {
    state.enableGoalMode = true
    render(<AIRunModeMenu />)
    expect(screen.getByRole('button', { name: label('minIterations') })).toHaveAttribute('aria-pressed', 'true')
    const input = screen.getByRole('spinbutton', { name: label('minIterations') })
    expect(input).toBeEnabled()
    expect(input).toHaveValue(1)
    expect(screen.getByRole('button', { name: label('acceptance') })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: label('duration') })).toHaveAttribute('aria-pressed', 'false')
  })

  it.each(['acceptance', 'duration'])('preserves an existing %s constraint when Goal is enabled', (mode) => {
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
    ['5h', 18000],
  ] as const)('applies the %s duration preset', (preset, seconds) => {
    state.enableGoalMode = true
    state.goalDurationSeconds = 7200
    render(<AIRunModeMenu />)
    fireEvent.click(screen.getByRole('button', { name: preset }))
    expect(state.onSetStrategy).toHaveBeenLastCalledWith({ GoalDurationSeconds: seconds }, true)
  })

  it.each([0, -2, 1, 3])('shows a minimum iteration value of 1 when the stored value is %s', (iterations) => {
    state.enableGoalMode = true
    state.goalMinIterations = iterations
    render(<AIRunModeMenu />)
    const input = screen.getByRole('spinbutton', { name: label('minIterations') })
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveValue(Math.max(1, iterations))
  })

  it.each(['0', '-3'])('clamps an entered iteration value of %s to 1', (value) => {
    state.enableGoalMode = true
    state.goalMinIterations = 2
    render(<AIRunModeMenu />)
    fireEvent.change(screen.getByRole('spinbutton', { name: label('minIterations') }), { target: { value } })
    expect(state.onSetStrategy).toHaveBeenLastCalledWith({ GoalMinIterations: 1 })
  })

  it.each([
    ['minIterations', 'acceptance', { GoalMinIterations: 0, GoalDurationSeconds: 0, GoalAcceptanceCriteria: '' }],
    ['acceptance', 'duration', { GoalMinIterations: 0, GoalDurationSeconds: 3600, GoalAcceptanceCriteria: '' }],
    ['duration', 'minIterations', { GoalMinIterations: 1, GoalDurationSeconds: 0, GoalAcceptanceCriteria: '' }],
  ] as const)('switches directly from %s to %s and resets the previous value', (mode, nextMode, next) => {
    state.enableGoalMode = true
    state.goalMinIterations = mode === 'minIterations' ? 5 : 0
    state.goalAcceptanceCriteria = mode === 'acceptance' ? 'ces' : ''
    state.goalDurationSeconds = mode === 'duration' ? 10800 : 0
    render(<AIRunModeMenu />)

    fireEvent.click(screen.getByRole('button', { name: label(nextMode) }))
    expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith({ EnableGoalMode: true, ...next }, true)
  })

  it('keeps the current value when clicking the selected Goal option', () => {
    state.enableGoalMode = true
    state.goalDurationSeconds = 10800
    render(<AIRunModeMenu />)

    fireEvent.click(screen.getByRole('button', { name: label('duration') }))

    expect(state.onSetStrategy).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '3h' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches between Goal constraints and clears the previous constraint', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'existing'
    const { rerender } = render(<AIRunModeMenu />)
    fireEvent.click(screen.getByRole('button', { name: label('minIterations') }))
    expect(state.onSetStrategy).toHaveBeenLastCalledWith(
      { EnableGoalMode: true, GoalMinIterations: 1, GoalDurationSeconds: 0, GoalAcceptanceCriteria: '' },
      true,
    )
    state.goalAcceptanceCriteria = ''
    state.goalMinIterations = 1
    rerender(<AIRunModeMenu />)
    expect(screen.getByRole('button', { name: label('minIterations') })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: label('acceptance') })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: label('duration') }))
    expect(state.onSetStrategy).toHaveBeenLastCalledWith(
      { EnableGoalMode: true, GoalMinIterations: 0, GoalDurationSeconds: 3600, GoalAcceptanceCriteria: '' },
      true,
    )
  })

  it('shows an inline empty acceptance field when selected', () => {
    state.enableGoalMode = true
    const { rerender } = render(<AIRunModeMenu />)
    fireEvent.click(screen.getByRole('button', { name: label('acceptance') }))
    expect(screen.getByRole('button', { name: label('acceptance') })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toHaveValue('')
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(state.onSetStrategy).toHaveBeenLastCalledWith(
      { EnableGoalMode: true, GoalMinIterations: 0, GoalDurationSeconds: 0, GoalAcceptanceCriteria: '' },
      true,
    )
    rerender(<AIRunModeMenu />)
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toHaveValue('')
  })

  it.each(['iterations', 'duration'] as const)('hides acceptance editing while %s is selected', (mode) => {
    state.enableGoalMode = true
    state.goalMinIterations = mode === 'iterations' ? 3 : 0
    state.goalDurationSeconds = mode === 'duration' ? 10800 : 0
    render(<AIRunModeMenu />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'AIRunModeSelect.editAcceptance' })).not.toBeInTheDocument()
  })

  it('renders stored acceptance and reflects external text changes', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'existing criteria'
    const { rerender } = render(<AIRunModeMenu />)
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toHaveValue('existing criteria')
    state.goalAcceptanceCriteria = 'externally updated criteria'
    rerender(<AIRunModeMenu />)
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toHaveValue('externally updated criteria')
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it('clears an empty acceptance selection when the strategy changes externally', () => {
    state.enableGoalMode = true
    const { rerender } = render(<AIRunModeMenu />)
    fireEvent.click(screen.getByRole('button', { name: label('acceptance') }))
    state.goalDurationSeconds = 3600
    rerender(<AIRunModeMenu />)
    expect(screen.getByRole('button', { name: label('duration') })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', { name: label('minIterations') })).not.toBeInTheDocument()
  })

  it('hides acceptance configuration when Goal is disabled', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'existing'
    const { rerender } = render(<AIRunModeMenu />)
    fireEvent.click(screen.getByRole('switch', { name: label('goal') }))
    expect(state.onToggleMode).toHaveBeenCalledWith('goal')
    state.enableGoalMode = false
    rerender(<AIRunModeMenu />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it.each(['minIterations', 'duration'])('hides acceptance after selecting %s', (constraint) => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'existing'
    const { rerender } = render(<AIRunModeMenu />)
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toHaveValue('existing')
    fireEvent.click(screen.getByRole('button', { name: label(constraint) }))
    expect(state.onSetStrategy).toHaveBeenCalledWith(expect.objectContaining({ GoalAcceptanceCriteria: '' }), true)
    state.goalAcceptanceCriteria = ''
    state.goalMinIterations = constraint === 'minIterations' ? 1 : 0
    state.goalDurationSeconds = constraint === 'duration' ? 3600 : 0
    rerender(<AIRunModeMenu />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it.each([
    ['close', 'final criteria'],
    ['unmount', ''],
  ])('saves the final acceptance edit only on %s', (close, finalValue) => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'old criteria'
    const { rerender, unmount } = render(<AIRunModeMenu open />)
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
      if (close === 'close') {
        rerender(<AIRunModeMenu open={false} />)
        expect(state.onSetStrategy).toHaveBeenCalledTimes(1)
      }
      unmount()
      expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith({ GoalAcceptanceCriteria: finalValue }, true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('skips saving when the acceptance draft returns to its original value', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'original'
    const { unmount } = render(<AIRunModeMenu />)
    const input = screen.getByRole('textbox', { name: label('acceptance') })
    fireEvent.change(input, { target: { value: 'draft' } })
    fireEvent.change(input, { target: { value: 'original' } })
    unmount()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it('does not submit the previous session’s draft after switching sessions', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'original'
    const { rerender, unmount } = render(<AIRunModeMenu />)
    const input = screen.getByRole('textbox', { name: label('acceptance') })
    fireEvent.change(input, { target: { value: 'session A draft' } })
    state.sessionId = 'session-b'
    rerender(<AIRunModeMenu />)
    expect(input).toHaveValue('original')
    unmount()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it('opens a stored nonpreset duration as custom hours and minutes', () => {
    state.enableGoalMode = true
    state.goalDurationSeconds = 8100
    render(<AIRunModeMenu />)
    expect(screen.getByRole('button', { name: 'AIRunModeSelect.customDuration' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationHours' })).toHaveValue(2)
    expect(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationMinutes' })).toHaveValue(15)
  })

  it('preserves the stored never duration and can switch it to custom', () => {
    state.enableGoalMode = true
    state.goalDurationSeconds = -1
    render(<AIRunModeMenu />)
    expect(screen.getByRole('button', { name: label('durationNever') })).toHaveAttribute('aria-pressed', 'true')
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'AIRunModeSelect.customDuration' }))
    expect(state.onSetStrategy).toHaveBeenLastCalledWith({ GoalDurationSeconds: 3600 }, true)
  })

  it('does not offer never for a positive duration', () => {
    state.enableGoalMode = true
    state.goalDurationSeconds = 3600
    render(<AIRunModeMenu />)
    expect(screen.queryByRole('button', { name: label('durationNever') })).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('updates custom duration and restores its values when the menu reopens', () => {
    state.enableGoalMode = true
    state.goalDurationSeconds = 3600
    const { rerender, unmount } = render(<AIRunModeMenu />)
    const presetButton = screen.getByRole('button', { name: '1h', pressed: true })
    const customButton = screen.getByRole('button', { name: 'AIRunModeSelect.customDuration', pressed: false })
    expect(presetButton).toHaveAttribute('data-variant', 'primary')
    expect(customButton).toHaveAttribute('data-variant', 'secondary2')
    fireEvent.click(presetButton)
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    fireEvent.click(customButton)
    expect(customButton).toHaveAttribute('aria-pressed', 'true')
    expect(customButton).toHaveAttribute('data-variant', 'primary')
    expect(presetButton).toHaveAttribute('data-variant', 'secondary2')
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationHours' }), {
      target: { value: '2' },
    })
    expect(state.onSetStrategy).toHaveBeenLastCalledWith({ GoalDurationSeconds: 7200 }, true)
    state.goalDurationSeconds = 7200
    rerender(<AIRunModeMenu />)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationMinutes' }), {
      target: { value: '15' },
    })
    expect(state.onSetStrategy).toHaveBeenLastCalledWith({ GoalDurationSeconds: 8100 }, true)
    state.goalDurationSeconds = 8100
    unmount()
    render(<AIRunModeMenu />)
    expect(screen.getByRole('button', { name: 'AIRunModeSelect.customDuration' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationHours' })).toHaveValue(2)
    expect(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.durationMinutes' })).toHaveValue(15)
  })

  it.each([
    ['durationHours', '-2', 60, 60],
    ['durationMinutes', '-1', 60, 60],
    ['durationMinutes', '80', 60, 3540],
    ['durationHours', '0', 3600, 60],
  ] as const)('bounds custom %s input %s', (field, value, stored, expected) => {
    state.enableGoalMode = true
    state.goalDurationSeconds = stored
    render(<AIRunModeMenu />)
    fireEvent.click(screen.getByRole('button', { name: 'AIRunModeSelect.customDuration' }))
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.' + field }), { target: { value } })
    expect(state.onSetStrategy).toHaveBeenLastCalledWith({ GoalDurationSeconds: expected }, true)
  })

  it.each([false, true])('resets all modes and parameters with Plan enabled=%s', (enablePlan) => {
    state.enablePlan = enablePlan
    state.enableMultiAgent = true
    state.enableGoalMode = true
    state.goalMinIterations = 2
    render(<AIRunModeMenu />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.reset' }))
    expect(state.onToggleMode.mock.calls).toEqual(enablePlan ? [['plan']] : [])
    expect(state.onSetStrategy).toHaveBeenCalledWith({
      EnableMultiAgent: false,
      MaxSubAgents: 0,
      EnableGoalMode: false,
      GoalMinIterations: 0,
      GoalDurationSeconds: 0,
      GoalAcceptanceCriteria: '',
    })
  })
})
