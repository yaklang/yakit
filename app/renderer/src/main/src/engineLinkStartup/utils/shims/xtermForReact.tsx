/**
 * xterm-for-react@1.0.4 内联了 React 16，在 React 19 下会报版本冲突。
 * 用 @xterm/xterm v5 重写仓库实际用到的 API（XTerm + IProps + ref.terminal）。
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Terminal, type ITerminalOptions } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

/** 兼容旧 xterm v4 透传字段（如 rows / cols），v5 不识别的字段会被忽略 */
export interface IProps {
  className?: string
  options?: ITerminalOptions & Record<string, unknown>
  onData?(data: string): void
  onKey?(event: { key: string; domEvent: KeyboardEvent }): void
  onResize?(event: { cols: number; rows: number }): void
  customKeyEventHandler?(event: KeyboardEvent): boolean
}

export interface XTermRef {
  terminal: Terminal
}

export const XTerm = forwardRef<XTermRef, IProps>(function XTerm(props, ref) {
  const { className } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const propsRef = useRef(props)
  useEffect(() => {
    propsRef.current = props
  })

  const [terminal] = useState(() => new Terminal(props.options ?? {}))
  useImperativeHandle(ref, () => ({ terminal }), [terminal])

  useEffect(() => {
    const term = terminal
    term.attachCustomKeyEventHandler((e) => propsRef.current.customKeyEventHandler?.(e) ?? true)
    const disposables = [
      term.onData((data) => propsRef.current.onData?.(data)),
      term.onKey((event) => propsRef.current.onKey?.(event)),
      term.onResize((event) => propsRef.current.onResize?.(event)),
    ]
    if (containerRef.current) term.open(containerRef.current)
    return () => {
      disposables.forEach((d) => d.dispose())
      term.dispose()
    }
  }, [terminal])

  return <div className={className} ref={containerRef} />
})

export default XTerm
