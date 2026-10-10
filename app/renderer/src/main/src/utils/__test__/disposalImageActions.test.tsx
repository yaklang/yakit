import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FlowDisposalLogItemView } from '@/components/HTTPFlowTable/FlowDisposalLog/FlowDisposalLogItem'
import { RiskDisposalLogItem } from '@/pages/risks/YakitRiskTable/RiskDisposalLog/RiskDisposalLogItem'
import { downloadDisposalFile } from '@/utils/disposalDownload'

vi.mock('@/utils/disposalDownload', () => ({ downloadDisposalFile: vi.fn() }))

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children }: React.PropsWithChildren) => <button>{children}</button>,
}))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  PaperClipOutlined: () => null,
  DownloadOutlined: () => null,
  EyeOutlined: () => null,
  PencilAltOutlined: () => null,
  TrashOutlined: () => null,
}))
vi.mock('@yakit-libs/yakit-ui-icons/colorful', () => ({ CommentLogColorful: () => null }))
vi.mock('@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon', () => ({ PopoverArrowIcon: () => null }))

const url = 'https://files.test/screen.png'
const info = {
  id: 1,
  logType: 'comment' as const,
  createdAt: 1,
  description: JSON.stringify([{ type: 'image', value: { url, width: 100, height: 100 } }]),
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe.each([
  ['流量', FlowDisposalLogItemView, 'HTTPFlowDetailMini.logDownload'],
  ['漏洞', RiskDisposalLogItem, 'RiskDisposalLog.download'],
] as const)('%s 日志图片操作', (_, Item, downloadLabel) => {
  it('将预览与下载按钮放入图片遮罩，不再显示图片下方的下载文字', () => {
    render(<Item info={info} />)
    const preview = screen.getByRole('button', { name: 'YakitButton.preview' })
    const download = screen.getByRole('button', { name: downloadLabel })
    expect(preview.closest('.ant-image-mask')).not.toBeNull()
    expect(download.closest('.ant-image-mask')).toBe(preview.closest('.ant-image-mask'))
    expect(download).toHaveTextContent('')
    expect(screen.queryByText(downloadLabel)).toBeNull()
  })

  it('点击下载保留原下载地址且不会打开图片预览', () => {
    render(<Item info={info} />)
    fireEvent.click(screen.getByRole('button', { name: downloadLabel }))
    expect(downloadDisposalFile).toHaveBeenCalledWith(url)
    expect(downloadDisposalFile).toHaveBeenCalledOnce()
    expect(document.querySelector('.ant-image-preview')).toBeNull()
  })

  it('点击眼睛按钮仍可打开原有图片预览', () => {
    render(<Item info={info} />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.preview' }))
    expect(document.querySelector('.ant-image-preview-img')).toHaveAttribute('src', url)
  })
})
