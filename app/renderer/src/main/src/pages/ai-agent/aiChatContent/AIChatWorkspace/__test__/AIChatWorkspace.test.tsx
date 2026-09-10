import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import { AIRightPanel } from '@/pages/ai-re-act/aiRightPanel/AIRightPanel'
import emiter from '@/utils/eventBus/eventBus'
import { AITabs, AITabsEnum } from '../../../defaultConstant'
import { AIChatWorkspace } from '../AIChatWorkspace'

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
const activeChat = { SessionID: 'session-1', Title: '当前任务', RelatedRuntimeIDs: [] as string[] }

vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => store,
  useCurrentRawData: () => rawData,
}))
vi.mock('@/pages/ai-agent/useContext/useStore', () => ({ default: () => ({ activeChat }) }))
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
  PluginExecuteHttpFlow: ({ runtimeId }: { runtimeId: string }) => <div data-testid="http-flows">{runtimeId}</div>,
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
vi.mock('@/hook/useAiChatLog/useAiChatLog.ts', () => ({ default: () => ({ onOpenLogWindow: vi.fn() }) }))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: () => <div>暂无数据</div> }))

beforeEach(() => {
  store.setState(initialState, true)
  rawData.httpRunTimeIDs = []
  rawData.riskRunTimeIDs = []
})

describe('AIChatWorkspace 菜单切换', () => {
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

  it('无数据时不自动打开，首次流量和漏洞数据到达时仍自动打开对应 tab', () => {
    const onTabsChange = vi.fn()
    render(<AIChatWorkspace setFilePreviewData={vi.fn()} onTabsChange={onTabsChange} />)
    expect(onTabsChange).toHaveBeenLastCalledWith(0)

    act(() => {
      rawData.httpRunTimeIDs = ['http-runtime']
      store.setState({ httpTabShow: true, httpTabUpdate: 1 })
    })
    expect(screen.getByTestId('http-flows')).toHaveTextContent('http-runtime')
    expect(onTabsChange).toHaveBeenLastCalledWith(1)

    act(() => {
      rawData.riskRunTimeIDs = ['risk-runtime']
      store.setState({ riskTabShow: true, riskTabUpdate: 1 })
    })
    expect(screen.getByTestId('risks')).toHaveTextContent('risk-runtime')
    expect(onTabsChange).toHaveBeenLastCalledWith(2)
  })
})
