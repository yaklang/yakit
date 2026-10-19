import type React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExportExcel } from '../DataExport'

const mocks = vi.hoisted(() => ({
  exportJsonToExcel: vi.fn(() => Promise.resolve()),
  failed: vi.fn(),
  getRemoteValue: vi.fn(() => Promise.resolve('')),
  setRemoteValue: vi.fn(),
}))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0, i18n: {} }),
}))
vi.mock('@/utils/notification', () => ({ failed: mocks.failed, yakitNotify: vi.fn() }))
vi.mock('@/utils/kv', () => ({ getRemoteValue: mocks.getRemoteValue, setRemoteValue: mocks.setRemoteValue }))
vi.mock('../toExcel', () => ({ export_json_to_excel: mocks.exportJsonToExcel }))
vi.mock('@ant-design/icons/lib/icons/LoadingOutlined', () => ({ default: () => null }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({
    children,
    onClick,
    disabled,
  }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitModal/YakitModal', () => ({
  YakitModal: ({ open, children }: React.PropsWithChildren<{ open?: boolean }>) =>
    open ? <div role="dialog">{children}</div> : null,
}))
vi.mock('@/components/yakitUI/YakitCheckbox/YakitCheckbox', () => ({
  YakitCheckbox: ({ children }: React.PropsWithChildren) => <label>{children}</label>,
}))

const smallResponse = {
  header: ['a', 'b'],
  exportData: [['1', '2']],
  response: { Data: [], Pagination: { Page: 1, Limit: 100 }, Total: 1 },
}

describe('ExportExcel onClose', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    )
  })
  afterEach(cleanup)

  it('数据量小于阈值直接导出成功后调用 onClose', async () => {
    const getData = vi.fn().mockResolvedValue(smallResponse)
    const onClose = vi.fn()
    render(<ExportExcel getData={getData} fileName="report" onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.exportExcel' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(mocks.exportJsonToExcel).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'report 1-1', bookType: 'xlsx' }),
    )
  })

  it('配置 onHarExport 时点击按钮触发 HAR 导出并调用 onClose，不触发 getData', () => {
    const getData = vi.fn()
    const onHarExport = vi.fn()
    const onClose = vi.fn()
    render(<ExportExcel getData={getData} onHarExport={onHarExport} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.exportExcel' }))

    expect(onHarExport).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(getData).not.toHaveBeenCalled()
    expect(mocks.exportJsonToExcel).not.toHaveBeenCalled()
  })

  it('数据量超过阈值走分批导出，弹窗保持打开且不调用 onClose', async () => {
    const getData = vi.fn().mockResolvedValue({
      ...smallResponse,
      response: { ...smallResponse.response, Total: 200000 },
    })
    const onClose = vi.fn()
    render(<ExportExcel getData={getData} fileName="report" onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.exportExcel' }))

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(mocks.exportJsonToExcel).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
