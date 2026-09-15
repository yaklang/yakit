import React, { useRef } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { AIChatContentProps, AIChatContentRefProps } from '../../../aiChatContent/type'
import { AIAgentChatLayout } from '../AIAgentChatLayout'

const agentStore = createStore<{ activeChat?: { Id: string; SessionID: string } }>(() => ({}))
const taskStore = createStore(() => ({ currentChatStatus: { questionID: 'task-1' } }))
const taskDetailsMap = new Map([['task-1', { uuid: 'snapshot-1', execution: { http_flow_count: 7 } }]])
const { queryFlows, queryRisks } = vi.hoisted(() => ({
  queryFlows: vi.fn(async () => ({ Total: 123 })),
  queryRisks: vi.fn(async () => ({ RiskLevelGroup: [] })),
}))

vi.mock('ahooks', async () => ({ ...(await vi.importActual('ahooks')), useInViewport: () => [true] }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))
vi.mock('@/pages/ai-agent/useContext/useStore', () => ({
  default: function useAgentStore() {
    return useStore(agentStore)
  },
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => taskStore,
  useCurrentRawData: () => ({ taskDetailsMap }),
}))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({
  default: function useSessionId() {
    return useStore(agentStore, (state) => state.activeChat?.SessionID ?? '')
  },
}))
vi.mock('@/pages/ai-agent/grpc', () => ({ grpcQueryHTTPFlows: queryFlows, grpcExportAILogs: vi.fn() }))
vi.mock('@/pages/risks/YakitRiskTable/utils', () => ({ apiRiskFieldGroup: queryRisks }))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({ getSetting: () => ({ Source: 'ai' }) }),
}))
vi.mock('@/pages/ai-agent/aiChatContent/hooks/useCasualTaskTab', () => ({
  useCasualTaskTab: () => ({ currentChatStatusQuestionID: '', syncCasualTaskTab: vi.fn() }),
}))
vi.mock('@/hook/useAiChatLog/useAiChatLog.ts', () => ({ default: () => ({ onOpenLogWindow: vi.fn() }) }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn(), failed: vi.fn() }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: vi.fn() } }))
vi.mock('@/pages/ai-agent/components/ExportAILogsModal/ExportAILogsModal', () => ({ ExportAILogsModal: () => null }))
vi.mock('@/pages/ai-agent/chatTemplate/historyTaskTree/TaskListPane', () => ({ TaskListPane: () => null }))
vi.mock('@/pages/ai-agent/chatTemplate/historyTaskTree/useHasTaskTree', () => ({ useHasTaskTree: () => false }))
vi.mock('@/pages/ai-agent/chatTemplate/TimelineCard/TimelineCard', () => ({ default: () => null }))
vi.mock('@/pages/ai-agent/aiTriageChatTemplate/AITriageChatTemplate', () => ({
  AIForgeForm: () => null,
  AIToolForm: () => null,
}))
vi.mock('@/components/yakitUI/YakitDockablePane/YakitDockablePane', () => ({
  YakitDockablePane: () => null,
  yakitDockablePaneSegmentedLabel: 'segmented-label',
}))
vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({ secondNode }: { secondNode: React.ReactNode }) => <>{secondNode}</>,
}))
vi.mock('../../../aiChatContent/AIChatWorkspace/AIChatWorkspace', () => ({ AIChatWorkspace: () => null }))
vi.mock('../../../aiChatWelcome/AIChatWelcome', () => ({
  default: React.forwardRef(function Welcome(_props, _ref) {
    return <div>欢迎页</div>
  }),
}))
vi.mock('../../../aiChatContent/AIChatContent', () => ({
  AIChatContent: React.forwardRef<HTMLDivElement, AIChatContentProps>(function Content(props, _ref) {
    return (
      <div ref={props.rightPanelLayoutRef} data-testid="chat-content">
        <button onClick={() => props.setShowFreeChat?.(!props.showFreeChat)}>切换自由对话</button>
      </div>
    )
  }),
}))
vi.mock('@/pages/ai-agent/historyChat/HistoryChat', () => ({
  default: () => (
    <div data-testid="history-list">
      <button onClick={() => agentStore.setState({ activeChat: { Id: 'chat-1', SessionID: 'session-1' } })}>
        测试会话
      </button>
    </div>
  ),
}))

function Layout() {
  const activeChat = useStore(agentStore, (state) => state.activeChat)
  const chatRef = useRef<AIChatContentRefProps>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={wrapperRef}>
      <AIAgentChatLayout
        mode={activeChat ? 're-act' : 'welcome'}
        onTriageSubmit={vi.fn()}
        onSetReAct={vi.fn()}
        onChat={vi.fn()}
        aiChatWelcomeRef={chatRef}
        aiReActChatRef={chatRef}
        wrapperRef={wrapperRef}
        onClearActiveForge={vi.fn()}
        onSubmitForge={vi.fn()}
        onClearActiveTool={vi.fn()}
        onSubmitTool={vi.fn()}
      />
    </div>
  )
}

