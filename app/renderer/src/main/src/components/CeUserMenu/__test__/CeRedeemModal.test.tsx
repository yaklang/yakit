import type React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockNetWorkApi, mockNotify } = vi.hoisted(() => ({
  mockNetWorkApi: vi.fn(),
  mockNotify: vi.fn(),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }),
}))
vi.mock('@/utils/notification', () => ({ yakitNotify: mockNotify }))
vi.mock('@/services/fetch', () => ({ NetWorkApi: mockNetWorkApi }))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({
    open,
    children,
    closable = true,
    onCancel,
  }: {
    open?: boolean
    children: React.ReactNode
    closable?: boolean
    onCancel?: () => void
  }) =>
    open ? (
      <div role="dialog">
        {closable ? (
          <button type="button" aria-label="close" onClick={onCancel}>
            close
          </button>
        ) : null}
        {children}
      </div>
    ) : null,
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    onClick,
    loading,
  }: {
    children: React.ReactNode
    onClick?: () => void
    loading?: boolean
  }) => (
    <button type="button" disabled={!!loading} onClick={onClick}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitInput/YakitInput', () => ({
  YakitInput: ({
    value,
    onChange,
    onPressEnter,
    placeholder,
  }: {
    value?: string
    onChange?: React.ChangeEventHandler<HTMLInputElement>
    onPressEnter?: () => void
    placeholder?: string
  }) => (
    <input
      aria-label="redeem-code"
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPressEnter?.()
      }}
    />
  ),
}))

import CeRedeemModal from '../CeRedeemModal'

describe('CeRedeemModal', () => {
  beforeEach(() => {
    mockNetWorkApi.mockReset()
    mockNotify.mockReset()
  })

  it('空码点击兑换时提示错误且不请求接口', () => {
    const onClose = vi.fn()
    render(<CeRedeemModal open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'CeUserMenu.redeem' }))
    expect(mockNotify).toHaveBeenCalledWith('error', 'CeUserMenu.redeemCodeRequired')
    expect(mockNetWorkApi).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('仅空白字符视为空码', () => {
    const onClose = vi.fn()
    render(<CeRedeemModal open onClose={onClose} />)
    fireEvent.change(screen.getByLabelText('redeem-code'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'CeUserMenu.redeem' }))
    expect(mockNotify).toHaveBeenCalledWith('error', 'CeUserMenu.redeemCodeRequired')
    expect(mockNetWorkApi).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('兑换成功时提示、回调 onSuccess 并关闭', async () => {
    mockNetWorkApi.mockResolvedValue({ ok: true, from: 'user/redeem' })
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    render(<CeRedeemModal open onClose={onClose} onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText('redeem-code'), { target: { value: ' CODE-1 ' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'CeUserMenu.redeem' }))
    })

    await waitFor(() => {
      expect(mockNetWorkApi).toHaveBeenCalledWith({
        method: 'post',
        url: 'user/redeem',
        data: { code: 'CODE-1' },
      })
    })
    expect(mockNotify).toHaveBeenCalledWith('success', 'CeUserMenu.redeemSuccess')
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('兑换失败时提示错误且不关闭', async () => {
    mockNetWorkApi.mockRejectedValue('invalid code')
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    render(<CeRedeemModal open onClose={onClose} onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText('redeem-code'), { target: { value: 'BAD' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'CeUserMenu.redeem' }))
    })

    await waitFor(() => {
      expect(mockNotify).toHaveBeenCalledWith('error', 'CeUserMenu.redeemFailed')
    })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('请求进行中隐藏关闭按钮，关后再开时过期成功响应不误关新弹窗', async () => {
    let resolveFirst!: (value: unknown) => void
    let resolveSecond!: (value: unknown) => void
    mockNetWorkApi
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          }),
      )

    const onClose = vi.fn()
    const onSuccess = vi.fn()
    const { rerender } = render(<CeRedeemModal open onClose={onClose} onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText('redeem-code'), { target: { value: 'CODE-A' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'CeUserMenu.redeem' }))
    })

    expect(screen.queryByRole('button', { name: 'close' })).not.toBeInTheDocument()
    expect(mockNetWorkApi).toHaveBeenCalledTimes(1)

    // 父层强制关闭再打开（模拟关后再开）
    rerender(<CeRedeemModal open={false} onClose={onClose} onSuccess={onSuccess} />)
    rerender(<CeRedeemModal open onClose={onClose} onSuccess={onSuccess} />)
    expect(screen.getByRole('button', { name: 'close' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('redeem-code'), { target: { value: 'CODE-B' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'CeUserMenu.redeem' }))
    })
    expect(mockNetWorkApi).toHaveBeenCalledTimes(2)

    // 第一次（已过期）成功返回，不得关掉当前会话
    await act(async () => {
      resolveFirst({ ok: true, from: 'user/redeem' })
    })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()

    // 第二次成功才关闭
    await act(async () => {
      resolveSecond({ ok: true, from: 'user/redeem' })
    })
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
