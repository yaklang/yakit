import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import 'xterm/css/xterm.css'
import { Terminal, type ITerminalOptions } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { getXtermTheme } from './xtermTheme'
import styles from './AuxXterm.module.scss'

export interface AuxXtermRef {
  terminal: Terminal
}

const defaultTerminalOptions: ITerminalOptions = {
  fontFamily: 'Consolas, "Lucida Console", "Courier New", monospace',
  convertEol: true,
}

interface AuxXtermProps {
  options?: ITerminalOptions
  customKeyEventHandler?: (event: KeyboardEvent) => boolean
}

const AuxXterm = forwardRef<AuxXtermRef, AuxXtermProps>(({ options = {}, customKeyEventHandler }, ref) => {
  const divRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  useImperativeHandle(
    ref,
    () => ({
      get terminal() {
        return terminalRef.current!
      },
    }),
    [],
  )

  useEffect(() => {
    const terminal = new Terminal({
      ...defaultTerminalOptions,
      ...options,
      theme: getXtermTheme(),
    })
    const fitAddon = new FitAddon()
    terminalRef.current = terminal
    fitRef.current = fitAddon
    terminal.loadAddon(fitAddon)

    if (customKeyEventHandler) {
      terminal.attachCustomKeyEventHandler(customKeyEventHandler)
    }

    if (divRef.current) {
      terminal.open(divRef.current)
      fitAddon.fit()
    }

    const resizeObserver = new ResizeObserver(() => fitAddon.fit())
    if (divRef.current) resizeObserver.observe(divRef.current)

    return () => {
      resizeObserver.disconnect()
      terminal.dispose()
      fitAddon.dispose()
      terminalRef.current = null
      fitRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div className={styles['aux-xterm']} ref={divRef} />
})

AuxXterm.displayName = 'AuxXterm'

export default AuxXterm
