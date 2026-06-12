import React, { useRef } from 'react'
import AuxXterm, { type AuxXtermRef, useAuxTerminalPush } from '@/auxWindow/components/AuxXterm'
import { setClipboardText } from '@/utils/clipboard'
import styles from '@/auxWindow/styles/terminalPage.module.scss'

interface EngineConsoleProps {
  windowId: string
}

const EngineConsole: React.FC<EngineConsoleProps> = ({ windowId }) => {
  const xtermRef = useRef<AuxXtermRef>(null)

  useAuxTerminalPush(windowId, xtermRef)

  return (
    <div className={styles['aux-terminal-page']}>
      <AuxXterm
        ref={xtermRef}
        options={{ convertEol: true }}
        customKeyEventHandler={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.code === 'KeyC') {
            const selection = xtermRef.current?.terminal.getSelection()
            if (selection) {
              setClipboardText(selection)
              return false
            }
          }
          return true
        }}
      />
    </div>
  )
}

export default EngineConsole
