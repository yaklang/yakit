import { useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { ipc, type GrpcInput, type GrpcOutput, type StreamTask } from '@/services/ipc'

type FuzzerStreamApi = 'HTTPFuzzer' | 'HTTPFuzzerSequence'
export function useFuzzerSession<A extends FuzzerStreamApi>(api: A, token: string) {
  const callbacks = useRef<{
    onData: (data: GrpcOutput<A>) => void
    onError: (error: unknown) => void
    onEnd: () => void
    onReset?: () => void
  }>({ onData() {}, onError() {}, onEnd() {} })
  const sessionRef = useRef<{ controller: AbortController; task?: StreamTask<A> }>()
  const cancel = useMemoizedFn(async () => {
    const session = sessionRef.current
    sessionRef.current = undefined
    try {
      await session?.task?.cancel()
    } finally {
      session?.controller.abort()
    }
  })
  const start = useMemoizedFn(async (params: GrpcInput<A>) => {
    sessionRef.current?.controller.abort()
    const session = { controller: new AbortController(), task: undefined as StreamTask<A> | undefined }
    let closed = false
    let failed = false
    sessionRef.current = session
    callbacks.current.onReset?.()
    const active = () => sessionRef.current === session && !session.controller.signal.aborted
    const onError = (error: unknown) => {
      if (active() && !closed) {
        closed = true
        failed = true
        callbacks.current.onError(error)
      }
    }
    try {
      session.task = await ipc.openStream('grpc', api, params, {
        token,
        signal: session.controller.signal,
        onData(data) {
          if (active() && !closed) callbacks.current.onData(data)
        },
        onError,
        onEnd() {
          if (active() && !closed) {
            closed = true
            callbacks.current.onEnd()
          }
        },
      })
      return active() && !failed
    } catch (error) {
      onError(error)
      return false
    }
  })
  useEffect(() => () => sessionRef.current?.controller.abort(), [token])
  return { callbacks, start, cancel }
}
