import type React from 'react'
import { createContext, useContext } from 'react'
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
import { YakitRoute } from '@/enums/yakitRoute'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { grpcExportAILogs, grpcQueryHTTPFlows } from '@/pages/ai-agent/grpc'
import { failed, yakitNotify } from '@/utils/notification'
import type { ExportAILogsModal as ExportAILogsModalComponent } from '@/pages/ai-agent/components/ExportAILogsModal/ExportAILogsModal'
import { apiRiskFieldGroup } from '@/pages/risks/YakitRiskTable/utils'
import type * as AIRightPanelModule from '../AIRightPanel'

const viewportState = vi.hoisted(() => ({ visible: true }))
const ViewportContext = createContext<boolean | undefined>(undefined)
vi.mock('ahooks', async () => ({
  ...(await vi.importActual('ahooks')),
  useInViewport: () => [useContext(ViewportContext) ?? viewportState.visible],
}))

// CI 的根配置将样式模块替换为空对象；为这里验证的状态类提供稳定映射。
vi.mock('../AIRightPanel.module.scss', () => ({
  default: {
    'right-panel-hidden': 'right-panel-hidden',
    'pane-slot-small': 'pane-slot-small',
    'count-badge': 'count-badge',
    'menu-item-icon-small': 'menu-item-icon-small',
  },
}))

// 数据源 mock：用真实 zustand vanilla store 构造（订阅语义与产品一致），
// rawData.taskDetailsMap 由各用例按需覆写；改写状态用 mockTaskStore.setState 原生推送更新
import { createStore } from 'zustand/vanilla'
import type { StoreApi } from 'zustand/vanilla'

interface MockTaskStoreState {
  currentChatStatus: { questionID: string }
}
// 详情条目带 uuid：父级轮询比较 uuid 判断详情是否被流数据刷新（参照 AITaskExecutionDetails）
interface MockTaskDetails {
  uuid?: string
  execution?: Record<string, unknown>
}
const mockTaskDetailsMap = new Map<string, MockTaskDetails>()
const mockAgentStore = createStore<{ activeChat?: { Id: number; SessionID: string } }>(() => ({}))
const mockTaskStore: StoreApi<MockTaskStoreState> = createStore<MockTaskStoreState>(() => ({
  currentChatStatus: { questionID: '' },
}))
const setMockQuestionID = (questionID: string) => {
  mockTaskStore.setState((state) => ({ currentChatStatus: { ...state.currentChatStatus, questionID } }))
  casualTaskState.questionID = questionID
}
const resetMockStore = () => {
  mockTaskStore.setState({ currentChatStatus: { questionID: '' } })
  mockTaskDetailsMap.clear()
  casualTaskState.questionID = ''
}
vi.mock('../../hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => mockTaskStore,
  useCurrentRawData: () => ({
    taskDetailsMap: mockTaskDetailsMap,
    httpRunTimeIDs: [] as string[],
  }),
}))

// 隔离日志导出及首页统计查询的 IPC 依赖。
vi.mock('@/pages/ai-agent/grpc', () => ({
  grpcExportAILogs: vi.fn(() => Promise.resolve()),
  grpcQueryHTTPFlows: vi.fn(),
}))
vi.mock('@/pages/risks/YakitRiskTable/utils', () => ({
  apiRiskFieldGroup: vi.fn(),
}))
vi.mock('@/pages/ai-agent/useContext/useStore', async () => {
  const { useStore } = await import('zustand')
  return {
    default: function useMockAIAgentStore() {
      return useStore(mockAgentStore)
    },
  }
})

// 菜单点击交互依赖（vi.hoisted：vi.mock 工厂引用的变量需先于 mock 提升初始化）
const { mockEmit, casualTaskState, mockSyncCasualTaskTab, mockOpenLogWindow, mockExportModalState, dispatcherState } =
  vi.hoisted(() => ({
    mockEmit: vi.fn(),
    casualTaskState: { questionID: '' },
    mockSyncCasualTaskTab: vi.fn(),
    mockOpenLogWindow: vi.fn(),
    mockExportModalState: { lastVisible: undefined as boolean | undefined },
    // getSetting 返回的可控配置，「任务详情」入口按 Source 决定是否渲染
    dispatcherState: { setting: { Source: 'ai' } as { Source: string } },
  }))
vi.mock('@/utils/eventBus/eventBus', () => ({ default: { emit: mockEmit, on: vi.fn(), off: vi.fn() } }))

// useCasualTaskTab / useAiChatLog / useDispatcher 的模块链含 electron IPC，统一 mock
vi.mock('@/pages/ai-agent/aiChatContent/hooks/useCasualTaskTab', () => ({
  useCasualTaskTab: () => ({
    currentChatStatusQuestionID: casualTaskState.questionID,
    syncCasualTaskTab: mockSyncCasualTaskTab,
  }),
}))
vi.mock('@/hook/useAiChatLog/useAiChatLog.ts', () => ({
  default: () => ({ onOpenLogWindow: mockOpenLogWindow }),
}))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({
  default: () => ({ getSetting: () => dispatcherState.setting }),
}))

vi.mock('@/pages/ai-agent/components/ExportAILogsModal/ExportAILogsModal', () => ({
  ExportAILogsModal: ({ visible, loading, onOk }: React.ComponentProps<typeof ExportAILogsModalComponent>) => {
    mockExportModalState.lastVisible = visible
    return visible ? (
      <button disabled={loading} onClick={() => onOk({ types: ['timeline'], outputPath: '/logs' })}>
        确认导出
      </button>
    ) : null
  },
}))

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn(), failed: vi.fn() }))

vi.mock('@/utils/timeUtil', () => ({
  timeDiffWithMoment: vi.fn((startedAt: number, endedAt: number) => `${endedAt - startedAt}s`),
}))

