import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import type * as AIMarkdownModule from '../AIMarkdown'
import { isAuxOrChildWindow } from '@/utils/isAuxOrChildWindow'

vi.mock('@/pages/assetViewer/reportRenders/markdownRender', () => ({
  StreamMarkdown: ({ content, wrapperClassName }: { content: string; wrapperClassName: string }) => (
    <div data-testid="preview" className={wrapperClassName}>
      {content}
    </div>
  ),
}))
vi.mock('@/components/yakitUI/YakitEditor/YakitEditor', () => ({
  YakitEditor: ({ value }: { value: string }) => <div data-testid="source">{value}</div>,
}))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({
  YakitButton: ({ onClick, 'aria-label': label }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} aria-label={label} />
  ),
}))
vi.mock('antd', () => ({
  Tooltip: ({ title, children }: { title: string; children: React.ReactElement }) =>
    React.cloneElement(children as React.ReactElement<React.AriaAttributes>, { 'aria-label': title }),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/pages/notepadManage/hook/useGoEditNotepad', () => ({ useGoEditNotepad: () => ({ goAddNotepad: vi.fn() }) }))
vi.mock('@/utils/openWebsite', () => ({ saveABSFileToOpen: vi.fn() }))
vi.mock('@/utils/isAuxOrChildWindow', () => ({ isAuxOrChildWindow: vi.fn(() => false) }))
vi.mock('@/pages/ai-re-act/hooks/useUiExpand', () => ({ useUiExpand: () => React.useState(true) }))
vi.mock('../AIMarkdown.module.scss', () => ({
  default: { 'ai-milkdown-mini': 'ai-milkdown-mini', 'ai-milkdown-code-mini': 'ai-milkdown-code-mini' },
}))
const { AIMarkdown } = await compileReactModule<typeof AIMarkdownModule>(import.meta.url, '../AIMarkdown.tsx')

afterEach(() => {
  cleanup()
  vi.mocked(isAuxOrChildWindow).mockReturnValue(false)
})

describe('AIMarkdown（启用 React Compiler）', () => {
  it.each([true, false])('按固定的窗口类型显示笔记入口（子窗口 %s）', (childWindow) => {
    vi.mocked(isAuxOrChildWindow).mockReturnValue(childWindow)
    const { rerender } = render(<AIMarkdown content="报告" nodeLabel="报告" referenceNode={null} />)
    const button = screen.queryByRole('button', { name: 'AIMarkdown.openFromNotepad' })
    expect(Boolean(button)).toBe(!childWindow)
    rerender(<AIMarkdown content="更新报告" nodeLabel="报告" referenceNode={null} />)
    expect(Boolean(screen.queryByRole('button', { name: 'AIMarkdown.openFromNotepad' }))).toBe(!childWindow)
  })

  it('流式内容、预览和源码模式保持同步', () => {
    const props = { content: '旧内容', nodeLabel: '报告', referenceNode: null, streaming: true }
    const { rerender } = render(<AIMarkdown {...props} />)
    expect(screen.getByTestId('preview')).toHaveClass('stream-markdown-streaming')
    rerender(<AIMarkdown {...props} content="新内容" streaming={false} />)
    expect(screen.getByTestId('preview')).toHaveTextContent('新内容')
    expect(screen.getByTestId('preview')).not.toHaveClass('stream-markdown-streaming')
    fireEvent.click(screen.getByRole('button', { name: 'AIMarkdown.switchToSource' }))
    expect(screen.queryByTestId('preview')).not.toBeInTheDocument()
    expect(screen.getByTestId('source')).toHaveTextContent('新内容')
    rerender(<AIMarkdown {...props} content="最终内容" streaming={false} />)
    expect(screen.getByTestId('source')).toHaveTextContent('最终内容')
    fireEvent.click(screen.getByRole('button', { name: 'AIMarkdown.switchToPreview' }))
    expect(screen.getByTestId('preview')).toHaveTextContent('最终内容')
  })

  it('预览和源码模式都能折叠、展开', () => {
    render(<AIMarkdown content="报告内容" nodeLabel="报告" referenceNode={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.collapse' }))
    expect(screen.getByTestId('preview')).toHaveClass('ai-milkdown-mini')
    fireEvent.click(screen.getByRole('button', { name: 'AIMarkdown.switchToSource' }))
    expect(screen.getByTestId('source').parentElement).toHaveClass('ai-milkdown-code-mini')
    fireEvent.click(screen.getByRole('button', { name: 'YakitButton.expand' }))
    expect(screen.getByTestId('source').parentElement).not.toHaveClass('ai-milkdown-code-mini')
  })
})
