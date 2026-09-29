import { beforeEach, describe, expect, it, vi } from 'vitest'
// 先注册 electron stub：AIRightPanel → @/store 依赖链会顶层 window.require('electron')（imControl）
import '@/pages/ai-re-act/hooks/__test__/setupElectron'
// 依赖链经 AI 组件会拉到 lottie-web / xterm，模块加载期探测 canvas，jsdom 不支持
vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn(), destroy: vi.fn() } }))
vi.mock('@xterm/xterm', () => ({ Terminal: vi.fn() }))
import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createStore } from 'zustand/vanilla'
import { AIRightPanel } from '@/pages/ai-re-act/aiRightPanel/AIRightPanel'
import emiter from '@/utils/eventBus/eventBus'
import { AITabs, AITabsEnum } from '../../../defaultConstant'
import type * as AIChatWorkspaceModule from '../AIChatWorkspace'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
import type { PluginExecuteWebsiteTreeProps } from '@/pages/plugins/operator/pluginExecuteResult/PluginExecuteResultType'
import { useHttpFlowSelection } from '@/components/useHttpFlowSelection'
const flowCallbacks: PluginExecuteWebsiteTreeProps[] = []

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

const { AIChatWorkspace } = await compileReactModule<typeof AIChatWorkspaceModule>(
  import.meta.url,
  '../AIChatWorkspace.tsx',
)

vi.mock('../AIChatWorkspace.module.scss', () => ({
  default: {
    'workspace-tab-close': 'workspace-tab-close',
    'workspace-tab-bar': 'workspace-tab-bar',
    'workspace-tab': 'workspace-tab',
    'workspace-tab-active': 'workspace-tab-active',
  },
}))

vi.mock('@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu', () => ({
  YakitDropdownMenu: ({
    menu,
    children,
  }: {
    menu: {
      data?: Array<{ key?: string; label?: React.ReactNode; disabled?: boolean; type?: string }>
      onClick?: (info: { key: string; domEvent: React.MouseEvent }) => void
    }
    children?: React.ReactNode
  }) => {
    const [open, setOpen] = React.useState(false)
    return (
      <div
        data-testid="workspace-tab-dropdown"
        onContextMenu={(event) => {
          event.preventDefault()
          setOpen(true)
        }}
      >
        {children}
        {open ? (
          <div role="menu" data-testid="workspace-tab-context-menu">
            {(menu.data || []).map((item) =>
              item.type === 'divider' || !item.key ? null : (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  disabled={!!item.disabled}
                  data-menu-key={item.key}
                  onClick={(event) => {
                    menu.onClick?.({ key: item.key!, domEvent: event })
                    setOpen(false)
                  }}
                >
                  {item.label}
                </button>
              ),
            )}
          </div>
        ) : null}
      </div>
    )
  },
}))

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
  PluginExecuteHttpFlow: (props: PluginExecuteWebsiteTreeProps) => {
    flowCallbacks.push(props)
    const { runtimeId, pageType } = props
    return (
      <div data-testid="http-flows" data-page-type={pageType}>
        {runtimeId}
      </div>
    )
  },
  VulnerabilitiesRisksTable: ({ runTimeIDs }: { runTimeIDs: string[] }) => (
    <div data-testid="risks">{runTimeIDs.join(',')}</div>
  ),
}))
vi.mock('@/pages/ai-agent/components/aiFileSystemList/FilePreview/FilePreview', () => ({
  default: ({ data }: { data: { name: string; path: string } }) => <div data-testid="file-preview">{data.path}</div>,
}))
vi.mock('@/pages/ai-agent/components/aiFileSystemList/OperationLog/OperationLog', () => ({ default: () => null }))
vi.mock('@/pages/ai-agent/chatTemplate/historyTaskTree/TaskListPane', () => ({ TaskListPane: () => null }))
vi.mock('@/pages/ai-agent/chatTemplate/TimelineCard/TimelineCard', () => ({ default: () => null }))
vi.mock('@/pages/ai-agent/historyChat/HistoryChat', () => ({ default: () => null }))
vi.mock('@/pages/ai-agent/components/ExportAILogsModal/ExportAILogsModal', () => ({
  ExportAILogsModal: () => null,
}))
vi.mock('@/pages/ai-agent/aiChatContent/AIContextToken/AIMainModelTokens', () => ({
  default: () => <div data-testid="main-model-tokens" />,
}))
vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [{ queryLoading: false, updateLoading: false, aiGlobalConfig: {} }, { onRefresh: vi.fn() }],
}))
vi.mock('@/pages/ai-agent/grpc', () => ({ grpcExportAILogs: vi.fn(), grpcQueryHTTPFlows: vi.fn() }))
vi.mock('@/pages/risks/YakitRiskTable/utils', () => ({ apiRiskFieldGroup: vi.fn() }))
vi.mock('@/hook/useAiChatLog/useAiChatLog.ts', () => ({ default: () => ({ onOpenLogWindow: vi.fn() }) }))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: () => <div>暂无数据</div> }))

