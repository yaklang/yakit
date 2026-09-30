import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as flow from '@/components/HTTPFlowTable/FlowDisposalLog/convert'
import * as risk from '@/pages/risks/YakitRiskTable/RiskDisposalLog/convert'
import { FlowDisposalLogItemView } from '@/components/HTTPFlowTable/FlowDisposalLog/FlowDisposalLogItem'
import { RiskDisposalLogItem } from '@/pages/risks/YakitRiskTable/RiskDisposalLog/RiskDisposalLogItem'
import { downloadDisposalFile } from '@/utils/disposalDownload'

vi.mock('@/utils/disposalDownload', () => ({ downloadDisposalFile: vi.fn() }))

vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ children }: React.PropsWithChildren) => <button>{children}</button>,
}))
vi.mock('antd', () => ({
  Image: Object.assign(() => null, { PreviewGroup: ({ children }: React.PropsWithChildren) => children }),
}))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  PaperClipOutlined: () => null,
  XOutlined: () => null,
  PencilAltOutlined: () => null,
  TrashOutlined: () => null,
}))
vi.mock('@yakit-libs/yakit-ui-icons/colorful', () => ({ CommentLogColorful: () => null }))
vi.mock('@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon', () => ({ PopoverArrowIcon: () => null }))

const file = { url: 'https://files.test/report.zip', name: '修复材料.zip', size: 2048 }
const image = { url: 'https://files.test/screen.png', width: 100, height: 100 }
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe.each([
  ['流量', flow, FlowDisposalLogItemView],
  ['漏洞', risk, RiskDisposalLogItem],
] as const)('%s 附件评论', (_, convert, Item) => {
  it('支持附件单独发布和两端约定的文件节点格式', () => {
    const json = convert.disposalCommentConvertToJSON({ value: '', imgs: [], files: [file] })
    expect(JSON.parse(json)).toEqual([{ type: 'file', value: file }])
    expect(convert.disposalCommentJSONConvertToData(json)).toEqual({ text: '', imgs: [], files: [file] })
  })

  it('混合内容往返保留附件，历史文字图片仍可解析', () => {
    const json = convert.disposalCommentConvertToJSON({ value: '已修复', imgs: [image], files: [file] })
    expect(convert.disposalCommentJSONConvertToData(json)).toEqual({ text: '已修复', imgs: [image], files: [file] })
    expect(
      convert.disposalCommentJSONConvertToData(convert.disposalCommentConvertToJSON({ value: '历史', imgs: [image] })),
    ).toEqual({ text: '历史', imgs: [image] })
    expect(convert.disposalCommentConvertToJSON({ value: '', imgs: [], files: [] })).toBe('')
  })

  it('附件评论显示名称、大小、带原文件名的下载链接和回复引用', () => {
    const description = convert.disposalCommentConvertToJSON({ value: '', imgs: [], files: [file] })
    render(
      <Item
        info={{
          id: 1,
          logType: 'comment',
          createdAt: 1,
          description,
          parentComment: { id: 2, userName: 'Admin', description },
        }}
      />,
    )
    expect(screen.getByText(file.name)).toBeInTheDocument()
    expect(screen.getByText('2 KiB')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '下载' })).toHaveAttribute('href', file.url)
    expect(screen.getByRole('link', { name: '下载' })).toHaveAttribute('download', file.name)
    fireEvent.click(screen.getByRole('link', { name: '下载' }))
    expect(downloadDisposalFile).toHaveBeenCalledWith(file.url, file.name)
    expect(downloadDisposalFile).toHaveBeenCalledOnce()
    expect(screen.getByText('[附件] * 1')).toBeInTheDocument()
  })
})
