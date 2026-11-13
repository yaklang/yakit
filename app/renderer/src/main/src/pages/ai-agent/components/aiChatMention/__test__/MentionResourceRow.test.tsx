import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MentionResourceRow from '../mentionResourceRow/MentionResourceRow'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/pages/KnowledgeBase/utils', () => ({
  targetIcon: (index: number) => () => <span data-testid={`knowledge-icon-${index}`} />,
}))
afterEach(cleanup)

describe('MentionResourceRow', () => {
  it('keeps the knowledge management icon when a filtered row changes its position', () => {
    const { rerender } = render(
      <MentionResourceRow kind="knowledgeBase" name="docs" knowledgeIndex={5} onSelect={vi.fn()} />,
    )
    expect(screen.getByTestId('knowledge-icon-5')).toBeInTheDocument()
    rerender(<MentionResourceRow kind="knowledgeBase" name="other" knowledgeIndex={2} onSelect={vi.fn()} />)
    expect(screen.getByTestId('knowledge-icon-2')).toBeInTheDocument()
    expect(screen.queryByTestId('knowledge-icon-5')).not.toBeInTheDocument()
  })

  it('selects the compact row and exposes the active state without action buttons', () => {
    const onSelect = vi.fn()
    render(<MentionResourceRow kind="forge" name="summarize" description="Summarize text" active onSelect={onSelect} />)
    const row = screen.getByRole('option')
    expect(row).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Summarize text')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    fireEvent.click(row)
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('shows a file type icon and the filename in the compact row', () => {
    render(<MentionResourceRow kind="file" name="photo.png" onSelect={vi.fn()} />)
    expect(screen.getByAltText('')).toHaveAttribute('src')
    expect(screen.getByText('photo.png')).toBeInTheDocument()
  })
})