beforeEach(() => {
  flowCallbacks.length = 0
  agentStore.setState({ activeChat: { SessionID: 'session-1', Title: '当前任务', RelatedRuntimeIDs: [] } })
  store.setState(initialState, true)
  rawData.httpRunTimeIDs = []
  rawData.riskRunTimeIDs = []
})

describe('AIChatWorkspace 菜单切换', () => {
  it('切换页面保留表格实例与勾选，返回后原表格仍能同步和取消勾选', () => {
    const syncSelectedHttpFlowIds = vi.fn()
    rawData.httpRunTimeIDs = ['runtime-1']
    let selection: ReturnType<typeof useHttpFlowSelection>
    function WorkspaceSelection({ visible }: { visible: boolean }) {
      selection = useHttpFlowSelection(visible, 'session-1', { syncSelectedHttpFlowIds })
      return (
        <div hidden={!visible}>
          <AIChatWorkspace setFilePreviewData={vi.fn()} {...selection} />
        </div>
      )
    }
    const { rerender } = render(<WorkspaceSelection visible />)
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP })))
    const tableNode = screen.getByTestId('http-flows')
    const table = flowCallbacks.at(-1)!
    const api = { reset: vi.fn(), deselectId: vi.fn() }
    act(() => {
      table.onRegisterTableSelectApi?.(api)
      table.onSetSelectedHttpFlowIds?.(['1'])
    })
    syncSelectedHttpFlowIds.mockClear()

    rerender(<WorkspaceSelection visible={false} />)
    expect(screen.getByTestId('http-flows')).toBe(tableNode)
    rerender(<WorkspaceSelection visible />)
    expect(screen.getByTestId('http-flows')).toBe(tableNode)
    expect(api.reset).not.toHaveBeenCalled()
    expect(syncSelectedHttpFlowIds).not.toHaveBeenCalled()
    act(() => table.onSetSelectedHttpFlowIds?.(['2']))
    expect(syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith(['2'])
    act(() => selection.onHttpFlowRemove('2', false))
    expect(api.deselectId).toHaveBeenCalledExactlyOnceWith('2')
  })

  it('清空选择保留表格实例并允许重新注册，旧回调不能恢复引用', () => {
    const syncSelectedHttpFlowIds = vi.fn()
    rawData.httpRunTimeIDs = ['runtime-1']
    let selection: ReturnType<typeof useHttpFlowSelection>
    function WorkspaceSelection() {
      selection = useHttpFlowSelection(true, 'session-1', { syncSelectedHttpFlowIds })
      return <AIChatWorkspace setFilePreviewData={vi.fn()} {...selection} />
    }
    render(<WorkspaceSelection />)
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP })))
    const tableNode = screen.getByTestId('http-flows')
    const previousTable = flowCallbacks.at(-1)!
    const previousApi = { reset: vi.fn(), deselectId: vi.fn() }
    act(() => {
      previousTable.onRegisterTableSelectApi?.(previousApi)
      previousTable.onSetSelectedHttpFlowIds?.(['1'])
    })
    syncSelectedHttpFlowIds.mockClear()
    act(() => selection.clearHttpFlowSelection())
    expect(screen.getByTestId('http-flows')).toBe(tableNode)
    expect(previousApi.reset).toHaveBeenCalledOnce()
    expect(syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith([])

    const currentTable = flowCallbacks.at(-1)!
    const currentApi = { reset: vi.fn(), deselectId: vi.fn() }
    act(() => currentTable.onRegisterTableSelectApi?.(currentApi))
    syncSelectedHttpFlowIds.mockClear()
    act(() => {
      previousTable.onRegisterTableSelectApi?.(previousApi)
      previousTable.onSetSelectedHttpFlowIds?.(['late'])
    })
    expect(syncSelectedHttpFlowIds).not.toHaveBeenCalled()
    act(() => currentTable.onSetSelectedHttpFlowIds?.(['2']))
    expect(syncSelectedHttpFlowIds).toHaveBeenCalledExactlyOnceWith(['2'])
    act(() => selection.onHttpFlowRemove('2', false))
    expect(currentApi.deselectId).toHaveBeenCalledExactlyOnceWith('2')
    expect(previousApi.deselectId).not.toHaveBeenCalled()
  })

  it('欢迎/会话流量透传勾选，关闭表格及切换筛选后拒绝旧通知与注册', () => {
    const selected = vi.fn()
    const register = vi.fn()
    rawData.httpRunTimeIDs = ['runtime-1']
    render(
      <AIChatWorkspace
        setFilePreviewData={vi.fn()}
        onSetSelectedHttpFlowIds={selected}
        onRegisterTableSelectApi={register}
      />,
    )
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP })))
    const aggregate = flowCallbacks.at(-1)!
    act(() => aggregate.onSetSelectedHttpFlowIds?.(['1']))
    expect(selected).toHaveBeenLastCalledWith(['1'])
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP, value: 'runtime-2' })))
    const filtered = flowCallbacks.at(-1)!
    selected.mockClear()
    register.mockClear()
    act(() => {
      aggregate.onSetSelectedHttpFlowIds?.(['late'])
      aggregate.onRegisterTableSelectApi?.({ reset: vi.fn(), deselectId: vi.fn() })
    })
    expect(selected).not.toHaveBeenCalled()
    expect(register).not.toHaveBeenCalled()
    act(() => filtered.onSetSelectedHttpFlowIds?.(['2']))
    expect(selected).toHaveBeenLastCalledWith(['2'])
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk })))
    expect(register).toHaveBeenLastCalledWith(undefined)
    selected.mockClear()
    act(() => filtered.onSetSelectedHttpFlowIds?.(['late-filter']))
    expect(selected).not.toHaveBeenCalled()
  })
  it.each([{ runtimeIds: [] }, { runtimeIds: ['stale-runtime'] }])(
    '欢迎页流量使用 History 模式、空 runtimeId 和空来源（$runtimeIds）',
    ({ runtimeIds }) => {
      agentStore.setState({ activeChat: undefined })
      rawData.httpRunTimeIDs = runtimeIds
      render(<AIChatWorkspace welcome setFilePreviewData={vi.fn()} />)
      act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP })))
      expect(flowCallbacks[flowCallbacks.length - 1].sourceType).toBe('')
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

  it('打开多个文件预览时各自独立页签，关闭其中一个不影响其余', () => {
    const onTabsChange = vi.fn()
    const setFilePreviewData = vi.fn()
    const { rerender, container } = render(
      <AIChatWorkspace setFilePreviewData={setFilePreviewData} onTabsChange={onTabsChange} />,
    )

    const fileA = {
      parent: null,
      name: 'a.ts',
      path: '/workspace/a.ts',
      isFolder: false,
      icon: 'ts',
      depth: 0,
      isLeaf: true,
    }
    const fileB = {
      parent: null,
      name: 'b.ts',
      path: '/workspace/b.ts',
      isFolder: false,
      icon: 'ts',
      depth: 0,
      isLeaf: true,
    }

    rerender(
      <AIChatWorkspace
        filePreviewData={fileA as never}
        setFilePreviewData={setFilePreviewData}
        onTabsChange={onTabsChange}
      />,
    )
    expect(screen.getByText('a.ts')).toBeInTheDocument()
    expect(screen.getByTestId('file-preview')).toHaveTextContent('/workspace/a.ts')
    expect(onTabsChange).toHaveBeenLastCalledWith(1)

    rerender(
      <AIChatWorkspace
        filePreviewData={fileB as never}
        setFilePreviewData={setFilePreviewData}
        onTabsChange={onTabsChange}
      />,
    )
    expect(screen.getByText('a.ts')).toBeInTheDocument()
    expect(screen.getByText('b.ts')).toBeInTheDocument()
    expect(screen.getByTestId('file-preview')).toHaveTextContent('/workspace/b.ts')
    expect(onTabsChange).toHaveBeenLastCalledWith(2)

    // 再次打开已存在文件应聚焦，不新增页签
    rerender(
      <AIChatWorkspace
        filePreviewData={{ ...fileA } as never}
        setFilePreviewData={setFilePreviewData}
        onTabsChange={onTabsChange}
      />,
    )
    expect(screen.getAllByText('a.ts')).toHaveLength(1)
    expect(screen.getByText('b.ts')).toBeInTheDocument()
    expect(screen.getByTestId('file-preview')).toHaveTextContent('/workspace/a.ts')
    expect(onTabsChange).toHaveBeenLastCalledWith(2)

    fireEvent.click(screen.getByText('b.ts'))
    expect(screen.getByTestId('file-preview')).toHaveTextContent('/workspace/b.ts')

    // 关闭当前（b）后，a 仍在
    const closeButtons = container.querySelectorAll('.workspace-tab-close')
    fireEvent.click(closeButtons[1]!)
    expect(screen.queryByText('b.ts')).not.toBeInTheDocument()
    expect(screen.getByText('a.ts')).toBeInTheDocument()
    expect(screen.getByTestId('file-preview')).toHaveTextContent('/workspace/a.ts')
    expect(onTabsChange).toHaveBeenLastCalledWith(1)
  })

  it('通过 switchAIActTab 打开文件预览可叠加多个页签', () => {
    const onTabsChange = vi.fn()
    function Harness() {
      const [filePreviewData, setFilePreviewData] = React.useState<undefined | { name: string; path: string }>()
      return (
        <AIChatWorkspace
          filePreviewData={filePreviewData as never}
          setFilePreviewData={setFilePreviewData as never}
          onTabsChange={onTabsChange}
        />
      )
    }
    render(<Harness />)

    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.File_Preview, value: '/tmp/one.js' })))
    expect(screen.getByText('one.js')).toBeInTheDocument()
    expect(screen.getByTestId('file-preview')).toHaveTextContent('/tmp/one.js')
    expect(onTabsChange).toHaveBeenLastCalledWith(1)

    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.File_Preview, value: '/tmp/two.js' })))
    expect(screen.getByText('one.js')).toBeInTheDocument()
    expect(screen.getByText('two.js')).toBeInTheDocument()
    expect(screen.getByTestId('file-preview')).toHaveTextContent('/tmp/two.js')
    expect(onTabsChange).toHaveBeenLastCalledWith(2)
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

