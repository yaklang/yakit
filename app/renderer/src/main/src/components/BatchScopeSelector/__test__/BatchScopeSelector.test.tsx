import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ notify: vi.fn() }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    loading,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
    <button {...props}>{loading ? 'loading' : children}</button>
  ),
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: mocks.notify }))

import { BatchScopeSelector } from '../BatchScopeSelector'

describe('BatchScopeSelector', () => {
  beforeEach(() => mocks.notify.mockReset())

  it('keeps the dialog open and executes ranges in the selected order', async () => {
    const user = userEvent.setup()
    const execute = vi.fn(async (scope) => ({ UpdatedCount: scope.count }))
    const onClose = vi.fn()
    render(<BatchScopeSelector total={2501} execute={execute} onClose={onClose} />)

    const executeButtons = screen.getAllByRole('button', { name: '执行' })
    await user.click(executeButtons[0])
    await waitFor(() => expect(screen.getAllByText('已完成')).toHaveLength(1))
    await user.click(executeButtons[2])
    await waitFor(() => expect(screen.getAllByText('已完成')).toHaveLength(2))
    await user.click(executeButtons[1])
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(3))

    expect(execute.mock.calls.map(([scope]) => [scope.page, scope.limit, scope.count])).toEqual([
      [1, 1000, 1000],
      [3, 1000, 501],
      [2, 1000, 1000],
    ])
    expect(onClose).not.toHaveBeenCalled()
  })

  it('allows request failures to retry but locks partial updates', async () => {
    const user = userEvent.setup()
    const onPartial = vi.fn()
    const execute = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ UpdatedCount: 1 })
    render(<BatchScopeSelector total={1001} execute={execute} onPartial={onPartial} />)

    await user.click(screen.getAllByRole('button', { name: '执行' })[0])
    await user.click(await screen.findByRole('button', { name: '重试' }))
    await waitFor(() => expect(screen.getByText('部分更新，请核对')).toBeInTheDocument())
    expect(onPartial).toHaveBeenCalledWith(expect.objectContaining({ page: 1, count: 1000 }), 1)
    expect(screen.getAllByRole('button', { name: '执行' })[0]).toBeDisabled()
  })

  it('does not turn a successful write into retryable failure when refresh fails', async () => {
    const user = userEvent.setup()
    render(
      <BatchScopeSelector
        total={1001}
        execute={async (scope) => ({ UpdatedCount: scope.count })}
        onScopeSuccess={() => {
          throw new Error('refresh failed')
        }}
      />,
    )
    await user.click(screen.getAllByRole('button', { name: '执行' })[0])
    await waitFor(() => expect(screen.getByText('已完成')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: '重试' })).not.toBeInTheDocument()
    expect(mocks.notify).toHaveBeenCalledWith('error', expect.stringContaining('数据刷新失败'))
  })
})
