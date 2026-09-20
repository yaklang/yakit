import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import { AI_STREAM_THOUGHT_NODE_ID } from '@/pages/ai-re-act/hooks/defaultConstant'

const rawData = new Map<
  string,
  { type: string; data: { NodeId?: string; NodeIdVerbose?: unknown; lastToken?: string } }
>()
const store = { rawData, renderNum: 1 }

vi.mock('@/auxWindow/pages/AIConcurrentStream/useContext/useStore', () => ({
  default: () => store,
}))
vi.mock('../../../aiGroupStreamCard/AIGroupStreamCard', () => ({
  STREAM_MASK_THRESHOLD: 170,
}))
vi.mock('@/pages/ai-re-act/hooks/useClickFocus', () => ({
  default: () => ({ ref: { current: null }, isFocus: false }),
}))
vi.mock('@/pages/ai-re-act/hooks/useAINodeLabel', () => ({
  default: () => ({ getLabelByParams: () => '标签' }),
}))
vi.mock('../../../aiGroupStreamCard/aiGroupStreamCardHeard/AIGroupStreamCardHeard', () => ({
  default: () => <div data-testid="heard" />,
}))
vi.mock('../../../aiGroupStreamCard/aiGroupStreamCardList/AIGroupStreamCardList', () => ({
  default: ({ expand, isThought }: { expand: boolean; isThought?: boolean }) => (
    <div data-testid="list" data-expand={String(expand)} data-thought={String(!!isThought)} />
  ),
}))
vi.mock('../../aiChildWindowNodeItemWrapper/AIChildWindowNodeItemWrapper', () => ({
  default: () => null,
}))

import AIChildWindowGroupStreamCard from '../AIChildWindowGroupStreamCard'

const setGroup = (token: string, nodeId: string) => {
  rawData.clear()
  rawData.set(token, {
    type: AIChatQSDataTypeEnum.STREAM_GROUP,
    data: { NodeId: nodeId, NodeIdVerbose: { Zh: '组' }, lastToken: '' },
  })
}

describe('AIChildWindowGroupStreamCard', () => {
  beforeEach(() => {
    rawData.clear()
    store.renderNum = 1
  })

  it('thought 组初始折叠并标记 isThought', () => {
    setGroup('g-thought', AI_STREAM_THOUGHT_NODE_ID)
    render(<AIChildWindowGroupStreamCard token="g-thought" />)
    const list = screen.getByTestId('list')
    expect(list).toHaveAttribute('data-expand', 'false')
    expect(list).toHaveAttribute('data-thought', 'true')
  })

  it('普通组初始展开且非 thought', () => {
    setGroup('g-normal', 'summary')
    render(<AIChildWindowGroupStreamCard token="g-normal" />)
    const list = screen.getByTestId('list')
    expect(list).toHaveAttribute('data-expand', 'true')
    expect(list).toHaveAttribute('data-thought', 'false')
  })
})
