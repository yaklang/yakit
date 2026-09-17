import { ipc } from '@/services/ipc'
import { useMemoizedFn } from 'ahooks'
import { yakitNotify } from '@/utils/notification'
import { useEffect, useRef } from 'react'

interface PluginUploadHooks {
  /**是否单个上传 */
  isSingle?: boolean
  taskToken: string
  onUploadData: (data: SaveYakScriptToOnlineResponse) => void
  onUploadEnd: () => void
  onUploadSuccess: () => void
  onUploadError: () => void
}
export interface SaveYakScriptToOnlineRequest {
  ScriptNames: string[]
  IsPrivate: boolean
  All?: boolean
  PluginSupplement?: string
}
export interface SaveYakScriptToOnlineResponse {
  Progress: number
  Message: string
  MessageType: string
}
export default function usePluginUploadHooks(props: PluginUploadHooks) {
  const { isSingle, taskToken, onUploadData, onUploadSuccess, onUploadEnd, onUploadError } = props
  const messageListRef = useRef<SaveYakScriptToOnlineResponse[]>([])
  const pluginNameListRef = useRef<string[]>([])
  const controllerRef = useRef<AbortController>()
  useEffect(() => () => controllerRef.current?.abort(), [taskToken])
  const onStart = useMemoizedFn((params: SaveYakScriptToOnlineRequest) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    messageListRef.current = []
    pluginNameListRef.current = params.ScriptNames
    let isSuccess = true
    const clear = () => {
      messageListRef.current = []
      pluginNameListRef.current = []
    }
    const onError = (error: unknown) => {
      if (controller.signal.aborted) return
      clear()
      onUploadError()
      onUploadEnd()
      yakitNotify('error', '上传异常:' + error)
    }
    void ipc
      .openStream('grpc', 'SaveYakScriptToOnline', params, {
        token: taskToken,
        signal: controller.signal,
        onData(data) {
          if (controller.signal.aborted) return
          if (data.Progress === 1 && data.MessageType === 'finalError') isSuccess = false
          messageListRef.current.push(data)
          onUploadData(data)
        },
        onError,
        onEnd() {
          if (controller.signal.aborted) return
          if (isSuccess) {
            onUploadSuccess()
            yakitNotify('success', '上传成功')
          } else if (isSingle && pluginNameListRef.current.length === 1) {
            yakitNotify(
              'error',
              '上传失败:' +
                messageListRef.current.filter((item) => item.MessageType === 'error').map((item) => item.Message),
            )
            onUploadError()
          }
          onUploadEnd()
          clear()
        },
      })
      .catch(onError)
  })
  const onCancel = useMemoizedFn(() => controllerRef.current?.abort())
  return { onStart, onCancel } as const
}
