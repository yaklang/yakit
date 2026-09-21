import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { YakitHint } from '../YakitHint'
import { HintModal, YakitHintModal } from '../YakitHintModal'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: {} }),
}))

describe('HintModal', () => {
  it('renders the latest children after rerender', () => {
    const { rerender } = render(
      <HintModal visible>
        <span>first-child</span>
      </HintModal>,
    )
    expect(screen.getByText('first-child')).toBeInTheDocument()

    rerender(
      <HintModal visible>
        <span>second-child</span>
      </HintModal>,
    )
    expect(screen.getByText('second-child')).toBeInTheDocument()
    expect(screen.queryByText('first-child')).not.toBeInTheDocument()
  })
})

describe('YakitHintModal', () => {
  it('updates content and onOk after rerender', () => {
    const firstOk = vi.fn()
    const secondOk = vi.fn()
    const { rerender } = render(<YakitHintModal visible content="project-a" onOk={firstOk} />)
    expect(screen.getByText('project-a')).toBeInTheDocument()

    rerender(<YakitHintModal visible content="project-b" onOk={secondOk} />)
    expect(screen.getByText('project-b')).toBeInTheDocument()
    expect(screen.queryByText('project-a')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.ok' }))
    expect(secondOk).toHaveBeenCalledOnce()
    expect(firstOk).not.toHaveBeenCalled()
  })
})

describe('YakitHint', () => {
  it('updates portal content while the modal stays mounted', () => {
    const firstOk = vi.fn()
    const secondOk = vi.fn()
    const { rerender } = render(<YakitHint visible={false} title="hint" content="project-a" onOk={firstOk} />)
    expect(screen.getByText('project-a')).toBeInTheDocument()

    rerender(<YakitHint visible content="project-b" title="hint" onOk={secondOk} />)
    expect(screen.getByText('project-b')).toBeInTheDocument()
    expect(screen.queryByText('project-a')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.ok' }))
    expect(secondOk).toHaveBeenCalledOnce()
    expect(firstOk).not.toHaveBeenCalled()
  })
})
