import React, { useRef } from 'react'
import AuxXterm, { type AuxXtermRef, useAuxTerminalPush } from '@/auxWindow/components/AuxXterm'
import styles from '@/auxWindow/styles/terminalPage.module.scss'

interface AiChatLogProps {
  windowId: string
}

const AiChatLog: React.FC<AiChatLogProps> = ({ windowId }) => {
  const xtermRef = useRef<AuxXtermRef>(null)

  useAuxTerminalPush(windowId, xtermRef)

  return (
    <div className={styles['aux-terminal-page']}>
      <AuxXterm ref={xtermRef} options={{ convertEol: true, scrollback: 500 }} />
    </div>
  )
}

export default AiChatLog
