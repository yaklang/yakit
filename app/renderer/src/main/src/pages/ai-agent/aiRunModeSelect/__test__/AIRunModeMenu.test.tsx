import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ButtonHTMLAttributes, ChangeEvent, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
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

vi.mock('@/components/yakitUI/YakitPopconfirm/YakitPopconfirm', () => ({
  YakitPopconfirm: ({
    children,
    title,
    open,
    onConfirm,
    onCancel,
  }: {
    children: ReactNode
    title: ReactNode
    open: boolean
    onConfirm: () => void
    onCancel: () => void
  }) => (
    <div>
      {children}
      {open && (
        <div role="dialog">
          {title}
          <button onClick={onCancel}>YakitButton.cancel</button>
          <button onClick={onConfirm}>YakitButton.ok</button>
        </div>
      )}
    </div>
  ),
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
    type: _type,
    ...props
  }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & { icon?: ReactNode; type?: string }) => (
    <button {...props}>
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
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({
  YakitSelect: ({
    value,
    onChange,
    options,
    'aria-label': label,
    disabled,
  }: {
    value: string
    onChange: (value: string) => void
    options: Array<{ value: string; label: string }>
    'aria-label': string
    disabled?: boolean
  }) => (
    <select aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
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
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({
    children,
    content,
    open,
    onOpenChange,
    arrow,
    trigger,
  }: {
    children: ReactNode
    content: ReactNode
    open: boolean
    onOpenChange: (open: boolean) => void
    arrow: boolean
    trigger: string | string[]
  }) => (
    <div data-testid="acceptance-popover" data-arrow={String(arrow)}>
      <div
        onClick={() => trigger.includes('click') && onOpenChange(!open)}
        onMouseEnter={() => trigger.includes('hover') && onOpenChange(true)}
      >
        {children}
      </div>
      {open && content}
    </div>
  ),
}))

import { AIRunModeMenu } from '../AIRunModeMenu'

const label = (key: string) => `AIMilkdownModeSlash.${key}`
const openAcceptance = () => fireEvent.click(screen.getByRole('button', { name: 'AIRunModeSelect.editAcceptance' }))
const confirmGoalSwitch = () => {
  fireEvent.click(screen.getByRole('button', { name: 'YakitButton.ok' }))
}

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, {
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
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
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
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getAllByRole('radio').filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(1)
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
    expect(screen.getByRole('radio', { name: label('minIterations') })).toBeChecked()
    const input = screen.getByRole('spinbutton', { name: label('minIterations') })
    expect(input).toBeEnabled()
    expect(input).toHaveValue(1)
    expect(screen.getByRole('radio', { name: label('acceptance') })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: label('duration') })).not.toBeChecked()
  })

  it.each(['acceptance', 'duration'])('preserves an existing %s constraint when Goal is enabled', (mode) => {
    state.enableGoalMode = true
    if (mode === 'acceptance') state.goalAcceptanceCriteria = 'existing'
    else state.goalDurationSeconds = 3600
    render(<AIRunModeMenu />)
    expect(screen.getByRole('radio', { name: label(mode) })).toBeChecked()
    expect(screen.getByRole('radio', { name: label('minIterations') })).not.toBeChecked()
  })

  it('applies duration presets to the active duration limit', () => {
    state.enableGoalMode = true
    state.goalDurationSeconds = 3600
    render(<AIRunModeMenu />)
    const select = screen.getByRole('combobox', { name: label('duration') })
    const threeHours = Array.from((select as HTMLSelectElement).options).find((option) =>
      option.textContent?.includes('3h'),
    )!
    fireEvent.change(select, { target: { value: threeHours.value } })
    expect(state.onSetStrategy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        GoalDurationSeconds: 10800,
      }),
    )
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

  it.each(['minIterations', 'acceptance', 'duration'] as const)(
    'keeps the selected %s option and its value when switching is cancelled',
    (mode) => {
      state.enableGoalMode = true
      state.goalMinIterations = mode === 'minIterations' ? 5 : 0
      state.goalAcceptanceCriteria = mode === 'acceptance' ? 'ces' : ''
      state.goalDurationSeconds = mode === 'duration' ? 10800 : 0
      render(<AIRunModeMenu />)
      const nextMode = mode === 'duration' ? 'acceptance' : 'duration'

      fireEvent.click(screen.getByRole('radio', { name: label(nextMode) }))

      expect(screen.getByRole('dialog')).toHaveTextContent('AIRunModeSelect.switchGoalModeContent')
      expect(screen.getByRole('radio', { name: label(mode) })).toBeChecked()
      expect(screen.getByRole('radio', { name: label(nextMode) })).not.toBeChecked()
      expect(state.onSetStrategy).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: 'YakitButton.cancel' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(state.onSetStrategy).not.toHaveBeenCalled()
      expect(screen.getByRole('radio', { name: label(mode) })).toBeChecked()
      if (mode === 'minIterations') expect(screen.getByRole('spinbutton', { name: label(mode) })).toHaveValue(5)
      else if (mode === 'acceptance') expect(screen.getByText('ces')).toBeInTheDocument()
      else expect(screen.getByRole('combobox', { name: label(mode) })).toHaveValue('3h')
    },
  )

  it.each([
    ['minIterations', 'acceptance', { GoalMinIterations: 0, GoalDurationSeconds: 0, GoalAcceptanceCriteria: '' }],
    ['acceptance', 'duration', { GoalMinIterations: 0, GoalDurationSeconds: 3600, GoalAcceptanceCriteria: '' }],
    ['duration', 'minIterations', { GoalMinIterations: 1, GoalDurationSeconds: 0, GoalAcceptanceCriteria: '' }],
  ] as const)(
    'only switches from %s to %s and resets the previous value after confirmation',
    (mode, nextMode, next) => {
      state.enableGoalMode = true
      state.goalMinIterations = mode === 'minIterations' ? 5 : 0
      state.goalAcceptanceCriteria = mode === 'acceptance' ? 'ces' : ''
      state.goalDurationSeconds = mode === 'duration' ? 10800 : 0
      render(<AIRunModeMenu />)

      fireEvent.click(screen.getByRole('radio', { name: label(nextMode) }))
      expect(state.onSetStrategy).not.toHaveBeenCalled()
      expect(screen.getByRole('radio', { name: label(mode) })).toBeChecked()

      confirmGoalSwitch()

      expect(state.onSetStrategy).toHaveBeenCalledExactlyOnceWith({ EnableGoalMode: true, ...next })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    },
  )

  it('does not ask for confirmation when clicking the selected Goal option', () => {
    state.enableGoalMode = true
    state.goalDurationSeconds = 10800
    render(<AIRunModeMenu />)

    fireEvent.click(screen.getByRole('radio', { name: label('duration') }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: label('duration') })).toHaveValue('3h')
  })

  it('switches between Goal constraints and clears the previous constraint', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'existing'
    const { rerender } = render(<AIRunModeMenu />)
    fireEvent.click(screen.getByRole('radio', { name: label('minIterations') }))
    confirmGoalSwitch()
    expect(state.onSetStrategy).toHaveBeenLastCalledWith({
      EnableGoalMode: true,
      GoalMinIterations: 1,
      GoalDurationSeconds: 0,
      GoalAcceptanceCriteria: '',
    })
    state.goalAcceptanceCriteria = ''
    state.goalMinIterations = 1
    rerender(<AIRunModeMenu />)
    expect(screen.getByRole('radio', { name: label('minIterations') })).toBeChecked()
    expect(screen.getByRole('radio', { name: label('acceptance') })).not.toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: label('duration') }))
    confirmGoalSwitch()
    expect(state.onSetStrategy).toHaveBeenLastCalledWith({
      EnableGoalMode: true,
      GoalMinIterations: 0,
      GoalDurationSeconds: 3600,
      GoalAcceptanceCriteria: '',
    })
  })

  it('selects acceptance without opening the editor, including when no criteria have been entered', () => {
    state.enableGoalMode = true
    state.goalMinIterations = 2
    const { rerender } = render(<AIRunModeMenu />)
    fireEvent.click(screen.getByText(label('acceptance')))
    confirmGoalSwitch()
    expect(screen.getByRole('radio', { name: label('acceptance') })).toBeChecked()
    expect(screen.getByRole('radio', { name: label('minIterations') })).not.toBeChecked()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(state.onSetStrategy).toHaveBeenCalledWith({
      EnableGoalMode: true,
      GoalMinIterations: 0,
      GoalDurationSeconds: 0,
      GoalAcceptanceCriteria: '',
    })

    state.goalMinIterations = 0
    rerender(<AIRunModeMenu />)
    expect(screen.getByRole('radio', { name: label('acceptance') })).toBeChecked()

    fireEvent.click(screen.getByRole('radio', { name: label('duration') }))
    confirmGoalSwitch()
    expect(screen.getByRole('radio', { name: label('acceptance') })).not.toBeChecked()
  })

  it('uses the theme color for the edit icon only after switching to acceptance is confirmed', () => {
    state.enableGoalMode = true
    state.goalDurationSeconds = 10800
    const { rerender } = render(<AIRunModeMenu />)
    const icon = screen
      .getByRole('button', { name: 'AIRunModeSelect.editAcceptance' })
      .querySelector<SVGElement>('svg')!
    expect(icon.style.color).toBe('')

    fireEvent.click(screen.getByRole('radio', { name: label('acceptance') }))
    expect(icon.style.color).toBe('')
    confirmGoalSwitch()
    expect(icon.style.color).toBe('var(--Colors-Use-Main-Primary)')

    state.goalDurationSeconds = 0
    rerender(<AIRunModeMenu />)
    expect(icon.style.color).toBe('var(--Colors-Use-Main-Primary)')
    fireEvent.click(screen.getByRole('radio', { name: label('minIterations') }))
    expect(icon.style.color).toBe('var(--Colors-Use-Main-Primary)')
    confirmGoalSwitch()
    expect(icon.style.color).toBe('')
  })

  it.each(['iterations', 'duration'] as const)('disables acceptance editing while %s is selected', (mode) => {
    state.enableGoalMode = true
    state.goalMinIterations = mode === 'iterations' ? 3 : 0
    state.goalDurationSeconds = mode === 'duration' ? 10800 : 0
    render(<AIRunModeMenu />)
    const editButton = screen.getByRole('button', { name: 'AIRunModeSelect.editAcceptance' })

    expect(editButton).toBeDisabled()
    fireEvent.click(editButton)

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it.each(['', 'existing criteria'])('groups summary %s and the edit icon into the popover button', (criteria) => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = criteria
    render(<AIRunModeMenu />)
    if (!criteria) {
      fireEvent.click(screen.getByRole('radio', { name: label('acceptance') }))
      confirmGoalSwitch()
      state.onSetStrategy.mockClear()
    }
    const editButton = screen.getByRole('button', { name: 'AIRunModeSelect.editAcceptance' })
    expect(editButton).toBeEnabled()
    const summary = screen.getByText(criteria || 'AIRunModeSelect.noAcceptance')
    expect(editButton).toContainElement(summary)
    expect(editButton.querySelector('svg')).not.toBeNull()
    expect(editButton.querySelector<SVGElement>('svg')!.style.color).toBe('var(--Colors-Use-Main-Primary)')
    expect(screen.getByTestId('acceptance-popover')).toContainElement(editButton)
    fireEvent.mouseEnter(editButton)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.click(summary)
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toHaveValue(criteria)
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it('clears an unsaved acceptance selection when the strategy changes externally', () => {
    state.enableGoalMode = true
    const { rerender } = render(<AIRunModeMenu />)
    fireEvent.click(screen.getByRole('radio', { name: label('acceptance') }))
    confirmGoalSwitch()
    expect(screen.getByRole('radio', { name: label('acceptance') })).toBeChecked()
    state.goalDurationSeconds = 3600
    rerender(<AIRunModeMenu />)
    expect(screen.getByRole('radio', { name: label('duration') })).toBeChecked()
    expect(screen.getByRole('radio', { name: label('acceptance') })).not.toBeChecked()
  })
  it('closes the acceptance editor when Goal is disabled', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'existing'
    render(<AIRunModeMenu />)
    openAcceptance()
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: label('goal') }))
    expect(state.onToggleMode).toHaveBeenCalledWith('goal')
    expect(screen.queryByRole('textbox', { name: label('acceptance') })).not.toBeInTheDocument()
    expect(state.onSetStrategy).not.toHaveBeenCalled()
  })

  it.each(['minIterations', 'duration'])('closes the acceptance editor when selecting %s', (constraint) => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'existing'
    render(<AIRunModeMenu />)
    openAcceptance()
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: label(constraint) }))
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toHaveValue('existing')
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    confirmGoalSwitch()
    expect(screen.queryByRole('textbox', { name: label('acceptance') })).not.toBeInTheDocument()
    expect(state.onSetStrategy).toHaveBeenCalledWith(expect.objectContaining({ GoalAcceptanceCriteria: '' }))
  })
  it('saves trimmed acceptance text and clears competing Goal fields', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'old criteria'
    render(<AIRunModeMenu />)
    openAcceptance()
    expect(screen.getByTestId('acceptance-popover')).toHaveAttribute('data-arrow', 'false')
    fireEvent.change(screen.getByRole('textbox', { name: label('acceptance') }), {
      target: { value: '  new criteria  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.save' }))
    expect(state.onSetStrategy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        EnableGoalMode: true,
        GoalMinIterations: 0,
        GoalDurationSeconds: 0,
        GoalAcceptanceCriteria: 'new criteria',
      }),
    )
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('disables saving blank acceptance and cancels without changing the strategy', () => {
    state.enableGoalMode = true
    state.goalAcceptanceCriteria = 'existing'
    render(<AIRunModeMenu />)
    openAcceptance()
    fireEvent.change(screen.getByRole('textbox', { name: label('acceptance') }), { target: { value: '   ' } })
    expect(screen.getByRole('button', { name: 'YakitButton.save' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.cancel' }))
    expect(state.onSetStrategy).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    openAcceptance()
    expect(screen.getByRole('textbox', { name: label('acceptance') })).toHaveValue('existing')
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
