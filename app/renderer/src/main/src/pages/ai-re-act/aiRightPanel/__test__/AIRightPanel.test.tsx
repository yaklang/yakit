import type React from 'react'
import type * as OutlineIcons from '@yakit-libs/yakit-ui-icons/outline'
import { createContext, useContext, useEffect } from 'react'
import { render, screen, fireEvent, waitFor, act, cleanup, within } from '@testing-library/react'
import { YakitRoute } from '@/enums/yakitRoute'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore as useUserStore } from '@/store'
import { grpcExportAILogs, grpcQueryHTTPFlows } from '@/pages/ai-agent/grpc'
import { failed, yakitNotify } from '@/utils/notification'
import type { ExportAILogsModal as ExportAILogsModalComponent } from '@/pages/ai-agent/components/ExportAILogsModal/ExportAILogsModal'
import { apiRiskFieldGroup } from '@/pages/risks/YakitRiskTable/utils'
import emiter from '@/utils/eventBus/eventBus'
import type * as AIRightPanelModule from '../AIRightPanel'
import { AITaskStatus } from '../../hooks/grpcApi'
import { useStore } from 'zustand'

vi.mock('@/pages/ai-agent/chatTemplate/historyTaskTree/useRunningAsyncTaskCount', () => {
  const useMockRunningAsyncTaskCount = () => useStore(mockRunningTaskStore, (state) => state)
  return { default: useMockRunningAsyncTaskCount }
})

// 当前安装的图标包缺少这两个装饰图标；保留其余真实导出以验证面板交互。
vi.mock('@yakit-libs/yakit-ui-icons/outline', async (importOriginal) => ({
  ...(await importOriginal<typeof OutlineIcons>()),
  ExportOutlined: () => null,
  FlowOutlined: () => null,
}))

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
    'count-badge-overflow': 'count-badge-overflow',
    'count-badge-risk': 'count-badge-risk',
    'menu-item-icon-small': 'menu-item-icon-small',
  },
}))

// 数据源 mock：用真实 zustand vanilla store 构造（订阅语义与产品一致），
// rawData.taskDetailsMap 由各用例按需覆写；改写状态用 mockTaskStore.setState 原生推送更新
import { createStore } from 'zustand/vanilla'
import type { StoreApi } from 'zustand/vanilla'

interface MockTaskStoreState {
  currentChatStatus: { questionID: string; status?: string }
  execute: boolean
  initLoading: boolean
  pendingReply: boolean
  taskDetailsUpdate: number
  asyncExecutionUpdate: number
  planHistoryList?: { records: { coordinator_id: string }[]; total?: number }
  planHistoryCount?: number
  sessionSnapshot?: { current_round?: number; execution: Record<string, unknown> }
}
// 详情条目带 uuid：父级收到更新通知后比较 uuid 判断详情是否被流数据刷新（参照 AITaskExecutionDetails）
interface MockTaskDetails {
  uuid?: string
  execution?: Record<string, unknown>
}
const mockTaskDetailsMap = new Map<string, MockTaskDetails>()
const mockRawData: {
  taskDetailsMap: Map<string, MockTaskDetails>
  httpRunTimeIDs: string[]
  aiPerfData: Record<string, never>
  asyncExecution?: {
    revision: number
    running_count: number
    updated_at: number
    executions: { execute_id: string; state?: string }[]
  }
} = {
  taskDetailsMap: mockTaskDetailsMap,
  httpRunTimeIDs: [],
  aiPerfData: {},
}
const mockRunningTaskStore = createStore<{ total: number; running: number | undefined }>(() => ({
  total: 0,
  running: undefined,
}))
const mockAgentStore = createStore<{ activeChat?: { Id: number; SessionID: string } }>(() => ({}))
const mockTaskStore: StoreApi<MockTaskStoreState> = createStore<MockTaskStoreState>(() => ({
  currentChatStatus: { questionID: '' },
  execute: false,
  initLoading: false,
  pendingReply: false,
  taskDetailsUpdate: 0,
  asyncExecutionUpdate: 0,
  planHistoryList: { records: [] },
  planHistoryCount: 0,
  sessionSnapshot: undefined,
}))
const setMockQuestionID = (questionID: string) => {
  mockTaskStore.setState((state) => ({ currentChatStatus: { ...state.currentChatStatus, questionID } }))
  casualTaskState.questionID = questionID
}
const resetMockStore = () => {
  mockTaskStore.setState({
    currentChatStatus: { questionID: '' },
    execute: false,
    initLoading: false,
    pendingReply: false,
    taskDetailsUpdate: 0,
    asyncExecutionUpdate: 0,
    planHistoryList: { records: [] },
    planHistoryCount: 0,
    sessionSnapshot: undefined,
  })
  mockRawData.asyncExecution = undefined
  mockTaskDetailsMap.clear()
  casualTaskState.questionID = ''
}
vi.mock('../../hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => mockTaskStore,
  useCurrentMeta: () => ({ syncIDMap: new Map() }),
  useCurrentRawData: () => mockRawData,
}))

vi.mock('@/pages/ai-agent/aiChatContent/AIContextToken/AIMainModelTokens', () => ({
  default: () => <div data-testid="main-model-tokens" />,
}))

vi.mock('@/pages/ai-re-act/hooks/useAIGlobalConfig', () => ({
  default: () => [{ queryLoading: false, updateLoading: false, aiGlobalConfig: {} }, { onRefresh: vi.fn() }],
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
const {
  mockEmit,
  casualTaskState,
  mockSyncCasualTaskTab,
  mockOpenLogWindow,
  mockExportModalState,
  mockOnSend,
  dispatcherState,
  mockNetWorkApi,
  mockIsCommunityEdition,
} = vi.hoisted(() => ({
  mockEmit: vi.fn(),
  casualTaskState: { questionID: '' },
  mockSyncCasualTaskTab: vi.fn(),
  mockOpenLogWindow: vi.fn(),
  mockExportModalState: { lastVisible: undefined as boolean | undefined },
  mockOnSend: vi.fn(() => true),
  // getSetting 返回的可控配置，「任务详情」入口按 Source 决定是否渲染
  dispatcherState: { setting: { Source: 'ai' } as { Source: string } },
  mockNetWorkApi: vi.fn<(params?: { url?: string }) => Promise<unknown>>(() => Promise.resolve(undefined)),
  mockIsCommunityEdition: vi.fn(() => true),
}))
vi.mock('@/utils/eventBus/eventBus', () => {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>()
  mockEmit.mockImplementation((name: string, ...args: unknown[]) => {
    handlers.get(name)?.forEach((handler) => handler(...args))
  })
  return {
    default: {
      on: vi.fn((name: string, handler: (...args: unknown[]) => void) => {
        if (!handlers.has(name)) handlers.set(name, new Set())
        handlers.get(name)!.add(handler)
      }),
      off: vi.fn((name: string, handler: (...args: unknown[]) => void) => {
        handlers.get(name)?.delete(handler)
      }),
      emit: mockEmit,
    },
  }
})

vi.mock('@/services/fetch', () => ({
  NetWorkApi: mockNetWorkApi,
}))
vi.mock('@/utils/envfile', async () => {
  const actual = (await vi.importActual('@/utils/envfile')) as Record<string, unknown>
  return {
    ...actual,
    isCommunityEdition: () => mockIsCommunityEdition(),
  }
})

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
  default: () => ({ getSetting: () => dispatcherState.setting, onSend: mockOnSend }),
}))

const sessionIdState = vi.hoisted(() => ({ id: '' }))
vi.mock('../../hooks/useCurrentSessionId', () => ({
  default: () => sessionIdState.id,
}))

