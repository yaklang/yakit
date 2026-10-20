import type React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RollingLoadList } from '../RollingLoadList'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

const baseProps = {
  data: [{ id: 1 }, { id: 2 }],
  loadMoreData: vi.fn(),
  renderRow: (row: { id: number }) => <div>row-{row.id}</div>,
  page: 1,
  hasMore: false,
  loading: false,
  defItemHeight: 58,
  rowKey: 'id',
}

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('RollingLoadList 到底文案', () => {
  it('不传 noMoreText 时展示默认到底文案', () => {
    render(<RollingLoadList {...baseProps} />)
    expect(screen.getByText('YakitEmpty.noMoreData')).toBeInTheDocument()
  })

  it('传入 noMoreText 时展示自定义文案', () => {
    render(<RollingLoadList {...baseProps} noMoreText="自定义到底文案" />)
    expect(screen.getByText('自定义到底文案')).toBeInTheDocument()
    expect(screen.queryByText('YakitEmpty.noMoreData')).not.toBeInTheDocument()
  })

  it('loading 或 hasMore 时不展示到底文案', () => {
    const { rerender } = render(<RollingLoadList {...baseProps} loading />)
    expect(screen.queryByText('YakitEmpty.noMoreData')).not.toBeInTheDocument()
    rerender(<RollingLoadList {...baseProps} hasMore />)
    expect(screen.queryByText('YakitEmpty.noMoreData')).not.toBeInTheDocument()
  })
})
