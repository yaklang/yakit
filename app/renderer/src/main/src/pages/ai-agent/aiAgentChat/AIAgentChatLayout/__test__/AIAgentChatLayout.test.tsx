import React, { useRef } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { AIChatContentProps, AIChatContentRefProps } from '../../../aiChatContent/type'
import { AIAgentChatLayout } from '../AIAgentChatLayout'
import type { AIAgentChatMode } from '../../type'

let removeFlow: (id: string, isSummary: boolean) => void

const agentStore = createStore<{ activeChat?: { Id: string; SessionID: string } }>(() => ({}))
const taskStore = createStore(() => ({ currentChatStatus: { questionID: 'task-1' } }))
const taskDetailsMap = new Map([['task-1', { uuid: 'snapshot-1', execution: { http_flow_count: 7 } }]])
let workspaceProps: {
  onSetSelectedHttpFlowIds: (ids: string[]) => void
  onRegisterTableSelectApi: (api: { reset: () => void; deselectId: (id: string) => void }) => void
}
const { welcomeFlow, chatFlow, submit } = vi.hoisted(() => ({
  welcomeFlow: vi.fn(),
  chatFlow: vi.fn(),
  submit: vi.fn(),
}))
const { queryFlows, queryRisks } = vi.hoisted(() => ({
  queryFlows: vi.fn(async () => ({ Total: 123 })),
  queryRisks: vi.fn(async () => ({ RiskLevelGroup: [] })),
}))

