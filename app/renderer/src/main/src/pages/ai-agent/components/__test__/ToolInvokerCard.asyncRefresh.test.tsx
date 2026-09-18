import '@/pages/ai-re-act/hooks/__test__/setupElectron'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ToolInvokerCard from '../ToolInvokerCard'
import { grpcQueryAIToolDetails } from '../../grpc'
import { SessionLifecycle } from '@/pages/ai-re-act/hooks/sessionLifecycle'
import { AIChatQSDataTypeEnum, type AIChatQSData } from '@/pages/ai-re-act/hooks/aiRender'
import { aiToolResultDataHandlers } from '@/pages/ai-re-act/hooks/grpcStreamHandler/aiToolResult'
import { makeGrpcJsonRes, makeHandlerRequest } from '@/pages/ai-re-act/hooks/__test__/fixtures'

const { updateToolResult, ensureSession } = vi.hoisted(() => ({ updateToolResult: vi.fn(), ensureSession: vi.fn() }))
vi.mock('../../grpc', () => ({ grpcQueryAIToolDetails: vi.fn() }))
vi.mock('../../useContext/useStore', () => ({ default: () => ({ activeChat: { id: 's' } }) }))
vi.mock('../../useContext/useDispatcher', () => ({ default: () => ({}) }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentSessionId', () => ({ default: () => 's' }))
vi.mock('@/pages/ai-re-act/hooks/useCurrentDataBySession', () => ({ useCurrentRawData: () => ({}) }))
vi.mock('@/pages/ai-re-act/hooks/ChatMultiSessionController', () => ({
  globalSessionEngine: { updateToolResult, ensureSession },
}))
vi.mock('@/pages/ai-re-act/hooks/useUiExpand', () => ({ useUiExpand: () => [false, vi.fn(), vi.fn()] }))
vi.mock('@/pages/ai-re-act/hooks/useAINodeLabel', () => ({ default: () => ({ nodeLabel: '' }) }))
vi.mock('@/utils/isAuxOrChildWindow', () => ({ isAuxOrChildWindow: () => false }))
vi.mock('@/pages/ai-re-act/aiReActChatContents/AIReActChatContents', () => ({ AIReferenceNode: () => null }))
vi.mock('../aiChatListItem/StreamingChatContent/hooks/useStreamingChatContent', () => ({
  useStreamingChatContent: vi.fn(),
}))
vi.mock('../FileList', () => ({ default: () => null }))
vi.mock('../OperationCardFooter/OperationCardFooter', () => ({ OperationCardFooter: () => null }))
// DataCompare → httpFlow 顶层 window.require('electron')，本用例不测对比抽屉
vi.mock('@/pages/compare/DataCompare', () => ({ CodeComparison: () => null }))

describe('ToolInvokerCard asynchronous detail refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })
  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it.each(['active', 'reconnected'])('only applies results for the original connection (%s)', async (state) => {
    const req = makeHandlerRequest({
      res: makeGrpcJsonRes('tool_call_start', {
        call_tool_id: 'tool',
        tool: { name: 'http', description: '' },
        start_time: 1,
        start_time_ms: 1,
      }),
    })
    aiToolResultDataHandlers.tool_call_start(req)
    const item = req.rawData.contents.get('tool')
    if (item?.type !== AIChatQSDataTypeEnum.TOOL_RESULT) throw new Error('missing tool fixture')
    item.data.type = 'result'
    item.data.tool.status = 'success'
    const original = new SessionLifecycle()
    ensureSession.mockReturnValue({ meta: { lifecycle: original } })
    let resolve!: (value: AIChatQSData[]) => void
    vi.mocked(grpcQueryAIToolDetails).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    render(<ToolInvokerCard itemData={item} renderNum={0} fileList={[]} />)
    // 工具结果卡片的第一个按钮为刷新详情，第二个为展开。
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(grpcQueryAIToolDetails).toHaveBeenCalledWith({ ProcessID: 'tool' })
    if (state === 'reconnected') {
      original.current = false
      ensureSession.mockReturnValue({ meta: { lifecycle: new SessionLifecycle() } })
    }
    await act(async () => {
      resolve([
        {
          id: 'detail',
          type: AIChatQSDataTypeEnum.TOOL_CALL_RESULT,
          chatType: 'reAct',
          Timestamp: 1,
          AIService: '',
          AIModelName: '',
          data: {
            content: 'output',
            status: 'end',
            CallToolID: 'tool',
            EventUUID: 'detail',
            NodeId: '',
            NodeIdVerbose: { Zh: '', En: '' },
            ContentType: '',
            executionResult: undefined,
          },
        },
      ])
    })
    if (state === 'active') expect(updateToolResult).toHaveBeenCalledWith('s', 'tool', { resultDetails: 'output' })
    else expect(updateToolResult).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
  })
})
