import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getMachineID: vi.fn(),
  NetWorkApi: vi.fn(),
}))

vi.mock('@/services/electronBridge', () => ({
  yakitHost: { getMachineID: mocks.getMachineID },
}))

vi.mock('@/services/fetch', () => ({
  NetWorkApi: mocks.NetWorkApi,
}))

const loadVisitorsStatistics = async () => {
  vi.resetModules()
  return import('../visitorsStatistics')
}

describe('visitorsStatisticsFun', () => {
  beforeEach(() => {
    mocks.getMachineID.mockReset().mockResolvedValue({ MachineID: 'machine-id' })
    mocks.NetWorkApi.mockReset().mockResolvedValue({})
  })

  it('等待异步机器码获取完成后才检查发送资格', async () => {
    let resolveMachineID!: (value: { MachineID: string }) => void
    mocks.getMachineID.mockImplementationOnce(
      () => new Promise<{ MachineID: string }>((resolve) => (resolveMachineID = resolve)),
    )
    const canSend = vi.fn().mockReturnValue(false)
    const { visitorsStatisticsFun } = await loadVisitorsStatistics()

    const result = visitorsStatisticsFun('token', undefined, canSend)
    await Promise.resolve()
    expect(canSend).not.toHaveBeenCalled()

    resolveMachineID({ MachineID: 'machine-id' })
    await expect(result).resolves.toBe(false)
    expect(canSend).toHaveBeenCalledOnce()
    expect(mocks.NetWorkApi).not.toHaveBeenCalled()
  })

  it('异步 guard 拒绝或抛错时不发送请求', async () => {
    const { visitorsStatisticsFun } = await loadVisitorsStatistics()

    await expect(visitorsStatisticsFun('token', undefined, async () => false)).resolves.toBe(false)
    await expect(
      visitorsStatisticsFun('token', undefined, async () => {
        throw new Error('stale activity')
      }),
    ).resolves.toBe(false)
    expect(mocks.NetWorkApi).not.toHaveBeenCalled()
  })

  it('带 guard 时等待统计请求结束并传递 token、form 与机器码', async () => {
    let resolveRequest!: (value: object) => void
    mocks.NetWorkApi.mockImplementationOnce(() => new Promise<object>((resolve) => (resolveRequest = resolve)))
    const { visitorsStatisticsFun } = await loadVisitorsStatistics()
    let settled = false

    const result = visitorsStatisticsFun('token-a', 'login', () => true).then((value) => {
      settled = true
      return value
    })
    await vi.waitFor(() => expect(mocks.NetWorkApi).toHaveBeenCalledOnce())
    expect(settled).toBe(false)
    expect(mocks.NetWorkApi).toHaveBeenCalledWith({
      url: 'tourist',
      method: 'post',
      data: { macCode: 'machine-id', token: 'token-a', form: 'login' },
    })

    resolveRequest({})
    await expect(result).resolves.toBe(true)
    expect(settled).toBe(true)
  })
})
