import i18n from '@/i18n/i18n'
vi.mock('@/i18n/i18n', async () => {
  const { createInstance } = await import('i18next')
  const { default: zh } = await import('@/locales/zh/components.json')
  const { default: en } = await import('@/locales/en/components.json')
  const instance = createInstance()
  await instance.init({
    lng: 'zh',
    fallbackLng: 'zh',
    resources: { zh: { components: zh }, en: { components: en } },
    interpolation: { escapeValue: false },
  })
  return { default: instance }
})
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DISPOSAL_ATTACHMENT_EXTENSIONS,
  getDisposalAttachmentTypeHint,
  MAX_ATTACHMENT_SIZE,
  uploadDisposalAttachment,
  validateDisposalAttachmentName,
} from '../disposalAttachment'

const mocks = vi.hoisted(() => ({
  splitUpload: vi.fn(),
}))

vi.mock('@/services/electronBridge', () => ({
  yakitUpload: { splitUpload: (...args: unknown[]) => mocks.splitUpload(...args) },
}))

describe('uploadDisposalAttachment', () => {
  it('uses the current language for validation and upload errors after switching languages', async () => {
    expect(getDisposalAttachmentTypeHint()).toContain('仅支持')
    await i18n.changeLanguage('en')
    expect(getDisposalAttachmentTypeHint()).toContain('Only .jpg')
    expect(() => validateDisposalAttachmentName('file.exe')).toThrow('attachments are supported')
    await expect(uploadDisposalAttachment({ path: '', hash: '', type: 'RiskComment' })).rejects.toThrow(
      'Attachment path and business identifier are required',
    )
    mocks.splitUpload.mockResolvedValue({ TaskStatus: false, resArr: [] })
    await expect(uploadDisposalAttachment({ path: 'file.pdf', hash: 'risk', type: 'RiskComment' })).rejects.toThrow(
      'Attachment upload failed',
    )
  })
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('zh')
  })

  it('uses the final chunk response URL', async () => {
    mocks.splitUpload.mockResolvedValue({
      TaskStatus: true,
      resArr: [
        { code: 200, data: {} },
        { code: 200, data: { from: 'https://files.example/report.pdf' } },
      ],
    })

    await expect(
      uploadDisposalAttachment({ path: 'C:\\tmp\\report.pdf', hash: 'risk-hash', type: 'RiskComment' }),
    ).resolves.toBe('https://files.example/report.pdf')
    expect(mocks.splitUpload).toHaveBeenCalledWith({
      url: 'fragment/upload',
      path: 'C:\\tmp\\report.pdf',
      filedHash: 'risk-hash',
      type: 'RiskComment',
    })
  })

  it('supports a string URL response and exposes the 100MiB limit', async () => {
    mocks.splitUpload.mockResolvedValue({
      TaskStatus: true,
      resArr: [{ code: 200, data: 'https://files.example/archive.pdf' }],
    })

    await expect(
      uploadDisposalAttachment({ path: 'C:\\tmp\\archive.pdf', hash: 'flow-hash', type: 'HttpflowComment' }),
    ).resolves.toBe('https://files.example/archive.pdf')
    expect(MAX_ATTACHMENT_SIZE).toBe(100 * 1024 * 1024)
  })

  it('rejects a completed upload without an attachment URL', async () => {
    mocks.splitUpload.mockResolvedValue({
      TaskStatus: true,
      resArr: [{ code: 200, data: {} }],
    })

    await expect(
      uploadDisposalAttachment({ path: 'C:\\tmp\\missing.pdf', hash: 'risk-hash', type: 'RiskComment' }),
    ).rejects.toThrow('附件上传失败')
  })

  it('rejects an empty path or business hash before invoking IPC', async () => {
    await expect(uploadDisposalAttachment({ path: '', hash: 'risk-hash', type: 'RiskComment' })).rejects.toThrow(
      '附件路径和业务标识必填',
    )
    await expect(
      uploadDisposalAttachment({ path: 'C:\\tmp\\file.txt', hash: '', type: 'HttpflowComment' }),
    ).rejects.toThrow('附件路径和业务标识必填')
    expect(mocks.splitUpload).not.toHaveBeenCalled()
  })

  it.each(['archive.zip', 'script.exe', 'report.pdf.exe', 'README', 'old.doc'])(
    'rejects unsupported %s before IPC',
    async (name) => {
      await expect(
        uploadDisposalAttachment({ path: `C:/files/${name}`, hash: 'risk-hash', type: 'RiskComment' }),
      ).rejects.toThrow('仅支持')
      expect(mocks.splitUpload).not.toHaveBeenCalled()
    },
  )

  it.each(DISPOSAL_ATTACHMENT_EXTENSIONS)('accepts backend extension .%s, including uppercase', (extension) => {
    expect(() => validateDisposalAttachmentName(`C:/文件/私密の笔记.${extension.toUpperCase()}`)).not.toThrow()
  })
})
