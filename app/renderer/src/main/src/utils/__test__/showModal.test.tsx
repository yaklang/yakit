import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BaseModal } from '../showModal'

vi.mock('@/components/yakitUI/YakitDrawer/YakitDrawer', () => ({ YakitDrawer: () => null }))
vi.mock('@/theme/antdTheme', () => ({ YakitAntdProvider: ({ children }) => children }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  ModalI18nRender: ({ node }) => node,
}))

describe('BaseModal keyboard policy', () => {
  it('Esc 保持旧版弹窗打开，关闭按钮仍可关闭', async () => {
    render(
      <BaseModal keyboard={true}>
        <input aria-label="输入内容" />
      </BaseModal>,
    )
    fireEvent.keyDown(screen.getByLabelText('输入内容'), { key: 'Escape', keyCode: 27 })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
