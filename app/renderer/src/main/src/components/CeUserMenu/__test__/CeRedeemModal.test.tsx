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
  YakitModal: ({ open, children }: { open?: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
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
})
