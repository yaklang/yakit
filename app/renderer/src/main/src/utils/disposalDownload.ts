import { yakitFileSystem } from '@/services/electronBridge'
import { getMessageApi, yakitNotify } from '@/utils/notification'

export const downloadDisposalFile = async (url: string, fileName?: string) => {
  const hideLoading = getMessageApi().loading('正在下载，请选择保存位置…', 0)
  try {
    const result = await yakitFileSystem.downloadDisposalFile({ url, fileName })
    if (!result.canceled) yakitNotify('success', `下载完成：${result.filePath}`)
  } catch (error) {
    yakitNotify('error', `下载失败：${String(error)}`)
  } finally {
    hideLoading()
  }
}
