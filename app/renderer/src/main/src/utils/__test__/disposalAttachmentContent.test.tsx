import i18n from '@/i18n/i18n'
vi.mock('@/i18n/i18n', async () => {
  const { createInstance } = await import('i18next')
  const { default: zh } = await import('@/locales/zh/components.json')
  const { default: en } = await import('@/locales/en/components.json')
  const { default: zhTW } = await import('@/locales/zh-TW/components.json')
  const { default: zhRisk } = await import('@/locales/zh/risk.json')
  const { default: enRisk } = await import('@/locales/en/risk.json')
  const { default: zhTWRisk } = await import('@/locales/zh-TW/risk.json')
  const instance = createInstance()
  await instance.init({
    lng: 'zh',
    fallbackLng: false,
    resources: {
      zh: { components: zh, risk: zhRisk },
      en: { components: en, risk: enRisk },
      'zh-TW': { components: zhTW, risk: zhTWRisk },
    },
    interpolation: { escapeValue: false },
  })
  return { default: instance }
})
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as flow from '@/components/HTTPFlowTable/FlowDisposalLog/convert'
import * as risk from '@/pages/risks/YakitRiskTable/RiskDisposalLog/convert'
import { FlowDisposalLogItemView } from '@/components/HTTPFlowTable/FlowDisposalLog/FlowDisposalLogItem'
import { RiskDisposalLogItem } from '@/pages/risks/YakitRiskTable/RiskDisposalLog/RiskDisposalLogItem'
import { downloadDisposalFile } from '@/utils/disposalDownload'

vi.mock('@/utils/disposalDownload', () => ({ downloadDisposalFile: vi.fn() }))

vi.mock('@/i18n/useI18nNamespaces', async () => {
  const { default: i18n } = await import('@/i18n/i18n')
  const { useTranslation } = await import('react-i18next')
  return {
    useI18nNamespaces: (namespaces: string[]) => {
      useTranslation(namespaces, { i18n })
      return { t: (key: string, options?: object) => i18n.t(key, { ns: namespaces, ...options }) }
    },
  }
})

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

beforeEach(async () => {
  await i18n.changeLanguage('zh')
})

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
  it('图片回复引用在切换语言后使用对应翻译并保留图片数量', async () => {
    const description = convert.disposalCommentConvertToJSON({ value: '', imgs: [image, image] })
    render(
      <Item
        info={{
          id: 1,
          logType: 'comment',
          createdAt: 1,
          description: '',
          parentComment: { id: 2, userName: 'Admin', description },
        }}
      />,
    )
    expect(screen.getByText('[图片] * 2')).toBeInTheDocument()
    await act(async () => {
      await i18n.changeLanguage('en')
    })
    expect(screen.getByText('[images] * 2')).toBeInTheDocument()
    expect(screen.queryByText('[图片] * 2')).not.toBeInTheDocument()
    await act(async () => {
      await i18n.changeLanguage('zh-TW')
    })
    expect(screen.getByText('[圖片] * 2')).toBeInTheDocument()
  })

  it('renders attachment download and quote labels in English', async () => {
    await i18n.changeLanguage('en')
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
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('download', file.name)
    expect(screen.getByText('[Attachment] * 1')).toBeInTheDocument()
  })
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
