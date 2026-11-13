import { beforeEach, describe, expect, it, vi } from 'vitest'
import { grpcFetchIntranetYakitVersion } from '../grpc'

const mocks = vi.hoisted(() => ({
  netWorkApi: vi.fn(),
  fetchEnterpriseUpdateInfo: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('@/services/fetch', () => ({
  NetWorkApi: (...args: unknown[]) => mocks.netWorkApi(...args),
}))

vi.mock('@/services/electronBridge', () => ({
  yakitEngine: {
    fetchEnterpriseUpdateInfo: (...args: unknown[]) => mocks.fetchEnterpriseUpdateInfo(...args),
  },
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: (...args: unknown[]) => mocks.yakitNotify(...args),
}))

vi.mock('@/utils/envfile', () => ({
  getReleaseEditionName: () => 'Yakit',
  toEngineHandshakeName: (name: string) => name,
}))

vi.mock('@/i18n/i18n', () => ({
  default: {
    getFixedT: () => (key: string, options?: { error?: unknown }) =>
      options?.error === undefined ? key : `${key}:${String(options.error)}`,
  },
}))

describe('内网 Yakit 更新包', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchEnterpriseUpdateInfo.mockResolvedValue({ version: '1.4.2' })
  })

  it('请求安装包，并跳过排在前面的普通文件', async () => {
    mocks.netWorkApi.mockResolvedValue({
      data: [
        { fileType: 'other_file', filePath: '/files/notes.txt' },
        { fileType: 'yak_data', filePath: '/files/yakit-1.4.2.exe' },
      ],
    })

    await expect(grpcFetchIntranetYakitVersion()).resolves.toBe('/files/yakit-1.4.2.exe')
    expect(mocks.netWorkApi).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'get',
        url: 'upload/yak/data',
        params: expect.objectContaining({
          keywords: '1.4.2',
          fileType: 'yak_data',
        }),
      }),
    )
  })

  it('列表里没有安装包时拒绝，不采用普通文件路径', async () => {
    mocks.netWorkApi.mockResolvedValue({
      data: [{ fileType: 'other_file', filePath: '/files/notes.txt' }],
    })

    await expect(grpcFetchIntranetYakitVersion(true)).rejects.toBeUndefined()
    expect(mocks.yakitNotify).not.toHaveBeenCalled()
  })
})