// 资源表必须定义在工厂内部：i18n.init 的预加载在 import 阶段就会触发 read
vi.mock('i18next-resources-to-backend', () => {
  const resources: Record<string, Record<string, unknown>> = {
    zh: {
      aiAgent: {
        AIRightPanel: {
          taskBoard: '任务详情看板',
          fileSystem: '文件系统',
          traffic: '流量',
          risk: '漏洞',
          sessionHistory: '会话历史',
          taskList: '任务列表',
          timeline: '时间线',
          aiSettings: 'AI 设置',
          exportLog: '导出日志',
          viewLog: '查看日志',
          collapse: '折叠',
          more: '更多',
          duration: '执行时长',
          toolCallStats: '工具调用统计',
          success: '成功',
          failed: '失败',
          totalAttempts: '总尝试次数',
          running: '执行中',
        },
      },
    },
  }
  return {
    default: () => ({
      type: 'backend' as const,
      init() {},
      read(language: string, namespace: string, callback: (err: unknown, data: unknown) => void) {
        const data = resources[language]?.[namespace]
        callback(null, data !== undefined ? data : {})
      },
    }),
  }
})

import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'
const { AIRightPanel } = await compileReactModule<typeof AIRightPanelModule>(import.meta.url, '../AIRightPanel.tsx')
import { AIRightPanelPane } from '../AIRightPanelPane'
import type { AIRightPanelProps } from '../type'

vi.mock('@/pages/ai-agent/chatTemplate/historyTaskTree/TaskListPane', () => ({
  TaskListPane: () => <div data-testid="task-list-pane" />,
}))
vi.mock('@/pages/ai-agent/chatTemplate/TimelineCard/TimelineCard', () => ({
  default: () => <div data-testid="timeline-pane" />,
}))
vi.mock('@/pages/ai-agent/historyChat/HistoryChat', () => ({
  default: ({
    hidePinButton,
    headerActionsExtra,
    aiSource,
  }: {
    hidePinButton?: boolean
    headerActionsExtra?: React.ReactNode
    aiSource: string[]
  }) => (
    <div data-testid="history-chat" data-sources={aiSource.join(',')}>
      <header>
        <span>会话列表</span>
        <button>新建会话</button>
        {headerActionsExtra}
        {!hidePinButton && <button>固定</button>}
      </header>
    </div>
  ),
}))

const WelcomeRightPanel = ({ refresh = true, ...props }: Pick<AIRightPanelProps, 'small'> & { refresh?: boolean }) => {
  return (
    <ViewportContext.Provider value={refresh}>
      <AIRightPanel welcome {...props} layoutRef={{ current: null }} />
    </ViewportContext.Provider>
  )
}

const renderPanel = async (ui: React.ReactElement) => {
  const renderResult = render(ui)
  // 「任务详情」按条件渲染可能缺席，用常驻菜单「文件系统」作为就绪探针
  await waitFor(() => expect(screen.getByText('文件系统')).toBeInTheDocument())
  return renderResult
}

const expectEmptyDataCards = () => {
  expect(screen.getByText('执行时长')).toBeVisible()
  expect(screen.getByText('执行时长').nextElementSibling).toHaveTextContent('—')
  expect(screen.getByText('工具调用统计')).toBeVisible()
  for (const label of ['成功', '失败', '总尝试次数']) {
    expect(screen.getByText(label).previousElementSibling).toHaveTextContent('—')
  }
}

