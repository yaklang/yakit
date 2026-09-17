import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GrpcOutput, StreamOptions } from '@/services/ipc'
const mocks = vi.hoisted(() => {
  const invoke = vi.fn()
  Object.defineProperty(window, 'require', { configurable: true, value: () => ({ ipcRenderer: { invoke } }) })
  return { invoke, openStream: vi.fn(), notify: vi.fn() }
})
vi.mock('@/services/ipc', () => ({ ipc: { openStream: mocks.openStream } }))
vi.mock('@/services/fetch', () => ({ NetWorkApi: vi.fn() }))
vi.mock('@/utils/notification', () => ({ yakitNotify: mocks.notify, yakitFailed: mocks.notify, info: mocks.notify }))
vi.mock('@/pages/plugins/builtInData', () => ({ defaultFilter: {}, defaultSearch: {}, pluginTypeToName: {} }))
vi.mock('@/defaultConstants/PluginBatchExecutor', () => ({ defPluginBatchExecuteExtraFormValue: {} }))
vi.mock('@/pages/pluginEditor/utils/convert', () => ({ delInvalidPluginExecuteParams: (params: unknown) => params }))
vi.mock('@/hook/useHoldGRPCStream/constant', () => ({ DefaultTabs: () => [] }))
import useMultipleHoldGRPCStream from '../useMultipleHoldGRPCStream'
import { apiDebugPlugin, type DebugPluginRequest } from '@/pages/plugins/utils'
const request: DebugPluginRequest = {
  Code: '',
  PluginType: 'yak',
  Input: 'discard for yak',
  ExecParams: [],
  PluginName: 'test',
  HTTPRequestTemplate: {
    IsHttpFlowId: false,
    HTTPFlowId: [],
    IsHttps: false,
    IsRawHTTPRequest: false,
    RawHTTPRequest: new Uint8Array(),
    Method: 'GET',
    Path: [],
    GetParams: [],
    Headers: [],
    Cookie: [],
    Body: new Uint8Array(),
    PostParams: [],
    MultipartParams: [],
    MultipartFileParams: [],
  },
}
const output: GrpcOutput<'DebugPlugin'> = {
  Hash: '',
  OutputJson: '',
  Raw: new Uint8Array(),
  IsMessage: true,
  Message: new TextEncoder().encode(
    JSON.stringify({ type: 'log', content: { level: 'info', data: 'early message', timestamp: 1 } }),
  ),
  Id: '9223372036854775807',
  RuntimeID: 'runtime',
  Progress: 0,
  PluginName: '',
}

describe('knowledge tasks using the shared SDK', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)
  it('uses the supplied opener after plugin preprocessing and preserves its error', async () => {
    const error = new Error('backend details')
    const open = vi.fn().mockRejectedValue(error)
    await expect(apiDebugPlugin({ params: request, open, isShowStartInfo: false })).rejects.toBe(error)
    expect(open).toHaveBeenCalledWith({ ...request, Input: '' })
    expect(mocks.invoke).not.toHaveBeenCalled()
  })
  it('captures data emitted before the opening response and records terminal loading state', async () => {
    mocks.openStream.mockImplementation(
      async (_namespace, _api, _params, options: StreamOptions<GrpcOutput<'DebugPlugin'>>) => {
        await options.onData!(output)
        options.onEnd!()
        return { cancel: vi.fn().mockResolvedValue(undefined) }
      },
    )
    const onEnd = vi.fn()
    const { result } = renderHook(useMultipleHoldGRPCStream)
    await act(async () =>
      result.current[1].createStream('early', {
        taskName: 'test',
        apiKey: 'DebugPlugin',
        token: 'early',
        autoClear: false,
        request: { params: request, isShowStartInfo: false },
        onEnd,
      }),
    )
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ loading: false, runtimeId: 'runtime' }))
    expect(result.current[0].early.logState[0].data).toBe('early message')
    expect(result.current[0].early.loading).toBe(false)
    expect(mocks.invoke).not.toHaveBeenCalled()
  })
  it('aborts every task when clearing the store and ignores stale events after token reuse', async () => {
    const options: StreamOptions<GrpcOutput<'DebugPlugin'>>[] = []
    mocks.openStream.mockImplementation(async (_namespace, _api, _params, value) => {
      options.push(value)
      return { cancel: vi.fn().mockResolvedValue(undefined) }
    })
    const { result } = renderHook(useMultipleHoldGRPCStream)
    const start = (token: string) =>
      result.current[1].createStream(token, {
        taskName: 'test',
        apiKey: 'DebugPlugin',
        token,
        request: { params: request, isShowStartInfo: false },
      })
    await act(async () => {
      await start('a')
      await start('b')
    })
    await act(async () => {
      result.current[1].clearAllStreams()
      await start('a')
      await options[0].onData!(output)
    })
    expect(options[0].signal?.aborted).toBe(true)
    expect(options[1].signal?.aborted).toBe(true)
    expect(options[2].signal?.aborted).toBe(false)
    expect(result.current[0].a.logState).toEqual([])
  })
})
