import { useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { ipc, type GrpcInput, type GrpcOutput, type StreamTask } from '@/services/ipc'

type Session = {
  controller: AbortController
  opening?: Promise<StreamTask<'SyntaxFlowScan'>>
  task?: StreamTask<'SyntaxFlowScan'>
}

/** Shared by the scan page and rule debugger; each hook owns one duplex instance. */
export function useSyntaxFlowSession(options: {
  token: string
  onData(value: GrpcOutput<'SyntaxFlowScan'>): void
  onError(error: unknown): void
  onEnd(): void
}) {
  const current = useRef<Session>()
  const onData = useMemoizedFn(options.onData)
  const onError = useMemoizedFn(options.onError)
  const onEnd = useMemoizedFn(options.onEnd)

  const send = useMemoizedFn(async (params: GrpcInput<'SyntaxFlowScan'>) => {
    const existing = current.current
    if (existing) {
      try {
        const task = existing.task ?? (await existing.opening)
        if (!task || current.current !== existing) return false
        await task.write(params)
      } catch (error) {
        if (current.current === existing) {
          current.current = undefined
          existing.controller.abort()
          onError(error)
        }
        throw error
      }
      return current.current === existing
    }
    const session: Session = { controller: new AbortController() }
    current.current = session
    const fail = (error: unknown) => {
      if (current.current !== session) return
      current.current = undefined
      onError(error)
    }
    try {
      session.opening = ipc.openStream('grpc', 'SyntaxFlowScan', params, {
        token: options.token,
        signal: session.controller.signal,
        onData: (value) => {
          if (current.current === session) onData(value)
        },
        onError: fail,
        onEnd: () => {
          if (current.current !== session) return
          current.current = undefined
          onEnd()
        },
      })
      const task = await session.opening
      if (current.current === session) session.task = task
      return current.current === session
    } catch (error) {
      fail(error)
      throw error
    }
  })

  const cancel = useMemoizedFn(async () => {
    const session = current.current
    current.current = undefined
    try {
      if (session?.task) await session.task.cancel()
    } finally {
      session?.controller.abort()
    }
  })

  useEffect(
    () => () => {
      const session = current.current
      current.current = undefined
      session?.controller.abort()
    },
    [options.token],
  )

  return { send, cancel }
}
