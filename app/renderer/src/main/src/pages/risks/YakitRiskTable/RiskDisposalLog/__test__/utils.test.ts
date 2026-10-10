import i18n from '@/i18n/i18n'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiUploadDisposalImage } from '../utils'

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

vi.mock('@/services/electronBridge', () => ({
  yakitUpload: { splitUpload: (...args: unknown[]) => mocks.splitUpload(...args) },
}))

vi.mock('@/services/fetch', () => ({
  NetWorkApi: (...args: unknown[]) => mocks.netWorkApi(...args),
}))

vi.mock('@/utils/notification', () => ({
  yakitNotify: (...args: unknown[]) => mocks.yakitNotify(...args),
}))

describe('RiskDisposalLog utils i18n', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('zh')
  })

  it.each([
    ['en', 'Risk hash is required', 'Failed to upload image', 'Image upload failed'],
    ['zh-TW', '缺少 risk hash', '上傳圖片失敗', '上傳圖片失敗'],
  ])('uses %s for image upload errors', async (language, missingHash, uploadFailed, fallbackError) => {
    await i18n.changeLanguage(language)

    await expect(apiUploadDisposalImage({ hash: '', base64: '', imgInfo: {} })).rejects.toBe(missingHash)
    expect(mocks.yakitNotify).toHaveBeenLastCalledWith('error', `${uploadFailed}: ${missingHash}`)

    mocks.splitUpload.mockResolvedValue({ resArr: [{ code: 200, data: '' }] })
    await expect(apiUploadDisposalImage({ hash: 'risk', base64: '', imgInfo: {} })).rejects.toThrow(fallbackError)
    expect(mocks.yakitNotify).toHaveBeenLastCalledWith('error', `${uploadFailed}: Error: ${fallbackError}`)
  })
})