const viewport = vi.hoisted(() => ({ visible: true }))
vi.mock('ahooks', async () => ({ ...(await vi.importActual('ahooks')), useInViewport: () => [viewport.visible] }))
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
  YakitResizeBox: ({ firstNode, secondNode }: { firstNode: React.ReactNode; secondNode: React.ReactNode }) => (
    <>
      {firstNode}
      {secondNode}
    </>
  ),
}))
vi.mock('../../../aiChatContent/AIChatWorkspace/AIChatWorkspace', () => ({
  AIChatWorkspace: (props: typeof workspaceProps) => {
    workspaceProps = props
    return null
  },
}))
vi.mock('../../../aiChatWelcome/AIChatWelcome', () => ({
  default: React.forwardRef(function Welcome(
    props: {
      onHttpFlowRemove: (id: string, isSummary: boolean) => void
      onTriageSubmit: (data: object) => void
    },
    ref,
  ) {
    React.useImperativeHandle(ref, () => ({ setHttpFlow: welcomeFlow }))
    removeFlow = props.onHttpFlowRemove
    return (
      <div>
        欢迎页
        <button onClick={() => props.onHttpFlowRemove('1,2,3', true)}>删除引用</button>
        <button onClick={() => props.onTriageSubmit({ httpFlowList: [{ flowIds: ['1', '2'] }] })}>发送欢迎消息</button>
      </div>
    )
  }),
}))
vi.mock('../../../aiChatContent/AIChatContent', () => ({
  AIChatContent: React.forwardRef<HTMLDivElement, AIChatContentProps>(function Content(props, _ref) {
    removeFlow = props.onHttpFlowRemove!
    React.useImperativeHandle(_ref, () => ({ setHttpFlow: chatFlow }) as unknown as HTMLDivElement)
    return (
      <div ref={props.rightPanelLayoutRef} data-testid="chat-content">
        <button onClick={() => props.setShowFreeChat?.(!props.showFreeChat)}>切换自由对话</button>
        <button onClick={props.onAfterSubmit}>发送会话消息</button>
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

function Layout({ mode }: { mode?: AIAgentChatMode }) {
  const activeChat = useStore(agentStore, (state) => state.activeChat)
  const chatRef = useRef<AIChatContentRefProps>(null)
  const welcomeRef = useRef<AIChatContentRefProps>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={wrapperRef}>
      <AIAgentChatLayout
        mode={mode ?? (activeChat ? 're-act' : 'welcome')}
        onTriageSubmit={submit}
        onSetReAct={vi.fn()}
        onChat={vi.fn()}
        aiChatWelcomeRef={welcomeRef}
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
  viewport.visible = true
  agentStore.setState({ activeChat: undefined })
  vi.clearAllMocks()
  layoutWidth = 1400
  chatTop = 120
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.closest('[hidden]')) return new DOMRect()
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
  it.each([undefined, 'session-1'])('同一会话仅切换展示模式不清理勾选（SessionID：%s）', async (sessionId) => {
    if (sessionId) agentStore.setState({ activeChat: { Id: 'chat-1', SessionID: sessionId } })
    const { rerender } = render(<Layout mode="welcome" />)
    await screen.findByText('欢迎页')
    const reset = vi.fn()
    const onSelection = workspaceProps.onSetSelectedHttpFlowIds
    act(() => workspaceProps.onRegisterTableSelectApi({ reset, deselectId: vi.fn() }))
    act(() => onSelection(['1']))
    welcomeFlow.mockClear()
    chatFlow.mockClear()

    rerender(<Layout mode="re-act" />)

    expect(reset).not.toHaveBeenCalled()
    expect(welcomeFlow).not.toHaveBeenCalled()
    expect(chatFlow).not.toHaveBeenCalled()
    act(() => onSelection(['2']))
    expect(chatFlow).toHaveBeenCalledExactlyOnceWith(['2'])
    expect(welcomeFlow).not.toHaveBeenCalled()
  })

  it.each(['welcome', 're-act'])('%s 单条关闭仅取消该流量，旧输入框的删除事件不影响新会话', async (mode) => {
    if (mode === 're-act') agentStore.setState({ activeChat: { Id: 'chat-1', SessionID: 'session-1' } })
    render(<Layout />)
    if (mode === 'welcome') await screen.findByText('欢迎页')
    const reset = vi.fn()
    const deselectId = vi.fn()
    act(() => workspaceProps.onRegisterTableSelectApi({ reset, deselectId }))
    act(() => removeFlow('1', false))
    expect(deselectId).toHaveBeenCalledWith('1')
    expect(reset).not.toHaveBeenCalled()
    const oldRemove = removeFlow
    act(() => agentStore.setState({ activeChat: { Id: 'chat-2', SessionID: 'session-2' } }))
    const nextReset = vi.fn()
    const nextDeselect = vi.fn()
    act(() => workspaceProps.onRegisterTableSelectApi({ reset: nextReset, deselectId: nextDeselect }))
    act(() => {
      oldRemove('1', false)
      oldRemove('1,2,3', true)
    })
    expect(nextReset).not.toHaveBeenCalled()
    expect(nextDeselect).not.toHaveBeenCalled()
    act(() => removeFlow('2', false))
    expect(nextDeselect).toHaveBeenCalledWith('2')
  })
  it('页面可见时勾选同步到当前会话，收起自由对话不清理，旧会话通知不污染新输入', async () => {
    const { rerender } = render(<Layout />)
    await screen.findByText('欢迎页')
    const welcomeSelection = workspaceProps.onSetSelectedHttpFlowIds
    act(() => welcomeSelection(['1']))
    expect(welcomeFlow).toHaveBeenLastCalledWith(['1'])
    expect(chatFlow).not.toHaveBeenCalled()
    act(() => agentStore.setState({ activeChat: { Id: 'chat-1', SessionID: 'session-1' } }))
    chatFlow.mockClear()
    act(() => welcomeSelection(['late-welcome']))
    expect(chatFlow).not.toHaveBeenCalled()
    const sessionSelection = workspaceProps.onSetSelectedHttpFlowIds
    act(() => sessionSelection(['2']))
    expect(chatFlow).toHaveBeenLastCalledWith(['2'])
    chatFlow.mockClear()
    const reset = vi.fn()
    act(() => workspaceProps.onRegisterTableSelectApi({ reset, deselectId: vi.fn() }))
    fireEvent.click(screen.getByText('切换自由对话'))
    expect(chatFlow).not.toHaveBeenCalled()
    expect(reset).not.toHaveBeenCalled()
    act(() => workspaceProps.onSetSelectedHttpFlowIds(['collapsed']))
    expect(chatFlow).toHaveBeenLastCalledWith(['collapsed'])
    chatFlow.mockClear()
    fireEvent.click(screen.getByText('切换自由对话'))
    expect(chatFlow).not.toHaveBeenCalled()
    expect(reset).not.toHaveBeenCalled()
    viewport.visible = false
    rerender(<Layout />)
    chatFlow.mockClear()
    act(() => workspaceProps.onSetSelectedHttpFlowIds(['hidden-page']))
    expect(chatFlow).not.toHaveBeenCalled()
    viewport.visible = true
    rerender(<Layout />)
    act(() => agentStore.setState({ activeChat: { Id: 'chat-2', SessionID: 'session-2' } }))
    chatFlow.mockClear()
    act(() => sessionSelection(['late-session']))
    expect(chatFlow).not.toHaveBeenCalled()
    act(() => workspaceProps.onSetSelectedHttpFlowIds(['3']))
    expect(chatFlow).toHaveBeenLastCalledWith(['3'])
  })

  it('删除/提交重置关联表格，欢迎页提交仍携带已提取流量', async () => {
    render(<Layout />)
    await screen.findByText('欢迎页')
    const reset = vi.fn()
    act(() => workspaceProps.onRegisterTableSelectApi({ reset, deselectId: vi.fn() }))
    fireEvent.click(screen.getByText('删除引用'))
    expect(reset).toHaveBeenCalledTimes(1)
    // 清空后会更换选择作用域，模拟工作区重新注册当前表格。
    act(() => workspaceProps.onRegisterTableSelectApi({ reset, deselectId: vi.fn() }))
    fireEvent.click(screen.getByText('发送欢迎消息'))
    expect(reset).toHaveBeenCalledTimes(2)
    expect(submit).toHaveBeenCalledWith({ httpFlowList: [{ flowIds: ['1', '2'] }] })
    act(() => agentStore.setState({ activeChat: { Id: 'chat-1', SessionID: 'session-1' } }))
    const sessionReset = vi.fn()
    act(() => workspaceProps.onRegisterTableSelectApi({ reset: sessionReset, deselectId: vi.fn() }))
    fireEvent.click(screen.getByText('发送会话消息'))
    expect(sessionReset).toHaveBeenCalledOnce()
    expect(reset).toHaveBeenCalledTimes(2)
  })
  it.each(['welcome', 're-act'])('%s 大屏切走再切回保留尺寸和会话列表实例', async (mode) => {
    if (mode === 're-act') {
      agentStore.setState({ activeChat: { Id: 'chat-1', SessionID: 'session-1' } })
    }
    const page = (hidden: boolean) => (
      <div hidden={hidden}>
        <Layout />
      </div>
    )
    const { container, rerender } = render(page(false))
    if (mode === 'welcome') await screen.findByText('欢迎页')
    fireEvent.click(screen.getByLabelText('AIRightPanel.sessionHistory'))
    const panel = container.querySelector('[data-ai-right-panel]')
    const frame = panel?.parentElement
    const frameStyle = frame?.getAttribute('style')
    const history = screen.getByTestId('history-list')
    history.scrollTop = 120
    expect(panel).toHaveAttribute('data-ai-right-panel-small', 'false')

    rerender(page(true))
    act(() => observers.forEach((notify) => notify()))
    expect(panel).toHaveAttribute('data-ai-right-panel-small', 'false')
    expect(frame?.getAttribute('style')).toBe(frameStyle)
    expect(screen.getByTestId('history-list')).toBe(history)

    rerender(page(false))
    // 恢复可见、尺寸通知到达前也应保留大屏布局。
    expect(panel).toHaveAttribute('data-ai-right-panel-small', 'false')
    expect(frame?.getAttribute('style')).toBe(frameStyle)
    act(() => observers.forEach((notify) => notify()))
    expect(panel).toHaveAttribute('data-ai-right-panel-small', 'false')
    expect(screen.getByTestId('history-list')).toBe(history)
    expect(history.scrollTop).toBe(120)

    // 恢复后真实缩窄仍应触发小屏模式。
    layoutWidth = 900
    act(() => observers.forEach((notify) => notify()))
    expect(panel).toHaveAttribute('data-ai-right-panel-small', 'true')
  })

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
