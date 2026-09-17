import { ipc, type LocalCallOptions } from '@/services/ipc'

export interface DeleteAIImageByNodeRequest {
  sessionID?: string[]
  chatDataStoreKey: string
}
export const deleteAIImageByNode = (params: DeleteAIImageByNodeRequest, options?: LocalCallOptions<number>) =>
  ipc.invoke('local', 'delete-ai-image', params, options)
