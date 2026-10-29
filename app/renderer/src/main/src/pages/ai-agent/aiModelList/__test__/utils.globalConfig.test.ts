import { beforeEach, describe, expect, it } from 'vitest'
import { ipcRendererMock, resetIpcMocks } from '../../../ai-re-act/hooks/__test__/setupElectron'
import { defaultAIGlobalConfig } from '../../defaultConstant'
import { grpcGetAIGlobalConfig } from '../utils'

beforeEach(resetIpcMocks)

describe('grpcGetAIGlobalConfig', () => {
  it.each([
    ['0', 0],
    ['12', 12],
    ['60000', 60000],
    [12, 12],
    [undefined, 0],
  ])('normalizes the IPC RPM value %s to a number', async (wireValue, expected) => {
    // 主进程 proto-loader 的 longs: String 会将 int64 返回为字符串。
    const response = {
      ...defaultAIGlobalConfig,
      RetryForever: true,
      NetworkDebug: true,
      ModelRequestsPerMinute: wireValue,
    }
    ipcRendererMock.invoke.mockResolvedValueOnce(response)

    const config = await grpcGetAIGlobalConfig()

    expect(ipcRendererMock.invoke).toHaveBeenCalledWith('GetAIGlobalConfig')
    expect(config).toEqual({ ...response, ModelRequestsPerMinute: expected })
    expect(response.ModelRequestsPerMinute).toBe(wireValue)
  })
})
