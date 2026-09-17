import { yakitNotify } from '@/utils/notification'
import { useCreation, useMemoizedFn } from 'ahooks'
import { useState, useRef, useEffect } from 'react'
import { deleteAIImageByNode, type DeleteAIImageByNodeRequest } from '../utils'

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
export const handleClearAIImage = async (
  params: AIClearImageParams,
  events?: ClearAIImageEvents,
  signal?: AbortSignal,
) => {
  try {
    await deleteAIImageByNode(params, { signal, onProgress: (progress) => events?.onData?.(progress) })
  } catch (error) {
    if (signal?.aborted) return
    events?.onError?.()
    if (!events?.onError) yakitNotify('error', `清理 AI 图片失败: ${error}`)
  } finally {
    if (!signal?.aborted) events?.onFinish?.()
  }
}

function useDeleteAIImageByNode(
  params?: UseDeleteAIImageByNodeParams,
): [UseDeleteAIImageByNodeState, UseDeleteAIImageByNodeEvents]
function useDeleteAIImageByNode(params?: UseDeleteAIImageByNodeParams) {
  const { isShowProgress, onFinish, onError } = params || {}
  const [progress, setProgress] = useState<number>(0)
  const controllerRef = useRef<AbortController>()
  useEffect(() => () => controllerRef.current?.abort(), [])

  const onClearImage = useMemoizedFn((params: AIClearImageParams) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setProgress(0)
    void handleClearAIImage(
      params,
      {
        onData: (progress) => {
          if (isShowProgress) setProgress(progress)
        },
        onFinish: () => onFinish?.(),
        onError: () => onError?.(),
      },
      controller.signal,
    )
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
