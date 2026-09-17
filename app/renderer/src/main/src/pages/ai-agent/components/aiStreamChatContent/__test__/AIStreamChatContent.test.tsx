import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AIStreamChatContent } from '../AIStreamChatContent'
import { AI_STREAM_THOUGHT_NODE_ID } from '@/pages/ai-re-act/hooks/defaultConstant'
import { getAIStreamIcon } from '../icons'
import {
  AnnotationOutlined,
  AtomOutlined,
  BookOpenTextOutlined,
  ClipboardCheckOutlined,
  FigmaIcon34227111184Outlined,
  FigmaIcon34227111185Outlined,
  FolderArchiveOutlined,
  GitMergeOutlined,
  LightBulbOutlined,
  LoaderPinwheelOutlined,
  MCPOutlined,
  ScrollTextOutlined,
  SearchOutlined,
  Sparkles2Outlined,
  StethoscopeOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { OutlineThoughtIcon } from '@yakit-libs/yakit-ui-icons/oldicon/OutlineThoughtIcon'

vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({ CopyComponents: () => null }))
vi.mock('@/pages/ai-re-act/hooks/useAINodeLabel', () => ({
  default: (label: { Zh: string }) => ({ nodeLabel: label.Zh }),
}))
vi.mock('@/pages/ai-re-act/hooks/useUiExpand', () => ({
  useUiExpand: (_token: string, initial: boolean) => React.useState(initial),
}))
vi.mock('../../thoughtDuration/ThoughtDuration', () => ({ default: () => null }))

describe('AIStreamChatContent', () => {
  it.each([
    ['loading_skills_names', LoaderPinwheelOutlined],
    ['load_skill_resources_path', LoaderPinwheelOutlined],
    ['load_capability', LoaderPinwheelOutlined],
    ['dispatch_sub_react_agents', GitMergeOutlined],
    ['load_tool', LoaderPinwheelOutlined],
    ['loading_skills_name', LoaderPinwheelOutlined],
    ['perception', LightBulbOutlined],
    ['intent', LightBulbOutlined],
    ['semantic_search_yaklang_samples', SearchOutlined],
    ['code_sample_title', FigmaIcon34227111184Outlined],
    ['mcp-loader', MCPOutlined],
    ['grep_yaklang_samples', SearchOutlined],
    ['batch-compress', FolderArchiveOutlined],
    ['write_yaklang_code', FigmaIcon34227111185Outlined],
    ['re-act-loop', AtomOutlined],
    ['review', StethoscopeOutlined],
    ['directly_answer', AnnotationOutlined],
    ['memory-timeline', FolderArchiveOutlined],
    ['summary', ScrollTextOutlined],
    ['re-act-verify', ClipboardCheckOutlined],
    ['enhance-query', BookOpenTextOutlined],
  ])('节点 %s 使用设计图对应的图标', (nodeId, expectedIcon) => {
    expect(getAIStreamIcon(nodeId)).toBe(expectedIcon)
  })

  it.each([
    'load_skill_resources_type',
    'intent_analysis',
    'search_yaklang_samples',
    'summary-short',
    'directly-answer',
    'knowledge_enhance',
    'memory-reducer',
    'unknown-node',
    undefined,
  ])('未配置节点 %s 不按前缀或语义猜测专用图标', (nodeId) => {
    expect(getAIStreamIcon(nodeId)).toBe(Sparkles2Outlined)
  })

  it('节点变化时更新前置图标', () => {
    const props = { nodeIdVerbose: { Zh: '输出', En: 'Output' }, content: '内容' }
    const { rerender } = render(<AIStreamChatContent {...props} nodeId="load_tool" />)
    const loadingSvg = screen.getByText('输出').previousElementSibling?.innerHTML
    expect(getAIStreamIcon('load_tool')).toBe(LoaderPinwheelOutlined)
    rerender(<AIStreamChatContent {...props} nodeId="grep_yaklang_samples" />)
    expect(getAIStreamIcon('grep_yaklang_samples')).toBe(SearchOutlined)
    expect(screen.getByText('输出').previousElementSibling?.innerHTML).not.toBe(loadingSvg)
  })

  it.each([undefined, 'unknown-node'])('未指定专用图标的节点 %s 显示前置默认图标', (nodeId) => {
    const { container: defaultIconContainer } = render(<Sparkles2Outlined />)
    const { container } = render(
      <AIStreamChatContent
        nodeId={nodeId}
        nodeIdVerbose={{ Zh: '流消息', En: 'Stream' }}
        content="输出内容"
        referenceNode={<span>参考资料</span>}
      />,
    )

    const title = screen.getByText('流消息')
    expect(title.previousElementSibling?.innerHTML).toBe(defaultIconContainer.firstElementChild?.innerHTML)
    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(screen.getByText('输出内容')).toBeInTheDocument()
    expect(screen.getByText('参考资料')).toBeInTheDocument()
  })

  it('思考流保留思考图标及展开收起行为', () => {
    const { container: thoughtIconContainer } = render(<OutlineThoughtIcon />)
    const { container } = render(
      <AIStreamChatContent
        nodeId={AI_STREAM_THOUGHT_NODE_ID}
        nodeIdVerbose={{ Zh: '思考', En: 'Thought' }}
        content="思考内容"
      />,
    )

    const title = screen.getByText('思考')
    expect(title.previousElementSibling?.querySelector('path')).toHaveAttribute(
      'd',
      thoughtIconContainer.querySelector('path')?.getAttribute('d'),
    )
    expect(container.querySelectorAll('svg')).toHaveLength(2)
    expect(screen.queryByText('思考内容')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('思考'))
    expect(screen.getByText('思考内容')).toBeInTheDocument()
    fireEvent.click(screen.getByText('思考'))
    expect(screen.queryByText('思考内容')).not.toBeInTheDocument()
  })
})