describe('AIChatWorkspace 标签页右键菜单', () => {
  const openTabs = () => {
    const onTabsChange = vi.fn()
    render(
      <>
        <AIChatWorkspace setFilePreviewData={vi.fn()} onTabsChange={onTabsChange} />
      </>,
    )
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP })))
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk })))
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Operation_Log })))
    expect(onTabsChange).toHaveBeenLastCalledWith(3)
    expect(screen.getByText(AITabs.http.label)).toBeInTheDocument()
    expect(screen.getByText(AITabs.risk.label)).toBeInTheDocument()
    expect(screen.getByText(AITabs['operation-log'].label)).toBeInTheDocument()
    return onTabsChange
  }

  const openContextMenuOn = (label: string) => {
    const tab = screen.getByText(label).closest('[data-testid="workspace-tab-dropdown"]') as HTMLElement
    fireEvent.contextMenu(tab)
    return screen.getByTestId('workspace-tab-context-menu')
  }

  it('关闭：关闭当前标签并聚焦相邻标签', () => {
    const onTabsChange = openTabs()
    // 当前激活是最后一个（读写日志）
    openContextMenuOn(AITabs['operation-log'].label)
    fireEvent.click(screen.getByRole('menuitem', { name: 'AIChatWorkspace.close' }))
    expect(screen.queryByText(AITabs['operation-log'].label)).not.toBeInTheDocument()
    expect(screen.getByText(AITabs.http.label)).toBeInTheDocument()
    expect(screen.getByText(AITabs.risk.label)).toBeInTheDocument()
    expect(onTabsChange).toHaveBeenLastCalledWith(2)
    // 关闭后应聚焦前一个（漏洞）
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
  })

  it('关闭其他：仅保留被右键的标签', () => {
    const onTabsChange = openTabs()
    openContextMenuOn(AITabs.http.label)
    fireEvent.click(screen.getByRole('menuitem', { name: 'AIChatWorkspace.closeOthers' }))
    expect(screen.getByText(AITabs.http.label)).toBeInTheDocument()
    expect(screen.queryByText(AITabs.risk.label)).not.toBeInTheDocument()
    expect(screen.queryByText(AITabs['operation-log'].label)).not.toBeInTheDocument()
    expect(onTabsChange).toHaveBeenLastCalledWith(1)
  })

  it('关闭右侧标签页：按视觉顺序关闭右侧，无右侧时禁用', () => {
    const onTabsChange = openTabs()
    // 右键中间的风险标签，应关闭右侧读写日志
    openContextMenuOn(AITabs.risk.label)
    fireEvent.click(screen.getByRole('menuitem', { name: 'AIChatWorkspace.closeRight' }))
    expect(screen.getByText(AITabs.http.label)).toBeInTheDocument()
    expect(screen.getByText(AITabs.risk.label)).toBeInTheDocument()
    expect(screen.queryByText(AITabs['operation-log'].label)).not.toBeInTheDocument()
    expect(onTabsChange).toHaveBeenLastCalledWith(2)

    // 风险已是最右，关闭右侧应禁用
    openContextMenuOn(AITabs.risk.label)
    expect(screen.getByRole('menuitem', { name: 'AIChatWorkspace.closeRight' })).toBeDisabled()
  })

  it('关闭全部：清空所有标签', () => {
    const onTabsChange = openTabs()
    openContextMenuOn(AITabs.http.label)
    fireEvent.click(screen.getByRole('menuitem', { name: 'AIChatWorkspace.closeAll' }))
    expect(screen.queryByText(AITabs.http.label)).not.toBeInTheDocument()
    expect(screen.queryByText(AITabs.risk.label)).not.toBeInTheDocument()
    expect(screen.queryByText(AITabs['operation-log'].label)).not.toBeInTheDocument()
    expect(onTabsChange).toHaveBeenLastCalledWith(0)
  })

  it('多文件预览页签支持右键关闭其他', () => {
    const onTabsChange = vi.fn()
    const setFilePreviewData = vi.fn()
    const { rerender } = render(<AIChatWorkspace setFilePreviewData={setFilePreviewData} onTabsChange={onTabsChange} />)
    const fileA = {
      parent: null,
      name: 'a.ts',
      path: '/workspace/a.ts',
      isFolder: false,
      icon: 'ts',
      depth: 0,
      isLeaf: true,
    }
    const fileB = {
      parent: null,
      name: 'b.ts',
      path: '/workspace/b.ts',
      isFolder: false,
      icon: 'ts',
      depth: 0,
      isLeaf: true,
    }
    rerender(
      <AIChatWorkspace
        filePreviewData={fileA as never}
        setFilePreviewData={setFilePreviewData}
        onTabsChange={onTabsChange}
      />,
    )
    rerender(
      <AIChatWorkspace
        filePreviewData={fileB as never}
        setFilePreviewData={setFilePreviewData}
        onTabsChange={onTabsChange}
      />,
    )
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP })))
    expect(onTabsChange).toHaveBeenLastCalledWith(3)

    openContextMenuOn('a.ts')
    fireEvent.click(screen.getByRole('menuitem', { name: 'AIChatWorkspace.closeOthers' }))
    expect(screen.getByText('a.ts')).toBeInTheDocument()
    expect(screen.queryByText('b.ts')).not.toBeInTheDocument()
    expect(screen.queryByText(AITabs.http.label)).not.toBeInTheDocument()
    expect(screen.getByTestId('file-preview')).toHaveTextContent('/workspace/a.ts')
    expect(onTabsChange).toHaveBeenLastCalledWith(1)
  })
})

