import { ipc, type StreamTask } from '@/services/ipc'
import { randomString } from '@/utils/randomUtil'
import type React from 'react'
import { memo, useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import YakitXterm, { TERMINAL_KEYBOARD_Map, type YakitXtermRefProps } from '@/components/yakitUI/YakitXterm/YakitXterm'
import { writeXTerm } from '@/utils/xtermUtils'
import { yakitNotify } from '@/utils/notification'
import { type System, SystemInfo, handleFetchSystem } from '@/constants/hardware'

export interface ReverseShellTerminalProps {
  /**false：前端不做任何处理，数据都是后端返回*/
  isWrite: boolean
  endpoint: { host: string; port: number }
  onStarted: () => void
  setLocal: (local: string) => void
  setRemote: (remote: string) => void
  onCancelMonitor: () => void
  onResizeXterm: (v: XTermSizeProps) => void
}
export interface XTermSizeProps {
  cols: number
  rows: number
}
export const ReverseShellTerminal: React.FC<ReverseShellTerminalProps> = memo((props) => {
  const { endpoint, onStarted, isWrite, setLocal, setRemote, onCancelMonitor, onResizeXterm } = props

  const xtermRef = useRef<YakitXtermRefProps>()
  const systemRef = useRef<System | undefined>(SystemInfo.system)

  const sessionRef = useRef<{ controller: AbortController; opening?: Promise<StreamTask<'OpenPort'>> }>()
  const onData = useMemoizedFn((data: import('@/services/ipc').GrpcOutput<'OpenPort'>) => {
    if (data.closed) {
      sessionRef.current?.controller.abort()
      onCancelMonitor()
      return
    }
    if (data.control) return
    if (data.localAddr) setLocal(data.localAddr)
    if (data.remoteAddr) setRemote(data.remoteAddr)
    if (data.raw.length && xtermRef.current?.terminal) xtermRef.current.terminal.write(data.raw)
  })
  const onError = useMemoizedFn((error: unknown) => {
    yakitNotify('error', `监听报错:${error}`)
    onCancelMonitor()
  })
  useEffect(() => {
    if (!systemRef.current) handleFetchSystem(() => (systemRef.current = SystemInfo.system))
    const session = {
      controller: new AbortController(),
      opening: undefined as Promise<StreamTask<'OpenPort'>> | undefined,
    }
    sessionRef.current = session
    let ended = false
    session.opening = ipc.openStream('grpc', 'OpenPort', endpoint, {
      token: randomString(40),
      signal: session.controller.signal,
      onData,
      onError(error) {
        ended = true
        if (!session.controller.signal.aborted) onError(error)
      },
      onEnd() {
        ended = true
        if (!session.controller.signal.aborted) onCancelMonitor()
      },
    })
    void session.opening
      .then(() => {
        if (!ended && !session.controller.signal.aborted) onStarted()
      })
      .catch((error) => {
        if (!session.controller.signal.aborted) onError(error)
      })
    return () => {
      session.controller.abort()
      if (sessionRef.current === session) sessionRef.current = undefined
    }
  }, [endpoint])

  const commandExec = useMemoizedFn(async (str: string) => {
    const session = sessionRef.current
    if (!session?.opening) return
    if (isWrite) writeXTerm(xtermRef, str)
    try {
      const task = await session.opening
      if (sessionRef.current !== session || session.controller.signal.aborted) return
      await task.write({ raw: new TextEncoder().encode(str) })
    } catch (error) {
      if (!session.controller.signal.aborted) onError(error)
    }
  })
  const customKeyEventHandler = useMemoizedFn((e) => {
    if (!xtermRef.current) return true
    const isCtrl = systemRef.current === 'Darwin' ? e.metaKey : e.ctrlKey
    if (e.type === 'keydown') {
      if (isCtrl) {
        if (e.code === TERMINAL_KEYBOARD_Map.KeyC.code) {
          const select = xtermRef.current?.terminal?.getSelection()
          return !select
        }

        if (e.code === TERMINAL_KEYBOARD_Map.KeyV.code) {
          return false
        }
      }
      if (isWrite && e.key === TERMINAL_KEYBOARD_Map.Backspace.key) {
        commandExec('\x1b[D \x1b[D')
        e.preventDefault()
        return false
      }
      if (isWrite && e.key === TERMINAL_KEYBOARD_Map.Enter.key) {
        commandExec(String.fromCharCode(10)) //enter 改为换行符
        e.preventDefault()
        return false
      }
    }

    return true
  })
  const onResize = useMemoizedFn((val) => {
    if (onResizeXterm) onResizeXterm(val)
  })
  return (
    <YakitXterm
      ref={xtermRef}
      onData={(data) => {
        commandExec(data)
      }}
      customKeyEventHandler={customKeyEventHandler}
      onResize={onResize}
    />
  )
})
