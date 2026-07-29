import { type RefObject, useEffect } from 'react'
import { yakitAuxWindow } from '@/services/electronBridge'
import { AUX_XTERM_THEME_SYNC } from '@/auxWindow/utils/applyAuxThemeColors'
import { getXtermTheme } from './xtermTheme'
import type { AuxXtermRef } from './AuxXterm'

export type AuxTerminalPushPayload = {
  type?: string
  data?: unknown
}

const applyPushPayload = (payload: AuxTerminalPushPayload, xtermRef: RefObject<AuxXtermRef | null>) => {
  const terminal = xtermRef.current?.terminal
  if (!terminal) return

  switch (payload.type) {
    case 'xterm-data':
    case 'ai-chat-log-data':
      if (typeof payload.data === 'string') terminal.write(payload.data)
      break
    // xterm-theme 来自主窗 forward-xterm-theme，切换时可能仍是上一套配色，改由 applyAuxThemeColors 本地同步
    case 'ai-chat-log-clear':
      terminal.clear()
      break
    default:
      break
  }
}

const syncXtermTheme = (xtermRef: RefObject<AuxXtermRef | null>) => {
  const terminal = xtermRef.current?.terminal
  if (!terminal) return
  terminal.options.theme = getXtermTheme()
}

export const useAuxTerminalPush = (windowId: string, xtermRef: RefObject<AuxXtermRef | null>) => {
  useEffect(() => {
    if (!windowId) return

    const onThemeSync = () => syncXtermTheme(xtermRef)

    let readySent = false
    const sendReady = () => {
      if (readySent || !xtermRef.current?.terminal) return
      readySent = true
      yakitAuxWindow.ready(windowId)
    }

    const offPush = yakitAuxWindow.onPush((msg) => {
      if (msg.windowId !== windowId) return
      applyPushPayload((msg.payload || {}) as AuxTerminalPushPayload, xtermRef)
    })

    const offInit = yakitAuxWindow.onInit((msg) => {
      if (msg.windowId !== windowId) return
      syncXtermTheme(xtermRef)
    })

    window.addEventListener(AUX_XTERM_THEME_SYNC, onThemeSync)

    sendReady()
    const timer = window.setInterval(sendReady, 50)

    return () => {
      window.clearInterval(timer)
      offPush()
      offInit()
      window.removeEventListener(AUX_XTERM_THEME_SYNC, onThemeSync)
    }
  }, [windowId, xtermRef])
}
