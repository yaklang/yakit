import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AIChatQSDataTypeEnum } from '@/pages/ai-re-act/hooks/aiRender'
import { AI_STREAM_THOUGHT_NODE_ID } from '@/pages/ai-re-act/hooks/defaultConstant'
import AIConcurrentStreamValue, {
  type AIConcurrentStreamStore,
} from '@/auxWindow/pages/AIConcurrentStream/useContext/AIConcurrentStreamContent'
import type { ReactNode } from 'react'

type RawItem = {
  id?: string
  type: string
  parentGroupToken?: string
  data: { NodeId?: string; NodeIdVerbose?: unknown; lastToken?: string; status?: string; content?: string }
}

const rawData = new Map<string, RawItem>()

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
  default: ({ lastItem }: { lastItem?: { data?: { status?: string } } }) => (
    <div data-testid="heard" data-status={lastItem?.data?.status ?? ''} />
  ),
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

const buildStore = (renderNum: number): AIConcurrentStreamStore =>
  ({
    session: '',
    token: '',
    chatType: 'task',
    childrenTokens: [],
    rawData,
    renderNum,
    execFileRecord: new Map(),
  }) as unknown as AIConcurrentStreamStore

const renderWithStore = (ui: ReactNode, renderNum: number) =>
  render(
    <AIConcurrentStreamValue.Provider
      value={{ store: buildStore(renderNum), dispatcher: { requestRefresh: () => {} } }}
    >
      {ui}
    </AIConcurrentStreamValue.Provider>,
  )

describe('AIChildWindowGroupStreamCard', () => {
  beforeEach(() => {
    rawData.clear()
  })

  it('thought 组初始折叠并标记 isThought', () => {
    setGroup('g-thought', AI_STREAM_THOUGHT_NODE_ID)
    renderWithStore(<AIChildWindowGroupStreamCard token="g-thought" />, 1)
    const list = screen.getByTestId('list')
    expect(list).toHaveAttribute('data-expand', 'false')
    expect(list).toHaveAttribute('data-thought', 'true')
  })

  it('普通组初始展开且非 thought', () => {
    setGroup('g-normal', 'summary')
    renderWithStore(<AIChildWindowGroupStreamCard token="g-normal" />, 1)
    const list = screen.getByTestId('list')
    expect(list).toHaveAttribute('data-expand', 'true')
    expect(list).toHaveAttribute('data-thought', 'false')
  })

  it('同 lastToken 下 renderNum 递增会刷新思考头 lastItem 状态', () => {
    setGroup('g-thought', AI_STREAM_THOUGHT_NODE_ID)
    rawData.set('child-1', {
      id: 'child-1',
      type: AIChatQSDataTypeEnum.STREAM,
      parentGroupToken: 'g-thought',
      data: { status: 'start', content: '思考中' },
    })

    const { rerender } = renderWithStore(<AIChildWindowGroupStreamCard token="g-thought" />, 1)
    expect(screen.getByTestId('heard')).toHaveAttribute('data-status', 'start')

    const child = rawData.get('child-1')!
    child.data.status = 'end'
    rerender(
      <AIConcurrentStreamValue.Provider value={{ store: buildStore(2), dispatcher: { requestRefresh: () => {} } }}>
        <AIChildWindowGroupStreamCard token="g-thought" />
      </AIConcurrentStreamValue.Provider>,
    )
    expect(screen.getByTestId('heard')).toHaveAttribute('data-status', 'end')
  })
})
