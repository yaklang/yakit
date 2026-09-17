import { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { randomString } from '@/utils/randomUtil'
import { ipc, type GrpcInput, type GrpcOutput } from '@/services/ipc'
import { fuzzerResponseForUI } from '@/pages/fuzzer/grpcAdapters'

interface StreamConcurrencyConfig {
  onData: (data: {
    Request: NonNullable<GrpcOutput<'HTTPFuzzerGroup'>['Request']>
    Response: ReturnType<typeof fuzzerResponseForUI>
  }) => void
  onStreamEnd?: () => void
}

export const useStreamConcurrency = ({ onData, onStreamEnd }: StreamConcurrencyConfig) => {
  const controllerRef = useRef<AbortController>()
  const [loading, setLoading] = useState(false)
  const handleData = useMemoizedFn(onData)
  const handleEnd = useMemoizedFn(() => {
    setLoading(false)
    onStreamEnd?.()
  })
  const startConcurrency = useMemoizedFn((params: GrpcInput<'HTTPFuzzerGroup'>) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    let finished = false
    const finish = () => {
      if (controller.signal.aborted || finished) return
      finished = true
      handleEnd()
    }
    void ipc
      .openStream('grpc', 'HTTPFuzzerGroup', params, {
        token: randomString(40),
        signal: controller.signal,
        onData(data) {
          if (controller.signal.aborted) return
          if (!data.Request || !data.Response) throw new Error('Fuzzer 并发响应缺少请求或响应数据')
          handleData({ Request: data.Request, Response: fuzzerResponseForUI(data.Response) })
        },
        onError: finish,
        onEnd: finish,
      })
      .catch(finish)
  })
  const cancelConcurrency = useMemoizedFn(() => {
    controllerRef.current?.abort()
    setLoading(false)
  })
  useEffect(() => () => controllerRef.current?.abort(), [])
  return { startConcurrency, cancelConcurrency, loading }
}
