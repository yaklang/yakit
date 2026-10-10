import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadDisposalFile } from '../disposalDownload'
import i18n from '@/i18n/i18n'

vi.mock('@/i18n/i18n', async () => {
  const { createInstance } = await import('i18next')
  const { default: zh } = await import('@/locales/zh/components.json')
  const { default: en } = await import('@/locales/en/components.json')
  const { default: zhTW } = await import('@/locales/zh-TW/components.json')
  const instance = createInstance()
  await instance.init({
    lng: 'zh',
    fallbackLng: false,
    resources: { zh: { components: zh }, en: { components: en }, 'zh-TW': { components: zhTW } },
    interpolation: { escapeValue: false },
  })
  return { default: instance }
})

const { download, notify, hide, loading } = vi.hoisted(() => {
  const hide = vi.fn()
  return { download: vi.fn(), notify: vi.fn(), hide, loading: vi.fn(() => hide) }
})
vi.mock('@/services/electronBridge', () => ({ yakitFileSystem: { downloadDisposalFile: download } }))
vi.mock('@/utils/notification', () => ({ yakitNotify: notify, getMessageApi: () => ({ loading }) }))
beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('zh')
})

describe('日志下载反馈', () => {
  it.each([
    ['en', 'Downloading. Please choose a save location…', 'Download complete: ', 'Download failed: '],
    ['zh-TW', '正在下載，請選擇儲存位置…', '下載完成：', '下載失敗：'],
  ])('切换为 %s 后下载提示跟随语言且保留路径和错误详情', async (language, pending, success, failure) => {
    await i18n.changeLanguage(language)
    download.mockResolvedValue({ canceled: false, filePath: 'C:/saved & notes.zip' })
    await downloadDisposalFile('https://files.test/file.zip')
    expect(loading).toHaveBeenLastCalledWith(pending, 0)
    expect(notify).toHaveBeenLastCalledWith('success', `${success}C:/saved & notes.zip`)
    download.mockRejectedValue(new Error('404'))
    await downloadDisposalFile('https://files.test/file.zip')
    expect(notify).toHaveBeenLastCalledWith('error', `${failure}Error: 404`)
    expect(hide).toHaveBeenCalledTimes(2)
  })

  it('通过主进程下载，完成后提示保存位置并关闭加载提示', async () => {
    download.mockResolvedValue({ canceled: false, filePath: 'C:/saved.zip' })
    await downloadDisposalFile('https://files.test/file.zip', '附件.zip')
    expect(download).toHaveBeenCalledWith({ url: 'https://files.test/file.zip', fileName: '附件.zip' })
    expect(notify).toHaveBeenCalledWith('success', '下载完成：C:/saved.zip')
    expect(hide).toHaveBeenCalledOnce()
  })
  it('取消不提示下载成功', async () => {
    download.mockResolvedValue({ canceled: true })
    await downloadDisposalFile('https://files.test/image.png')
    expect(notify).not.toHaveBeenCalled()
    expect(hide).toHaveBeenCalledOnce()
  })
  it('错误可见且关闭加载提示', async () => {
    download.mockRejectedValue(new Error('404'))
    await downloadDisposalFile('https://files.test/image.png')
    expect(notify).toHaveBeenCalledWith('error', expect.stringContaining('404'))
    expect(hide).toHaveBeenCalledOnce()
  })
})
