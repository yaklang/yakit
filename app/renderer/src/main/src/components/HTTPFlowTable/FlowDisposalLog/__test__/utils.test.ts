import i18n from '@/i18n/i18n'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  apiDeleteFlowDisposalComment,
  apiGetFlowDisposalLogs,
  apiPublishFlowDisposalComment,
  apiUploadFlowDisposalImage,
} from '../utils'

const mocks = vi.hoisted(() => ({
  netWorkApi: vi.fn(),
  splitUpload: vi.fn(),
  yakitNotify: vi.fn(),
}))

vi.mock('@/i18n/i18n', async () => {
  const { createInstance } = await import('i18next')
  const [{ default: zhRisk }, { default: zhComponents }, { default: zhApiUtils }] = await Promise.all([
    import('@/locales/zh/risk.json'),
    import('@/locales/zh/components.json'),
    import('@/locales/zh/apiUtils.json'),
  ])
  const [{ default: enRisk }, { default: enComponents }, { default: enApiUtils }] = await Promise.all([
    import('@/locales/en/risk.json'),
    import('@/locales/en/components.json'),
    import('@/locales/en/apiUtils.json'),
  ])
  const [{ default: zhTWRisk }, { default: zhTWComponents }, { default: zhTWApiUtils }] = await Promise.all([
    import('@/locales/zh-TW/risk.json'),
    import('@/locales/zh-TW/components.json'),
    import('@/locales/zh-TW/apiUtils.json'),
  ])
  const instance = createInstance()
  await instance.init({
    lng: 'zh',
    fallbackLng: false,
    resources: {
      zh: { risk: zhRisk, components: zhComponents, apiUtils: zhApiUtils },
      en: { risk: enRisk, components: enComponents, apiUtils: enApiUtils },
      'zh-TW': { risk: zhTWRisk, components: zhTWComponents, apiUtils: zhTWApiUtils },
    },
    interpolation: { escapeValue: false },
  })
  return { default: instance }
})

vi.mock('@/services/fetch', () => ({
  NetWorkApi: (...args: unknown[]) => mocks.netWorkApi(...args),
}))

vi.mock('@/services/electronBridge', () => ({
  yakitUpload: { splitUpload: (...args: unknown[]) => mocks.splitUpload(...args) },
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: (...args: unknown[]) => mocks.yakitNotify(...args),
}))

describe('FlowDisposalLog utils i18n', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('zh')
  })

  it.each([
    {
      language: 'en',
      missingHash: 'Flow hash is required',
      uploadFailed: 'Failed to upload image',
      fetchFailed: 'Failed to fetch flow disposal logs',
      publishFailed: 'Failed to publish comment',
      deleteFailed: 'Failed to delete comment',
    },
    {
      language: 'zh-TW',
      missingHash: '缺少流量 hash',
      uploadFailed: '上傳圖片失敗',
      fetchFailed: '查詢流量處置日誌失敗',
      publishFailed: '發布評論失敗',
      deleteFailed: '刪除評論失敗',
    },
  ])('uses $language for upload and request errors', async (expected) => {
    await i18n.changeLanguage(expected.language)

    await expect(apiUploadFlowDisposalImage({ hash: '', base64: '', imgInfo: {} })).rejects.toBe(expected.missingHash)
    expect(mocks.yakitNotify).toHaveBeenLastCalledWith('error', `${expected.uploadFailed}: ${expected.missingHash}`)

    mocks.netWorkApi.mockRejectedValue(new Error('offline'))
    await expect(apiGetFlowDisposalLogs({ hash: 'flow' })).rejects.toThrow('offline')
    expect(mocks.yakitNotify).toHaveBeenLastCalledWith('error', `${expected.fetchFailed}: Error: offline`)

    await expect(apiPublishFlowDisposalComment({ hash: 'flow', description: 'comment' })).rejects.toThrow('offline')
    expect(mocks.yakitNotify).toHaveBeenLastCalledWith('error', `${expected.publishFailed}: Error: offline`)

    await expect(apiDeleteFlowDisposalComment(1)).rejects.toThrow('offline')
    expect(mocks.yakitNotify).toHaveBeenLastCalledWith('error', `${expected.deleteFailed}: Error: offline`)
  })

  it('uses the localized fallback when upload response has no URL or error message', async () => {
    await i18n.changeLanguage('en')
    mocks.splitUpload.mockResolvedValue({ resArr: [{ code: 200, data: '' }] })

    await expect(apiUploadFlowDisposalImage({ hash: 'flow', base64: '', imgInfo: {} })).rejects.toThrow(
      'Image upload failed',
    )
    expect(mocks.yakitNotify).toHaveBeenCalledWith('error', 'Failed to upload image: Error: Image upload failed')
  })
})
