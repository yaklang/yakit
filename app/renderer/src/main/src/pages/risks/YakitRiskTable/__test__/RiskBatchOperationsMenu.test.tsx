import type React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RiskBatchOperationsMenu } from '../RiskBatchOperationsMenu'

const { latestMenu } = vi.hoisted(() => ({
  latestMenu: {
    current: undefined as
      | {
          data: Array<{ key?: string; type?: string }>
          onClick: (info: { key: string }) => void
        }
      | undefined,
  },
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  ChevronDownOutlined: () => <span data-testid="chevron-down" />,
}))

vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({
    menu,
    dropdown,
    children,
  }: React.PropsWithChildren<{
    menu: {
      data: Array<{ key?: string; type?: string }>
      onClick: (info: { key: string }) => void
    }
    dropdown: {
      open?: boolean
      disabled?: boolean
      onOpenChange?: (open: boolean) => void
    }
  }>) => {
    latestMenu.current = menu
    return (
      <div>
        <div
          onClick={() => {
            if (!dropdown.disabled) dropdown.onOpenChange?.(!dropdown.open)
          }}
        >
          {children}
        </div>
        {dropdown.open && (
          <div data-testid="batch-menu">
            {menu.data.map((item, index) =>
              item.type === 'divider' ? (
                <hr key={`divider-${index}`} data-testid="menu-divider" />
              ) : (
                <button key={item.key} onClick={() => menu.onClick({ key: item.key! })}>
                  {item.key}
                </button>
              ),
            )}
          </div>
        )}
      </div>
    )
  },
}))

afterEach(() => {
  cleanup()
  latestMenu.current = undefined
})

describe('RiskBatchOperationsMenu', () => {
  it('disables the trigger when no risk is selected and guards stale actions', () => {
    const onAction = vi.fn()
    render(<RiskBatchOperationsMenu selectedCount={0} isEnterprise onAction={onAction} />)

    const trigger = screen.getByRole('button', { name: 'YakitButton.batchOperation' })
    expect(trigger).toBeDisabled()
    fireEvent.click(trigger)
    expect(screen.queryByTestId('batch-menu')).not.toBeInTheDocument()

    act(() => latestMenu.current?.onClick({ key: 'export-csv' }))
    expect(onAction).not.toHaveBeenCalled()
  })

  it('shows common actions in community edition and blocks modify mark', () => {
    const onAction = vi.fn()
    render(<RiskBatchOperationsMenu selectedCount={2} isEnterprise={false} onAction={onAction} />)

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.batchOperation' }))
    expect(screen.queryByRole('button', { name: 'modify-mark' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'export-csv' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'export-html' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'delete' })).toBeInTheDocument()
    expect(screen.getByTestId('menu-divider')).toBeInTheDocument()

    act(() => latestMenu.current?.onClick({ key: 'modify-mark' }))
    expect(onAction).not.toHaveBeenCalled()
  })

  it('dispatches enterprise actions and closes the menu after a click', () => {
    const onAction = vi.fn()
    render(<RiskBatchOperationsMenu selectedCount={3} isEnterprise onAction={onAction} />)

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.batchOperation' }))
    fireEvent.click(screen.getByRole('button', { name: 'modify-mark' }))

    expect(onAction).toHaveBeenCalledWith('modify-mark')
    expect(screen.queryByTestId('batch-menu')).not.toBeInTheDocument()
  })

  it('closes the menu when the selection count or edition changes', () => {
    const onAction = vi.fn()
    const { rerender } = render(<RiskBatchOperationsMenu selectedCount={1} isEnterprise={false} onAction={onAction} />)

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.batchOperation' }))
    expect(screen.getByTestId('batch-menu')).toBeInTheDocument()
    rerender(<RiskBatchOperationsMenu selectedCount={2} isEnterprise={false} onAction={onAction} />)
    expect(screen.queryByTestId('batch-menu')).not.toBeInTheDocument()
    rerender(<RiskBatchOperationsMenu selectedCount={1} isEnterprise={false} onAction={onAction} />)
    expect(screen.queryByTestId('batch-menu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.batchOperation' }))
    expect(screen.getByTestId('batch-menu')).toBeInTheDocument()
    rerender(<RiskBatchOperationsMenu selectedCount={2} isEnterprise onAction={onAction} />)
    expect(screen.queryByTestId('batch-menu')).not.toBeInTheDocument()
  })
})
