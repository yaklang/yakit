import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { AIChatContent } from '../AIChatContent'
import type { AIReActChatProps } from '@/pages/ai-re-act/aiReActChat/AIReActChatType'

const store = createStore(() => ({ initLoading: true }))
const agentStore = createStore(() => ({ activeChat: { SessionID: 'session-1', Source: 'ai' } }))
const { newChat } = vi.hoisted(() => ({ newChat: vi.fn() }))

vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentStore: () => store }))
vi.mock('../../useContext/useStore', () => ({
  default: function useAgentStore() {
    return useStore(agentStore)
  },
}))
vi.mock('../../historyChat/HistoryChat', () => ({ onNewChat: newChat }))
vi.mock('../aiHorizontalScrollCard/AIHorizontalScrollCard', () => ({ AIHorizontalScrollCard: () => null }))
vi.mock('@/pages/ai-re-act/aiReActChat/AIReActChat', async () => {
  const { forwardRef } = await import('react')
  return {
    AIReActChat: forwardRef<HTMLDivElement, AIReActChatProps>(function Chat(props, _ref) {
      return (
        <div ref={props.rightPanelLayoutRef}>
          聊天内容
          {props.showAIRightPanel && <span>内部面板</span>}
          <button onClick={() => props.setShowFreeChat(!props.showFreeChat)}>切换自由对话</button>
        </div>
      )
    }),
  }
})
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: () => '回到首页' }),
}))
vi.mock('lottie-web', () => ({
  default: {
    loadAnimation: () => ({
      addEventListener: (event: string, callback: () => void) => {
        if (event === 'complete') callback()
      },
      removeEventListener: vi.fn(),
      setSpeed: vi.fn(),
      destroy: vi.fn(),
    }),
  },
}))
vi.mock('../../aiGlobalLoading/TypewriterText/TypewriterText', () => ({
  default: ({ text }: { text: string }) => <p>{text}</p>,
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  store.setState({ initLoading: true })
  agentStore.setState({ activeChat: { SessionID: 'session-1', Source: 'ai' } })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const advance = (duration: number) => act(() => vi.advanceTimersByTime(duration))
const queryBackButton = () => screen.queryByRole('button', { name: '回到首页' })

describe('AIChatContent 加载超时操作', () => {
  it('公共布局关闭内部面板，并将自由对话变更交给父级', () => {
    store.setState({ initLoading: false })
    const setShowFreeChat = vi.fn()
    const rightPanelLayoutRef = vi.fn()
    const { rerender } = render(
      <AIChatContent
        onChat={vi.fn()}
        showFreeChat
        rightPanelLayoutRef={rightPanelLayoutRef}
        setShowFreeChat={setShowFreeChat}
      />,
    )
    expect(screen.queryByText('内部面板')).not.toBeInTheDocument()
    expect(rightPanelLayoutRef.mock.calls[0][0]).toContainElement(screen.getByText('切换自由对话'))
    fireEvent.click(screen.getByText('切换自由对话'))
    expect(setShowFreeChat).toHaveBeenLastCalledWith(false)
    rerender(
      <AIChatContent
        onChat={vi.fn()}
        showFreeChat={false}
        rightPanelLayoutRef={rightPanelLayoutRef}
        setShowFreeChat={setShowFreeChat}
      />,
    )
    fireEvent.click(screen.getByText('切换自由对话'))
    expect(setShowFreeChat).toHaveBeenLastCalledWith(true)
  })

  it('独立使用时保留内部面板', () => {
    render(<AIChatContent onChat={vi.fn()} />)
    expect(screen.getByText('内部面板')).toBeInTheDocument()
  })
  it('持续加载 3 秒后在文案下方显示带返回图标的按钮，点击复用新建会话逻辑', () => {
    render(<AIChatContent onChat={vi.fn()} />)
    advance(2999)
    expect(queryBackButton()).not.toBeInTheDocument()
    advance(1)
    const button = screen.getByRole('button', { name: '回到首页' })
    expect(screen.getByText('数据加载中，请稍后').nextElementSibling).toBe(button)
    expect(button.querySelector('svg')).not.toBeNull()
    fireEvent.click(button)
    expect(newChat).toHaveBeenCalledOnce()
  })

  it('加载提前结束时取消计时，下次加载重新等待 3 秒', () => {
    render(<AIChatContent onChat={vi.fn()} />)
    advance(2000)
    act(() => store.setState({ initLoading: false }))
    advance(3000)
    expect(queryBackButton()).not.toBeInTheDocument()
    act(() => store.setState({ initLoading: true }))
    advance(2999)
    expect(queryBackButton()).not.toBeInTheDocument()
    advance(1)
    expect(queryBackButton()).toBeVisible()
    act(() => store.setState({ initLoading: false }))
    expect(queryBackButton()).not.toBeInTheDocument()
  })

  it('切换会话后清除旧按钮并重新计时', () => {
    render(<AIChatContent onChat={vi.fn()} />)
    advance(3000)
    expect(queryBackButton()).toBeVisible()
    act(() => agentStore.setState({ activeChat: { SessionID: 'session-2', Source: 'ai' } }))
    expect(queryBackButton()).not.toBeInTheDocument()
    advance(2999)
    expect(queryBackButton()).not.toBeInTheDocument()
    advance(1)
    expect(queryBackButton()).toBeVisible()
  })

  it('卸载时取消等待按钮的定时器', () => {
    const { unmount } = render(<AIChatContent onChat={vi.fn()} />)
    advance(1000)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
