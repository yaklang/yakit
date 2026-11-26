import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'zustand/vanilla'
import type { AIAgentGrpcApi } from '../../../hooks/grpcApi'
import { AIInputEventSyncTypeEnum, AsyncExecutionState } from '../../../hooks/grpcApi'
import type * as AIBackgroundTaskPaneModule from '../AIBackgroundTaskPane'
import { compileReactModule } from '@/utils/__test__/helpers/compileReactModule'

const { onSend } = vi.hoisted(() => ({ onSend: vi.fn() }))
const store = createStore(() => ({ asyncExecutionUpdate: 0 }))
const session = { id: 'session-1' }
const rawData: { asyncExecution?: AIAgentGrpcApi.AsyncExecutionSnapshot } = {}

vi.mock('antd', () => ({ Tooltip: ({ children }: { children: ReactNode }) => children }))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({
  CheckCircleOutlined: () => null,
  ChevronRightOutlined: () => null,
  LoadingOutlined: () => null,
  QuestionMarkCircleOutlined: () => null,
  XCircleOutlined: () => null,
  XOutlined: () => null,
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({ useI18nNamespaces: () => ({ t: (key: string) => key }) }))
vi.mock('@/components/yakitUI/YakitEmpty/YakitEmpty', () => ({ YakitEmpty: () => <div>empty</div> }))
vi.mock('@/components/yakitUI/YakitTag/YakitTag', () => ({
  YakitTag: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('@/utils/randomUtil', () => ({ randomString: () => 'sync-id' }))
vi.mock('../../../hooks/useCurrentDataBySession', () => ({
  useCurrentStore: () => store,
  useCurrentRawData: () => rawData,
}))
vi.mock('../../../hooks/useCurrentSessionId', () => ({
  default: () => session.id,
}))
vi.mock('@/pages/ai-agent/useContext/useDispatcher', () => ({ default: () => ({ onSend }) }))
// CI 的根配置将样式模块替换为空对象；折叠用例需要稳定 class 名。
vi.mock('../AIBackgroundTaskPane.module.scss', () => ({
  default: {
    content: 'content',
    empty: 'empty',
    'group-title': 'group-title',
    expanded: 'expanded',
    'group-list': 'group-list',
    'group-list-inner': 'group-list-inner',
    'execution-item': 'execution-item',
    'running-item': 'running-item',
    running: 'running',
    completed: 'completed',
    failed: 'failed',
    'execution-time': 'execution-time',
    'execution-time-hide': 'execution-time-hide',
    'execution-fail-reason': 'execution-fail-reason',
    'execution-cancel': 'execution-cancel',
    'list-end': 'list-end',
  },
}))

const { AIBackgroundTaskPane } = await compileReactModule<typeof AIBackgroundTaskPaneModule>(
  import.meta.url,
  '../AIBackgroundTaskPane.tsx',
)

const makeExecution = (
  executeId: string,
  state: AsyncExecutionState,
  name = executeId,
): AIAgentGrpcApi.AsyncExecutionSummary => ({
  execute_id: executeId,
  state,
  metadata: { name },
})

const makeSnapshot = (running: number, succeeded: number, failed: number): AIAgentGrpcApi.AsyncExecutionSnapshot => ({
  revision: 1,
  running_count: running,
  updated_at: 1,
  executions: [
    ...Array.from({ length: running }, (_, i) => makeExecution(`r-${i}`, AsyncExecutionState.running)),
    ...Array.from({ length: succeeded }, (_, i) => makeExecution(`s-${i}`, AsyncExecutionState.completed)),
    ...Array.from({ length: failed }, (_, i) => makeExecution(`f-${i}`, AsyncExecutionState.failed)),
  ],
})

const groupTitle = (section: 'Running' | 'Succeeded' | 'Failed') =>
  screen.getByText(new RegExp(`AIRightPanel\\.execution${section}`))

const expectSectionExpanded = (section: 'Running' | 'Succeeded' | 'Failed', expanded: boolean) => {
  const title = groupTitle(section)
  expect(title).toHaveClass('group-title')
  const list = title.nextElementSibling
  expect(list).toHaveClass('group-list')
  if (expanded) {
    expect(title).toHaveClass('expanded')
    expect(list).toHaveClass('expanded')
  } else {
    expect(title).not.toHaveClass('expanded')
    expect(list).not.toHaveClass('expanded')
  }
}

describe('AIBackgroundTaskPane', () => {
  beforeEach(() => {
    onSend.mockClear()
    session.id = 'session-1'
    rawData.asyncExecution = undefined
    store.setState({ asyncExecutionUpdate: 0 })
  })
  afterEach(() => cleanup())

  it('没有执行时展示空状态，并同步查询快照', () => {
    render(<AIBackgroundTaskPane />)
    expect(screen.getByText('empty')).toBeInTheDocument()
    expect(screen.queryByText('AIRightPanel.executionRunning')).not.toBeInTheDocument()
    expect(onSend).toHaveBeenCalledWith({
      token: 'session-1',
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_ASYNC_EXECUTION,
        SyncID: 'sync-id',
      },
    })
  })

  it('按运行中、成功、失败分组，空分组不渲染', () => {
    rawData.asyncExecution = {
      revision: 3,
      running_count: 1,
      updated_at: 1,
      executions: [
        makeExecution('exec-running', AsyncExecutionState.running, 'pcap-analysis'),
        makeExecution('exec-pending', AsyncExecutionState.pending, 'wait-tool'),
        makeExecution('exec-done', AsyncExecutionState.completed, 'cmd'),
        makeExecution('exec-failed', AsyncExecutionState.failed, 'scan_port'),
        makeExecution('exec-cancelled', AsyncExecutionState.cancelled, 'fuzz'),
        makeExecution('exec-timeout', AsyncExecutionState.timedOut, 'slow'),
        { execute_id: 'exec-no-name', state: AsyncExecutionState.running },
      ],
    }
    render(<AIBackgroundTaskPane />)
    expect(screen.getByText(/AIRightPanel\.executionRunning/)).toBeInTheDocument()
    expect(screen.getByText(/AIRightPanel\.executionSucceeded/)).toBeInTheDocument()
    expect(screen.getByText(/AIRightPanel\.executionFailed/)).toBeInTheDocument()
    expect(screen.getByText('pcap-analysis')).toBeInTheDocument()
    expect(screen.getByText('wait-tool')).toBeInTheDocument()
    expect(screen.getByText('cmd')).toBeInTheDocument()
    expect(screen.getByText('scan_port')).toBeInTheDocument()
    expect(screen.getByText('fuzz')).toBeInTheDocument()
    expect(screen.getByText('slow')).toBeInTheDocument()
    expect(screen.getByText('exec-no-name')).toBeInTheDocument()
    expect(screen.getByText('YakitEmpty.end_of_list')).toBeInTheDocument()
  })

  it('仅有运行中时不展示成功和失败，点击取消发送停止请求', () => {
    rawData.asyncExecution = {
      revision: 1,
      running_count: 1,
      updated_at: 1,
      executions: [makeExecution('exec-1', AsyncExecutionState.running, 'authorization-bypass')],
    }
    render(<AIBackgroundTaskPane />)
    expect(screen.getByText(/AIRightPanel\.executionRunning/)).toBeInTheDocument()
    expect(screen.queryByText(/AIRightPanel\.executionSucceeded/)).not.toBeInTheDocument()
    expect(screen.queryByText(/AIRightPanel\.executionFailed/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('AIRightPanel.executionCancel'))
    expect(onSend).toHaveBeenCalledWith({
      token: 'session-1',
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_STOP_ASYNC_EXECUTION,
        SyncID: 'sync-id',
        SyncJsonInput: JSON.stringify({ execute_id: 'exec-1' }),
      },
    })
  })

  it('首帧有数据时按 expandLimit 决定各分组初始展开', () => {
    rawData.asyncExecution = makeSnapshot(6, 6, 1)
    render(<AIBackgroundTaskPane />)
    expectSectionExpanded('Running', true)
    expectSectionExpanded('Succeeded', false)
    expectSectionExpanded('Failed', false)
    cleanup()

    rawData.asyncExecution = makeSnapshot(1, 6, 1)
    render(<AIBackgroundTaskPane />)
    expectSectionExpanded('Running', true)
    expectSectionExpanded('Succeeded', true)
    expectSectionExpanded('Failed', false)
  })

  it('异步数据到达后按 expandLimit 初始化展开态', () => {
    render(<AIBackgroundTaskPane />)
    expect(screen.getByText('empty')).toBeInTheDocument()

    rawData.asyncExecution = makeSnapshot(6, 1, 1)
    act(() => {
      store.setState({ asyncExecutionUpdate: 1 })
    })
    expectSectionExpanded('Running', true)
    expectSectionExpanded('Succeeded', false)
    expectSectionExpanded('Failed', false)
  })

  it('stopping 状态归入运行中并展示取消', () => {
    rawData.asyncExecution = {
      revision: 1,
      running_count: 1,
      updated_at: 1,
      executions: [makeExecution('exec-stopping', AsyncExecutionState.stopping, 'stopping-task')],
    }
    render(<AIBackgroundTaskPane />)
    expect(screen.getByText(/AIRightPanel\.executionRunning/)).toBeInTheDocument()
    expect(screen.getByText('stopping-task')).toBeInTheDocument()
    fireEvent.click(screen.getByText('AIRightPanel.executionCancel'))
    expect(onSend).toHaveBeenCalledWith({
      token: 'session-1',
      type: '',
      params: {
        IsSyncMessage: true,
        SyncType: AIInputEventSyncTypeEnum.SYNC_TYPE_STOP_ASYNC_EXECUTION,
        SyncID: 'sync-id',
        SyncJsonInput: JSON.stringify({ execute_id: 'exec-stopping' }),
      },
    })
  })

  it('点击分组标题切换折叠', () => {
    rawData.asyncExecution = makeSnapshot(1, 1, 1)
    render(<AIBackgroundTaskPane />)
    expectSectionExpanded('Running', true)
    expectSectionExpanded('Succeeded', true)
    expectSectionExpanded('Failed', true)

    fireEvent.click(groupTitle('Succeeded'))
    expectSectionExpanded('Running', true)
    expectSectionExpanded('Succeeded', false)
    expectSectionExpanded('Failed', true)

    fireEvent.click(groupTitle('Succeeded'))
    expectSectionExpanded('Succeeded', true)
  })
})
