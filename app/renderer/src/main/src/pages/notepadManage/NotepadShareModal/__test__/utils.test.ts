import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiGetUserSearch } from '../utils'

const { networkApi, yakitNotify } = vi.hoisted(() => ({
  networkApi: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('@/services/fetch', () => ({ NetWorkApi: networkApi }))
vi.mock('@/utils/notification', () => ({ yakitNotify }))

describe('apiGetUserSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('查询条件为空时直接返回空列表且不发起请求', async () => {
    await expect(apiGetUserSearch({})).resolves.toEqual({ data: [] })

    expect(networkApi).not.toHaveBeenCalled()
    expect(yakitNotify).not.toHaveBeenCalled()
  })

  it('仅传 uid 时通过 GET user/search 查询并透传参数', async () => {
    const response = { data: [{ uid: 'uid-1', name: '张三' }] }
    networkApi.mockResolvedValueOnce(response)

    await expect(apiGetUserSearch({ uid: 'uid-1' })).resolves.toBe(response)

    expect(networkApi).toHaveBeenCalledWith({
      method: 'get',
      url: 'user/search',
      params: { uid: 'uid-1' },
    })
  })

  it('传入关键词时通过 GET user/search 查询并透传参数', async () => {
    const response = { data: [{ uid: 'uid-2', name: '李四' }] }
    networkApi.mockResolvedValueOnce(response)

    await expect(apiGetUserSearch({ keywords: '李四' })).resolves.toBe(response)

    expect(networkApi).toHaveBeenCalledWith({
      method: 'get',
      url: 'user/search',
      params: { keywords: '李四' },
    })
  })

  it('请求失败时提示错误并透传拒绝', async () => {
    const error = new Error('offline')
    networkApi.mockRejectedValueOnce(error)

    await expect(apiGetUserSearch({ uid: 'uid-1' })).rejects.toBe(error)
    expect(yakitNotify).toHaveBeenCalledWith('error', `apiGetUserSearch获取普通用户失败:${error}`)
  })
})
