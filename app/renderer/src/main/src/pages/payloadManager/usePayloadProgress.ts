import { useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { ipc, type GrpcInput, type GrpcOutput } from '@/services/ipc'
import { randomString } from '@/utils/randomUtil'

type PayloadProgressApi =
  | 'SavePayloadStream'
  | 'SavePayloadToFileStream'
  | 'SaveLargePayloadToFileStream'
  | 'ConvertPayloadGroupToDatabase'
  | 'RemoveDuplicatePayloads'
  | 'MigratePayloads'

/** 字典任务由所属组件管理；重试、关闭、卸载均只取消当前实例。 */
export function usePayloadProgress(callbacks: {
  onData: (data: GrpcOutput<'SavePayloadStream'>) => void
  onError: (error: unknown) => void
  onEnd: () => void
}) {
  const controllerRef = useRef<AbortController>()
  const onData = useMemoizedFn(callbacks.onData)
  const onError = useMemoizedFn(callbacks.onError)
  const onEnd = useMemoizedFn(callbacks.onEnd)
  const cancel = useMemoizedFn(() => controllerRef.current?.abort())
  const start = useMemoizedFn(<A extends PayloadProgressApi>(api: A, params: GrpcInput<A>) => {
    cancel()
    const controller = new AbortController()
    controllerRef.current = controller
    const fail = (error: unknown) => {
      if (!controller.signal.aborted) onError(error)
    }
    void ipc
      .openStream('grpc', api, params, {
        token: randomString(40),
        signal: controller.signal,
        onData(data) {
          if (!controller.signal.aborted) onData(data)
        },
        onError: fail,
        onEnd() {
          if (!controller.signal.aborted) onEnd()
        },
      })
      .catch(fail)
  })
  useEffect(() => cancel, [])
  return { start, cancel }
}