let layoutWidth = 1400
let chatTop = 120
const observers = new Set<() => void>()
beforeEach(() => {
  agentStore.setState({ activeChat: undefined })
  vi.clearAllMocks()
  layoutWidth = 1400
  chatTop = 120
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const chat = this.dataset.testid === 'chat-content'
    return {
      x: 0,
      y: 0,
      left: chat ? 12 : 0,
      top: chat ? chatTop : 0,
      width: chat ? layoutWidth - 16 : layoutWidth,
      height: chat ? 788 - chatTop : 800,
      right: layoutWidth,
      bottom: 800,
      toJSON: () => ({}),
    }
  })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      callback: () => void
      constructor(callback: ResizeObserverCallback) {
        this.callback = () => callback([], this as unknown as ResizeObserver)
      }
      observe() {
        observers.add(this.callback)
      }
      disconnect() {
        observers.delete(this.callback)
      }
      unobserve() {}
    },
  )
})
afterEach(() => {
  cleanup()
  observers.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('公共右侧面板', () => {
  it('按页面挂载数据源，回到欢迎页后取消任务订阅和轮询', async () => {
    const readTask = vi.spyOn(taskDetailsMap, 'get')
    const subscribe = taskStore.subscribe.bind(taskStore)
    let subscriptions = 0
    vi.spyOn(taskStore, 'subscribe').mockImplementation((listener) => {
      subscriptions++
      const unsubscribe = subscribe(listener)
      return () => {
        subscriptions--
        unsubscribe()
      }
    })
    render(<Layout />)
    await screen.findByText('欢迎页')
    await waitFor(() => expect(screen.getByLabelText('AIRightPanel.traffic')).toHaveTextContent('123'))
    vi.useFakeTimers()
    act(() => vi.advanceTimersByTime(3000))
    expect(subscriptions).toBe(0)
    expect(readTask).not.toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText('AIRightPanel.sessionHistory'))
    fireEvent.click(screen.getByText('测试会话'))
    expect(subscriptions).toBeGreaterThan(0)
    const chatReads = readTask.mock.calls.length
    act(() => vi.advanceTimersByTime(3000))
    expect(readTask.mock.calls.length).toBeGreaterThan(chatReads)
    expect(queryFlows).toHaveBeenCalledTimes(1)
    expect(queryRisks).toHaveBeenCalledTimes(1)

    await act(async () => agentStore.setState({ activeChat: undefined }))
    expect(subscriptions).toBe(0)
    const welcomeReads = readTask.mock.calls.length
    act(() => vi.advanceTimersByTime(3000))
    expect(readTask.mock.calls.length).toBe(welcomeReads)
    expect(queryFlows).toHaveBeenCalledTimes(2)
    expect(queryRisks).toHaveBeenCalledTimes(2)
  })

  it('欢迎页选择会话后保留历史面板实例，并切换为会话统计', async () => {
    const { container } = render(<Layout />)
    await screen.findByText('欢迎页')
    await waitFor(() => expect(screen.getByLabelText('AIRightPanel.traffic')).toHaveTextContent('123'))
    fireEvent.click(screen.getByLabelText('AIRightPanel.sessionHistory'))
    const panel = container.querySelector('[data-ai-right-panel]')
    const history = screen.getByTestId('history-list')
    history.scrollTop = 120
    fireEvent.click(screen.getByRole('button', { name: '测试会话' }))
    await screen.findByTestId('chat-content')
    await waitFor(() => expect(screen.getByLabelText('AIRightPanel.traffic')).toHaveTextContent('7'))
    expect(container.querySelectorAll('[data-ai-right-panel]')).toHaveLength(1)
    expect(container.querySelector('[data-ai-right-panel]')).toBe(panel)
    expect(screen.getByTestId('history-list')).toBe(history)
    expect(history.scrollTop).toBe(120)
    expect(queryFlows).toHaveBeenCalledTimes(1)

    expect(panel?.parentElement).toHaveStyle({ left: '12px', top: '120px', width: '1384px', height: '668px' })
    chatTop = 200
    act(() => observers.forEach((notify) => notify()))
    expect(panel?.parentElement).toHaveStyle({ top: '200px', height: '588px' })

    fireEvent.click(screen.getByText('切换自由对话'))
    expect(panel?.parentElement).toHaveAttribute('hidden')
    fireEvent.click(screen.getByText('切换自由对话'))
    expect(panel?.parentElement).not.toHaveAttribute('hidden')
    expect(container.querySelector('[data-ai-right-panel]')).toBe(panel)
    fireEvent.click(screen.getByLabelText('AIRightPanel.taskList'))
    expect(screen.queryByTestId('history-list')).not.toBeInTheDocument()
    act(() => agentStore.setState({ activeChat: undefined }))
    await screen.findByText('欢迎页')
    expect(panel?.querySelector('section')).toBeNull()
  })

  it('小屏切换页面仍保留浮层，移入取消关闭、移出延时关闭', async () => {
    layoutWidth = 900
    const { container } = render(<Layout />)
    await screen.findByText('欢迎页')
    const panel = container.querySelector('[data-ai-right-panel]')
    expect(panel).toHaveAttribute('data-ai-right-panel-small', 'true')
    fireEvent.mouseEnter(screen.getByLabelText('AIRightPanel.sessionHistory'))
    const history = screen.getByTestId('history-list')
    fireEvent.click(screen.getByText('测试会话'))
    expect(screen.getByTestId('history-list')).toBe(history)
    const pane = history.closest('section')?.parentElement
    expect(pane).not.toBeNull()
    vi.useFakeTimers()
    fireEvent.mouseLeave(screen.getByLabelText('AIRightPanel.sessionHistory'))
    fireEvent.mouseEnter(pane!)
    act(() => vi.advanceTimersByTime(150))
    expect(screen.getByTestId('history-list')).toBe(history)
    fireEvent.mouseLeave(pane!)
    act(() => vi.advanceTimersByTime(149))
    expect(screen.getByTestId('history-list')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByTestId('history-list')).not.toBeInTheDocument()
  })
})
