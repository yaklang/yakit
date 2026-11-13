import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IrifyAiAuditStyleToggle } from '../IrifyAiAuditStyleToggle'
import styles from '../IrifyAiAuditStyleToggle.module.scss'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

afterEach(cleanup)

it('defaults to code and lets the user switch both ways before starting', () => {
  const onChange = vi.fn()
  const { rerender } = render(<IrifyAiAuditStyleToggle value="unset" onChange={onChange} />)
  const code = screen.getByText('styleToggle.code')
  const skill = screen.getByText('styleToggle.skill')
  expect(code).toHaveClass(styles['toggle-item-active'])
  expect(skill).not.toHaveClass(styles['toggle-item-active'])

  fireEvent.click(skill)
  expect(onChange).toHaveBeenLastCalledWith('skill')
  rerender(<IrifyAiAuditStyleToggle value="skill" onChange={onChange} />)
  expect(skill).toHaveClass(styles['toggle-item-active'])
  expect(code).not.toHaveClass(styles['toggle-item-active'])
  fireEvent.click(code)
  expect(onChange).toHaveBeenLastCalledWith('code')
})

it('shows the selected mode and ignores clicks after starting', () => {
  const onChange = vi.fn()
  render(<IrifyAiAuditStyleToggle value="skill" locked onChange={onChange} />)
  const code = screen.getByText('styleToggle.code')
  const skill = screen.getByText('styleToggle.skill')

  expect(skill).toHaveClass(styles['toggle-item-active'])
  fireEvent.click(code)
  fireEvent.click(skill)
  expect(onChange).not.toHaveBeenCalled()
})
