import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AIStreamChatContent } from '../AIStreamChatContent'
import { AI_STREAM_THOUGHT_NODE_ID } from '@/pages/ai-re-act/hooks/defaultConstant'
import { getAIStreamIcon } from '../icons'
import { LoaderOutlined, SearchOutlined, SparklesOutlined } from '@yakit-libs/yakit-ui-icons/outline'
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
    'loading_skills_names',
    'load_skill_resources_path',
    'load_capability',
    'dispatch_sub_react_agents',
    'load_tool',
    'loading_skills_name',
    'perception',
    'intent',
    'semantic_search_yaklang_samples',
    'code_sample_title',
    'mcp-loader',
    'grep_yaklang_samples',
    'batch-compress',
    'write_yaklang_code',
    're-act-loop',
    'review',
    'directly_answer',
    'memory-timeline',
    'summary',
    're-act-verify',
    'enhance-query',
  ])('标黄节点 %s 使用专用图标', (nodeId) => {
    expect(getAIStreamIcon(nodeId)).not.toBe(SparklesOutlined)
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
  ])('未标黄节点 %s 不按前缀或语义猜测专用图标', (nodeId) => {
    expect(getAIStreamIcon(nodeId)).toBe(SparklesOutlined)
  })

  it('节点变化时更新前置图标', () => {
    const props = { nodeIdVerbose: { Zh: '输出', En: 'Output' }, content: '内容' }
    const { rerender } = render(<AIStreamChatContent {...props} nodeId="load_tool" />)
    const loadingSvg = screen.getByText('输出').previousElementSibling?.innerHTML
    expect(getAIStreamIcon('load_tool')).toBe(LoaderOutlined)
    rerender(<AIStreamChatContent {...props} nodeId="grep_yaklang_samples" />)
    expect(getAIStreamIcon('grep_yaklang_samples')).toBe(SearchOutlined)
    expect(screen.getByText('输出').previousElementSibling?.innerHTML).not.toBe(loadingSvg)
  })

  it.each([undefined, 'unknown-node'])('未指定专用图标的节点 %s 显示前置默认图标', (nodeId) => {
    const { container: defaultIconContainer } = render(<SparklesOutlined />)
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
