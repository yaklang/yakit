import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { YakitModal } from '../YakitModal'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }),
}))

describe('YakitModal keyboard policy', () => {
  it.each([undefined, true])('Esc 不关闭弹窗，即使调用方传入 keyboard=%s', (keyboard) => {
    const onCancel = vi.fn()
    const onOk = vi.fn()
    render(
      <YakitModal
        open
        getContainer={false}
        keyboard={keyboard}
        onCancel={onCancel}
        onOk={onOk}
        cancelText="取消"
        okText="确定"
      >
        <input aria-label="弹窗输入框" />
      </YakitModal>,
    )

    fireEvent.keyDown(screen.getByLabelText('弹窗输入框'), { key: 'Escape', code: 'Escape', keyCode: 27 })
    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(onOk).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('关闭按钮仍触发 onCloseX', () => {
    const onCloseX = vi.fn()
    const onCancel = vi.fn()
    render(
      <YakitModal
        open
        getContainer={false}
        footer={null}
        closeIcon={<span>关闭弹窗</span>}
        onCloseX={onCloseX}
        onCancel={onCancel}
      />,
    )
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', keyCode: 27 })
    expect(onCloseX).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '关闭弹窗' }))
    expect(onCloseX).toHaveBeenCalledOnce()
    expect(onCancel).not.toHaveBeenCalled()
  })
})
