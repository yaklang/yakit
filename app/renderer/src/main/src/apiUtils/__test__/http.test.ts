import { beforeEach, describe, expect, it, vi } from 'vitest'
import { httpDeleteNotepadFile, httpUploadImgBase64, httpUploadImgPath } from '../http'

const mocks = vi.hoisted(() => ({
  netWorkApi: vi.fn(),
  splitUpload: vi.fn(),
  uploadImgBase64: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('@/services/fetch', () => ({
  NetWorkApi: (...args: unknown[]) => mocks.netWorkApi(...args),
}))

vi.mock('@/services/electronBridge', () => ({
  yakitUpload: {
    splitUpload: (...args: unknown[]) => mocks.splitUpload(...args),
    uploadImgBase64: (...args: unknown[]) => mocks.uploadImgBase64(...args),
  },
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: (...args: unknown[]) => mocks.yakitNotify(...args),
}))

vi.mock('@/i18n/i18n', () => ({
  default: {
    getFixedT: () => (key: string, options?: { error?: unknown }) =>
      options?.error === undefined ? key : `${key}:${String(options.error)}`,
  },
}))

describe('图片上传 HTTP 封装', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['字符串 URL', 'https://cdn.example/path.png'],
    ['对象 from', { from: 'https://cdn.example/path-object.png' }],
  ])('httpUploadImgPath 支持%s响应', async (_, data) => {
    mocks.splitUpload.mockResolvedValueOnce({ resArr: [{ code: 200, data }] })

    const request = { path: 'C:\\images\\path.png' }
    await expect(httpUploadImgPath(request)).resolves.toBe(typeof data === 'string' ? data : data.from)
    expect(mocks.splitUpload).toHaveBeenCalledWith({
      ...request,
      url: 'fragment/upload',
    })
  })

  it.each([
    ['字符串 URL', 'https://cdn.example/base64.png'],
    ['对象 from', { from: 'https://cdn.example/base64-object.png' }],
  ])('httpUploadImgBase64 支持%s响应', async (_, data) => {
    mocks.uploadImgBase64.mockResolvedValueOnce({ code: 200, data })

    const request = {
      base64: 'data:image/png;base64,aW1hZ2U=',
      imgInfo: { filename: 'base64.png', contentType: 'image/png' },
    }
    await expect(httpUploadImgBase64(request)).resolves.toBe(typeof data === 'string' ? data : data.from)
    expect(mocks.uploadImgBase64).toHaveBeenCalledWith(request)
  })

  it.each([
    ['空字符串', ''],
    ['空 from 对象', { from: '' }],
  ])('httpUploadImgPath 在成功状态返回%s时拒绝并提示错误', async (_, data) => {
    mocks.splitUpload.mockResolvedValueOnce({ resArr: [{ code: 200, data }] })

    await expect(httpUploadImgPath({ path: 'C:\\images\\empty.png' })).rejects.toBe('YakitNotification.unknown_error')
    expect(mocks.yakitNotify).toHaveBeenCalledWith(
      'error',
      'apiUtilsHttp.uploadImgFailed:YakitNotification.unknown_error',
    )
  })

  it('httpUploadImgPath 透传后端 reason，并按 hiddenError 控制提示', async () => {
    const response = { resArr: [{ code: 500, data: { reason: 'invalid path image' } }] }
    mocks.splitUpload.mockResolvedValueOnce(response).mockResolvedValueOnce(response)

    await expect(httpUploadImgPath({ path: 'C:\\images\\invalid.png' })).rejects.toBe('invalid path image')
    expect(mocks.yakitNotify).toHaveBeenCalledWith('error', 'apiUtilsHttp.uploadImgFailed:invalid path image')

    mocks.yakitNotify.mockClear()
    await expect(httpUploadImgPath({ path: 'C:\\images\\invalid.png' }, true)).rejects.toBe('invalid path image')
    expect(mocks.yakitNotify).not.toHaveBeenCalled()
  })

  it.each([
    ['空字符串', ''],
    ['空 from 对象', { from: '' }],
  ])('httpUploadImgBase64 在成功状态返回%s时拒绝并提示错误', async (_, data) => {
    mocks.uploadImgBase64.mockResolvedValueOnce({ code: 200, data })

    await expect(
      httpUploadImgBase64({
        base64: 'data:image/png;base64,aW1hZ2U=',
        imgInfo: { filename: 'empty.png', contentType: 'image/png' },
      }),
    ).rejects.toBe('YakitNotification.unknown_error')
    expect(mocks.yakitNotify).toHaveBeenCalledWith(
      'error',
      'apiUtilsHttp.uploadImgFailed:YakitNotification.unknown_error',
    )
  })

  it('httpUploadImgBase64 透传后端 reason，并按 hiddenError 控制提示', async () => {
    const response = { code: 500, data: { reason: 'invalid base64 image' } }
    const request = {
      base64: 'invalid-base64',
      imgInfo: { filename: 'invalid.png', contentType: 'image/png' },
    }
    mocks.uploadImgBase64.mockResolvedValueOnce(response).mockResolvedValueOnce(response)

    await expect(httpUploadImgBase64(request)).rejects.toBe('invalid base64 image')
    expect(mocks.yakitNotify).toHaveBeenCalledWith('error', 'apiUtilsHttp.uploadImgFailed:invalid base64 image')

    mocks.yakitNotify.mockClear()
    await expect(httpUploadImgBase64(request, true)).rejects.toBe('invalid base64 image')
    expect(mocks.yakitNotify).not.toHaveBeenCalled()
  })
})

describe('httpDeleteNotepadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('通过 DELETE company/file 发送文件名并透传成功结果', async () => {
    const request = { file_name: ['image.png', 'report.pdf'] }
    const response = { from: 'company/file', ok: true }
    mocks.netWorkApi.mockResolvedValueOnce(response)

    await expect(httpDeleteNotepadFile(request)).resolves.toBe(response)
    expect(mocks.netWorkApi).toHaveBeenCalledWith({
      method: 'delete',
      url: 'company/file',
      data: request,
    })
    expect(mocks.yakitNotify).not.toHaveBeenCalled()
  })

  it('请求失败时透传拒绝并按 hiddenError 控制错误提示', async () => {
    const error = new Error('delete failed')
    const request = { file_name: ['image.png'] }
    mocks.netWorkApi.mockRejectedValueOnce(error).mockRejectedValueOnce(error)

    await expect(httpDeleteNotepadFile(request)).rejects.toBe(error)
    expect(mocks.yakitNotify).toHaveBeenCalledWith('error', 'apiUtilsHttp.deleteOSSFailed:Error: delete failed')

    mocks.yakitNotify.mockClear()
    await expect(httpDeleteNotepadFile(request, true)).rejects.toBe(error)
    expect(mocks.yakitNotify).not.toHaveBeenCalled()
  })
})
