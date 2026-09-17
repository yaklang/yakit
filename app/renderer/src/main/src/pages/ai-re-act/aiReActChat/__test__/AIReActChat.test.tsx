import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type * as AIReActChatModule from '../AIReActChat'
import type { AIReActChatContentsRef } from '../../aiReActChatContents/AIReActChatContentsType'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'

const { scrollToItemIndex } = vi.hoisted(() => ({ scrollToItemIndex: vi.fn() }))

vi.mock('ahooks', async () => {
  const actual = await vi.importActual('ahooks')
  return {
    ...actual,
    useInViewport: () => [true],
  }
})

vi.mock('@/pages/ai-agent/useContext/useStore', () => ({
  default: () => ({ activeChat: undefined, setting: undefined }),
}))

vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({
    setActiveChat: vi.fn(),
    getSetting: () => ({}),
    onStart: vi.fn(),
    onSend: vi.fn(),
  }),
}))

vi.mock('@/pages/ai-agent/utils', () => ({
  formatAIAgentSetting: () => ({}),
  getAIReActRequestParams: () => ({ attachedResourceInfo: undefined }),
}))

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('@/utils/randomUtil', () => ({ randomString: () => 'test-id' }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: vi.fn() } }))

vi.mock('../../hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => ({
    getState: () => ({ execute: false, currentChatStatus: { questionID: '' }, notifyMessage: undefined }),
  }),
}))
vi.mock('../../hooks/useCurrentSessionId', () => ({ default: () => 'test-session' }))
vi.mock('../../hooks/useSessionId', () => ({ default: () => ({ getSession: () => 'test-session' }) }))
vi.mock('../../hooks/useAINodeLabel', () => ({ default: () => ({ nodeLabel: '' }) }))
vi.mock('../../hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: {
    ensureSession: () => ({ store: {} }),
    setActiveShowSession: vi.fn(),
  },
}))
vi.mock('zustand', async () => {
  const actual = await vi.importActual('zustand')
  return { ...actual, useStore: () => false }
})

vi.mock('../../aiReActChatContents/AIReActChatContents', () => ({
  AIReActChatContents: React.forwardRef<AIReActChatContentsRef>((_props, ref) => {
    React.useImperativeHandle(ref, () => ({ scrollToItemIndex }), [])
    return <div data-testid="chat-contents" />
  }),
}))
vi.mock('../aiReActChatHeader/AIReActChatHeader', () => ({
  AIReActChatHeader: ({ scrollToItemIndex }: Partial<AIReActChatContentsRef>) => (
    <button data-testid="chat-header" onClick={() => scrollToItemIndex?.(3, 'smooth')}>
      定位任务
    </button>
  ),
}))
vi.mock('../aiReactChatTextarea/AIReactChatTextarea', () => ({
  AIReactChatTextarea: React.forwardRef(() => <div data-testid="chat-textarea" />),
}))
vi.mock('../aiToDoListWrapper/AIToDoListWrapper', () => ({
  AIToDoListWrapper: () => <div data-testid="todo-list" />,
}))
vi.mock('@/pages/ai-agent/components/aiTaskQuery/AITaskQuery', () => ({
  AITaskQuery: () => null,
}))
vi.mock('@/pages/ai-agent/aiAgentChat/AIAgentChat', () => ({
  AIReActTaskChatReview: () => null,
}))
vi.mock('../AIReActComponent', () => ({
  ChevrondownButton: () => <span data-testid="expand-button" />,
}))
vi.mock('../../aiRightPanel/AIRightPanel', () => ({
  AIRightPanel: () => <div data-testid="right-panel" />,
}))

const { AIReActChat } = await compileReactModule<typeof AIReActChatModule>(import.meta.url, '../AIReActChat.tsx')

const baseProps = {
  showFreeChat: true,
  showAIRightPanel: true,
  setShowFreeChat: vi.fn(),
  startRequest: vi.fn(),
}

describe('AIReActChat', () => {
  it('首次挂载后点击任务，通过已挂载的内容引用定位', () => {
    scrollToItemIndex.mockClear()
    render(<AIReActChat {...baseProps} title="会话" />)
    fireEvent.click(screen.getByText('定位任务'))
    expect(scrollToItemIndex).toHaveBeenCalledWith(3, 'smooth')
  })
  it('提供聊天区域定位引用，供公共面板对齐', () => {
    const rightPanelLayoutRef = vi.fn()
    const { unmount } = render(
      <AIReActChat {...baseProps} showAIRightPanel={false} rightPanelLayoutRef={rightPanelLayoutRef} />,
    )
    const element = rightPanelLayoutRef.mock.calls[0][0] as HTMLDivElement
    expect(element).toContainElement(screen.getByTestId('chat-contents'))
    expect(element).toContainElement(screen.getByTestId('chat-textarea'))
    unmount()
    expect(rightPanelLayoutRef.mock.calls.at(-1)?.[0]).toBeNull()
  })
  it('自由对话收起时不渲染右侧面板', () => {
    render(<AIReActChat {...baseProps} showFreeChat={false} />)

    expect(screen.queryByTestId('right-panel')).not.toBeInTheDocument()
  })

  it('未开启右侧面板开关时不渲染右侧面板', () => {
    render(<AIReActChat {...baseProps} showAIRightPanel={false} />)

    expect(screen.queryByTestId('right-panel')).not.toBeInTheDocument()
  })

  it('自由对话展开时渲染右侧面板', () => {
    render(<AIReActChat {...baseProps} />)

    expect(screen.getByTestId('right-panel')).toBeInTheDocument()
  })
})
