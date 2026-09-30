import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadDisposalFile } from '../disposalDownload'

const { download, notify, hide, loading } = vi.hoisted(() => {
  const hide = vi.fn()
  return { download: vi.fn(), notify: vi.fn(), hide, loading: vi.fn(() => hide) }
})
vi.mock('@/services/electronBridge', () => ({ yakitFileSystem: { downloadDisposalFile: download } }))
vi.mock('@/utils/notification', () => ({ yakitNotify: notify, getMessageApi: () => ({ loading }) }))
beforeEach(() => vi.clearAllMocks())

describe('日志下载反馈', () => {
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
