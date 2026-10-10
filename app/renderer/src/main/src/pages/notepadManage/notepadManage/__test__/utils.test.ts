import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { apiGetNotepadList as GetNotepadList } from '../utils'

const { networkApi, yakitNotify } = vi.hoisted(() => ({
  networkApi: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('@/services/fetch', () => ({ NetWorkApi: networkApi }))
vi.mock('@/utils/notification', () => ({ yakitNotify }))

let apiGetNotepadList: typeof GetNotepadList

describe('apiGetNotepadList', () => {
  beforeAll(async () => {
    Object.defineProperty(window, 'require', {
      configurable: true,
      value: vi.fn(() => ({ ipcRenderer: { invoke: vi.fn(), on: vi.fn(), removeListener: vi.fn() } })),
    })
    ;({ apiGetNotepadList } = await import('../utils'))
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('使用 POST notepad/list，并补齐默认分页参数和筛选字段', async () => {
    const response = { data: [], pagemeta: { page: 1, limit: 20, total: 0 } }
    networkApi.mockResolvedValueOnce(response)

    await expect(
      apiGetNotepadList({
        page: 0,
        limit: 0,
        keywords: 'report',
        user: 'alice',
        collaborator: 'bob',
      }),
    ).resolves.toBe(response)

    expect(networkApi).toHaveBeenCalledWith({
      method: 'post',
      url: 'notepad/list',
      data: {
        page: 1,
        limit: 20,
        order: 'desc',
        order_by: 'updated_at',
        keywords: 'report',
        user: 'alice',
        collaborator: 'bob',
      },
    })
  })

  it('保留显式分页和排序参数', async () => {
    networkApi.mockResolvedValueOnce({ data: [], pagemeta: { page: 3, limit: 50, total: 0 } })

    await apiGetNotepadList({
      page: 3,
      limit: 50,
      order: 'asc',
      order_by: 'created_at',
      keywords: '',
      user: '',
      collaborator: '',
    })

    expect(networkApi).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: 'notepad/list',
        data: expect.objectContaining({ page: 3, limit: 50, order: 'asc', order_by: 'created_at' }),
      }),
    )
  })

  it('请求失败时透传拒绝，并按 hiddenError 控制错误提示', async () => {
    const error = new Error('offline')
    networkApi.mockRejectedValueOnce(error).mockRejectedValueOnce(error)

    await expect(apiGetNotepadList({ page: 0, limit: 0, keywords: '', user: '' })).rejects.toBe(error)
    expect(yakitNotify).toHaveBeenCalledWith('error', `获取云文档列表失败:${error}`)

    yakitNotify.mockClear()
    await expect(apiGetNotepadList({ page: 0, limit: 0, keywords: '', user: '' }, true)).rejects.toBe(error)
    expect(yakitNotify).not.toHaveBeenCalled()
  })
})
