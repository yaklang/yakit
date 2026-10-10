import { yakitFileSystem } from '@/services/electronBridge'
import { getMessageApi, yakitNotify } from '@/utils/notification'
import i18n from '@/i18n/i18n'

const tOriginal = i18n.getFixedT(null, 'components')

export const downloadDisposalFile = async (url: string, fileName?: string) => {
  const hideLoading = getMessageApi().loading(tOriginal('DisposalAttachment.downloading'), 0)
  try {
    const result = await yakitFileSystem.downloadDisposalFile({ url, fileName })
    if (!result.canceled) {
      yakitNotify('success', tOriginal('DisposalAttachment.downloadComplete', { path: result.filePath }))
    }
  } catch (error) {
    yakitNotify('error', tOriginal('DisposalAttachment.downloadFailed', { error: String(error) }))
  } finally {
    hideLoading()
  }
}
