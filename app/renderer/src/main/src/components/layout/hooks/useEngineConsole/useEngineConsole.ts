import { useEffect, useRef, useState } from 'react'
import { yakitNotify } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import { Uint8ArrayToString } from '@/utils/str'
import { ExecResult } from '@/pages/invoker/schema'
import { useEngineConsoleStore } from '@/store/baseConsole'
import { useMemoizedFn } from 'ahooks'
import { setClipboardText } from '@/utils/clipboard'
import { useTheme } from '@/hook/useTheme'
import { getXtermTheme } from '@/hook/useXTermOptions/useXTermOptions'
import { yakitEngine, yakitStream, yakitWindow } from '@/services/electronBridge'

export let clickEngineConsoleFlag = false
export const changeClickEngineConsoleFlag = (flag: boolean) => {
  clickEngineConsoleFlag = flag
}
export let engineConsoleWindowHash = ''
interface useEngineConsoleHooks {}
export default function useEngineConsole(props: useEngineConsoleHooks) {
  const { theme: themeGlobal } = useTheme()
  const [engineConsoleToken, setEngineConsoleToken] = useState<string>('')
  const { consoleLog, setConsoleInfo } = useEngineConsoleStore()
  const streamCleanupRef = useRef<BridgeCleanup[]>([])
  const consoleLogRef = useRef<string>(consoleLog)
  useEffect(() => {
    consoleLogRef.current = consoleLog
  }, [consoleLog])

  useEffect(() => {
    if (engineConsoleWindowHash) {
      yakitWindow.forwardConsoleTheme({
        xtermThemeVars: getXtermTheme(),
      })
    }
  }, [themeGlobal])

  const cleanupEngineConsoleStream = useMemoizedFn(() => {
    streamCleanupRef.current.forEach((cleanup) => cleanup())
    streamCleanupRef.current = []
  })

  useEffect(() => {
    const offHash = yakitWindow.onConsoleWindowHash(({ hash }) => {
      clickEngineConsoleFlag = false
      engineConsoleWindowHash = hash
      // hash存在则证明引擎新窗口已打开
      if (hash) {
        yakitWindow.forwardConsoleTheme({
          xtermThemeVars: getXtermTheme(),
        })
        // 此处历史记录为使用 EngineConsole 组件产生的历史记录
        if (consoleLogRef.current.length) {
          yakitWindow.forwardConsoleData(consoleLogRef.current)
        }
        onEngineConsoleStart()
      } else {
        // 引擎新窗口关闭
        setConsoleInfo('')
        cancelEngineConsole()
      }
    })

    // 监听子窗口的复制操作
    const offCopy = yakitWindow.onConsoleTerminalCopyData((copyData: string) => {
      setClipboardText(copyData)
    })

    return () => {
      // 菜单常驻父组件意外或主动销毁，子窗口也需要跟着销毁
      yakitWindow.closeConsoleWindow()

      // 状态需要重置
      clickEngineConsoleFlag = false
      engineConsoleWindowHash = ''
      setConsoleInfo('')
      cancelEngineConsole()

      offHash()
      offCopy()
    }
  }, [])

  const onEngineConsoleStart = () => {
    const newToken = randomString(40)
    setEngineConsoleToken(newToken)
    yakitEngine.attachCombinedOutput({}, newToken).then(() => {
      yakitNotify('info', '启动输出监控成功')
    })
  }

  useEffect(() => {
    if (!engineConsoleToken) return

    cleanupEngineConsoleStream()
    const offData = yakitStream.onData(engineConsoleToken, async (data: ExecResult) => {
      if (engineConsoleWindowHash) {
        yakitWindow.forwardConsoleData(Uint8ArrayToString(data.Raw) + '\r\n')
      }
    })

    const offError = yakitStream.onError(engineConsoleToken, (error) => {
      yakitNotify('error', `[AttachCombinedOutput] error:  ${error}`)
    })

    const offEnd = yakitStream.onEnd(engineConsoleToken, () => {
      yakitNotify('info', '[AttachCombinedOutput] finished')
    })

    streamCleanupRef.current = [offData, offError, offEnd]

    return () => {
      cleanupEngineConsoleStream()
    }
  }, [engineConsoleToken])

  const cancelEngineConsole = useMemoizedFn(() => {
    if (engineConsoleToken) {
      yakitStream.cancel('AttachCombinedOutput', engineConsoleToken)
    }
    cleanupEngineConsoleStream()
  })
}
