import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
    ...props
  }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & { icon?: ReactNode; type?: string }) => (
    <button {...props}>
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

describe('AIRunModeSelect', () => {
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
})
