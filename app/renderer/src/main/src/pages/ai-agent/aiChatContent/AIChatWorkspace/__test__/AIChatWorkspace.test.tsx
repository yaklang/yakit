import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { AIRightPanel } from '@/pages/ai-re-act/aiRightPanel/AIRightPanel'
import emiter from '@/utils/eventBus/eventBus'
import { AITabs, AITabsEnum } from '../../../defaultConstant'
import type * as AIChatWorkspaceModule from '../AIChatWorkspace'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import type { PluginExecuteWebsiteTreeProps } from '@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResultType'

const { AIChatWorkspace } = await compileReactModule<typeof AIChatWorkspaceModule>(
  import.meta.url,
  '../AIChatWorkspace.tsx',
)

vi.mock('../AIChatWorkspace.module.scss', () => ({ default: { 'workspace-tab-close': 'workspace-tab-close' } }))

const store = createStore(() => ({
  currentChatStatus: { questionID: 'task-1' },
  execFileRecord: new Map(),
  httpTabShow: false,
  httpTabUpdate: 0,
  riskTabShow: false,
  riskTabUpdate: 0,
}))
const initialState = store.getState()
const rawData = { httpRunTimeIDs: [] as string[], riskRunTimeIDs: [] as string[] }
const agentStore = createStore<{
  activeChat?: { SessionID: string; Title: string; RelatedRuntimeIDs: string[] }
}>(() => ({}))

vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => store,
  useCurrentRawData: () => rawData,
}))
vi.mock('@/pages/ai-agent/useContext/useStore', async () => {
  const { useStore } = await import('zustand')
  return {
    default: function useMockAIAgentStore() {
      return useStore(agentStore)
    },
  }
})
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({ getSetting: () => ({ Source: 'ai' }) }),
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key }),
}))

// 保留真实菜单、任务入口 hook、事件总线和工作区，仅隔离内容页面及 IPC 依赖。
vi.mock('@/pages/ai-re-act/hooks/useCurrentTaskData/useCurrentTaskExecution', () => ({
  default: () => undefined,
}))
vi.mock('@/pages/ai-agent/chatTemplate/aiTaskExecutionDetails/AITaskExecutionDetails', () => ({
  AITaskExecutionDetails: ({ taskId }: { taskId: string }) => <div data-testid="task-detail">{taskId}</div>,
}))
vi.mock('@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResult', () => ({
  PluginExecuteHttpFlow: ({ runtimeId, pageType }: PluginExecuteWebsiteTreeProps) => (
    <div data-testid="http-flows" data-page-type={pageType}>
      {runtimeId}
    </div>
  ),
  VulnerabilitiesRisksTable: ({ runTimeIDs }: { runTimeIDs: string[] }) => (
    <div data-testid="risks">{runTimeIDs.join(',')}</div>
  ),
}))
vi.mock('@/pages/ai-agent/components/aiFileSystemList/FilePreview/FilePreview', () => ({ default: () => null }))
vi.mock('@/pages/ai-agent/components/aiFileSystemList/OperationLog/OperationLog', () => ({ default: () => null }))
vi.mock('@/pages/ai-agent/chatTemplate/historyTaskTree/TaskListPane', () => ({ TaskListPane: () => null }))
vi.mock('@/pages/ai-agent/chatTemplate/TimelineCard/TimelineCard', () => ({ default: () => null }))
vi.mock('@/pages/ai-agent/historyChat/HistoryChat', () => ({ default: () => null }))
vi.mock('@/pages/ai-agent/components/ExportAILogsModal/ExportAILogsModal', () => ({
  ExportAILogsModal: () => null,
}))
vi.mock('@/pages/ai-agent/grpc', () => ({ grpcExportAILogs: vi.fn() }))
vi.mock('@/pages/risks/YakitRiskTable/utils', () => ({ apiRiskFieldGroup: vi.fn() }))
vi.mock('@/hook/useAiChatLog/useAiChatLog.ts', () => ({ default: () => ({ onOpenLogWindow: vi.fn() }) }))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: () => <div>暂无数据</div> }))

beforeEach(() => {
  agentStore.setState({ activeChat: { SessionID: 'session-1', Title: '当前任务', RelatedRuntimeIDs: [] } })
  store.setState(initialState, true)
  rawData.httpRunTimeIDs = []
  rawData.riskRunTimeIDs = []
})

