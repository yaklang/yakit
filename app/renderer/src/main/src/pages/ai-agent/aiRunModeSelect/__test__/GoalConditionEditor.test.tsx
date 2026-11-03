import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../ai-re-act/hooks/__test__/setupElectron'
import { GoalConditionEditor } from '../GoalConditionEditor'
import type { AIExecutionStrategy } from '@/pages/ai-re-act/hooks/grpcApi'

const fixture = vi.hoisted(() => ({ id: 'session-a' }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => fixture.id }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitSwitch/yakitSwitchAnimation.scss', () => ({}))

const applied = vi.fn((_next: AIExecutionStrategy) => true)
const initial: AIExecutionStrategy = {
  EnableGoalMode: true,
  GoalMinIterations: 4,
  GoalDurationSeconds: 0,
  GoalAcceptanceCriteria: '',
}
const apply = () => fireEvent.click(screen.getByRole('button', { name: 'AIRunModeSelect.applyCondition' }))
const select = (kind: string) => fireEvent.click(screen.getByRole('radio', { name: `AIRunModeSelect.${kind}` }))

beforeEach(() => {
  fixture.id = 'session-a'
  applied.mockReset().mockReturnValue(true)
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Goal condition editor in the existing mode menu', () => {
  it('does not submit when viewing or switching a draft condition; applies duration in seconds once', () => {
    render(<GoalConditionEditor strategy={initial} onApply={applied} />)
    select('duration')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.minimumDuration' }), {
      target: { value: '1200' },
    })
    expect(applied).not.toHaveBeenCalled()
    apply()
    expect(applied).toHaveBeenCalledTimes(1)
    expect(applied).toHaveBeenCalledWith({
      EnableGoalMode: true,
      GoalMinIterations: 0,
      GoalDurationSeconds: 1200,
      GoalAcceptanceCriteria: '',
    })
  })

  it('applies the continuous sentinel and disables the finite duration input', () => {
    render(<GoalConditionEditor strategy={initial} onApply={applied} />)
    select('duration')
    fireEvent.click(screen.getByRole('switch'))
    expect(screen.getByRole('spinbutton', { name: 'AIRunModeSelect.minimumDuration' })).toBeDisabled()
    apply()
    expect(applied.mock.calls[0][0]).toMatchObject({
      GoalDurationSeconds: -1,
      GoalMinIterations: 0,
      GoalAcceptanceCriteria: '',
    })
  })

  it('requires nonblank acceptance text and clears duration and iterations on apply', () => {
    render(<GoalConditionEditor strategy={initial} onApply={applied} />)
    select('acceptance')
    expect(screen.getByRole('button', { name: 'AIRunModeSelect.applyCondition' })).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox', { name: 'AIRunModeSelect.acceptanceCriteria' }), {
      target: { value: '  report with evidence  ' },
    })
    apply()
    expect(applied.mock.calls[0][0]).toEqual({
      EnableGoalMode: true,
      GoalMinIterations: 0,
      GoalDurationSeconds: 0,
      GoalAcceptanceCriteria: 'report with evidence',
    })
  })

  it('does not bubble Enter to the chat input or submit a condition while entering text', () => {
    const parentKey = vi.fn()
    render(
      <div onKeyDown={parentKey}>
        <GoalConditionEditor strategy={initial} onApply={applied} />
      </div>,
    )
    select('acceptance')
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'AIRunModeSelect.acceptanceCriteria' }), { key: 'Enter' })
    expect(parentKey).not.toHaveBeenCalled()
    expect(applied).not.toHaveBeenCalled()
  })

  it('keeps a rejected draft available for retry instead of silently marking it applied', () => {
    applied.mockReturnValue(false)
    render(<GoalConditionEditor strategy={initial} onApply={applied} />)
    select('duration')
    apply()
    expect(screen.getByRole('alert')).toHaveTextContent('AIRunModeSelect.updateRejected')
    applied.mockReturnValue(true)
    apply()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(applied).toHaveBeenCalledTimes(2)
  })

  it('discards the previous session draft and restores the selected session condition', () => {
    const { rerender } = render(<GoalConditionEditor strategy={initial} onApply={applied} />)
    select('duration')
    fixture.id = 'session-b'
    rerender(
      <GoalConditionEditor
        strategy={{
          EnableGoalMode: true,
          GoalAcceptanceCriteria: 'B evidence',
          GoalDurationSeconds: 0,
          GoalMinIterations: 0,
        }}
        onApply={applied}
      />,
    )
    expect(screen.getByRole('textbox', { name: 'AIRunModeSelect.acceptanceCriteria' })).toHaveValue('B evidence')
    expect(applied).not.toHaveBeenCalled()
  })
})
