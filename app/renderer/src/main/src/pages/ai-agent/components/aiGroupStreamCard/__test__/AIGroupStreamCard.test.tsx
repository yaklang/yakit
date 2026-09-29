import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import { AI_STREAM_THOUGHT_NODE_ID } from '@/pages/ai-re-act/hooks/defaultConstant'

const contents = new Map<
  string,
  {
    type: string
    id?: string
    data: {
      NodeId?: string
      NodeIdVerbose?: unknown
      lastToken?: string
      status?: 'start' | 'end'
      content?: string
    }
  }
>()

const store = createStore(() => ({
  groups: {} as Record<string, { nodeId: string; renderNum: number; childrenTokens: string[] }>,
  items: {} as Record<string, { renderNum: number }>,
  chatElements: [] as { token: string }[],
}))

vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => store,
  useCurrentRawData: () => ({ contents }),
}))
vi.mock('@/pages/ai-re-act/aiReActChatContents/AIReActChatContents', () => ({
  AIReferenceNode: () => null,
}))
vi.mock('@/pages/ai-re-act/hooks/useClickFocus', () => ({
  default: () => ({ ref: { current: null }, isFocus: false }),
}))
vi.mock('@/pages/ai-re-act/hooks/useUiExpand', async () => {
  const React = await import('react')
  return {
    useUiExpand: (_token: string, initial: boolean) => React.useState(initial),
  }
})
vi.mock('@/pages/ai-re-act/hooks/useAINodeLabel', () => ({
  default: () => ({ getLabelByParams: () => '标签' }),
}))
vi.mock('../aiGroupStreamCardHeard/AIGroupStreamCardHeard', () => ({
  isThoughtHeaderStreaming: (lastItem?: { data?: { status?: string } }) =>
    lastItem != null && lastItem.data?.status !== 'end',
  default: ({
    expand,
    setExpand,
    streaming,
  }: {
    expand: boolean
    setExpand: (v: boolean | ((p: boolean) => boolean)) => void
    streaming?: boolean
  }) => (
    <div>
      <span data-testid="expand">{String(expand)}</span>
      <span data-testid="streaming">{String(!!streaming)}</span>
      <button type="button" onClick={() => setExpand(true)}>
        展开组
      </button>
    </div>
  ),
}))
vi.mock('../aiGroupStreamCardList/AIGroupStreamCardList', () => ({
  default: () => <div data-testid="list" />,
}))

import AIGroupStreamCard from '../AIGroupStreamCard'

const setupGroup = (token: string, nodeId: string, lastInChat: boolean) => {
  contents.clear()
  contents.set(token, {
    type: AIChatQSDataTypeEnum.STREAM_GROUP,
    data: { NodeId: nodeId, NodeIdVerbose: { Zh: '组' }, lastToken: 'child-1' },
  })
  store.setState({
    groups: { [token]: { nodeId, renderNum: 1, childrenTokens: ['child-1'] } },
    items: { 'child-1': { renderNum: 1 } },
    chatElements: lastInChat ? [{ token }] : [{ token }, { token: 'other' }],
  })
}

describe('AIGroupStreamCard 末条自动折叠', () => {
  beforeEach(() => {
    contents.clear()
    store.setState({ groups: {}, items: {}, chatElements: [] })
  })

  it('普通组作为会话末条时自动折叠', () => {
    setupGroup('g-normal', 'summary', true)
    render(<AIGroupStreamCard token="g-normal" />)
    expect(screen.getByTestId('expand')).toHaveTextContent('false')
  })

  it('thought 组成为末条后仍保持用户展开', () => {
    setupGroup('g-thought', AI_STREAM_THOUGHT_NODE_ID, false)
    render(<AIGroupStreamCard token="g-thought" />)
    expect(screen.getByTestId('expand')).toHaveTextContent('false')
    fireEvent.click(screen.getByRole('button', { name: '展开组' }))
    expect(screen.getByTestId('expand')).toHaveTextContent('true')
    act(() => {
      store.setState({ chatElements: [{ token: 'g-thought' }] })
    })
    expect(screen.getByTestId('expand')).toHaveTextContent('true')
  })
})

describe('AIGroupStreamCardHeardWrapper streaming', () => {
  beforeEach(() => {
    contents.clear()
    store.setState({ groups: {}, items: {}, chatElements: [] })
  })

  it('子流 status 原地改写后 renderNum bump，下传 streaming 变为 false', () => {
    setupGroup('g-thought', AI_STREAM_THOUGHT_NODE_ID, true)
    const child = {
      type: AIChatQSDataTypeEnum.STREAM,
      id: 'child-1',
      data: { status: 'start' as 'start' | 'end', content: '思考中', NodeId: AI_STREAM_THOUGHT_NODE_ID },
    }
    contents.set('child-1', child)

    render(<AIGroupStreamCard token="g-thought" />)
    expect(screen.getByTestId('streaming')).toHaveTextContent('true')

    // 模拟 stream-finished：原地改 status，再 bump 父组（与 handler 一致）
    child.data.status = 'end'
    act(() => {
      const state = store.getState()
      store.setState({
        groups: {
          ...state.groups,
          'g-thought': { ...state.groups['g-thought'], renderNum: 2 },
        },
        items: {
          ...state.items,
          'child-1': { renderNum: 2 },
        },
      })
    })

    expect(screen.getByTestId('streaming')).toHaveTextContent('false')
  })
})