describe('AIChatWorkspace 菜单切换', () => {
  it.each([{ runtimeIds: [] }, { runtimeIds: ['stale-runtime'] }])(
    '欢迎页流量使用 History 模式和空 runtimeId（$runtimeIds）',
    ({ runtimeIds }) => {
      agentStore.setState({ activeChat: undefined })
      rawData.httpRunTimeIDs = runtimeIds
      render(<AIChatWorkspace welcome setFilePreviewData={vi.fn()} />)
      act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP })))
      expect(screen.getByTestId('http-flows')).toHaveAttribute('data-page-type', 'History')
      expect(screen.getByTestId('http-flows')).toBeEmptyDOMElement()
      expect(screen.queryByText('暂无数据')).not.toBeInTheDocument()
    },
  )

  it('未激活会话时，只有欢迎页允许展示全部流量', () => {
    agentStore.setState({ activeChat: undefined })
    const setFilePreviewData = vi.fn()
    const { rerender } = render(<AIChatWorkspace setFilePreviewData={setFilePreviewData} />)
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP })))
    expect(screen.queryByTestId('http-flows')).not.toBeInTheDocument()
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
    rerender(<AIChatWorkspace welcome setFilePreviewData={setFilePreviewData} />)
    expect(screen.getByTestId('http-flows')).toHaveAttribute('data-page-type', 'History')
    rerender(<AIChatWorkspace welcome={false} setFilePreviewData={setFilePreviewData} />)
    expect(screen.queryByTestId('http-flows')).not.toBeInTheDocument()
  })

  it.each([true, false])('从欢迎页选择会话后流量按会话展示，有 runtimeId：%s', (hasRuntimeIds) => {
    agentStore.setState({ activeChat: undefined })
    const setFilePreviewData = vi.fn()
    const { rerender } = render(<AIChatWorkspace welcome setFilePreviewData={setFilePreviewData} />)
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP })))
    expect(screen.getByTestId('http-flows')).toBeEmptyDOMElement()
    act(() => {
      rawData.httpRunTimeIDs = hasRuntimeIds ? ['http-runtime', 'shared-runtime'] : []
      agentStore.setState({
        activeChat: {
          SessionID: 'session-2',
          Title: '新会话',
          RelatedRuntimeIDs: hasRuntimeIds ? ['shared-runtime', 'related-runtime'] : [],
        },
      })
    })
    expect(screen.queryByTestId('http-flows')).not.toBeInTheDocument()
    // 会话已选中但欢迎页标识尚未更新时，也不能回退到全量查询。
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP })))
    if (hasRuntimeIds) {
      expect(screen.getByTestId('http-flows')).toHaveTextContent(/^http-runtime,shared-runtime,related-runtime$/)
      expect(screen.getByTestId('http-flows')).toHaveAttribute('data-page-type', 'Plugin')
    } else {
      expect(screen.queryByTestId('http-flows')).not.toBeInTheDocument()
      expect(screen.getByText('暂无数据')).toBeInTheDocument()
    }
    rerender(<AIChatWorkspace welcome={false} setFilePreviewData={setFilePreviewData} />)
    if (hasRuntimeIds) {
      expect(screen.getByTestId('http-flows')).toHaveTextContent(/^http-runtime,shared-runtime,related-runtime$/)
    } else {
      expect(screen.queryByTestId('http-flows')).not.toBeInTheDocument()
    }
  })

  it.each([{ runtimeIds: [] }, { runtimeIds: ['stale-runtime'] }])(
    '欢迎页未激活会话时查询全部漏洞（$runtimeIds）',
    ({ runtimeIds }) => {
      agentStore.setState({ activeChat: undefined })
      rawData.riskRunTimeIDs = runtimeIds
      render(<AIChatWorkspace welcome setFilePreviewData={vi.fn()} />)
      act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk })))
      expect(screen.getByTestId('risks')).toBeEmptyDOMElement()
      expect(screen.queryByText('暂无数据')).not.toBeInTheDocument()
    },
  )

  it('没有会话时仍按页面模式区分全量视图和空状态，模式切换立即更新内容', () => {
    agentStore.setState({ activeChat: undefined })
    const setFilePreviewData = vi.fn()
    const { rerender } = render(<AIChatWorkspace setFilePreviewData={setFilePreviewData} />)
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk })))
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
    expect(screen.queryByTestId('risks')).not.toBeInTheDocument()

    rerender(<AIChatWorkspace welcome setFilePreviewData={setFilePreviewData} />)
    expect(screen.getByTestId('risks')).toBeEmptyDOMElement()

    rerender(<AIChatWorkspace welcome={false} setFilePreviewData={setFilePreviewData} />)
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
    expect(screen.queryByTestId('risks')).not.toBeInTheDocument()
  })

  it.each([true, false])('已激活会话时即使 welcome=true 也按会话 ID 查询，有数据：%s', (hasRuntimeIds) => {
    if (hasRuntimeIds) {
      rawData.riskRunTimeIDs = ['risk-runtime', 'shared-runtime']
      agentStore.setState({
        activeChat: {
          SessionID: 'session-1',
          Title: '当前任务',
          RelatedRuntimeIDs: ['shared-runtime', 'related-runtime'],
        },
      })
    }
    render(<AIChatWorkspace welcome setFilePreviewData={vi.fn()} />)
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk })))
    if (hasRuntimeIds) {
      expect(screen.getByTestId('risks')).toHaveTextContent(/^risk-runtime,shared-runtime,related-runtime$/)
    } else {
      expect(screen.queryByTestId('risks')).not.toBeInTheDocument()
      expect(screen.getByText('暂无数据')).toBeInTheDocument()
    }
  })

  it.each([true, false])('欢迎页选中会话后清空旧页签，再次打开按会话展示，有数据：%s', (hasRuntimeIds) => {
    agentStore.setState({ activeChat: undefined })
    const setFilePreviewData = vi.fn()
    const { rerender } = render(<AIChatWorkspace welcome setFilePreviewData={setFilePreviewData} />)
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk })))
    expect(screen.getByTestId('risks')).toBeEmptyDOMElement()

    act(() => {
      rawData.riskRunTimeIDs = hasRuntimeIds ? ['session-runtime'] : []
      agentStore.setState({ activeChat: { SessionID: 'session-2', Title: '新会话', RelatedRuntimeIDs: [] } })
    })
    rerender(<AIChatWorkspace welcome={false} setFilePreviewData={setFilePreviewData} />)
    expect(screen.queryByText(AITabs.risk.label)).not.toBeInTheDocument()
    expect(screen.queryByTestId('risks')).not.toBeInTheDocument()

    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk })))
    if (hasRuntimeIds) {
      expect(screen.getByTestId('risks')).toHaveTextContent(/^session-runtime$/)
    } else {
      expect(screen.queryByTestId('risks')).not.toBeInTheDocument()
      expect(screen.getByText('暂无数据')).toBeInTheDocument()
    }
  })

  it.each([true, false])('small=%s：先打开任务详情，无数据时仍可点击流量、漏洞打开 tab', (small) => {
    const onTabsChange = vi.fn()
    render(
      <>
        <AIChatWorkspace setFilePreviewData={vi.fn()} onTabsChange={onTabsChange} />
        <AIRightPanel small={small} />
      </>,
    )
    expect(onTabsChange).toHaveBeenLastCalledWith(0)

    fireEvent.click(screen.getByLabelText('AIRightPanel.taskBoard'))
    expect(screen.getByTestId('task-detail')).toHaveTextContent('task-1')
    expect(onTabsChange).toHaveBeenLastCalledWith(1)

    fireEvent.click(screen.getByLabelText('AIRightPanel.traffic'))
    expect(screen.getByText(AITabs.http.label)).toBeInTheDocument()
    expect(screen.queryByTestId('task-detail')).not.toBeInTheDocument()
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
    expect(onTabsChange).toHaveBeenLastCalledWith(2)

    fireEvent.click(screen.getByLabelText('AIRightPanel.risk'))
    expect(screen.getByText(AITabs.risk.label)).toBeInTheDocument()
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
    expect(onTabsChange).toHaveBeenLastCalledWith(3)

    // 已有 tab 可以重复激活，原来的任务详情也仍可切回。
    fireEvent.click(screen.getByLabelText('AIRightPanel.traffic'))
    expect(screen.getAllByText(AITabs.http.label)).toHaveLength(1)
    expect(onTabsChange).toHaveBeenLastCalledWith(3)
    fireEvent.click(screen.getByText('当前任务'))
    expect(screen.getByTestId('task-detail')).toHaveTextContent('task-1')
  })

  it.each([
    { key: AITabsEnum.HTTP, testId: 'http-flows' },
    { key: AITabsEnum.Risk, testId: 'risks' },
  ])('显式指定 runtimeId 时可直接打开 $key tab', ({ key, testId }) => {
    render(<AIChatWorkspace setFilePreviewData={vi.fn()} />)
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key, value: 'runtime-1' })))
    expect(screen.getByTestId(testId)).toHaveTextContent('runtime-1')
  })

  it('流量和漏洞首次到达时不自动打开，手动打开后展示最新数据', () => {
    const onTabsChange = vi.fn()
    render(<AIChatWorkspace setFilePreviewData={vi.fn()} onTabsChange={onTabsChange} />)
    expect(onTabsChange).toHaveBeenLastCalledWith(0)

    act(() => {
      rawData.httpRunTimeIDs = ['http-runtime']
      store.setState({ httpTabShow: true, httpTabUpdate: 1 })
    })
    expect(screen.queryByText(AITabs.http.label)).not.toBeInTheDocument()
    expect(onTabsChange).toHaveBeenLastCalledWith(0)

    act(() => {
      rawData.riskRunTimeIDs = ['risk-runtime']
      store.setState({ riskTabShow: true, riskTabUpdate: 1 })
    })
    expect(screen.queryByText(AITabs.risk.label)).not.toBeInTheDocument()
    expect(onTabsChange).toHaveBeenLastCalledWith(0)

    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP })))
    expect(screen.getByTestId('http-flows')).toHaveTextContent('http-runtime')
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk })))
    expect(screen.getByTestId('risks')).toHaveTextContent('risk-runtime')
    expect(onTabsChange).toHaveBeenLastCalledWith(2)
  })

  it('数据到达时保持当前任务页签，切换会话后也不自动打开数据页签', () => {
    const onTabsChange = vi.fn()
    const setFilePreviewData = vi.fn()
    render(
      <>
        <AIChatWorkspace setFilePreviewData={setFilePreviewData} onTabsChange={onTabsChange} />
        <AIRightPanel small />
      </>,
    )
    fireEvent.click(screen.getByLabelText('AIRightPanel.taskBoard'))
    act(() => {
      rawData.httpRunTimeIDs = ['http-runtime']
      rawData.riskRunTimeIDs = ['risk-runtime']
      store.setState({ httpTabShow: true, riskTabShow: true, httpTabUpdate: 1, riskTabUpdate: 1 })
    })
    expect(screen.getByTestId('task-detail')).toHaveTextContent('task-1')
    expect(onTabsChange).toHaveBeenLastCalledWith(1)

    act(() => {
      agentStore.setState({ activeChat: { SessionID: 'session-2', Title: '当前任务', RelatedRuntimeIDs: [] } })
    })
    expect(onTabsChange).toHaveBeenLastCalledWith(0)
    expect(screen.queryByTestId('task-detail')).not.toBeInTheDocument()
    expect(screen.queryByText(AITabs.http.label)).not.toBeInTheDocument()
    expect(screen.queryByText(AITabs.risk.label)).not.toBeInTheDocument()
    expect(setFilePreviewData).toHaveBeenLastCalledWith(undefined)
  })

  it.each([
    { key: AITabsEnum.HTTP, testId: 'http-flows', ids: 'httpRunTimeIDs', update: 'httpTabUpdate', show: 'httpTabShow' },
    { key: AITabsEnum.Risk, testId: 'risks', ids: 'riskRunTimeIDs', update: 'riskTabUpdate', show: 'riskTabShow' },
  ] as const)('手动打开的 $key 持续刷新，关闭后新数据不会重新打开', ({ key, testId, ids, update, show }) => {
    const onTabsChange = vi.fn()
    const { container } = render(<AIChatWorkspace setFilePreviewData={vi.fn()} onTabsChange={onTabsChange} />)
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key })))
    expect(screen.getByText('暂无数据')).toBeInTheDocument()

    for (const count of [1, 2]) {
      act(() => {
        rawData[ids].push(`runtime-${count}`)
        store.setState({ [show]: true, [update]: count })
      })
      expect(screen.getByTestId(testId).textContent).toBe(rawData[ids].join(','))
      expect(onTabsChange).toHaveBeenLastCalledWith(1)
    }

    fireEvent.click(container.querySelector('.workspace-tab-close')!)
    act(() => {
      rawData[ids].push('runtime-3')
      store.setState({ [update]: 3 })
    })
    expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    expect(onTabsChange).toHaveBeenLastCalledWith(0)
  })
})