describe('AIRightPanel', () => {
  beforeEach(() => {
    viewportState.visible = true
    mockAgentStore.setState({ activeChat: undefined })
  })

  describe('首页模式', () => {
    beforeEach(() => {
      vi.mocked(grpcQueryHTTPFlows)
        .mockReset()
        .mockResolvedValue({
          Total: 123,
          Data: [],
          Pagination: { Page: 1, Limit: 1, Order: 'desc', OrderBy: 'id' },
        })
      vi.mocked(apiRiskFieldGroup)
        .mockReset()
        .mockResolvedValue({
          RiskIPGroup: [],
          RiskTypeGroup: [],
          RiskLevelGroup: [
            { Name: 'critical', Total: 2 },
            { Name: 'fatal', Total: 3 },
            { Name: 'high', Total: 7 },
            { Name: 'warning', Total: 11 },
            { Name: 'medium', Total: 2 },
            { Name: 'low', Total: 17 },
            { Name: 'info', Total: 19 },
            { Name: 'other', Total: 4 },
          ].map((group) => ({ ...group, Verbose: '', Delta: 0 })),
        })
    })

    it.each([false, true])('大小屏均只显示四个首页入口（小屏：%s）', async (small) => {
      casualTaskState.questionID = 'existing-task'
      try {
        render(<WelcomeRightPanel small={small} />)
        await screen.findByLabelText('文件系统')
        for (const label of ['文件系统', '流量', '漏洞', '会话历史']) {
          expect(screen.getByLabelText(label)).toBeInTheDocument()
        }
        for (const label of ['任务详情看板', '任务列表', '更多', '时间线', '导出日志', '查看日志']) {
          expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
        }
        expect(screen.queryByText('执行时长')).not.toBeInTheDocument()
        expect(screen.queryByText('工具调用统计')).not.toBeInTheDocument()
        fireEvent.click(screen.getByLabelText('会话历史'))
        expect(screen.getByTestId('history-chat')).toBeInTheDocument()
      } finally {
        resetMockStore()
      }
    })

    it('欢迎页自行读取全量统计，不读取当前任务数据', async () => {
      setMockQuestionID('existing-task')
      const readTask = vi.spyOn(mockTaskDetailsMap, 'get')
      const result = await renderPanel(<AIRightPanel welcome />)
      try {
        await waitFor(() => expect(screen.getByLabelText('流量')).toHaveTextContent('123'))
        expect(screen.getByLabelText('漏洞')).toHaveTextContent('5｜7｜13｜17｜23')
        expect(readTask).not.toHaveBeenCalled()
        result.rerender(<AIRightPanel welcome small />)
        expect(screen.getByLabelText('漏洞 65')).toBeInTheDocument()
        expect(readTask).not.toHaveBeenCalled()
      } finally {
        result.unmount()
        readTask.mockRestore()
        resetMockStore()
      }
    })

    it('可见时无筛选查询全量统计，重渲染不重查，再次可见时刷新', async () => {
      setMockQuestionID('stream-task')
      mockTaskDetailsMap.set('stream-task', {
        uuid: 'stream-1',
        execution: { http_flow_count: 999, risk_level_count: { critical: 888, total: 888 } },
      })
      try {
        const result = await renderPanel(<WelcomeRightPanel refresh={false} />)
        expect(grpcQueryHTTPFlows).not.toHaveBeenCalled()
        expect(apiRiskFieldGroup).not.toHaveBeenCalled()
        result.rerender(<WelcomeRightPanel refresh />)
        await waitFor(() => expect(screen.getByLabelText('流量')).toHaveTextContent('123'))
        expect(screen.getByLabelText('漏洞')).toHaveTextContent('5｜7｜13｜17｜23')
        expect(grpcQueryHTTPFlows).toHaveBeenCalledExactlyOnceWith({ Pagination: { Page: 1, Limit: 1 } })
        expect(apiRiskFieldGroup).toHaveBeenCalledExactlyOnceWith()

        mockTaskDetailsMap.set('stream-task', {
          uuid: 'stream-2',
          execution: { http_flow_count: 1000, risk_level_count: { critical: 889, total: 889 } },
        })
        result.rerender(<WelcomeRightPanel small />)
        expect(screen.getByLabelText('漏洞 65')).toBeInTheDocument()
        result.rerender(<WelcomeRightPanel small={false} />)
        expect(screen.getByLabelText('流量')).toHaveTextContent('123')
        expect(screen.getByLabelText('漏洞')).toHaveTextContent('5｜7｜13｜17｜23')
        expect(grpcQueryHTTPFlows).toHaveBeenCalledTimes(1)
        expect(apiRiskFieldGroup).toHaveBeenCalledTimes(1)

        result.rerender(<WelcomeRightPanel refresh={false} />)
        expect(grpcQueryHTTPFlows).toHaveBeenCalledTimes(1)
        expect(apiRiskFieldGroup).toHaveBeenCalledTimes(1)
        vi.mocked(grpcQueryHTTPFlows).mockResolvedValueOnce({
          Total: 456,
          Data: [],
          Pagination: { Page: 1, Limit: 1, Order: 'desc', OrderBy: 'id' },
        })
        vi.mocked(apiRiskFieldGroup).mockResolvedValueOnce({
          RiskIPGroup: [],
          RiskTypeGroup: [],
          RiskLevelGroup: [{ Name: 'high', Total: 9, Verbose: '', Delta: 0 }],
        })
        result.rerender(<WelcomeRightPanel refresh />)
        await waitFor(() => expect(screen.getByLabelText('流量')).toHaveTextContent('456'))
        expect(screen.getByLabelText('漏洞')).toHaveTextContent('9')
        await waitFor(() => expect(grpcQueryHTTPFlows).toHaveBeenCalledTimes(2))
        expect(apiRiskFieldGroup).toHaveBeenCalledTimes(2)
      } finally {
        resetMockStore()
      }
    })

    it.each(['traffic', 'risk'])(
      '一个统计接口失败时错误提示照常暴露，另一个仍正常展示（失败：%s）',
      async (failedApi) => {
        if (failedApi === 'traffic') vi.mocked(grpcQueryHTTPFlows).mockRejectedValueOnce(new Error('query failed'))
        else vi.mocked(apiRiskFieldGroup).mockRejectedValueOnce(new Error('query failed'))
        await renderPanel(<WelcomeRightPanel />)
        if (failedApi === 'traffic') {
          await waitFor(() => expect(screen.getByLabelText('漏洞')).toHaveTextContent('5｜7｜13｜17｜23'))
          expect(screen.getByLabelText('流量')).toHaveTextContent(/^流量$/)
        } else {
          await waitFor(() => expect(screen.getByLabelText('流量')).toHaveTextContent('123'))
          expect(screen.getByLabelText('漏洞')).toHaveTextContent(/^漏洞$/)
        }
        // 失败要暴露错误提示：grpcQueryHTTPFlows 不传 hiddenError（真实实现内部会 yakitNotify 弹错误），
        // apiRiskFieldGroup 无静默参数、失败必弹提示；组件侧 .catch 仅兜底未处理的 rejection。
        expect(vi.mocked(grpcQueryHTTPFlows).mock.calls[0]?.[1]).toBeFalsy()
        expect(apiRiskFieldGroup).toHaveBeenCalledExactlyOnceWith()
        expect(grpcQueryHTTPFlows).toHaveBeenCalledTimes(1)
      },
    )

    it('空统计不显示角标，自由对话不查询首页统计', async () => {
      vi.mocked(grpcQueryHTTPFlows).mockResolvedValueOnce({
        Total: 0,
        Data: [],
        Pagination: { Page: 1, Limit: 1, Order: 'desc', OrderBy: 'id' },
      })
      vi.mocked(apiRiskFieldGroup).mockResolvedValueOnce({ RiskIPGroup: [], RiskTypeGroup: [], RiskLevelGroup: [] })
      const result = await renderPanel(<WelcomeRightPanel />)
      await act(async () => {})
      expect(screen.getByLabelText('流量')).toHaveTextContent(/^流量$/)
      expect(screen.getByLabelText('漏洞')).toHaveTextContent(/^漏洞$/)
      result.rerender(<WelcomeRightPanel small />)
      expect(screen.queryByLabelText(/^漏洞 /)).not.toBeInTheDocument()
      result.unmount()
      await renderPanel(<AIRightPanel />)
      expect(grpcQueryHTTPFlows).toHaveBeenCalledTimes(1)
      expect(apiRiskFieldGroup).toHaveBeenCalledTimes(1)
    })
  })

  it.each([false, true])('AI 设置跳转到设置页，更多分组按顺序展开和收起（小屏：%s）', async (small) => {
    render(<AIRightPanel small={small} />)
    fireEvent.click(await screen.findByLabelText('更多'))
    const aiSettings = screen.getByLabelText('AI 设置')
    const timeline = screen.getByLabelText('时间线')
    const exportLog = screen.getByLabelText('导出日志')
    expect(aiSettings.parentElement?.firstElementChild).toBe(aiSettings)
    expect(aiSettings.nextElementSibling).toBe(timeline)
    expect(timeline.nextElementSibling).toBe(exportLog)
    expect(exportLog.nextElementSibling).toBe(screen.getByLabelText('查看日志'))
    mockEmit.mockClear()
    fireEvent.click(aiSettings)
    expect(mockEmit).toHaveBeenCalledTimes(1)
    expect(mockEmit).toHaveBeenCalledWith(
      'openPage',
      JSON.stringify({ route: YakitRoute.Settings, params: { anchor: 'ai-config' } }),
    )
    fireEvent.click(screen.getByLabelText('折叠'))
    expect(screen.queryByLabelText('AI 设置')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('时间线')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('导出日志')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('查看日志')).not.toBeInTheDocument()
  })

  it('点击会话历史打开 HistoryChat，关闭按钮位于原头部最右侧且没有固定按钮', async () => {
    await renderPanel(<AIRightPanel />)
    fireEvent.click(screen.getByLabelText('会话历史'))
    const history = screen.getByTestId('history-chat')
    expect(history).toHaveAttribute('data-sources', 'ai,im,')
    const pane = history.closest('section')!
    expect(pane.querySelectorAll('header')).toHaveLength(1)
    expect(screen.queryByRole('button', { name: '固定' })).not.toBeInTheDocument()
    const closeButton = pane.querySelector('header')!.lastElementChild!
    expect(closeButton).toHaveAttribute('aria-label')
    fireEvent.click(closeButton)
    expect(screen.queryByTestId('history-chat')).not.toBeInTheDocument()
    expect(screen.getByLabelText('文件系统')).toBeInTheDocument()
  })

  it.each([false, true])('切换详情会话后保留当前会话列表（small=%s）', (small) => {
    mockAgentStore.setState({ activeChat: { Id: 1, SessionID: 'session-1' } })
    render(<AIRightPanel small={small} />)
    fireEvent.click(screen.getByLabelText('会话历史'))
    const history = screen.getByTestId('history-chat')

    act(() => {
      mockAgentStore.setState({ activeChat: { Id: 2, SessionID: 'session-2' } })
    })

    expect(screen.getByTestId('history-chat')).toBe(history)
    fireEvent.click(history.querySelector('header')!.lastElementChild!)
    expect(screen.queryByTestId('history-chat')).not.toBeInTheDocument()
  })

  it.each(['任务列表', '时间线'])('切换详情会话后关闭旧会话的%s', (label) => {
    mockAgentStore.setState({ activeChat: { Id: 1, SessionID: 'session-1' } })
    render(<AIRightPanel small />)
    fireEvent.click(screen.getByLabelText('更多'))
    fireEvent.click(screen.getByLabelText(label))
    const testId = label === '任务列表' ? 'task-list-pane' : 'timeline-pane'
    expect(screen.getByTestId(testId)).toBeInTheDocument()

    act(() => {
      mockAgentStore.setState({ activeChat: { Id: 2, SessionID: 'session-2' } })
    })

    expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
  })

  it('小屏会话历史支持悬停打开、移出销毁和点击关闭', async () => {
    render(<AIRightPanel small />)
    const item = screen.getByLabelText('会话历史')
    fireEvent.mouseEnter(item)
    expect(screen.getByTestId('history-chat')).toBeInTheDocument()
    fireEvent.mouseLeave(item)
    await waitFor(() => expect(screen.queryByTestId('history-chat')).not.toBeInTheDocument())
    fireEvent.click(item)
    fireEvent.click(screen.getByTestId('history-chat').querySelector('header')!.lastElementChild!)
    expect(screen.queryByTestId('history-chat')).not.toBeInTheDocument()
    expect(screen.getByLabelText('文件系统')).toBeInTheDocument()
  })

  it('正常态点击时间线打开面板，关闭后恢复菜单', async () => {
    await renderPanel(<AIRightPanel />)
    fireEvent.click(screen.getByLabelText('更多'))
    fireEvent.click(screen.getByLabelText('时间线'))
    expect(screen.getByTestId('timeline-pane')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByTestId('timeline-pane')).not.toBeInTheDocument()
    expect(screen.getByLabelText('文件系统')).toBeInTheDocument()
  })

  it('小屏在任务列表和时间线间悬停切换，移出时间线后销毁', async () => {
    render(<AIRightPanel small />)
    fireEvent.click(screen.getByLabelText('更多'))
    const taskItem = screen.getByLabelText('任务列表')
    const timelineItem = screen.getByLabelText('时间线')
    fireEvent.mouseEnter(taskItem)
    fireEvent.mouseLeave(taskItem)
    fireEvent.mouseEnter(timelineItem)
    expect(screen.queryByTestId('task-list-pane')).not.toBeInTheDocument()
    expect(screen.getByTestId('timeline-pane')).toBeInTheDocument()
    fireEvent.mouseLeave(timelineItem)
    await waitFor(() => expect(screen.queryByTestId('timeline-pane')).not.toBeInTheDocument())
    fireEvent.click(timelineItem)
    expect(screen.getByTestId('timeline-pane')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByTestId('timeline-pane')).not.toBeInTheDocument()
  })
  it('正常态点击任务列表替换菜单，关闭后恢复菜单', async () => {
    await renderPanel(<AIRightPanel />)
    fireEvent.click(screen.getByLabelText('任务列表'))
    expect(screen.getByTestId('task-list-pane')).toBeVisible()
    expect(screen.getByLabelText('文件系统').parentElement?.parentElement?.parentElement?.className).toContain(
      'right-panel-hidden',
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByTestId('task-list-pane')).not.toBeInTheDocument()
    expect(screen.getByLabelText('文件系统').parentElement?.parentElement?.parentElement?.className).not.toContain(
      'right-panel-hidden',
    )
  })

  it('小屏悬停打开，移入浮层保持，移出后销毁', async () => {
    render(<AIRightPanel small />)
    const item = screen.getByLabelText('任务列表')
    fireEvent.mouseEnter(item)
    const pane = screen.getByTestId('task-list-pane').closest('section')!.parentElement!
    expect(pane.className).toContain('pane-slot-small')
    fireEvent.mouseLeave(item)
    fireEvent.mouseEnter(pane)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    expect(screen.getByTestId('task-list-pane')).toBeInTheDocument()
    fireEvent.mouseLeave(pane)
    await waitFor(() => expect(screen.queryByTestId('task-list-pane')).not.toBeInTheDocument())
    fireEvent.mouseEnter(item)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByTestId('task-list-pane')).not.toBeInTheDocument()
    expect(screen.getByLabelText('文件系统')).toBeInTheDocument()
  })

  it('切换屏幕模式时清理打开的任务浮层', () => {
    const result = render(<AIRightPanel small />)
    fireEvent.mouseEnter(screen.getByLabelText('任务列表'))
    result.rerender(<AIRightPanel small={false} />)
    expect(screen.queryByTestId('task-list-pane')).not.toBeInTheDocument()
  })

  it('包裹组件支持自定义标题和操作区', () => {
    render(
      <AIRightPanelPane title="自定义标题" actions={<button>操作</button>} onClose={vi.fn()}>
        内容
      </AIRightPanelPane>,
    )
    expect(screen.getByText('自定义标题')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: '操作' })).toBeInTheDocument()
    expect(screen.getByText('内容')).toBeInTheDocument()
  })

  it('正常态渲染数据卡片、六个主菜单与「更多」按钮', async () => {
    setMockQuestionID('task-normal')
    // 「任务详情」入口需要 questionID 与 ai-agent 来源同时满足
    casualTaskState.questionID = 'task-normal'
    mockTaskDetailsMap.set('task-normal', {
      execution: { started_at: 1000, ended_at: 7000, tool_call_success: 1, tool_call_failed: 2, tool_call_total: 3 },
    })
    const result = await renderPanel(<AIRightPanel />)
    try {
      expect(screen.getByText('执行时长')).toBeInTheDocument()
      // timeDiffWithMoment mock 返回差值 "6000s"
      expect(screen.getByText('6000s')).toBeInTheDocument()
      expect(screen.getByText('工具调用统计')).toBeInTheDocument()
      expect(screen.getByText('任务详情看板')).toBeInTheDocument()
      expect(screen.getByText('文件系统')).toBeInTheDocument()
      expect(screen.getByText('会话历史')).toBeInTheDocument()
      // 底部「更多」分组默认收起
      expect(screen.getByText('更多')).toBeInTheDocument()
      expect(screen.queryByText('时间线')).not.toBeInTheDocument()
    } finally {
      result.unmount()
      resetMockStore()
      casualTaskState.questionID = ''
    }
  })

  it('点击「更多」展开底部分组，点击「折叠」收起', async () => {
    await renderPanel(<AIRightPanel />)
    fireEvent.click(screen.getByText('更多'))
    expect(screen.getByText('时间线')).toBeInTheDocument()
    expect(screen.getByText('导出日志')).toBeInTheDocument()
    expect(screen.getByText('查看日志')).toBeInTheDocument()
    expect(screen.getByText('折叠')).toBeInTheDocument()

    fireEvent.click(screen.getByText('折叠'))
    expect(screen.queryByText('时间线')).not.toBeInTheDocument()
    expect(screen.getByText('更多')).toBeInTheDocument()
  })

  it('small 强制小屏态：仅图标，不渲染数据卡片与文案', () => {
    render(<AIRightPanel small />)
    expect(screen.queryByText('执行时长')).not.toBeInTheDocument()
    expect(screen.queryByText('任务详情看板')).not.toBeInTheDocument()
    expect(screen.queryByText('更多')).not.toBeInTheDocument()
  })

  it('small 小屏态悬停菜单项时左侧出现文案提示', async () => {
    render(<AIRightPanel small />)
    const fileSystemButton = screen.getByLabelText('文件系统')
    // antd Tooltip 悬停触发，浮层渲染到 body 下
    fireEvent.mouseEnter(fileSystemButton)
    await waitFor(() => expect(screen.getByText('文件系统')).toBeInTheDocument())
  })

  it.each(['任务详情看板', '流量', '漏洞'])('大屏点击%s后切为小屏，提示保持关闭直到鼠标移出再移入', async (label) => {
    casualTaskState.questionID = 'q-1'
    try {
      const { rerender } = render(<AIRightPanel small={false} />)
      const button = screen.getByLabelText(label)
      fireEvent.mouseEnter(button)
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      fireEvent.click(button)
      if (label === '任务详情看板') {
        expect(mockSyncCasualTaskTab).toHaveBeenCalled()
      } else {
        expect(mockEmit).toHaveBeenCalledWith(
          'switchAIActTab',
          JSON.stringify({ key: label === '流量' ? 'http' : 'risk' }),
        )
      }
      // 左侧工作区展开后切为小屏，新入口接收到鼠标进入事件。
      rerender(<AIRightPanel small />)
      const smallButton = screen.getByLabelText(label)
      fireEvent.mouseEnter(smallButton)
      expect(smallButton).not.toHaveClass('ant-tooltip-open')
      fireEvent.mouseLeave(smallButton)
      fireEvent.mouseEnter(smallButton)
      expect(smallButton).toHaveClass('ant-tooltip-open')
      await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent(label))
    } finally {
      casualTaskState.questionID = ''
      mockSyncCasualTaskTab.mockClear()
      mockEmit.mockClear()
      cleanup()
    }
  })

  it('small 小屏态「更多」hover 后点击展开，Tooltip 浮层不残留', async () => {
    render(<AIRightPanel small />)
    const moreButton = screen.getByLabelText('更多')
    // 悬停展开提示（受控 open 同步渲染浮层）
    fireEvent.mouseEnter(moreButton)
    await waitFor(() => expect(document.querySelector('.ant-tooltip')).toBeInTheDocument())
    fireEvent.click(moreButton)
    fireEvent.mouseLeave(moreButton)
    // label 切换为「折叠」：key={label} 重建 Tooltip，受控 open 状态下浮层同步销毁/隐藏
    await waitFor(() => {
      const tooltip = document.querySelector<HTMLElement>('.ant-tooltip')
      // 已卸载或不可见（屏外定位）均视为不残留
      if (tooltip) expect(tooltip.style.left).toBe('-1000vw')
    })
  })

  it('small 小屏态 hover 展开项后收起分组（触发元素卸载），浮层随之销毁', async () => {
    render(<AIRightPanel small />)
    fireEvent.click(screen.getByLabelText('更多'))
    const timelineButton = screen.getByLabelText('导出日志')
    // hover 打开普通菜单的文案提示
    fireEvent.mouseEnter(timelineButton)
    await waitFor(() => expect(document.querySelector('.ant-tooltip')).toBeInTheDocument())

    // 点击「折叠」：MORE_MENUS 整组卸载，触发元素消失，受控浮层随组件卸载同步销毁
    fireEvent.click(screen.getByLabelText('折叠'))
    await waitFor(() => expect(document.querySelector('.ant-tooltip')).not.toBeInTheDocument())
  })

  it('small 小屏态点击「更多」展开额外功能入口，再次点击收起', async () => {
    render(<AIRightPanel small />)
    const moreButton = screen.getByLabelText('更多')

    expect(screen.queryByLabelText('时间线')).not.toBeInTheDocument()
    fireEvent.click(moreButton)
    expect(screen.getByLabelText('时间线')).toBeInTheDocument()
    expect(screen.getByLabelText('导出日志')).toBeInTheDocument()
    expect(screen.getByLabelText('查看日志')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('折叠'))
    expect(screen.queryByLabelText('时间线')).not.toBeInTheDocument()
  })

  it('session_snapshot 提供流量总数和各等级漏洞计数', async () => {
    setMockQuestionID('task-risk')
    mockTaskDetailsMap.set('task-risk', {
      uuid: 'uuid-risk',
      execution: {
        http_flow_count: 42,
        risk_level_count: { critical: 4, high: 6, warning: 1, low: 3, info: 5, other: 3, total: 22 },
      },
    })
    const result = await renderPanel(<AIRightPanel />)
    try {
      expect(screen.getByText('42')).toBeInTheDocument()
      // 面板展示严重/高危/中危/低危/信息，其中 info 与 other 合并到信息。
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getByText('6')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it('漏洞等级计数为 0 的等级不展示角标', async () => {
    setMockQuestionID('task-risk-partial-zero')
    mockTaskDetailsMap.set('task-risk-partial-zero', {
      uuid: 'uuid-risk-partial-zero',
      execution: {
        risk_level_count: { critical: 2, high: 0, warning: 0, low: 1, info: 0, other: 0, total: 3 },
      },
    })
    const result = await renderPanel(<AIRightPanel />)
    try {
      const riskButton = screen.getByLabelText('漏洞')
      // 仅展示非零等级：严重 2、低危 1
      expect(riskButton).toContainElement(screen.getByText('2'))
      expect(riskButton).toContainElement(screen.getByText('1'))
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it('漏洞等级计数全部为 0 时不渲染等级角标', async () => {
    setMockQuestionID('task-risk-all-zero')
    mockTaskDetailsMap.set('task-risk-all-zero', {
      uuid: 'uuid-risk-all-zero',
      execution: {
        risk_level_count: { critical: 0, high: 0, warning: 0, low: 0, info: 0, other: 0, total: 0 },
      },
    })
    const result = await renderPanel(<AIRightPanel />)
    try {
      const riskButton = screen.getByLabelText('漏洞')
      // 无任何等级数字与分隔符，整个 risk-tag 角标隐藏
      expect(riskButton.textContent).toBe('漏洞')
      expect(screen.queryByText('｜')).not.toBeInTheDocument()
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it.each([false, true])('数量更新后无需悬停即可刷新流量和漏洞（小屏：%s）', (small) => {
    vi.useFakeTimers()
    setMockQuestionID('task-live-count')
    const detail = {
      uuid: 'snapshot-0',
      execution: { http_flow_count: 0, risk_level_count: { high: 0, total: 0 } },
    }
    mockTaskDetailsMap.set('task-live-count', detail)
    try {
      render(<AIRightPanel small={small} />)
      const trafficMenu = screen.getByLabelText('流量')
      const riskMenu = screen.getByLabelText('漏洞')

      for (const [index, count] of [42, 58, 0].entries()) {
        // 与 session_snapshot 一致：保留任务条目引用，替换 execution 并更新 uuid。
        detail.execution = { http_flow_count: count, risk_level_count: { high: count, total: count } }
        detail.uuid = `snapshot-${index + 1}`
        act(() => vi.advanceTimersByTime(3000))

        expect(trafficMenu.textContent).toBe(`${small ? '' : '流量'}${count || ''}`)
        expect(riskMenu.textContent).toBe(`${small ? '' : '漏洞'}${count || ''}`)
      }
    } finally {
      cleanup()
      resetMockStore()
      vi.useRealTimers()
    }
  })

  it('小屏流量和漏洞使用相同的图标角标，切回正常尺寸后恢复数量标签', () => {
    setMockQuestionID('task-risk-small')
    mockTaskDetailsMap.set('task-risk-small', {
      uuid: 'uuid-risk-small',
      execution: {
        http_flow_count: 42,
        risk_level_count: { critical: 4, high: 6, warning: 1, low: 3, info: 5, other: 3, total: 22 },
      },
    })
    const result = render(<AIRightPanel small />)
    try {
      for (const [label, count] of [
        ['流量', 42],
        ['漏洞', 22],
      ] as const) {
        const badge = screen.getByLabelText(`${label} ${count}`)
        expect(screen.getByLabelText(label)).toContainElement(badge)
        expect(badge).toHaveClass('count-badge')
        expect(badge.parentElement).toHaveClass('menu-item-icon-small')
      }

      result.rerender(<AIRightPanel small={false} />)
      expect(screen.queryByLabelText('流量 42')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('漏洞 22')).not.toBeInTheDocument()
      expect(screen.getByLabelText('流量')).toHaveTextContent('42')
      expect(screen.getByLabelText('漏洞')).toHaveTextContent('4｜6｜1｜3｜8')
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it.each([
    { total: undefined, expected: 22 },
    { total: 99, expected: 99 },
    { total: 0, expected: 0 },
  ])('快照漏洞总数优先使用 total=$total，缺失时按等级求和', async ({ total, expected }) => {
    setMockQuestionID('task-risk-total')
    mockTaskDetailsMap.set('task-risk-total', {
      uuid: 'uuid-risk-total',
      execution: {
        risk_level_count: { critical: 4, high: 6, warning: 1, low: 3, info: 5, other: 3, total },
      },
    })
    const result = render(<AIRightPanel small />)
    try {
      await screen.findByLabelText('漏洞')
      if (expected === 0) expect(screen.queryByLabelText(/^漏洞 /)).not.toBeInTheDocument()
      else expect(screen.getByLabelText(`漏洞 ${expected}`)).toBeInTheDocument()
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it('当前任务变化时自动更新统计，切到无快照任务或清空任务后移除旧角标', async () => {
    // 两个任务使用相同 uuid，确保更新由 questionID 订阅驱动。
    mockTaskDetailsMap.set('task-first', {
      uuid: 'same-uuid',
      execution: {
        http_flow_count: 42,
        risk_level_count: { critical: 2, high: 0, warning: 0, low: 0, info: 1, other: 2, total: 5 },
      },
    })
    mockTaskDetailsMap.set('task-second', {
      uuid: 'same-uuid',
      execution: {
        http_flow_count: 81,
        risk_level_count: { critical: 0, high: 7, warning: 0, low: 0, info: 0, other: 0, total: 7 },
      },
    })
    setMockQuestionID('task-first')
    const result = await renderPanel(<AIRightPanel />)
    try {
      expect(screen.getByLabelText('流量')).toHaveTextContent('42')
      expect(screen.getByLabelText('漏洞')).toHaveTextContent('2｜3')

      act(() => setMockQuestionID('task-second'))
      expect(screen.getByLabelText('流量')).toHaveTextContent('81')
      expect(screen.getByLabelText('漏洞')).toHaveTextContent(/^漏洞7$/)

      act(() => setMockQuestionID('task-without-snapshot'))
      expect(screen.getByLabelText('流量')).toHaveTextContent(/^流量$/)
      expect(screen.getByLabelText('漏洞')).toHaveTextContent(/^漏洞$/)
      expectEmptyDataCards()

      act(() => setMockQuestionID('task-first'))
      expect(screen.getByLabelText('流量')).toHaveTextContent('42')
      expect(screen.getByLabelText('漏洞')).toHaveTextContent('2｜3')
      act(() => setMockQuestionID(''))
      expect(screen.getByLabelText('流量')).toHaveTextContent(/^流量$/)
      expect(screen.getByLabelText('漏洞')).toHaveTextContent(/^漏洞$/)
      expectEmptyDataCards()
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it('当正常态面板会遮挡列表时切换为小屏态', async () => {
    const listElement = document.createElement('div')
    let listWidth = 1108
    Object.defineProperty(listElement, 'clientWidth', {
      configurable: true,
      get: () => listWidth,
    })
    Object.defineProperty(listElement, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: listWidth }),
    })
    const layoutRef = { current: listElement } as React.RefObject<HTMLElement | null>
    let resizeCallback: (() => void) | undefined
    class ResizeObserverMock {
      constructor(callback: () => void) {
        resizeCallback = callback
      }

      observe() {}

      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)

    try {
      render(<AIRightPanel layoutRef={layoutRef} />)
      // 1108 - 325 = 783 < 784 进入小屏（仅图标）；宽度到 1109 恢复正常态后菜单文案出现
      await waitFor(() => expect(screen.getByLabelText('文件系统')).toBeInTheDocument())
      expect(screen.queryByText('文件系统')).not.toBeInTheDocument()

      // 1108 - 325 = 783，小于列表最大宽度，进入小屏；达到 784px 后恢复正常态。
      listWidth = 1109
      act(() => resizeCallback?.())
      await waitFor(() => expect(screen.getByText('文件系统')).toBeInTheDocument())
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('小屏判断跟随聊天容器宽度并在最大宽度边界切换', async () => {
    const listElement = document.createElement('div')

    let listWidth = 783
    Object.defineProperty(listElement, 'clientWidth', {
      configurable: true,
      get: () => listWidth,
    })
    Object.defineProperty(listElement, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ width: listWidth }),
    })
    const layoutRef = { current: listElement } as React.RefObject<HTMLElement | null>
    let resizeCallback: (() => void) | undefined
    class ResizeObserverMock {
      constructor(callback: () => void) {
        resizeCallback = callback
      }

      observe() {}

      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)

    try {
      render(<AIRightPanel layoutRef={layoutRef} />)
      await waitFor(() => expect(screen.queryByText('文件系统')).not.toBeInTheDocument())

      // 聊天容器宽度达到 1109px 后，扣除 325px 面板槽位正好剩余 784px，恢复正常态。
      listWidth = 1109
      act(() => resizeCallback?.())
      await waitFor(() => expect(screen.getByText('文件系统')).toBeInTheDocument())
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('会话面板自行读取当前任务的执行详情并传给 DataCards 展示', async () => {
    setMockQuestionID('task-1')
    mockTaskDetailsMap.set('task-1', {
      uuid: 'uuid-1',
      execution: {
        started_at: 1000,
        ended_at: 7000,
        tool_call_success: 3,
        tool_call_failed: 1,
        tool_call_total: 4,
      },
    })
    const result = await renderPanel(<AIRightPanel />)
    try {
      // timeDiffWithMoment mock 返回差值 "6000s"
      expect(screen.getByText('6000s')).toBeInTheDocument()
      // 统计值与其 label 同属一个 stat 块，经 label 定位避免与 risk 角标写死值（4｜6｜1｜3｜8）撞车
      const statValue = (label: string) => screen.getByText(label).previousElementSibling?.textContent
      expect(statValue('成功')).toBe('3')
      expect(statValue('失败')).toBe('1')
      expect(statValue('总尝试次数')).toBe('4')

      // 当前任务无执行数据时保留卡片，旧统计值替换为占位符。
      act(() => setMockQuestionID('task-without-data'))
      expectEmptyDataCards()
      expect(screen.queryByText('6000s')).not.toBeInTheDocument()
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it('数据源：任务执行中展示「执行中」，无执行数据时保留占位卡片，恢复后更新数值', async () => {
    setMockQuestionID('task-2')
    mockTaskDetailsMap.set('task-2', {
      uuid: 'uuid-2',
      execution: {
        started_at: 1000,
        ended_at: 0,
        tool_call_success: 2,
        tool_call_failed: 0,
        tool_call_total: 2,
      },
    })
    mockTaskDetailsMap.set('task-empty', { uuid: 'uuid-empty' })
    const result = await renderPanel(<AIRightPanel />)
    try {
      // 有 started_at 无 ended_at：执行中
      expect(screen.getByText('执行中')).toBeInTheDocument()
      expect(screen.getByText('失败').previousElementSibling).toHaveTextContent('0')

      // 仅更新 store，由父级订阅自动刷新传参，不手动重渲染或重新挂载卡片。
      act(() => {
        setMockQuestionID('task-empty')
      })
      expectEmptyDataCards()
      expect(screen.queryByText('执行中')).not.toBeInTheDocument()
      act(() => setMockQuestionID('task-2'))
      expect(screen.getByText('执行中')).toBeInTheDocument()
      expect(screen.getByText('成功').previousElementSibling).toHaveTextContent('2')
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it('数据源：同任务详情原地更新（uuid 变化）后轮询刷新卡片数据', async () => {
    setMockQuestionID('task-3')
    const taskDetails: MockTaskDetails = {
      uuid: 'uuid-3a',
      execution: { started_at: 1000, ended_at: 0, tool_call_success: 0, tool_call_failed: 0, tool_call_total: 0 },
    }
    mockTaskDetailsMap.set('task-3', taskDetails)
    const result = await renderPanel(<AIRightPanel />)
    try {
      expect(screen.getByText('执行中')).toBeInTheDocument()

      // session_snapshot 保留详情对象引用并替换 execution，靠 uuid 轮询（3s 间隔）感知更新。
      taskDetails.uuid = 'uuid-3b'
      taskDetails.execution = {
        started_at: 1000,
        ended_at: 9000,
        tool_call_success: 5,
        tool_call_failed: 2,
        tool_call_total: 7,
      }
      // 轮询间隔 3s，超时放宽到 5s 预留余量，避免慢环境下 flaky
      await waitFor(() => expect(screen.getByText('8000s')).toBeInTheDocument(), { timeout: 5000 })
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it.each([false, true])('菜单点击：文件系统激活侧边栏 File 页，流量/漏洞打开工作区（首页：%s）', async (welcome) => {
    await renderPanel(<AIRightPanel welcome={welcome} />)
    // 首页与会话面板都通过 switchAIAgentTab 激活文件页。
    fireEvent.click(screen.getByText('文件系统'))
    expect(mockEmit).toHaveBeenCalledWith(
      'switchAIAgentTab',
      JSON.stringify({ type: 'setTabActive', params: { active: 'file', show: true } }),
    )
    fireEvent.click(screen.getByText('流量'))
    expect(mockEmit).toHaveBeenCalledWith('switchAIActTab', JSON.stringify({ key: 'http' }))
    fireEvent.click(screen.getByText('漏洞'))
    expect(mockEmit).toHaveBeenCalledWith('switchAIActTab', JSON.stringify({ key: 'risk' }))
  })

  it('菜单点击：任务详情入口按条件渲染，点击同步任务 tab', async () => {
    // questionID + ai-agent 来源均满足：入口展示，点击同步
    casualTaskState.questionID = 'q-1'
    try {
      await renderPanel(<AIRightPanel />)
      fireEvent.click(screen.getByText('任务详情看板'))
      expect(mockSyncCasualTaskTab).toHaveBeenCalledTimes(1)
    } finally {
      casualTaskState.questionID = ''
      cleanup()
    }

    // 无 questionID：入口不渲染
    mockSyncCasualTaskTab.mockClear()
    await renderPanel(<AIRightPanel />)
    expect(screen.queryByText('任务详情看板')).not.toBeInTheDocument()
    cleanup()

    // 非 ai-agent 来源（如 history）：入口不渲染
    casualTaskState.questionID = 'q-2'
    dispatcherState.setting = { Source: 'history' }
    try {
      await renderPanel(<AIRightPanel />)
      expect(screen.queryByText('任务详情看板')).not.toBeInTheDocument()
      expect(mockSyncCasualTaskTab).not.toHaveBeenCalled()
    } finally {
      dispatcherState.setting = { Source: 'ai' }
      casualTaskState.questionID = ''
    }
  })

  it('菜单点击：导出日志打开弹窗、查看日志打开日志窗口', async () => {
    await renderPanel(<AIRightPanel />)
    // 「导出日志/查看日志」位于「更多」分组内，先展开
    fireEvent.click(screen.getByText('更多'))
    fireEvent.click(screen.getByText('导出日志'))
    expect(mockExportModalState.lastVisible).toBe(true)
    fireEvent.click(screen.getByText('查看日志'))
    expect(mockOpenLogWindow).toHaveBeenCalledTimes(1)
  })

  it.each([true, false])('导出结束后恢复 loading，失败保留弹窗（成功 %s）', async (success) => {
    mockAgentStore.setState({ activeChat: { Id: 1, SessionID: 'session-export' } })
    let finish!: () => void
    vi.mocked(grpcExportAILogs).mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        finish = resolve
      })
      if (!success) throw new Error('导出失败')
      return { FilePath: '/logs/export.zip' }
    })
    vi.mocked(failed).mockClear()
    vi.mocked(yakitNotify).mockClear()
    await renderPanel(<AIRightPanel />)
    fireEvent.click(screen.getByText('更多'))
    fireEvent.click(screen.getByText('导出日志'))
    fireEvent.click(screen.getByText('确认导出'))
    expect(screen.getByText('确认导出')).toBeDisabled()
    expect(grpcExportAILogs).toHaveBeenLastCalledWith(
      { SessionID: 'session-export', ExportDataTypes: ['timeline'], OutputPath: '/logs' },
      true,
    )
    await act(async () => finish())
    if (success) {
      expect(screen.queryByText('确认导出')).not.toBeInTheDocument()
      expect(yakitNotify).toHaveBeenCalledWith('success', expect.any(String))
      fireEvent.click(screen.getByText('导出日志'))
    } else {
      expect(failed).toHaveBeenCalledWith(expect.any(String))
    }
    expect(screen.getByText('确认导出')).not.toBeDisabled()
  })
})
