import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
})
