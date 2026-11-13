import { useRef } from 'react'
import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { AIChatContentProps, AIChatContentRefProps } from '../../../aiChatContent/type'
import { AIAgentChatLayout } from '../AIAgentChatLayout'
import type { AIAgentChatMode } from '../../type'
import type { RiskSelectionProps } from '../../../aiChatContent/AIChatWorkspace/AIChatWorkspaceTabs/AIChatWorkspaceTabContent'

let removeFlow: (id: string, isSummary: boolean) => void

const agentStore = createStore<{ activeChat?: { Id: string; SessionID: string } }>(() => ({}))
const taskStore = createStore(() => ({
  currentChatStatus: { questionID: 'task-1' },
  currentPlan: { task_tree: [] },
  chatElements: [],
  tasks: {},
  taskDetailsUpdate: 0,
}))
const taskContents = new Map()
const taskDetailsMap = new Map([['task-1', { uuid: 'snapshot-1', execution: { http_flow_count: 7 } }]])
let workspaceProps: {
  selectedHttpFlowIds: string[]
  onSetSelectedHttpFlowIds: (ids: string[]) => void
  riskSelection: RiskSelectionProps
}
const { submit } = vi.hoisted(() => ({ submit: vi.fn() }))
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
  useCurrentRawData: () => ({ taskDetailsMap, contents: taskContents }),
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
// 布局测试保留真实右侧面板，隔离网络请求和模型用量组件的 Electron 依赖。
vi.mock('@/services/fetch', () => ({ NetWorkApi: vi.fn(async () => undefined) }))
vi.mock('@/pages/ai-agent/aiChatContent/AIContextToken/AIMainModelTokens', () => ({ default: () => null }))
vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn(), failed: vi.fn() }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: vi.fn() } }))
vi.mock('@/pages/ai-agent/components/ExportAILogsModal/ExportAILogsModal', () => ({ ExportAILogsModal: () => null }))
vi.mock('@/pages/ai-agent/chatTemplate/historyTaskTree/TaskListPane', () => ({ TaskListPane: () => null }))
vi.mock('@/pages/ai-agent/chatTemplate/historyTaskTree/useHasTaskTree', () => ({
  useHasTaskTree: () => false,
  useCasualConcurrentTaskList: () => [],
}))
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
  YakitResizeBox: ({ firstNode, secondNode }: { firstNode: ReactNode; secondNode: ReactNode }) => (
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
  default: (props: {
    onHttpFlowRemove: (id: string, isSummary: boolean) => void
    onTriageSubmit: (data: object) => void
    selectedHttpFlowIds: string[]
    selectedRiskIds: string[]
  }) => {
    removeFlow = props.onHttpFlowRemove
    return (
      <div>
        欢迎页
        <output data-testid="selected-flows">{props.selectedHttpFlowIds.join(',')}</output>
        <output data-testid="selected-risks">{props.selectedRiskIds.join(',')}</output>
        <button onClick={() => props.onHttpFlowRemove('1,2,3', true)}>删除引用</button>
        <button onClick={() => props.onTriageSubmit({ resourceReferences: [{ type: 'http', ids: ['1', '2'] }] })}>
          发送欢迎消息
        </button>
      </div>
    )
  },
}))
vi.mock('../../../aiChatContent/AIChatContent', () => ({
  AIChatContent: (props: AIChatContentProps) => {
    removeFlow = props.onHttpFlowRemove!
    return (
      <div ref={props.rightPanelLayoutRef} data-testid="chat-content">
        <output data-testid="selected-flows">{props.selectedHttpFlowIds?.join(',')}</output>
        <output data-testid="selected-risks">{props.selectedRiskIds?.join(',')}</output>
        <button onClick={() => props.setShowFreeChat?.(!props.showFreeChat)}>切换自由对话</button>
        <button onClick={props.onAfterSubmit}>发送会话消息</button>
      </div>
    )
  },
}))
vi.mock('@/pages/ai-agent/historyChat/HistoryChat', () => ({
  default: () => <div data-testid="history-list" />,
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
  submit.mockReturnValue(true)
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
  it('欢迎页提交被拒绝时保留流量和风险选择，重试成功后清理', async () => {
    submit.mockReturnValueOnce(false)
    render(<Layout />)
    await screen.findByText('欢迎页')
    act(() => {
      workspaceProps.onSetSelectedHttpFlowIds(['1', '2'])
      workspaceProps.riskSelection.onChange(
        [{ Id: 21, Hash: 'hash-21', Title: '风险 A', IP: '', RiskType: '', CreatedAt: 0 }],
        true,
      )
    })

    fireEvent.click(screen.getByText('发送欢迎消息'))

    expect(submit).toHaveBeenCalledOnce()
    expect(screen.getByTestId('selected-flows')).toHaveTextContent('1,2')
    expect(screen.getByTestId('selected-risks')).toHaveTextContent('21')
    expect(workspaceProps.selectedHttpFlowIds).toEqual(['1', '2'])
    expect(workspaceProps.riskSelection.ids).toEqual(['21'])

    fireEvent.click(screen.getByText('发送欢迎消息'))

    expect(submit).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('selected-flows')).toBeEmptyDOMElement()
    expect(screen.getByTestId('selected-risks')).toBeEmptyDOMElement()
    expect(workspaceProps.selectedHttpFlowIds).toEqual([])
    expect(workspaceProps.riskSelection.ids).toEqual([])
  })

  it('风险选择同步到当前输入框，取消、提交和切换会话后保持一致', async () => {
    render(<Layout />)
    await screen.findByText('欢迎页')
    const first = { Id: 21, Hash: 'hash-21', Title: '风险 A', IP: '', RiskType: '', CreatedAt: 0 }
    const second = { ...first, Id: 22, Title: '风险 B' }
    const welcomeChange = workspaceProps.riskSelection.onChange
    act(() => welcomeChange([first, second], true))
    expect(workspaceProps.riskSelection.ids).toEqual(['21', '22'])
    expect(screen.getByTestId('selected-risks')).toHaveTextContent('21,22')
    act(() => welcomeChange([first], false))
    expect(workspaceProps.riskSelection.ids).toEqual(['22'])
    expect(screen.getByTestId('selected-risks')).toHaveTextContent('22')
    fireEvent.click(screen.getByText('发送欢迎消息'))
    expect(workspaceProps.riskSelection.ids).toEqual([])

    act(() => agentStore.setState({ activeChat: { Id: 'chat-1', SessionID: 'session-1' } }))
    act(() => welcomeChange([second], true))
    expect(screen.getByTestId('selected-risks')).toBeEmptyDOMElement()
    act(() => workspaceProps.riskSelection.onChange([first], true))
    expect(screen.getByTestId('selected-risks')).toHaveTextContent('21')
    fireEvent.click(screen.getByText('发送会话消息'))
    expect(workspaceProps.riskSelection.ids).toEqual([])
  })

  it.each([undefined, 'session-1'])('同一会话仅切换展示模式不清理勾选（SessionID：%s）', async (sessionId) => {
    if (sessionId) agentStore.setState({ activeChat: { Id: 'chat-1', SessionID: sessionId } })
    const { rerender } = render(<Layout mode="welcome" />)
    await screen.findByText('欢迎页')
    const onSelection = workspaceProps.onSetSelectedHttpFlowIds
    act(() => onSelection(['1']))

    rerender(<Layout mode="re-act" />)

    expect(screen.getByTestId('selected-flows')).toHaveTextContent('1')
    act(() => onSelection(['2']))
    expect(screen.getByTestId('selected-flows')).toHaveTextContent('2')
  })

  it.each(['welcome', 're-act'])('%s 单条关闭仅取消该流量，旧输入框的删除事件不影响新会话', async (mode) => {
    if (mode === 're-act') agentStore.setState({ activeChat: { Id: 'chat-1', SessionID: 'session-1' } })
    render(<Layout />)
    if (mode === 'welcome') await screen.findByText('欢迎页')
    act(() => workspaceProps.onSetSelectedHttpFlowIds(['1', '2']))
    act(() => removeFlow('1', false))
    expect(workspaceProps.selectedHttpFlowIds).toEqual(['2'])
    const oldRemove = removeFlow
    act(() => agentStore.setState({ activeChat: { Id: 'chat-2', SessionID: 'session-2' } }))
    act(() => workspaceProps.onSetSelectedHttpFlowIds(['1', '2']))
    act(() => {
      oldRemove('1', false)
      oldRemove('1,2,3', true)
    })
    expect(workspaceProps.selectedHttpFlowIds).toEqual(['1', '2'])
    act(() => removeFlow('2', false))
    expect(workspaceProps.selectedHttpFlowIds).toEqual(['1'])
  })
  it('页面可见时勾选同步到当前会话，收起自由对话不清理，旧会话通知不污染新输入', async () => {
    const { rerender } = render(<Layout />)
    await screen.findByText('欢迎页')
    const welcomeSelection = workspaceProps.onSetSelectedHttpFlowIds
    act(() => welcomeSelection(['1']))
    expect(screen.getByTestId('selected-flows')).toHaveTextContent('1')
    act(() => agentStore.setState({ activeChat: { Id: 'chat-1', SessionID: 'session-1' } }))
    act(() => welcomeSelection(['late-welcome']))
    expect(screen.getByTestId('selected-flows')).toBeEmptyDOMElement()
    const sessionSelection = workspaceProps.onSetSelectedHttpFlowIds
    act(() => sessionSelection(['2']))
    expect(screen.getByTestId('selected-flows')).toHaveTextContent('2')
    fireEvent.click(screen.getByText('切换自由对话'))
    expect(workspaceProps.selectedHttpFlowIds).toEqual(['2'])
    act(() => workspaceProps.onSetSelectedHttpFlowIds(['collapsed']))
    fireEvent.click(screen.getByText('切换自由对话'))
    expect(screen.getByTestId('selected-flows')).toHaveTextContent('collapsed')
    viewport.visible = false
    rerender(<Layout />)
    act(() => workspaceProps.onSetSelectedHttpFlowIds(['hidden-page']))
    expect(workspaceProps.selectedHttpFlowIds).toEqual(['collapsed'])
    viewport.visible = true
    rerender(<Layout />)
    act(() => agentStore.setState({ activeChat: { Id: 'chat-2', SessionID: 'session-2' } }))
    act(() => sessionSelection(['late-session']))
    expect(screen.getByTestId('selected-flows')).toBeEmptyDOMElement()
    act(() => workspaceProps.onSetSelectedHttpFlowIds(['3']))
    expect(screen.getByTestId('selected-flows')).toHaveTextContent('3')
  })

  it('删除/提交重置关联表格，欢迎页提交仍携带已提取流量', async () => {
    render(<Layout />)
    await screen.findByText('欢迎页')
    act(() => workspaceProps.onSetSelectedHttpFlowIds(['1', '2']))
    fireEvent.click(screen.getByText('删除引用'))
    expect(workspaceProps.selectedHttpFlowIds).toEqual([])
    act(() => workspaceProps.onSetSelectedHttpFlowIds(['1', '2']))
    fireEvent.click(screen.getByText('发送欢迎消息'))
    expect(workspaceProps.selectedHttpFlowIds).toEqual([])
    expect(submit).toHaveBeenCalledWith({ resourceReferences: [{ type: 'http', ids: ['1', '2'] }] })
    act(() => agentStore.setState({ activeChat: { Id: 'chat-1', SessionID: 'session-1' } }))
    act(() => workspaceProps.onSetSelectedHttpFlowIds(['3']))
    fireEvent.click(screen.getByText('发送会话消息'))
    expect(workspaceProps.selectedHttpFlowIds).toEqual([])
  })
  it.each(['welcome', 're-act'])('%s 大屏切走再切回保留浮层尺寸', async (mode) => {
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
    const panel = container.querySelector('[data-ai-right-panel]')
    const frame = panel?.parentElement
    const frameStyle = frame?.getAttribute('style')
    expect(panel).toHaveAttribute('data-ai-right-panel-small', 'false')

    rerender(page(true))
    act(() => observers.forEach((notify) => notify()))
    expect(panel).toHaveAttribute('data-ai-right-panel-small', 'false')
    expect(frame?.getAttribute('style')).toBe(frameStyle)

    rerender(page(false))
    // 恢复可见、尺寸通知到达前也应保留大屏布局。
    expect(panel).toHaveAttribute('data-ai-right-panel-small', 'false')
    expect(frame?.getAttribute('style')).toBe(frameStyle)
    act(() => observers.forEach((notify) => notify()))
    expect(panel).toHaveAttribute('data-ai-right-panel-small', 'false')
    expect(frame?.getAttribute('style')).toBe(frameStyle)

    // 恢复后真实缩窄仍应触发小屏模式。
    layoutWidth = 900
    act(() => observers.forEach((notify) => notify()))
    expect(panel).toHaveAttribute('data-ai-right-panel-small', 'true')
  })

  it('会话模式浮层随聊天容器定位，切换自由对话隐藏浮层', async () => {
    agentStore.setState({ activeChat: { Id: 'chat-1', SessionID: 'session-1' } })
    const { container } = render(<Layout />)
    await screen.findByTestId('chat-content')
    const panel = container.querySelector('[data-ai-right-panel]')
    await waitFor(() =>
      expect(panel?.parentElement).toHaveStyle({ left: '12px', top: '120px', width: '1384px', height: '668px' }),
    )
    chatTop = 200
    act(() => observers.forEach((notify) => notify()))
    await waitFor(() => expect(panel?.parentElement).toHaveStyle({ top: '200px', height: '588px' }))

    fireEvent.click(screen.getByText('切换自由对话'))
    expect(panel?.parentElement).toHaveAttribute('hidden')
    fireEvent.click(screen.getByText('切换自由对话'))
    expect(panel?.parentElement).not.toHaveAttribute('hidden')

    // 回到首页时关闭会话模式遗留的任务列表浮层
    fireEvent.click(screen.getByLabelText('AIRightPanel.taskList'))
    expect(container.querySelector('[data-ai-right-panel] section')).not.toBeNull()
    act(() => {
      agentStore.setState({ activeChat: undefined })
    })
    await screen.findByText('欢迎页')
    expect(container.querySelector('[data-ai-right-panel] section')).toBeNull()
  })

  it('按页面挂载数据源，回到欢迎页后取消任务订阅和待刷新', async () => {
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
    // 欢迎态右侧面板不再渲染流量入口（已迁到 WelcomeTipsCards），也不订阅任务快照
    expect(screen.queryByLabelText('AIRightPanel.traffic')).not.toBeInTheDocument()
    vi.useFakeTimers()
    act(() => vi.advanceTimersByTime(3000))
    expect(subscriptions).toBe(0)
    expect(readTask).not.toHaveBeenCalled()

    // HistoryChat 不再由右侧面板渲染，直接经 agentStore 切换到会话模式验证数据源订阅
    await act(async () => {
      agentStore.setState({ activeChat: { Id: 'chat-1', SessionID: 'session-1' } })
    })
    expect(subscriptions).toBeGreaterThan(0)
    expect(readTask).toHaveBeenCalled()
    expect(screen.getByLabelText('AIRightPanel.traffic')).toHaveTextContent('7')
    const chatReads = readTask.mock.calls.length
    act(() => vi.advanceTimersByTime(3000))
    expect(readTask.mock.calls.length).toBe(chatReads)
    act(() => taskStore.setState((state) => ({ ...state, taskDetailsUpdate: (state.taskDetailsUpdate ?? 0) + 1 })))
    act(() => vi.advanceTimersByTime(3000))
    expect(readTask.mock.calls.length).toBeGreaterThan(chatReads)

    await act(async () => agentStore.setState({ activeChat: undefined }))
    expect(subscriptions).toBe(0)
    expect(screen.queryByLabelText('AIRightPanel.traffic')).not.toBeInTheDocument()
    const welcomeReads = readTask.mock.calls.length
    act(() => taskStore.setState((state) => ({ ...state, taskDetailsUpdate: (state.taskDetailsUpdate ?? 0) + 1 })))
    act(() => vi.advanceTimersByTime(3000))
    expect(readTask.mock.calls.length).toBe(welcomeReads)
  })
})
