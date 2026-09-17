import { ipc } from '@/services/ipc'
import { useEffect, useRef } from 'react'
import { yakitNotify } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import { Uint8ArrayToString } from '@/utils/str'
import type { ExecResult } from '@/pages/invoker/schema'
import { useEngineConsoleStore } from '@/store/baseConsole'
import { useMemoizedFn } from 'ahooks'
import { setClipboardText } from '@/utils/clipboard'
import { useTheme } from '@/hook/useTheme'
import { getXtermTheme } from '@/hook/useXTermOptions/useXTermOptions'
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
  const controllerRef = useRef<AbortController>()
  const consoleLogRef = useRef<string>(consoleLog)
  useEffect(() => {
    consoleLogRef.current = consoleLog
  }, [consoleLog])

  useEffect(() => {
    if (engineConsoleWindowHash) {
      ipc.invoke('local', 'forward-xterm-theme', {
        xtermThemeVars: getXtermTheme(),
      })
    }
  }, [themeGlobal])

  const cancelEngineConsole = useMemoizedFn(() => {
    controllerRef.current?.abort()
    engineConsoleTokenRef.current = ''
  })
  const onEngineConsoleStart = useMemoizedFn(() => {
    cancelEngineConsole()
    const controller = new AbortController()
    controllerRef.current = controller
    const token = randomString(40)
    engineConsoleTokenRef.current = token
    const onError = (error: unknown) => {
      if (!controller.signal.aborted) yakitNotify('error', `[AttachCombinedOutput] error: ${error}`)
    }
    yakitNotify('info', t('EngineConsole.monitorStarted'))
    void ipc
      .openStream(
        'grpc',
        'AttachCombinedOutput',
        {},
        {
          token,
          signal: controller.signal,
          onData(data) {
            if (!controller.signal.aborted && engineConsoleWindowHash)
              ipc.invoke('local', 'forward-xterm-data', Uint8ArrayToString(data.Raw) + '\r\n')
          },
          onError,
          onEnd() {
            if (!controller.signal.aborted) yakitNotify('info', '[AttachCombinedOutput] finished')
          },
        },
      )
      .catch(onError)
  })

  useEffect(() => {
    const offHash = ipc.on('engineConsole-window-hash', ({ hash }) => {
      clickEngineConsoleFlag = false
      engineConsoleWindowHash = hash
      // hash存在则证明引擎新窗口已打开
      if (hash) {
        ipc.invoke('local', 'forward-xterm-theme', {
          xtermThemeVars: getXtermTheme(),
        })
        // 此处历史记录为使用 EngineConsole 组件产生的历史记录
        if (consoleLogRef.current.length) {
          ipc.invoke('local', 'forward-xterm-data', consoleLogRef.current)
        }
        onEngineConsoleStart()
      } else {
        // 引擎新窗口关闭
        setConsoleInfo('')
        cancelEngineConsole()
      }
    })

    // 监听子窗口的复制操作
    const offCopy = ipc.on('console-terminal-window-copy-data', (copyData: string) => {
      setClipboardText(copyData)
    })

    return () => {
      // 菜单常驻父组件意外或主动销毁，子窗口也需要跟着销毁
      ipc.invoke('local', 'close-console-new-window', {})

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
