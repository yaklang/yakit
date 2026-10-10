import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/pages/ai-re-act/hooks/__test__/setupElectron'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import { YakitRoute } from '@/enums/yakitRoute'
import type * as ReportCardModule from '../AIReportFinishCard'
import type { AIReportFinishCardProps } from '../AIReportFinishCardType'
import type { StreamdownProps } from 'streamdown'

const { route, emit, notify } = vi.hoisted(() => ({ route: vi.fn(), emit: vi.fn(), notify: vi.fn() }))

vi.mock('@/utils/getMainOperatorPageBodyContainer', () => ({ getCurrentPageTabRouteKey: route }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit } }))
vi.mock('@/utils/notification', () => ({ yakitNotify: notify, failed: vi.fn(), success: vi.fn() }))
vi.mock('@/pages/yakRunner/utils', () => ({ getCodeByPath: vi.fn() }))
vi.mock('@/pages/yakRunner/FileTree/icon', () => ({ FileSuffix: { md: 'markdown-icon' } }))
vi.mock('@/pages/ai-agent/defaultConstant', () => ({ AITabsEnum: { File_Preview: 'file-preview' } }))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/pages/assetViewer/reportRenders/markdownRender', async () => {
  const { Streamdown } = await import('streamdown')
  return {
    StreamMarkdown: ({ content, ...props }: StreamdownProps & { content?: string }) => (
      <Streamdown {...props}>{content}</Streamdown>
    ),
  }
})
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ onClick, 'aria-label': label }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} aria-label={label} />
  ),
}))
vi.mock('antd', () => ({
  Tooltip: ({ title, children }: { title: string; children: React.ReactElement }) =>
    React.cloneElement(children as React.ReactElement<React.AriaAttributes>, { 'aria-label': title }),
}))
vi.mock('../../ChatCard', () => ({
  default: ({ titleMore, children }: { titleMore: React.ReactNode; children: React.ReactNode }) => (
    <div>
      {titleMore}
      {children}
    </div>
  ),
}))
vi.mock('../AIReportFinishCard.module.scss', () => ({ default: {} }))

const { AIReportFinishCard } = await compileReactModule<typeof ReportCardModule>(
  import.meta.url,
  '../AIReportFinishCard.tsx',
)

const reportProps = (path = '/engine/报告.md'): AIReportFinishCardProps => ({
  item: { data: { reportPath: path, title: '报告', content: '聊天中只有受限预览' } } as AIReportFinishCardProps['item'],
  renderNum: 1,
  isChildWindow: false,
})

beforeEach(() => {
  vi.clearAllMocks()
  route.mockReturnValue(YakitRoute.AI_Agent)
})
afterEach(cleanup)

describe('报告文件打开入口（启用 React Compiler）', () => {
  it('完成后的报告不因路径通配符在末尾补出 Markdown 符号', () => {
    const props = reportProps()
    const note = '完整目录结构、入口点明细和关键配置见报告文件。'
    props.item.data.content = `建议阅读 internal/server/install_*.go 与 redhaze-resolver/x{NNN}_*_test.go。\n\n${note}`
    const { container } = render(<AIReportFinishCard {...props} />)
    expect(container.querySelector('p:last-child')?.textContent).toBe(note)
  })

  it('报告内的行内代码保留文件名通配符', () => {
    const props = reportProps()
    props.item.data.content = '阅读 `x{NNN}_*_test.go`。'
    const { container } = render(<AIReportFinishCard {...props} />)
    expect(container.querySelector('code')?.textContent).toBe('x{NNN}_*_test.go')
    expect(container.textContent).toBe('阅读 x{NNN}_*_test.go。')
  })

  it('普通 AI 会话打开落盘报告文件，不触发审计页报错或传递受限正文', () => {
    render(<AIReportFinishCard {...reportProps()} />)
    fireEvent.click(screen.getByRole('button', { name: 'AIReportFinishCard.viewReport' }))
    expect(emit).toHaveBeenCalledExactlyOnceWith(
      'switchAIActTab',
      JSON.stringify({ key: 'file-preview', value: '/engine/报告.md' }),
    )
    expect(notify).not.toHaveBeenCalled()
  })

  it('AI 代码审计页继续使用已有报告预览入口', () => {
    route.mockReturnValue(YakitRoute.Irify_AI_Code_Audit)
    render(<AIReportFinishCard {...reportProps()} />)
    fireEvent.click(screen.getByRole('button', { name: 'AIReportFinishCard.viewReport' }))
    expect(emit).toHaveBeenCalledExactlyOnceWith(
      'onAiCodeAuditOpenTemporaryFile',
      JSON.stringify({
        name: '审计报告.md',
        path: '/engine/报告.md',
        icon: 'markdown-icon',
        language: 'markdown',
        aiReport: true,
      }),
    )
    expect(notify).not.toHaveBeenCalled()
  })

  it('报告路径更新后打开新的文件', () => {
    const { rerender } = render(<AIReportFinishCard {...reportProps()} />)
    rerender(<AIReportFinishCard {...reportProps('/engine/new-report.md')} renderNum={2} />)
    fireEvent.click(screen.getByRole('button', { name: 'AIReportFinishCard.viewReport' }))
    expect(emit).toHaveBeenCalledExactlyOnceWith(
      'switchAIActTab',
      JSON.stringify({ key: 'file-preview', value: '/engine/new-report.md' }),
    )
  })

  it('没有文件路径时不发起文件预览', () => {
    render(<AIReportFinishCard {...reportProps('')} />)
    fireEvent.click(screen.getByRole('button', { name: 'AIReportFinishCard.viewReport' }))
    expect(emit).not.toHaveBeenCalled()
  })

  it('子窗口继续隐藏文件打开按钮', () => {
    render(<AIReportFinishCard {...reportProps()} isChildWindow />)
    expect(screen.queryByRole('button', { name: 'AIReportFinishCard.viewReport' })).not.toBeInTheDocument()
  })
})
