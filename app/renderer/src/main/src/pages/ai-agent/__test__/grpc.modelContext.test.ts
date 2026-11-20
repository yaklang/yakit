import '../../ai-re-act/hooks/__test__/setupElectron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ipcRendererMock } from '../../ai-re-act/hooks/__test__/setupElectron'
import { grpcGetAIModelContext, grpcSetAIModelContext } from '../grpc'
import { yakitNotify } from '@/utils/notification'

vi.mock('@/utils/notification', () => ({ yakitNotify: vi.fn() }))
vi.mock('../../ai-re-act/hooks/utils', () => ({ genBaseAIChatData: vi.fn(), isToolExecStream: vi.fn() }))

const identity = { Provider: 'openai', Model: 'model', ContextKey: 'opaque-key' }
const saved = { ...identity, ThresholdTokens: '500000', MinimumThresholdTokens: '100000', DisableAutoAdjust: false }

describe('model context RPC boundary', () => {
  beforeEach(() => {
    ipcRendererMock.invoke.mockReset()
    vi.mocked(yakitNotify).mockClear()
  })

  it('returns the GetAIModelContext response directly', async () => {
    ipcRendererMock.invoke.mockResolvedValueOnce(saved)
    await expect(grpcGetAIModelContext(identity)).resolves.toBe(saved)
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('GetAIModelContext', identity)
  })

  it('preserves explicitly enabling automatic adjustment', async () => {
    ipcRendererMock.invoke.mockResolvedValueOnce(saved)
    await expect(grpcSetAIModelContext({ ...identity, ThresholdTokens: 0, DisableAutoAdjust: false })).resolves.toBe(
      saved,
    )
    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('SetAIModelContext', {
      ...identity,
      ThresholdTokens: 0,
      DisableAutoAdjust: false,
    })
  })

  it('preserves UNIMPLEMENTED independently of its message', async () => {
    ipcRendererMock.invoke.mockRejectedValueOnce(Object.assign(new Error('old engine'), { code: 12 }))
    await expect(grpcGetAIModelContext(identity)).rejects.toMatchObject({ code: 12, message: 'old engine' })
    expect(yakitNotify).toHaveBeenCalledOnce()
  })

  it('lets the context editor handle a gRPC failure without a duplicate notification', async () => {
    ipcRendererMock.invoke.mockRejectedValueOnce(Object.assign(new Error('old engine'), { code: 12 }))
    await expect(grpcGetAIModelContext(identity, true)).rejects.toMatchObject({ code: 12 })
    expect(yakitNotify).not.toHaveBeenCalled()
  })

  it('rethrows an IPC failure and reports the failed save by default', async () => {
    const error = new Error('IPC unavailable')
    ipcRendererMock.invoke.mockRejectedValueOnce(error)
    await expect(grpcSetAIModelContext({ ...identity, ThresholdTokens: 600000 })).rejects.toBe(error)
    expect(yakitNotify).toHaveBeenCalledWith('error', expect.stringContaining('保存模型上下文失败'))
  })
})