const browserInstancesMock = vi.hoisted(() => {
  let instances: { id: string }[] = []
  const listeners = new Set<() => void>()
  return {
    getInstances: () => instances,
    setInstances(next: { id: string; online?: boolean }[]) {
      instances = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    reset() {
      instances = []
      listeners.forEach((listener) => listener())
    },
  }
})
vi.mock('@/pages/ai-agent/browserInstances/browserInstanceStore', async () => {
  const React = await import('react')
  return {
    useBrowserInstances: () => {
      const instances = React.useSyncExternalStore(
        browserInstancesMock.subscribe,
        browserInstancesMock.getInstances,
        browserInstancesMock.getInstances,
      )
      return {
        instances,
        history: [],
        pending: [],
        selectedId: '',
        loading: false,
        error: '',
        historyError: '',
        autoApprovalErrors: {},
      }
    },
  }
})

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
      yakitUi: {
        YakitButton: {
          close: '关闭',
        },
        YakitEmpty: {
          noData: '暂无数据',
        },
      },
      layout: {
        CeUserMenu: {
          balance: '余额',
          redeem: '兑换',
          recharge: '充值',
          unlimited: '无限制',
          tokenRemaining: '剩余 Token',
        },
      },
      aiAgent: {
        AISkillLoadingPane: {
          loaded: '已加载',
          available: '可加载',
        },
        AIRightPanel: {
          taskBoard: '任务详情看板',
          fileSystem: '文件系统',
          loadSkills: '加载技能',
          browserInstances: '浏览器实例',
          traffic: '流量',
          risk: '漏洞',
          sessionHistory: '会话历史',
          backgroundTasks: '后台任务',
          executionRunning: '运行中',
          executionSucceeded: '成功',
          executionFailed: '失败',
          executionFailReason: '失败原因',
          executionDuration: '耗时：',
          executionCancel: '取消',
          taskList: '异步任务',
          timeline: '时间线',
          aiSettings: 'AI 设置',
          exportLog: '导出日志',
          viewLog: '查看日志',
          collapse: '折叠',
          more: '更多',
          currentRound: '当前轮数',
          step: 'Step',
          runtime: '运行时间',
          toolCallCount: '工具调用数',
          running: '执行中',
          loginToViewBalance: '登录查看余额',
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
import { clearSessionSnapshotExecutionClocks } from '../../hooks/sessionSnapshotExecution'
import { AIRightPanelPane } from '../AIRightPanelPane'
const { AIRightPanel } = await compileReactModule<typeof AIRightPanelModule>(import.meta.url, '../AIRightPanel.tsx')

vi.mock('@/pages/ai-agent/chatTemplate/historyTaskTree/TaskListPane', () => ({
  TaskListPane: () => <div data-testid="task-list-pane" />,
}))
vi.mock('../AISkillLoadingPane/AISkillLoadingPane', () => ({
  AISkillLoadingPane: ({
    loadState,
    onTotalChange,
  }: {
    loadState: 'loaded' | 'metadata'
    onTotalChange: (total: number) => void
  }) => {
    useEffect(() => {
      onTotalChange(loadState === 'loaded' ? 2 : 0)
    }, [loadState, onTotalChange])
    return <div data-testid="load-skills-pane" data-load-state={loadState} />
  },
}))
vi.mock('@/pages/ai-agent/chatTemplate/TimelineCard/TimelineCard', () => ({
  default: () => <div data-testid="timeline-pane" />,
}))

const renderPanel = async (ui: React.ReactElement) => {
  const renderResult = render(ui)
  // 「任务详情」按条件渲染可能缺席，用常驻菜单「文件系统」作为就绪探针
  await waitFor(() => expect(screen.getByText('文件系统')).toBeInTheDocument())
  return renderResult
}

const expectEmptyDataCards = () => {
  expect(screen.getByText('当前轮数').nextElementSibling).toHaveTextContent('—')
  expect(screen.getByText('运行时间')).toBeVisible()
  expect(screen.getByText('运行时间').nextElementSibling).toHaveTextContent('—')
  expect(screen.getByText('Step')).toBeVisible()
  expect(screen.getByText('Step').nextElementSibling).toHaveTextContent('0')
  expect(screen.getByText('工具调用数')).toBeVisible()
  expect(screen.getByText('工具调用数').nextElementSibling).toHaveTextContent('0')
  expect(screen.getByTestId('main-model-tokens')).toBeInTheDocument()
}

describe('AIRightPanel', () => {
  beforeEach(() => {
    sessionIdState.id = ''
    browserInstancesMock.reset()
    mockRunningTaskStore.setState({ total: 0, running: undefined })
    viewportState.visible = true
    mockAgentStore.setState({ activeChat: undefined })
    mockTaskStore.setState({ execute: false, planHistoryCount: 0 })
    useUserStore.getState().setStoreUserInfo({
      ...useUserStore.getState().userInfo,
      isLogin: false,
    })
    mockIsCommunityEdition.mockReturnValue(true)
    mockNetWorkApi.mockReset()
    mockNetWorkApi.mockResolvedValue(undefined)
    mockOnSend.mockClear()
    mockRawData.asyncExecution = undefined
  })

  afterEach(() => {
    clearSessionSnapshotExecutionClocks()
    vi.useRealTimers()
  })

  it.each([false, true])('异步任务按总数显隐，角标只展示执行中数量（小屏：%s）', (small) => {
    const result = render(<AIRightPanel small={small} />)
    try {
      for (const { total, running } of [
        { total: 0, running: 0 },
        { total: 1, running: 1 },
        { total: 99, running: 99 },
        { total: 100, running: 100 },
        { total: 2, running: 0 },
      ]) {
        act(() => mockRunningTaskStore.setState({ total, running }))
        if (total <= 0) {
          expect(screen.queryByLabelText('异步任务')).not.toBeInTheDocument()
          continue
        }
        const menu = screen.getByLabelText('异步任务')
        const displayedCount = running ? (small ? Math.min(running, 99) : running) : ''
        expect(menu.textContent).toBe(`${small ? '' : '异步任务'}${displayedCount}`)
        if (small && running) {
          const badge = screen.getByLabelText(`异步任务 ${running}`)
          expect(badge).toHaveClass('count-badge')
          expect(badge).not.toHaveClass('count-badge-risk')
          expect(badge.classList.contains('count-badge-overflow')).toBe(running > 99)
        } else {
          expect(screen.queryByLabelText(/^异步任务 /)).not.toBeInTheDocument()
        }
      }
    } finally {
      result.unmount()
    }
  })

  it('异步任务切换宽窄屏保留数量，浮层使用相同标题', () => {
    mockRunningTaskStore.setState({ total: 100, running: 100 })
    const result = render(<AIRightPanel />)
    try {
      expect(screen.getByLabelText('异步任务')).toHaveTextContent('异步任务100')
      result.rerender(<AIRightPanel small />)
      expect(screen.getByLabelText('异步任务 100')).toHaveTextContent('99')
      result.rerender(<AIRightPanel small={false} />)
      expect(screen.queryByLabelText('异步任务 100')).not.toBeInTheDocument()
      expect(screen.getByLabelText('异步任务')).toHaveTextContent('异步任务100')
      fireEvent.click(screen.getByLabelText('异步任务'))
      expect(screen.getByTestId('task-list-pane')).toBeInTheDocument()
      const closeButton = screen.getByRole('button', { name: /关闭|Close|YakitButton\.close/ })
      expect(closeButton.parentElement?.parentElement?.firstElementChild).toHaveTextContent('异步任务100')
      expect(screen.queryByText('任务列表')).not.toBeInTheDocument()
    } finally {
      result.unmount()
    }
  })

  describe('主模型 Tokens 登录入口', () => {
    it('未登录显示登录查看余额，点击触发 onOpenLogin', async () => {
      await renderPanel(<AIRightPanel />)
      const btn = screen.getByRole('button', { name: '登录查看余额' })
      expect(btn).toBeVisible()
      fireEvent.click(btn)
      expect(mockEmit).toHaveBeenCalledWith('onOpenLogin', '')
    })

    it('非社区版未登录不展示登录查看余额', async () => {
      mockIsCommunityEdition.mockReturnValue(false)
      await renderPanel(<AIRightPanel />)
      expect(screen.queryByRole('button', { name: '登录查看余额' })).not.toBeInTheDocument()
      expect(screen.queryByTestId('ce-user-token-quota')).not.toBeInTheDocument()
      expect(mockNetWorkApi).not.toHaveBeenCalled()
    })

    it('已登录无额度数据时不展示余额块', async () => {
      useUserStore.getState().setStoreUserInfo({
        ...useUserStore.getState().userInfo,
        isLogin: true,
      })
      // 列表为空且创建失败 → 配额仍隐藏（与登录入口区分）
      mockNetWorkApi.mockResolvedValue({ data: { apiKey: [] } })
      await renderPanel(<AIRightPanel />)
      await waitFor(() => {
        expect(mockNetWorkApi).toHaveBeenCalled()
      })
      expect(screen.queryByTestId('ce-user-token-quota')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '登录查看余额' })).not.toBeInTheDocument()
    })

    it('已登录无 API Key 时创建后回拉并展示余额块', async () => {
      useUserStore.getState().setStoreUserInfo({
        ...useUserStore.getState().userInfo,
        isLogin: true,
      })
      let apikeysCalls = 0
      mockNetWorkApi.mockImplementation(async (params?: { url?: string }) => {
        if (params?.url === 'apikey') return { ok: true }
        apikeysCalls += 1
        if (apikeysCalls === 1) return { data: { apiKey: [] as string[] } }
        return {
          data: {
            apiKey: ['k'],
            tokenUsed: 0,
            tokenLimit: 100_000_000,
            tokenLimitEnable: true,
          },
        }
      })
      await renderPanel(<AIRightPanel />)
      await waitFor(() => {
        expect(screen.getByTestId('ce-user-token-quota')).toBeInTheDocument()
      })
      expect(mockNetWorkApi.mock.calls.some((call) => call[0]?.url === 'apikey')).toBe(true)
      expect(apikeysCalls).toBeGreaterThanOrEqual(2)
    })

    it('已登录有额度时展示 CeUserMenu 同款余额块，充值触发 onOpenRecharge', async () => {
      useUserStore.getState().setStoreUserInfo({
        ...useUserStore.getState().userInfo,
        isLogin: true,
      })
      mockNetWorkApi.mockResolvedValue({
        data: {
          apiKey: ['k'],
          tokenUsed: 0,
          tokenLimit: 100_000_000,
          tokenLimitEnable: true,
        },
      })
      await renderPanel(<AIRightPanel />)
      await waitFor(() => {
        expect(screen.getByTestId('ce-user-token-quota')).toBeInTheDocument()
      })
      expect(screen.getByText(/余额/)).toBeVisible()
      expect(screen.getByText('¥10')).toBeVisible()
      expect(screen.getByText(/剩余 Token/)).toBeVisible()
      fireEvent.click(screen.getByRole('button', { name: '充值' }))
      expect(mockEmit).toHaveBeenCalledWith('onOpenRecharge', '')
      fireEvent.click(screen.getByTestId('ce-user-token-quota'))
      expect(mockEmit).toHaveBeenCalledWith('onOpenUsageStatistics', '')
    })

    it('点击兑换打开兑换弹窗且不冒泡触发用量统计', async () => {
      useUserStore.getState().setStoreUserInfo({
        ...useUserStore.getState().userInfo,
        isLogin: true,
      })
      mockNetWorkApi.mockResolvedValue({
        data: {
          apiKey: ['k'],
          tokenUsed: 0,
          tokenLimit: 100_000_000,
          tokenLimitEnable: true,
        },
      })
      await renderPanel(<AIRightPanel />)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: '兑换' })).toBeInTheDocument()
      })

      mockEmit.mockClear()
      fireEvent.click(screen.getByRole('button', { name: '兑换' }))

      expect(mockEmit).toHaveBeenCalledWith('onOpenRedeem', '')
      expect(mockEmit).not.toHaveBeenCalledWith('onOpenUsageStatistics', '')
    })

    it('idle 时收到 onRefreshCommunityApiKeys 会刷新余额', async () => {
      useUserStore.getState().setStoreUserInfo({
        ...useUserStore.getState().userInfo,
        isLogin: true,
      })
      mockTaskStore.setState({ execute: false })
      let call = 0
      mockNetWorkApi.mockImplementation(async (params?: { url?: string }) => {
        if (params?.url !== 'apikeys') return undefined
        call += 1
        if (call === 1) {
          return {
            data: {
              apiKey: ['k'],
              tokenUsed: 0,
              tokenLimit: 100_000_000,
              tokenLimitEnable: true,
            },
          }
        }
        return {
          data: {
            apiKey: ['k'],
            tokenUsed: 50_000_000,
            tokenLimit: 100_000_000,
            tokenLimitEnable: true,
          },
        }
      })
      await renderPanel(<AIRightPanel />)
      await waitFor(() => {
        expect(screen.getByText('¥10')).toBeVisible()
      })

      await act(async () => {
        emiter.emit('onRefreshCommunityApiKeys', '')
      })
      await waitFor(() => {
        expect(screen.getByText('¥5')).toBeVisible()
      })
    })

    it('刷新为空或失败时保留已展示的余额块，不卸载闪烁', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
      try {
        useUserStore.getState().setStoreUserInfo({
          ...useUserStore.getState().userInfo,
          isLogin: true,
        })
        mockTaskStore.setState({ execute: true })
        let call = 0
        mockNetWorkApi.mockImplementation(async (params?: { url?: string }) => {
          if (params?.url === 'apikey') return { ok: true }
          call += 1
          if (call === 1) {
            return {
              data: {
                apiKey: ['k'],
                tokenUsed: 0,
                tokenLimit: 100_000_000,
                tokenLimitEnable: true,
              },
            }
          }
          if (call === 2) return { data: { apiKey: [] as string[] } }
          throw new Error('network')
        })

        const result = await renderPanel(<AIRightPanel />)
        try {
          await waitFor(() => expect(screen.getByTestId('ce-user-token-quota')).toBeInTheDocument())
          expect(screen.getByText('¥10')).toBeVisible()

          await act(async () => {
            await vi.advanceTimersByTimeAsync(10_000)
          })
          expect(screen.getByTestId('ce-user-token-quota')).toBeInTheDocument()
          expect(screen.getByText('¥10')).toBeVisible()

          await act(async () => {
            await vi.advanceTimersByTimeAsync(10_000)
          })
          expect(screen.getByTestId('ce-user-token-quota')).toBeInTheDocument()
          expect(screen.getByText('¥10')).toBeVisible()
        } finally {
          result.unmount()
          resetMockStore()
        }
      } finally {
        vi.useRealTimers()
      }
    })

    it('已有展示数据时 effect 重跑拿到空列表不重复建 key', async () => {
      useUserStore.getState().setStoreUserInfo({
        ...useUserStore.getState().userInfo,
        isLogin: true,
      })
      mockTaskStore.setState({ execute: false })
      let apikeysCalls = 0
      mockNetWorkApi.mockImplementation(async (params?: { url?: string }) => {
        if (params?.url === 'apikey') return { ok: true }
        apikeysCalls += 1
        if (apikeysCalls === 1) {
          return {
            data: {
              apiKey: ['k'],
              tokenUsed: 0,
              tokenLimit: 100_000_000,
              tokenLimitEnable: true,
            },
          }
        }
        return { data: { apiKey: [] as string[] } }
      })

      const result = await renderPanel(<AIRightPanel />)
      try {
        await waitFor(() => expect(screen.getByTestId('ce-user-token-quota')).toBeInTheDocument())
        expect(screen.getByText('¥10')).toBeVisible()
        expect(mockNetWorkApi.mock.calls.some((call) => call[0]?.url === 'apikey')).toBe(false)

        // 翻转 execute 触发 effect 重跑 ensureApiKeys；空列表且已有展示 → 不 POST apikey
        await act(async () => {
          mockTaskStore.setState({ execute: true })
        })
        await waitFor(() => expect(apikeysCalls).toBeGreaterThanOrEqual(2))
        expect(mockNetWorkApi.mock.calls.some((call) => call[0]?.url === 'apikey')).toBe(false)
        expect(screen.getByTestId('ce-user-token-quota')).toBeInTheDocument()
        expect(screen.getByText('¥10')).toBeVisible()
      } finally {
        result.unmount()
        resetMockStore()
      }
    })

    it('已有展示数据时 ensureApiKeys 失败保留余额块且不建 key', async () => {
      useUserStore.getState().setStoreUserInfo({
        ...useUserStore.getState().userInfo,
        isLogin: true,
      })
      mockTaskStore.setState({ execute: false })
      let apikeysCalls = 0
      mockNetWorkApi.mockImplementation(async (params?: { url?: string }) => {
        if (params?.url === 'apikey') return { ok: true }
        apikeysCalls += 1
        if (apikeysCalls === 1) {
          return {
            data: {
              apiKey: ['k'],
              tokenUsed: 0,
              tokenLimit: 100_000_000,
              tokenLimitEnable: true,
            },
          }
        }
        throw new Error('network')
      })

      const result = await renderPanel(<AIRightPanel />)
      try {
        await waitFor(() => expect(screen.getByTestId('ce-user-token-quota')).toBeInTheDocument())
        expect(screen.getByText('¥10')).toBeVisible()

        await act(async () => {
          mockTaskStore.setState({ execute: true })
        })
        await waitFor(() => expect(apikeysCalls).toBeGreaterThanOrEqual(2))
        expect(mockNetWorkApi.mock.calls.some((call) => call[0]?.url === 'apikey')).toBe(false)
        expect(screen.getByTestId('ce-user-token-quota')).toBeInTheDocument()
        expect(screen.getByText('¥10')).toBeVisible()
      } finally {
        result.unmount()
        resetMockStore()
      }
    })

    it('polls apikeys every 10s while execute and stops after execute ends', async () => {
      // Only fake interval APIs so RTL waitFor (setTimeout-based) still works.
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
      try {
        useUserStore.getState().setStoreUserInfo({
          ...useUserStore.getState().userInfo,
          isLogin: true,
        })
        mockNetWorkApi.mockResolvedValue({
          data: {
            apiKey: ['k'],
            tokenUsed: 0,
            tokenLimit: 100_000_000,
            tokenLimitEnable: true,
          },
        })
        mockTaskStore.setState({ execute: true })

        const result = await renderPanel(<AIRightPanel />)
        try {
          await waitFor(() => expect(screen.getByTestId('ce-user-token-quota')).toBeInTheDocument())
          await waitFor(() => expect(mockNetWorkApi.mock.calls.length).toBeGreaterThanOrEqual(1))
          const afterStart = mockNetWorkApi.mock.calls.length

          await act(async () => {
            await vi.advanceTimersByTimeAsync(10_000)
          })
          expect(mockNetWorkApi.mock.calls.length).toBe(afterStart + 1)

          await act(async () => {
            await vi.advanceTimersByTimeAsync(10_000)
          })
          expect(mockNetWorkApi.mock.calls.length).toBe(afterStart + 2)

          await act(async () => {
            mockTaskStore.setState({ execute: false })
          })
          // execute=false re-runs effect: one trailing fetch, interval cleared
          await waitFor(() => expect(mockNetWorkApi.mock.calls.length).toBe(afterStart + 3))

          const afterEnd = mockNetWorkApi.mock.calls.length
          await act(async () => {
            await vi.advanceTimersByTimeAsync(20_000)
          })
          expect(mockNetWorkApi.mock.calls.length).toBe(afterEnd)
        } finally {
          result.unmount()
          resetMockStore()
        }
      } finally {
        vi.useRealTimers()
      }
    })

    it('重叠的 apikeys 请求只采纳最新响应，忽略慢返回的旧余额', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
      try {
        useUserStore.getState().setStoreUserInfo({
          ...useUserStore.getState().userInfo,
          isLogin: true,
        })
        mockTaskStore.setState({ execute: true })

        let resolveFirst!: (value: unknown) => void
        const firstPending = new Promise((resolve) => {
          resolveFirst = resolve
        })
        let call = 0
        mockNetWorkApi.mockImplementation(() => {
          call += 1
          if (call === 1) return firstPending
          return Promise.resolve({
            data: {
              apiKey: ['k'],
              tokenUsed: 50_000_000,
              tokenLimit: 100_000_000,
              tokenLimitEnable: true,
            },
          })
        })

        const result = await renderPanel(<AIRightPanel />)
        try {
          await waitFor(() => expect(mockNetWorkApi.mock.calls.length).toBe(1))

          await act(async () => {
            await vi.advanceTimersByTimeAsync(10_000)
          })
          await waitFor(() => {
            expect(screen.getByTestId('ce-user-token-quota')).toBeInTheDocument()
            // tokenUsed=50M / limit=100M → 余额 ¥5
            expect(screen.getByText('¥5')).toBeVisible()
          })

          // 更早发出的慢请求带回更高剩余额度，不得覆盖已展示的新数据
          await act(async () => {
            resolveFirst({
              data: {
                apiKey: ['k'],
                tokenUsed: 0,
                tokenLimit: 100_000_000,
                tokenLimitEnable: true,
              },
            })
            await Promise.resolve()
          })
          expect(screen.getByText('¥5')).toBeVisible()
          expect(screen.queryByText('¥10')).not.toBeInTheDocument()
        } finally {
          result.unmount()
          resetMockStore()
        }
      } finally {
        vi.useRealTimers()
      }
    })

    it('退出后空 key 账号登录会清除旧额度并仍可创建 key，旧请求不能恢复缓存', async () => {
      useUserStore.getState().setStoreUserInfo({
        ...useUserStore.getState().userInfo,
        isLogin: true,
      })
      mockTaskStore.setState({ execute: false })

      let resolveStale!: (value: unknown) => void
      const stalePending = new Promise((resolve) => {
        resolveStale = resolve
      })
      let phase: 'account-a' | 'relogin' = 'account-a'
      let apikeysCalls = 0

      mockNetWorkApi.mockImplementation(async (params?: { url?: string }) => {
        if (params?.url === 'apikey') return { ok: true }
        apikeysCalls += 1
        if (phase === 'account-a') {
          if (apikeysCalls === 1) {
            return {
              data: {
                apiKey: ['old-k'],
                tokenUsed: 0,
                tokenLimit: 100_000_000,
                tokenLimitEnable: true,
              },
            }
          }
          // effect 因 execute 翻转重跑：挂起，模拟退出后才返回的旧请求
          return stalePending
        }
        // 新账号：空列表 → 创建 → 回拉新额度
        if (apikeysCalls === 1) return { data: { apiKey: [] as string[] } }
        return {
          data: {
            apiKey: ['new-k'],
            tokenUsed: 50_000_000,
            tokenLimit: 100_000_000,
            tokenLimitEnable: true,
          },
        }
      })

      const result = await renderPanel(<AIRightPanel />)
      try {
        await waitFor(() => expect(screen.getByTestId('ce-user-token-quota')).toBeInTheDocument())
        expect(screen.getByText('¥10')).toBeVisible()

        await act(async () => {
          mockTaskStore.setState({ execute: true })
        })
        await waitFor(() => expect(apikeysCalls).toBeGreaterThanOrEqual(2))

        await act(async () => {
          useUserStore.getState().setStoreUserInfo({
            ...useUserStore.getState().userInfo,
            isLogin: false,
          })
        })
        await waitFor(() => {
          expect(screen.queryByTestId('ce-user-token-quota')).not.toBeInTheDocument()
          expect(screen.getByRole('button', { name: '登录查看余额' })).toBeVisible()
        })

        phase = 'relogin'
        apikeysCalls = 0
        mockNetWorkApi.mockClear()
        await act(async () => {
          mockTaskStore.setState({ execute: false })
          useUserStore.getState().setStoreUserInfo({
            ...useUserStore.getState().userInfo,
            isLogin: true,
          })
        })
        await waitFor(() => {
          expect(screen.getByTestId('ce-user-token-quota')).toBeInTheDocument()
          // tokenUsed=50M → ¥5，证明新账号额度而非旧 ¥10
          expect(screen.getByText('¥5')).toBeVisible()
        })
        expect(mockNetWorkApi.mock.calls.some((call) => call[0]?.url === 'apikey')).toBe(true)
        expect(screen.queryByText('¥10')).not.toBeInTheDocument()

        await act(async () => {
          resolveStale({
            data: {
              apiKey: ['old-k'],
              tokenUsed: 0,
              tokenLimit: 100_000_000,
              tokenLimitEnable: true,
            },
          })
          await Promise.resolve()
        })
        expect(screen.getByText('¥5')).toBeVisible()
        expect(screen.queryByText('¥10')).not.toBeInTheDocument()
      } finally {
        result.unmount()
        resetMockStore()
      }
    })
  })

  describe('首页模式', () => {
    it.each([false, true])('welcome 模式不渲染右侧菜单与数据卡（小屏：%s）', async (small) => {
      casualTaskState.questionID = 'existing-task'
      try {
        const { container } = render(<AIRightPanel welcome small={small} layoutRef={{ current: null }} />)
        expect(container.querySelector('[data-ai-right-panel]')).toBeInTheDocument()
        for (const label of ['文件系统', '浏览器实例', '流量', '漏洞', '会话历史']) {
          expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
          expect(screen.queryByText(label)).not.toBeInTheDocument()
        }
        for (const label of ['任务详情看板', '加载技能', '异步任务', '更多', '时间线', '导出日志', '查看日志']) {
          expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
        }
        expect(screen.queryByText('运行时间')).not.toBeInTheDocument()
        expect(screen.queryByText('工具调用统计')).not.toBeInTheDocument()
        expect(grpcQueryHTTPFlows).not.toHaveBeenCalled()
        expect(apiRiskFieldGroup).not.toHaveBeenCalled()
      } finally {
        resetMockStore()
      }
    })

    it('welcome 模式不读取当前任务数据，也不查询全量统计', async () => {
      setMockQuestionID('existing-task')
      mockTaskDetailsMap.set('existing-task', {
        uuid: 'stream-1',
        execution: { http_flow_count: 999, risk_level_count: { critical: 888, total: 888 } },
      })
      const readTask = vi.spyOn(mockTaskDetailsMap, 'get')
      const { unmount } = render(<AIRightPanel welcome layoutRef={{ current: null }} />)
      try {
        expect(screen.queryByLabelText('流量')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('漏洞')).not.toBeInTheDocument()
        expect(readTask).not.toHaveBeenCalled()
        expect(grpcQueryHTTPFlows).not.toHaveBeenCalled()
        expect(apiRiskFieldGroup).not.toHaveBeenCalled()
      } finally {
        unmount()
        readTask.mockRestore()
        resetMockStore()
      }
    })

    it('从会话模式切回 welcome 时关闭内容浮层', async () => {
      const result = await renderPanel(<AIRightPanel />)
      try {
        fireEvent.click(screen.getByLabelText('加载技能'))
        expect(screen.getByTestId('load-skills-pane')).toBeInTheDocument()
        result.rerender(<AIRightPanel welcome layoutRef={{ current: null }} />)
        await waitFor(() => expect(screen.queryByTestId('load-skills-pane')).not.toBeInTheDocument())
        expect(screen.queryByLabelText('文件系统')).not.toBeInTheDocument()
      } finally {
        result.unmount()
        resetMockStore()
      }
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

  it.each([
    ['异步任务', 'task-list-pane'],
    ['时间线', 'timeline-pane'],
    ['加载技能', 'load-skills-pane'],
  ])('切换详情会话后关闭旧会话的%s', (label, testId) => {
    mockRunningTaskStore.setState({ total: 1, running: 1 })
    mockAgentStore.setState({ activeChat: { Id: 1, SessionID: 'session-1' } })
    render(<AIRightPanel small />)
    fireEvent.click(screen.getByLabelText('更多'))
    fireEvent.click(screen.getByLabelText(label))
    expect(screen.getByTestId(testId)).toBeInTheDocument()

    act(() => {
      mockAgentStore.setState({ activeChat: { Id: 2, SessionID: 'session-2' } })
    })

    expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
  })

  it('正常态点击时间线打开面板，关闭后恢复菜单', async () => {
    await renderPanel(<AIRightPanel />)
    fireEvent.click(screen.getByLabelText('更多'))
    fireEvent.click(screen.getByLabelText('时间线'))
    expect(screen.getByTestId('timeline-pane')).toBeInTheDocument()
    const closeButton = screen.getByRole('button', { name: /关闭|Close|YakitButton\.close/ })
    const actions = closeButton.parentElement!
    const header = actions.parentElement!
    expect(header.firstElementChild).toHaveTextContent('时间线')
    expect(header.firstElementChild?.querySelector('button')).toBeNull()
    expect(within(actions).getByRole('button', { name: /copyDump/ })).toBeInTheDocument()
    expect(within(actions).getByRole('button', { name: /refresh/ })).toBeInTheDocument()
    expect(within(actions).getAllByRole('button')).toHaveLength(3)
    fireEvent.click(closeButton)
    expect(screen.queryByTestId('timeline-pane')).not.toBeInTheDocument()
    expect(screen.getByLabelText('文件系统')).toBeInTheDocument()
  })

  it('小屏点击在异步任务和时间线间切换，移出不销毁', async () => {
    mockRunningTaskStore.setState({ total: 1, running: 1 })
    render(<AIRightPanel small />)
    fireEvent.click(screen.getByLabelText('更多'))
    const taskItem = screen.getByLabelText('异步任务')
    const timelineItem = screen.getByLabelText('时间线')
    fireEvent.click(taskItem)
    expect(screen.getByTestId('task-list-pane')).toBeInTheDocument()
    fireEvent.click(timelineItem)
    expect(screen.queryByTestId('task-list-pane')).not.toBeInTheDocument()
    expect(screen.getByTestId('timeline-pane')).toBeInTheDocument()
    fireEvent.mouseLeave(timelineItem)
    expect(screen.getByTestId('timeline-pane')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /关闭|Close|YakitButton\.close/ }))
    expect(screen.queryByTestId('timeline-pane')).not.toBeInTheDocument()
  })
  it.each([
    ['异步任务', 'task-list-pane'],
    ['加载技能', 'load-skills-pane'],
  ])('正常态点击%s替换菜单，关闭后恢复菜单', async (label, testId) => {
    mockRunningTaskStore.setState({ total: 1, running: 1 })
    await renderPanel(<AIRightPanel />)
    fireEvent.click(screen.getByLabelText(label))
    expect(screen.getByTestId(testId)).toBeVisible()
    const header = screen.getByTestId(testId).closest('section')!.querySelector('header')!
    expect(within(header).getAllByRole('button')).toHaveLength(1)
    expect(screen.getByLabelText('文件系统').parentElement?.parentElement?.parentElement?.className).toContain(
      'right-panel-hidden',
    )
    fireEvent.click(screen.getByRole('button', { name: /关闭|Close|YakitButton\.close/ }))
    expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    expect(screen.getByLabelText('文件系统').parentElement?.parentElement?.parentElement?.className).not.toContain(
      'right-panel-hidden',
    )
  })

  it.each([
    ['异步任务', 'task-list-pane'],
    ['加载技能', 'load-skills-pane'],
  ])('小屏点击%s打开浮层，移出不销毁', async (label, testId) => {
    mockRunningTaskStore.setState({ total: 1, running: 1 })
    render(<AIRightPanel small />)
    const item = screen.getByLabelText(label)
    fireEvent.click(item)
    const pane = screen.getByTestId(testId).closest('section')!.parentElement!
    expect(pane.className).toContain('pane-slot-small')
    fireEvent.mouseLeave(item)
    fireEvent.mouseLeave(pane)
    expect(screen.getByTestId(testId)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /关闭|Close|YakitButton\.close/ }))
    expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    expect(screen.getByLabelText('文件系统')).toBeInTheDocument()
  })

  it('切换屏幕模式时清理打开的任务浮层', () => {
    mockRunningTaskStore.setState({ total: 1, running: 1 })
    const result = render(<AIRightPanel small />)
    fireEvent.click(screen.getByLabelText('异步任务'))
    result.rerender(<AIRightPanel small={false} />)
    expect(screen.queryByTestId('task-list-pane')).not.toBeInTheDocument()
  })

  it.each([false, true])('加载技能菜单位于文件系统和浏览器实例之间（小屏：%s）', (small) => {
    browserInstancesMock.setInstances([{ id: 'browser-1', online: true }])
    try {
      render(<AIRightPanel small={small} />)
      const loadSkills = screen.getByLabelText('加载技能')
      expect(screen.getByLabelText('文件系统').nextElementSibling).toBe(loadSkills)
      expect(loadSkills.nextElementSibling).toBe(screen.getByLabelText('浏览器实例'))
    } finally {
      cleanup()
      browserInstancesMock.reset()
    }
  })

  it('进入会话面板时同步后台执行和规划快照', () => {
    sessionIdState.id = 'session-1'
    render(<AIRightPanel />)
    for (const syncType of ['async_execution_sync', 'plan_exec_tasks']) {
      expect(mockOnSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'session-1',
          params: expect.objectContaining({ IsSyncMessage: true, SyncType: syncType }),
        }),
      )
    }
  })

  it('历史恢复完成后再同步右侧面板快照', () => {
    sessionIdState.id = 'session-1'
    mockTaskStore.setState({ initLoading: true, execute: true })
    render(<AIRightPanel />)
    expect(mockOnSend).not.toHaveBeenCalled()
    act(() => mockTaskStore.setState({ initLoading: false }))
    expect(mockOnSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'session-1',
        params: expect.objectContaining({ IsSyncMessage: true, SyncType: 'async_execution_sync' }),
      }),
    )
  })

  it('无会话时不同步右侧面板快照', () => {
    render(<AIRightPanel />)
    expect(mockOnSend).not.toHaveBeenCalled()
  })

  it('有规划历史时展示异步任务入口', () => {
    mockTaskStore.setState({ planHistoryCount: 2, planHistoryList: { records: [] } })
    render(<AIRightPanel />)
    expect(screen.getByLabelText('异步任务')).toBeInTheDocument()
    expect(screen.getByLabelText('异步任务')).toHaveTextContent('异步任务')
  })

  it('后台任务位于异步任务上方，打开后按运行中、成功、失败展示', () => {
    mockRunningTaskStore.setState({ total: 1, running: 1 })
    sessionIdState.id = 'session-1'
    mockRawData.asyncExecution = {
      revision: 4,
      running_count: 1,
      updated_at: 14,
      executions: [{ execute_id: 'exec-1', state: 'running' }],
    }
    mockTaskStore.setState({ asyncExecutionUpdate: 1 })
    render(<AIRightPanel />)
    const background = screen.getByLabelText('后台任务')
    expect(background.nextElementSibling).toBe(screen.getByLabelText('异步任务'))
    expect(background).toHaveTextContent('后台任务1')
    fireEvent.click(background)
    expect(screen.getByText('运行中')).toBeInTheDocument()
    expect(screen.queryByText('成功')).not.toBeInTheDocument()
    expect(screen.queryByText('失败')).not.toBeInTheDocument()
    expect(mockOnSend).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'session-1',
        params: expect.objectContaining({ IsSyncMessage: true, SyncType: 'async_execution_sync' }),
      }),
    )
  })

  it('后台任务数量为 0 时不展示菜单', () => {
    mockRawData.asyncExecution = {
      revision: 0,
      running_count: 0,
      updated_at: 0,
      executions: [],
    }
    mockTaskStore.setState({ asyncExecutionUpdate: 1 })
    render(<AIRightPanel />)
    expect(screen.queryByLabelText('后台任务')).not.toBeInTheDocument()
  })

  it('后台任务菜单和面板标题展示全部执行数量', () => {
    mockRawData.asyncExecution = {
      revision: 4,
      running_count: 1,
      updated_at: 14,
      executions: [
        { execute_id: 'exec-1', state: 'running' },
        { execute_id: 'exec-2', state: 'completed' },
      ],
    }
    mockTaskStore.setState({ asyncExecutionUpdate: 1 })
    render(<AIRightPanel />)
    expect(screen.getByLabelText('后台任务')).toHaveTextContent('后台任务2')
    fireEvent.click(screen.getByLabelText('后台任务'))
    const paneTitle = screen.getAllByText('后台任务').find((node) => node.closest('header'))
    expect(paneTitle?.closest('header')).toHaveTextContent('后台任务2')
  })

  it('小屏加载技能与异步任务互相切换', () => {
    mockRunningTaskStore.setState({ total: 1, running: 1 })
    render(<AIRightPanel small />)
    const loadSkills = screen.getByLabelText('加载技能')
    fireEvent.click(loadSkills)
    expect(screen.getByTestId('load-skills-pane')).toBeVisible()
    fireEvent.click(screen.getByLabelText('异步任务'))
    expect(screen.queryByTestId('load-skills-pane')).not.toBeInTheDocument()
    expect(screen.getByTestId('task-list-pane')).toBeVisible()
    fireEvent.click(loadSkills)
    expect(screen.queryByTestId('task-list-pane')).not.toBeInTheDocument()
    expect(screen.getByTestId('load-skills-pane')).toBeVisible()
  })

  it.each([false, true])('加载技能标题切换已加载和可加载列表（小屏：%s）', (small) => {
    render(<AIRightPanel small={small} />)
    fireEvent.click(screen.getByLabelText('加载技能'))
    expect(screen.getByTestId('load-skills-pane')).toHaveAttribute('data-load-state', 'loaded')
    const pane = screen.getByTestId('load-skills-pane').closest('section')!
    expect(within(pane).getByText('2')).toBeInTheDocument()
    fireEvent.click(screen.getByText('可加载'))
    expect(screen.getByTestId('load-skills-pane')).toHaveAttribute('data-load-state', 'metadata')
    expect(within(pane).getByText('0')).toBeInTheDocument()
    fireEvent.click(screen.getByText('已加载'))
    expect(screen.getByTestId('load-skills-pane')).toHaveAttribute('data-load-state', 'loaded')
    expect(within(pane).getByText('2')).toBeInTheDocument()
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
      expect(screen.getByText('运行时间')).toBeInTheDocument()
      expect(screen.getAllByText('1h40m').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('工具调用数')).toBeInTheDocument()
      expect(screen.getByTestId('main-model-tokens')).toBeInTheDocument()
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
    expect(screen.queryByText('运行时间')).not.toBeInTheDocument()
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
    mockTaskStore.setState({
      sessionSnapshot: {
        execution: {
          http_flow_count: 3,
          risk_level_count: { critical: 1, high: 0, warning: 0, low: 0, info: 0, other: 0, total: 1 },
        },
      },
    })
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
      resetMockStore()
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

  it('无当前任务时用会话累计快照展示流量和漏洞', async () => {
    mockTaskStore.setState({
      sessionSnapshot: {
        current_round: 5,
        execution: {
          http_flow_count: 15,
          risk_level_count: { critical: 1, high: 2, warning: 0, low: 0, info: 0, other: 0, total: 3 },
        },
      },
    })
    const result = await renderPanel(<AIRightPanel />)
    expect(screen.getByText('当前轮数').nextElementSibling).toHaveTextContent('5')
    expect(screen.getByText('当前轮数').compareDocumentPosition(screen.getByText('Step'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    try {
      expect(screen.getByLabelText('流量')).toHaveTextContent('15')
      expect(screen.getByLabelText('漏洞')).toHaveTextContent('1｜2')
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it('同时有任务 execution 与会话累计时展示任务侧数值', async () => {
    setMockQuestionID('task-prefer')
    mockTaskDetailsMap.set('task-prefer', {
      uuid: 'uuid-prefer',
      execution: {
        http_flow_count: 42,
        risk_level_count: { critical: 4, high: 0, warning: 0, low: 0, info: 0, other: 0, total: 4 },
      },
    })
    mockTaskStore.setState({
      sessionSnapshot: {
        execution: {
          http_flow_count: 15,
          risk_level_count: { critical: 1, high: 2, warning: 0, low: 0, info: 0, other: 0, total: 3 },
        },
      },
    })
    const result = await renderPanel(<AIRightPanel />)
    try {
      expect(screen.getByLabelText('流量')).toHaveTextContent('42')
      expect(screen.getByLabelText('漏洞')).toHaveTextContent(/^漏洞4$/)
      expect(screen.getByLabelText('流量')).not.toHaveTextContent('15')
      expect(screen.getByLabelText('漏洞')).not.toHaveTextContent('1｜2')
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
      // 仅展示非零等级：严重 2、低危 1（工具调用数可能展示 0，故限定在漏洞入口内断言）
      expect(riskButton).toContainElement(screen.getByText('2'))
      expect(riskButton).toContainElement(screen.getByText('1'))
      expect(riskButton.textContent || '').not.toMatch(/(^|[｜])0([｜]|$)/)
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it('漏洞等级计数全部为 0 时不显示漏洞入口', async () => {
    setMockQuestionID('task-risk-all-zero')
    mockTaskDetailsMap.set('task-risk-all-zero', {
      uuid: 'uuid-risk-all-zero',
      execution: {
        risk_level_count: { critical: 0, high: 0, warning: 0, low: 0, info: 0, other: 0, total: 0 },
      },
    })
    const result = await renderPanel(<AIRightPanel />)
    try {
      expect(screen.queryByLabelText('漏洞')).not.toBeInTheDocument()
      expect(screen.queryByText('｜')).not.toBeInTheDocument()
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it.each([false, true])('数量更新后无需悬停即可刷新流量和漏洞（小屏：%s）', (small) => {
    vi.useFakeTimers()
    setMockQuestionID('task-live-count')
    mockRunningTaskStore.setState({ total: 7, running: 7 })
    const detail = {
      uuid: 'snapshot-0',
      execution: { http_flow_count: 0, risk_level_count: { high: 0, total: 0 } },
    }
    mockTaskDetailsMap.set('task-live-count', detail)
    try {
      render(<AIRightPanel small={small} />)
      expect(screen.queryByLabelText('流量')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('漏洞')).not.toBeInTheDocument()

      for (const [index, count] of [42, 99, 100, 366, 58, 0].entries()) {
        // 与 session_snapshot 一致：保留任务条目引用，替换 execution 并更新 uuid。
        detail.execution = { http_flow_count: count, risk_level_count: { high: count, total: count } }
        detail.uuid = `snapshot-${index + 1}`
        act(() => mockTaskStore.setState((state) => ({ taskDetailsUpdate: state.taskDetailsUpdate + 1 })))
        act(() => vi.advanceTimersByTime(3000))

        expect(screen.getByLabelText('异步任务').textContent).toBe(`${small ? '' : '异步任务'}7`)
        if (count === 0) {
          expect(screen.queryByLabelText('流量')).not.toBeInTheDocument()
          expect(screen.queryByLabelText('漏洞')).not.toBeInTheDocument()
          continue
        }
        const displayedCount = small && count > 99 ? 99 : count
        expect(screen.getByLabelText('流量').textContent).toBe(`${small ? '' : '流量'}${displayedCount}`)
        expect(screen.getByLabelText('漏洞').textContent).toBe(`${small ? '' : '漏洞'}${displayedCount}`)
        if (small) {
          for (const label of ['流量', '漏洞']) {
            const badge = screen.getByLabelText(`${label} ${count}`)
            expect(badge.classList.contains('count-badge-overflow')).toBe(count > 99)
          }
        }
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
        if (label === '漏洞') expect(badge).toHaveClass('count-badge-risk')
        else expect(badge).not.toHaveClass('count-badge-risk')
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
      expect(screen.queryByLabelText('流量')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('漏洞')).not.toBeInTheDocument()
      expectEmptyDataCards()

      act(() => setMockQuestionID('task-first'))
      expect(screen.getByLabelText('流量')).toHaveTextContent('42')
      expect(screen.getByLabelText('漏洞')).toHaveTextContent('2｜3')
      act(() => setMockQuestionID(''))
      expect(screen.queryByLabelText('流量')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('漏洞')).not.toBeInTheDocument()
      expectEmptyDataCards()
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it('当正常态面板会遮挡列表时切换为小屏态', async () => {
    const listElement = document.createElement('div')
    let listWidth = 1188
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
      // 1188 - 325 = 863，小于内容最大宽度，仅显示图标。
      await waitFor(() => expect(screen.getByLabelText('文件系统')).toBeInTheDocument())
      expect(screen.queryByText('文件系统')).not.toBeInTheDocument()

      // 剩余 864px 时恢复正常态，显示菜单文案。
      listWidth = 1189
      act(() => resizeCallback?.())
      await waitFor(() => expect(screen.getByText('文件系统')).toBeInTheDocument())
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('小屏判断跟随聊天容器宽度并在最大宽度边界切换', async () => {
    const listElement = document.createElement('div')

    let listWidth = 864
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

      // 容器宽度达到 1189px 后，扣除 325px 面板槽位正好剩余 864px。
      listWidth = 1189
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
      expect(screen.getAllByText('1h40m').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('工具调用数').nextElementSibling).toHaveTextContent('4')
      expect(screen.getByTestId('main-model-tokens')).toBeInTheDocument()

      // 当前任务无执行数据时保留卡片，旧统计值替换为占位符。
      act(() => setMockQuestionID('task-without-data'))
      expectEmptyDataCards()
      expect(screen.queryByText('1h40m')).not.toBeInTheDocument()
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it('运行中快照转为 completed 后运行时间停在后端秒数', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    setMockQuestionID('task-clock-end')
    mockAgentStore.setState({ activeChat: { Id: 1, SessionID: 'session-clock' } })
    mockTaskStore.setState((state) => ({
      execute: true,
      currentChatStatus: { ...state.currentChatStatus, status: AITaskStatus.inProgress },
    }))
    const taskDetails: MockTaskDetails = {
      uuid: 'uuid-clock-1',
      execution: { status: 'processing', execution_seconds: 10, started_at: 1000 },
    }
    mockTaskDetailsMap.set('task-clock-end', taskDetails)
    const result = await renderPanel(<AIRightPanel />)
    try {
      expect(screen.getByText('运行时间').nextElementSibling).toHaveTextContent('10s')
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      expect(screen.getByText('运行时间').nextElementSibling).toHaveTextContent('13s')

      taskDetails.uuid = 'uuid-clock-2'
      taskDetails.execution = { status: 'completed', execution_seconds: 10, started_at: 1000 }
      act(() => mockTaskStore.setState((state) => ({ taskDetailsUpdate: state.taskDetailsUpdate + 1 })))
      await waitFor(() => expect(screen.getByText('运行时间').nextElementSibling).toHaveTextContent('10s'), {
        timeout: 5000,
      })
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(screen.getByText('运行时间').nextElementSibling).toHaveTextContent('10s')
    } finally {
      result.unmount()
      resetMockStore()
      mockAgentStore.setState({ activeChat: undefined })
    }
  })

  it('关闭会话后快照仍为 processing 时运行时间停止累加', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    setMockQuestionID('task-clock-close')
    mockAgentStore.setState({ activeChat: { Id: 1, SessionID: 'session-clock-close' } })
    mockTaskStore.setState((state) => ({
      execute: true,
      currentChatStatus: { ...state.currentChatStatus, status: AITaskStatus.inProgress },
    }))
    mockTaskDetailsMap.set('task-clock-close', {
      uuid: 'uuid-clock-close',
      execution: { status: 'processing', execution_seconds: 10, started_at: 1000 },
    })
    const result = await renderPanel(<AIRightPanel />)
    try {
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      expect(screen.getByText('运行时间').nextElementSibling).toHaveTextContent('13s')

      act(() => mockTaskStore.setState({ execute: false }))
      expect(screen.getByText('运行时间').nextElementSibling).toHaveTextContent('10s')
      act(() => {
        vi.advanceTimersByTime(4000)
      })
      expect(screen.getByText('运行时间').nextElementSibling).toHaveTextContent('10s')
    } finally {
      result.unmount()
      resetMockStore()
      mockAgentStore.setState({ activeChat: undefined })
    }
  })

  it('问题结束后即使快照仍为 processing 运行时间停止累加', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    setMockQuestionID('task-clock-idle')
    mockAgentStore.setState({ activeChat: { Id: 1, SessionID: 'session-clock-idle' } })
    mockTaskStore.setState((state) => ({
      execute: true,
      currentChatStatus: { ...state.currentChatStatus, status: AITaskStatus.inProgress },
    }))
    mockTaskDetailsMap.set('task-clock-idle', {
      uuid: 'uuid-clock-idle',
      execution: { status: 'processing', execution_seconds: 10, started_at: 1000 },
    })
    const result = await renderPanel(<AIRightPanel />)
    try {
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      expect(screen.getByText('运行时间').nextElementSibling).toHaveTextContent('13s')

      act(() =>
        mockTaskStore.setState((state) => ({
          currentChatStatus: { ...state.currentChatStatus, status: AITaskStatus.success },
        })),
      )
      expect(screen.getByText('运行时间').nextElementSibling).toHaveTextContent('10s')
      act(() => {
        vi.advanceTimersByTime(4000)
      })
      expect(screen.getByText('运行时间').nextElementSibling).toHaveTextContent('10s')
    } finally {
      result.unmount()
      resetMockStore()
      mockAgentStore.setState({ activeChat: undefined })
    }
  })

  it('运行时间优先使用 execution_seconds，不采用墙钟跨度', async () => {
    setMockQuestionID('task-seconds')
    mockTaskDetailsMap.set('task-seconds', {
      uuid: 'uuid-seconds',
      execution: {
        execution_seconds: 4 * 3600,
        execution_minutes: 240,
        started_at: 1000,
        ended_at: 1000 + 13 * 86400,
      },
    })
    const result = await renderPanel(<AIRightPanel />)
    try {
      expect(screen.getByText('运行时间').nextElementSibling).toHaveTextContent('4h')
      expect(screen.queryByText(`${13 * 86400}s`)).not.toBeInTheDocument()
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
      // 有 started_at 无 ended_at：执行中（Step 与运行时间各一处）
      expect(screen.getAllByText('执行中').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('工具调用数').nextElementSibling).toHaveTextContent('2')

      // 仅更新 store，由父级订阅自动刷新传参，不手动重渲染或重新挂载卡片。
      act(() => {
        setMockQuestionID('task-empty')
      })
      expectEmptyDataCards()
      expect(screen.queryByText('执行中')).not.toBeInTheDocument()
      act(() => setMockQuestionID('task-2'))
      expect(screen.getAllByText('执行中').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('工具调用数').nextElementSibling).toHaveTextContent('2')
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it('数据源：同任务详情原地更新（uuid 变化）后通过更新通知刷新卡片数据', async () => {
    setMockQuestionID('task-3')
    const taskDetails: MockTaskDetails = {
      uuid: 'uuid-3a',
      execution: { started_at: 1000, ended_at: 0, tool_call_success: 0, tool_call_failed: 0, tool_call_total: 0 },
    }
    mockTaskDetailsMap.set('task-3', taskDetails)
    const result = await renderPanel(<AIRightPanel />)
    try {
      expect(screen.getAllByText('执行中').length).toBeGreaterThanOrEqual(1)

      // session_snapshot 保留详情对象引用并替换 execution，通过 store 通知并比较 uuid 感知更新。
      taskDetails.uuid = 'uuid-3b'
      taskDetails.execution = {
        started_at: 1000,
        ended_at: 9000,
        tool_call_success: 5,
        tool_call_failed: 2,
        tool_call_total: 7,
      }
      act(() => mockTaskStore.setState((state) => ({ taskDetailsUpdate: state.taskDetailsUpdate + 1 })))
      // 防抖等待 3s，超时放宽到 5s 预留余量，避免慢环境下 flaky
      await waitFor(() => expect(screen.getAllByText('2h13m').length).toBeGreaterThanOrEqual(1), {
        timeout: 5000,
      })
      expect(screen.getByText('工具调用数').nextElementSibling).toHaveTextContent('7')
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it('浏览器实例、流量、漏洞没有数据时不显示，有数据时显示数量', async () => {
    const result = await renderPanel(<AIRightPanel />)
    try {
      expect(screen.queryByLabelText('浏览器实例')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('流量')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('漏洞')).not.toBeInTheDocument()

      setMockQuestionID('task-activity')
      mockTaskDetailsMap.set('task-activity', {
        uuid: 'uuid-activity',
        execution: {
          http_flow_count: 8,
          risk_level_count: { critical: 1, high: 0, warning: 0, low: 0, info: 0, other: 0, total: 1 },
        },
      })
      act(() => {
        browserInstancesMock.setInstances([
          { id: 'browser-1', online: true },
          { id: 'browser-2', online: true },
        ])
        mockTaskStore.setState((state) => ({ taskDetailsUpdate: state.taskDetailsUpdate + 1 }))
      })
      expect(screen.getByLabelText('浏览器实例')).toHaveTextContent('2')
      await waitFor(() => expect(screen.getByLabelText('流量')).toHaveTextContent('8'), { timeout: 5000 })
      expect(screen.getByLabelText('漏洞')).toHaveTextContent('1')
    } finally {
      result.unmount()
      resetMockStore()
    }
  })

  it('菜单点击：文件系统/浏览器/会话历史激活侧边栏对应页，流量/漏洞切换工作区', async () => {
    browserInstancesMock.setInstances([{ id: 'browser-1', online: true }])
    setMockQuestionID('menu-click')
    mockTaskDetailsMap.set('menu-click', {
      uuid: 'uuid-menu-click',
      execution: {
        http_flow_count: 2,
        risk_level_count: { critical: 1, high: 0, warning: 0, low: 0, info: 0, other: 0, total: 1 },
      },
    })
    const result = await renderPanel(<AIRightPanel />)
    try {
      fireEvent.click(screen.getByText('文件系统'))
      expect(mockEmit).toHaveBeenCalledWith(
        'switchAIAgentTab',
        JSON.stringify({ type: 'setTabActive', params: { active: 'file', show: true, toggle: true } }),
      )
      fireEvent.click(screen.getByText('流量'))
      expect(mockEmit).toHaveBeenCalledWith('switchAIActTab', JSON.stringify({ key: 'http' }))
      fireEvent.click(screen.getByText('漏洞'))
      expect(mockEmit).toHaveBeenCalledWith('switchAIActTab', JSON.stringify({ key: 'risk' }))
      fireEvent.click(screen.getByText('浏览器实例'))
      expect(mockEmit).toHaveBeenCalledWith(
        'switchAIAgentTab',
        JSON.stringify({ type: 'setTabActive', params: { active: 'browser', show: true, toggle: true } }),
      )
      fireEvent.click(screen.getByText('会话历史'))
      expect(mockEmit).toHaveBeenCalledWith(
        'switchAIAgentTab',
        JSON.stringify({ type: 'setTabActive', params: { active: 'session', show: true, toggle: true } }),
      )
    } finally {
      result.unmount()
      browserInstancesMock.reset()
      resetMockStore()
    }
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
