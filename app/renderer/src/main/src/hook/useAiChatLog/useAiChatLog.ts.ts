import { ipc } from '../../../../../../shared/communication/window-client'
import { getXtermTheme } from '@/hook/useXTermOptions/useXTermOptions'
import { useTheme } from '@/hook/useTheme'
import { useEffect, useState } from 'react'

const useAiChatLog = () => {
  const [logWinHash, setLogWinHash] = useState('')
  const { theme } = useTheme()

  useEffect(() => {
    ipc.invoke('local', 'forward-xterm-theme', {
      xtermThemeVars: getXtermTheme(),
    })
  }, [theme])

  useEffect(() => {
    const stopIpcEvent1 = ipc.on('ai-chat-log-window-hash', ({ hash }) => {
      setLogWinHash(hash)
      if (hash) {
        ipc.invoke('local', 'forward-xterm-theme', {
          xtermThemeVars: getXtermTheme(),
        })
      }
    })
    return () => {
      stopIpcEvent1()
    }
  }, [])

  const onOpenLogWindow = async () => {
    if (logWinHash === '') {
      await ipc.invoke('local', 'open-ai-chat-log-window', {})
    } else {
      await ipc.invoke('local', 'close-ai-chat-window', {})
    }
  }

  return {
    onOpenLogWindow,
  }
}
export default useAiChatLog
