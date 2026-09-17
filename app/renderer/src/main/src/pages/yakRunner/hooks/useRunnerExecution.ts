import { useEffect, useMemo } from 'react'
import { useMemoizedFn } from 'ahooks'
import { ipc, type GrpcInput } from '@/services/ipc'
import { randomString } from '@/utils/randomUtil'
import { failed } from '@/utils/notification'

type Output = { Raw: Uint8Array }

/** 一个编辑器页面拥有一个执行会话，输出面板晚挂载时重放有限缓存。 */
export function createRunnerExecution(onFinish: () => void, onError: (error: unknown) => void) {
  const listeners = new Set<(data: Output) => void>()
  const buffer: Output[] = []
  let bufferedBytes = 0
  let current: AbortController | undefined
  const finish = (controller: AbortController, error?: unknown) => {
    if (current !== controller || controller.signal.aborted) return
    current = undefined
    onFinish()
    if (error) onError(error)
  }
  const cancel = () => {
    const controller = current
    current = undefined
    controller?.abort()
    if (controller) onFinish()
  }
  return {
    async start(params: GrpcInput<'Exec'>) {
      // 旧任务的结束回调不能清除新任务的运行状态。
      current?.abort()
      const controller = new AbortController()
      current = controller
      try {
        await ipc.openStream('grpc', 'Exec', params, {
          token: randomString(40),
          signal: controller.signal,
          onData(data) {
            if (current !== controller || controller.signal.aborted || !data.Raw.length) return
            const output = { Raw: data.Raw }
            buffer.push(output)
            bufferedBytes += data.Raw.byteLength
            while (buffer.length && bufferedBytes > 1024 * 1024) bufferedBytes -= buffer.shift()!.Raw.byteLength
            for (const listener of listeners) listener(output)
          },
          onError: (error) => finish(controller, error),
          onEnd: () => finish(controller),
        })
      } catch (error) {
        finish(controller, error)
      }
    },
    cancel,
    subscribe(listener: (data: Output) => void) {
      for (const data of buffer) listener(data)
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      current?.abort()
      current = undefined
      listeners.clear()
      buffer.length = 0
      bufferedBytes = 0
    },
  }
}

export type RunnerExecution = ReturnType<typeof createRunnerExecution>

export function useRunnerExecution(onFinish: () => void) {
  const finish = useMemoizedFn(onFinish)
  const execution = useMemo(() => createRunnerExecution(finish, (error) => failed(`${error}`)), [finish])
  useEffect(() => () => execution.dispose(), [execution])
  return execution
}
