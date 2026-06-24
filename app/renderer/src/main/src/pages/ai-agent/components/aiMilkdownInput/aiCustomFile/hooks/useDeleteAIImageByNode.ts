import { randomString } from '@/utils/randomUtil'
import { useCreation, useMemoizedFn } from 'ahooks'
import { useState } from 'react'
import { deleteAIImageByNode, DeleteAIImageByNodeRequest } from '../utils'
const { ipcRenderer } = window.require('electron')

interface UseDeleteAIImageByNodeParams {
  /**是否需要进度条 */
  isShowProgress?: boolean
  onFinish?: () => void
  onError?: () => void
}
interface UseDeleteAIImageByNodeState {
  progress: number
}
export interface AIClearImageParams extends Omit<DeleteAIImageByNodeRequest, 'token'> {}
export interface UseDeleteAIImageByNodeEvents {
  onClearImage: (params: AIClearImageParams) => void
}
export interface ClearAIImageEvents {
  onData?: (progress: number) => void
  onError?: () => void
  onFinish?: () => void
}
export const handleClearAIImage = (params: AIClearImageParams, events?: ClearAIImageEvents) => {
  const token = randomString(8)

  // 提取公共的清除监听器方法，避免内存泄漏
  const removeListeners = () => {
    ipcRenderer.removeAllListeners(`delete-ai-image-progress-${token}`)
    ipcRenderer.removeAllListeners(`delete-ai-image-finish-${token}`)
    ipcRenderer.removeAllListeners(`delete-ai-image-err-${token}`)
  }
  ipcRenderer.on(`delete-ai-image-progress-${token}`, (e, progress: number) => {
    events?.onData?.(progress)
  })
  ipcRenderer.on(`delete-ai-image-err-${token}`, (e, err) => {
    events?.onError?.()
  })
  ipcRenderer.on(`delete-ai-image-finish-${token}`, (e) => {
    events?.onFinish?.()
    removeListeners()
  })

  const newParams: DeleteAIImageByNodeRequest = {
    ...params,
    token,
  }
  deleteAIImageByNode(newParams)
}

function useDeleteAIImageByNode(
  params?: UseDeleteAIImageByNodeParams,
): [UseDeleteAIImageByNodeState, UseDeleteAIImageByNodeEvents]
function useDeleteAIImageByNode(params?: UseDeleteAIImageByNodeParams) {
  const { isShowProgress, onFinish, onError } = params || {}
  const [progress, setProgress] = useState<number>(0)

  const onClearImage = useMemoizedFn((params: AIClearImageParams) => {
    handleClearAIImage(params, {
      onData: (progress) => {
        if (isShowProgress) setProgress(progress)
      },
      onFinish: () => onFinish?.(),
      onError: () => onError?.(),
    })
  })
  const state: UseDeleteAIImageByNodeState = useCreation(() => {
    return {
      progress,
    }
  }, [progress])
  const event: UseDeleteAIImageByNodeEvents = useCreation(() => {
    return {
      onClearImage,
    }
  }, [onClearImage])
  return [state, event] as const
}

export default useDeleteAIImageByNode
