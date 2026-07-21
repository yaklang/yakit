import { useEffect, useRef } from 'react'
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
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export let clickEngineConsoleFlag = false
export const changeClickEngineConsoleFlag = (flag: boolean) => {
  clickEngineConsoleFlag = flag
}
export let engineConsoleWindowHash = ''
interface useEngineConsoleHooks {}
export default function useEngineConsole(props: useEngineConsoleHooks) {
  const { t } = useI18nNamespaces(['engineConsole'])
  const { theme: themeGlobal } = useTheme()
  // gRPC stream token，仅驱动订阅/取消，不暴露 UI，用 ref 避免父组件重渲染
  const engineConsoleTokenRef = useRef<string>('')
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

  // token 变更时手动重建 stream 订阅，替代 state + effect 驱动
  const setupEngineConsoleStream = useMemoizedFn((token: string) => {
    cleanupEngineConsoleStream()
    const offData = yakitStream.onData(token, async (data: ExecResult) => {
      if (engineConsoleWindowHash) {
        yakitWindow.forwardConsoleData(Uint8ArrayToString(data.Raw) + '\r\n')
      }
    })

    const offError = yakitStream.onError(token, (error) => {
      yakitNotify('error', `[AttachCombinedOutput] error:  ${error}`)
    })

    const offEnd = yakitStream.onEnd(token, () => {
      yakitNotify('info', '[AttachCombinedOutput] finished')
    })

    streamCleanupRef.current = [offData, offError, offEnd]
  })

  const cancelEngineConsole = useMemoizedFn(() => {
    const token = engineConsoleTokenRef.current
    if (token) {
      yakitStream.cancel('AttachCombinedOutput', token)
      engineConsoleTokenRef.current = ''
    }
    cleanupEngineConsoleStream()
  })

  const onEngineConsoleStart = useMemoizedFn(() => {
    const newToken = randomString(40)
    engineConsoleTokenRef.current = newToken
    setupEngineConsoleStream(newToken)
    yakitEngine.attachCombinedOutput({}, newToken).then(() => {
      yakitNotify('info', t('EngineConsole.monitorStarted'))
    })
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
}
