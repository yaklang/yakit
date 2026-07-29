import { APIFunc } from '@/apiUtils/type'
import { yakitNotify } from '@/utils/notification'

const { ipcRenderer } = window.require('electron')

export interface DeleteAIImageByNodeRequest {
  /** 对话 ID 列表 */
  sessionID?: string[]
  /** 图片路径前缀，如 histroyAiStore（与 save-ai-image 的 chatDataStoreKey 一致） */
  chatDataStoreKey: string
  token?: string
}
interface DeleteAIImageByNodeResponse {}
export const deleteAIImageByNode: APIFunc<DeleteAIImageByNodeRequest, DeleteAIImageByNodeResponse> = (
  params,
  hiddenError,
) => {
  const { sessionID, chatDataStoreKey } = params
  return new Promise((resolve, reject) => {
    ipcRenderer
      .invoke(
        'delete-ai-image',
        {
          chatDataStoreKey,
          sessionID,
        },
        params.token,
      )
      .then(resolve)
      .catch((err) => {
        if (!hiddenError) yakitNotify('error', 'deleteAIImageByNode 失败:' + err)
        reject(err)
      })
  })
}
