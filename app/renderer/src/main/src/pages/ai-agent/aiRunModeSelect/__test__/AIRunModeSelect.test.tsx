import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModeOptionKey } from '../aiRunModeConstants'

const modeState = vi.hoisted(() => ({ selectedModes: [] as { key: ModeOptionKey }[] }))
vi.mock('../useAIRunMode', () => ({ useAIRunMode: () => modeState }))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

vi.mock('../AIRunModeMenu', () => ({
  AIRunModeMenu: () => <div data-testid="run-mode-menu" />,
}))

vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    icon,
    children,
    type: _type,
    isActive,
    ...props
  }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
    icon?: ReactNode
    type?: string
    isActive?: boolean
  }) => (
    <button {...props} data-active={String(isActive)}>
      {icon}
      {children}
    </button>
  ),
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
    trigger: string
  }) => (
    <div data-testid="mode-popover" data-arrow={String(arrow)} data-trigger={trigger}>
      <div onClickCapture={() => onOpenChange(!open)}>{children}</div>
      {open && <div>{content}</div>}
    </div>
  ),
}))

import AIRunModeSelect from '../AIRunModeSelect'

afterEach(cleanup)
beforeEach(() => {
  modeState.selectedModes = []
})

describe('AIRunModeSelect', () => {
  it.each<ModeOptionKey>(['plan', 'multiAgent', 'goal'])(
    'keeps the button active for %s with the menu closed or open',
    (key) => {
      modeState.selectedModes = [{ key }]
      render(<AIRunModeSelect />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-active', 'true')
      fireEvent.click(button)
      expect(button).toHaveAttribute('data-active', 'true')
      fireEvent.click(button)
      expect(button).toHaveAttribute('data-active', 'true')
    },
  )

  it('stays inactive when all modes are disabled even with the menu open', () => {
    render(<AIRunModeSelect />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-active', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('data-active', 'false')
  })

  it('updates when external mode settings change and clears only after the last mode is disabled', () => {
    const { rerender } = render(<AIRunModeSelect />)
    modeState.selectedModes = [{ key: 'plan' }, { key: 'goal' }]
    rerender(<AIRunModeSelect />)
    expect(screen.getByRole('button')).toHaveAttribute('data-active', 'true')
    modeState.selectedModes = [{ key: 'goal' }]
    rerender(<AIRunModeSelect />)
    expect(screen.getByRole('button')).toHaveAttribute('data-active', 'true')
    modeState.selectedModes = []
    rerender(<AIRunModeSelect />)
    expect(screen.getByRole('button')).toHaveAttribute('data-active', 'false')
  })

  it('renders an icon-only button with a click popover and no arrow', () => {
    render(<AIRunModeSelect />)
    const button = screen.getByRole('button')
    expect(button.textContent).toBe('')
    expect(button.querySelector('svg')).not.toBeNull()
    expect(screen.getByTestId('mode-popover')).toHaveAttribute('data-arrow', 'false')
    expect(screen.getByTestId('mode-popover')).toHaveAttribute('data-trigger', 'click')
    expect(screen.queryByTestId('run-mode-menu')).not.toBeInTheDocument()
  })

  it('opens and closes the mode menu through the trigger', () => {
    render(<AIRunModeSelect />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByTestId('run-mode-menu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByTestId('run-mode-menu')).not.toBeInTheDocument()
  })

  it('opens from the input callback and reports manual closing to the input', () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(<AIRunModeSelect open={false} onOpenChange={onOpenChange} />)
    expect(screen.queryByTestId('run-mode-menu')).not.toBeInTheDocument()

    rerender(<AIRunModeSelect open onOpenChange={onOpenChange} />)
    expect(screen.getByTestId('run-mode-menu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
