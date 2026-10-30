import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInstance } from 'i18next'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import zh from '@/locales/zh/yakitUi.json'
import zhTW from '@/locales/zh-TW/yakitUi.json'
import en from '@/locales/en/yakitUi.json'

const mocks = vi.hoisted(() => ({ notify: vi.fn() }))
const testI18n = createInstance()
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: testI18n.t.bind(testI18n) }),
}))
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
  beforeEach(async () => {
    mocks.notify.mockReset()
    await testI18n.init({
      lng: 'zh',
      fallbackLng: false,
      defaultNS: 'yakitUi',
      resources: { zh: { yakitUi: zh }, 'zh-TW': { yakitUi: zhTW }, en: { yakitUi: en } },
      interpolation: { escapeValue: false },
    })
  })

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

  it('blocks duplicate runs, other ranges and closing until the current request completes', async () => {
    const user = userEvent.setup()
    let resolveRequest!: (result: { UpdatedCount: number }) => void
    const pending = new Promise<{ UpdatedCount: number }>((resolve) => {
      resolveRequest = resolve
    })
    const execute = vi.fn().mockReturnValueOnce(pending).mockResolvedValue({ UpdatedCount: 1 })
    const onClose = vi.fn()
    const onScopeSuccess = vi.fn()
    render(<BatchScopeSelector total={1001} execute={execute} onClose={onClose} onScopeSuccess={onScopeSuccess} />)

    const [firstRange, secondRange] = screen.getAllByRole('button', { name: '执行' })
    const close = screen.getByRole('button', { name: '完成/关闭' })
    act(() => {
      firstRange.click()
      firstRange.click()
      secondRange.click()
      close.click()
    })

    expect(execute).toHaveBeenCalledOnce()
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ page: 1, count: 1000 }))
    expect(firstRange).toBeDisabled()
    expect(secondRange).toBeDisabled()
    expect(close).toBeDisabled()
    await user.click(secondRange)
    await user.click(close)
    expect(execute).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
    expect(onScopeSuccess).not.toHaveBeenCalled()

    await act(async () => resolveRequest({ UpdatedCount: 1000 }))
    expect(onScopeSuccess).toHaveBeenCalledOnce()
    expect(firstRange).toBeDisabled()
    expect(secondRange).toBeEnabled()
    expect(close).toBeEnabled()
    await user.click(firstRange)
    expect(execute).toHaveBeenCalledOnce()
    await user.click(secondRange)
    expect(execute).toHaveBeenCalledTimes(2)
    expect(execute).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, count: 1 }))
    expect(onClose).not.toHaveBeenCalled()
    await user.click(close)
    expect(onClose).toHaveBeenCalledOnce()
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

  it.each([
    {
      language: 'en',
      summary: '1001 records in total. Each range contains up to 1000 records. The dialog stays open after completion.',
      executeLabel: 'Run',
      pendingLabel: 'Not started',
      partialLabel: 'Partially updated, please verify',
      closeLabel: 'Done / Close',
      error:
        'Range 1-1000 updated only 1/1000 records. Retries are disabled for this range to avoid processing successful records again.',
    },
    {
      language: 'zh-TW',
      summary: '共 1001 筆資料。每個範圍最多 1000 筆，完成後彈窗會繼續保留。',
      executeLabel: '執行',
      pendingLabel: '未執行',
      partialLabel: '部分更新，請核對',
      closeLabel: '完成/關閉',
      error: '範圍 1-1000 僅更新 1/1000 筆。為避免重複處理已成功記錄，本範圍已停止自動重試。',
    },
  ])('renders range controls and interpolated errors in $language', async (translation) => {
    await testI18n.changeLanguage(translation.language)
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<BatchScopeSelector total={1001} execute={async () => ({ UpdatedCount: 1 })} onClose={onClose} />)

    expect(screen.getByText(translation.summary)).toBeInTheDocument()
    expect(screen.getAllByText(translation.pendingLabel)).toHaveLength(2)
    await user.click(screen.getAllByRole('button', { name: translation.executeLabel })[0])
    expect(await screen.findByText(translation.partialLabel)).toBeInTheDocument()
    expect(screen.getByText(translation.error)).toBeInTheDocument()
    expect(mocks.notify).toHaveBeenCalledWith('error', translation.error)
    await user.click(screen.getByRole('button', { name: translation.closeLabel }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