describe('AIChatWorkspace tabs horizontal scroll', () => {
  it('scrolls active tab into view and converts wheel deltaY to horizontal scroll', () => {
    const onTabsChange = vi.fn()
    render(<AIChatWorkspace setFilePreviewData={vi.fn()} onTabsChange={onTabsChange} />)
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP })))
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk })))
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Operation_Log })))

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ inline: 'nearest', block: 'nearest' })

    const tabBar = screen.getByTestId('workspace-tab-bar') as HTMLDivElement
    Object.defineProperty(tabBar, 'scrollWidth', { configurable: true, get: () => 800 })
    Object.defineProperty(tabBar, 'clientWidth', { configurable: true, get: () => 200 })
    let scrollLeft = 0
    Object.defineProperty(tabBar, 'scrollLeft', {
      configurable: true,
      get: () => scrollLeft,
      set: (v: number) => {
        scrollLeft = v
      },
    })

    const wheelEvent = new WheelEvent('wheel', { deltaY: 80, deltaX: 0, bubbles: true, cancelable: true })
    tabBar.dispatchEvent(wheelEvent)
    expect(scrollLeft).toBe(80)
  })

  it('scrolls only the newly active tab after manual wheel; tabs identity churn does not re-scroll', () => {
    const scrollTargets: Element[] = []
    Element.prototype.scrollIntoView = vi.fn(function (this: Element, ..._args: unknown[]) {
      scrollTargets.push(this)
    })

    const onTabsChange = vi.fn()
    render(<AIChatWorkspace setFilePreviewData={vi.fn()} onTabsChange={onTabsChange} />)
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.HTTP })))
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Risk })))
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Operation_Log })))

    const httpTab = screen.getByText(AITabs.http.label).closest('[data-tab-key]') as HTMLElement
    const logTab = screen.getByText(AITabs['operation-log'].label).closest('[data-tab-key]') as HTMLElement
    expect(httpTab).toBeTruthy()
    expect(logTab).toBeTruthy()

    // Simulate user wheeled tab bar to the start, then clear open-tab scrolls
    scrollTargets.length = 0
    ;(Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>).mockClear()

    // Re-open already-active last tab: parent recreates tabs array but activeKey stays —
    // must NOT re-scroll (would fight manual wheel / jump viewport back to last)
    act(() => emiter.emit('switchAIActTab', JSON.stringify({ key: AITabsEnum.Operation_Log })))
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()

    // Click first tab: selection changes; scrollIntoView must target first, not stale last
    fireEvent.click(httpTab)
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1)
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ inline: 'nearest', block: 'nearest' })
    expect(scrollTargets).toHaveLength(1)
    expect(scrollTargets[0]).toBe(httpTab)
    expect(scrollTargets[0]).not.toBe(logTab)
  })
})
