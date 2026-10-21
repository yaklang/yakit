import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TextDropdownTrigger } from '../TextDropdownTrigger'

describe('TextDropdownTrigger', () => {
  it('渲染为可聚焦 YakitButton，并同步 disabled / aria-expanded', () => {
    const { rerender } = render(
      <TextDropdownTrigger label="全部" open={false} aria-label="搜索范围" data-testid="trigger" />,
    )
    const trigger = screen.getByRole('button', { name: '搜索范围' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).not.toBeDisabled()
    trigger.focus()
    expect(trigger).toHaveFocus()

    rerender(<TextDropdownTrigger label="全部" open disabled aria-label="搜索范围" data-testid="trigger" />)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toBeDisabled()
  })

  it('保留下拉注入的点击 / 键盘事件', () => {
    const onClick = vi.fn()
    const onKeyDown = vi.fn()
    render(<TextDropdownTrigger label="全部" aria-label="搜索范围" onClick={onClick} onKeyDown={onKeyDown} />)
    const trigger = screen.getByRole('button', { name: '搜索范围' })

    fireEvent.click(trigger)
    expect(onClick).toHaveBeenCalledTimes(1)

    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onKeyDown).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(trigger, { key: ' ' })
    expect(onKeyDown).toHaveBeenCalledTimes(2)
  })

  it('disabled 时不触发点击', () => {
    const onClick = vi.fn()
    render(<TextDropdownTrigger label="全部" disabled aria-label="搜索范围" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: '搜索范围' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})
