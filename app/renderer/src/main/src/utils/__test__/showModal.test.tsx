import type React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { emit } = vi.hoisted(() => ({ emit: vi.fn() }))

vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit } }))
vi.mock('../eventBus/eventBus', () => ({ default: { emit } }))
vi.mock('@/components/yakitUI/YakitDrawer/YakitDrawer', () => ({
  YakitDrawer: ({ open, children, onClose }: { open?: boolean; children?: React.ReactNode; onClose?: () => void }) =>
    open ? (
      <div role="dialog" data-testid="base-drawer" data-open="true">
        <button type="button" onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    ) : null,
}))
vi.mock('@/theme/antdTheme', () => ({ YakitAntdProvider: ({ children }) => children }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({
  ModalI18nRender: ({ node }) => node,
}))

import { BaseDrawer, BaseModal } from '../showModal'

beforeEach(() => {
  emit.mockClear()
})

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

describe('BaseDrawer 初始打开', () => {
  it('挂载即打开，setYakitHeaderDraggable 首发为 false 且无先 true 后 false', () => {
    render(
      <BaseDrawer>
        <span>drawer-body</span>
      </BaseDrawer>,
    )

    expect(screen.getByTestId('base-drawer')).toHaveAttribute('data-open', 'true')
    expect(screen.getByText('drawer-body')).toBeInTheDocument()

    const dragCalls = emit.mock.calls.filter(([event]) => event === 'setYakitHeaderDraggable')
    expect(dragCalls.length).toBeGreaterThanOrEqual(1)
    expect(dragCalls[0]).toEqual(['setYakitHeaderDraggable', false])
    expect(dragCalls.some(([, value]) => value === true)).toBe(false)
  })
})
