import React, { useEffect, useRef } from 'react'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import styles from './baseConsole.module.scss'
import { ExecResult } from '@/pages/invoker/schema'
import { failed, info } from '@/utils/notification'
import { randomString } from '@/utils/randomUtil'
import { writeXTerm, xtermFit } from '@/utils/xtermUtils'
import { Uint8ArrayToString } from '@/utils/str'
import { XTerm } from 'xterm-for-react'
import ReactResizeDetector from 'react-resize-detector'
import { useEngineConsoleStore } from '../../store/baseConsole'
import { YakitSystem } from '@/yakitGVDefine'
import { setClipboardText } from '@/utils/clipboard'
import { useXTermOptions } from '@/hook/useXTermOptions/useXTermOptions'
import { yakitEngine, yakitStream, yakitSystem } from '@/services/electronBridge'

export interface EngineConsoleProp {
  isMini: boolean
}

export const EngineConsole: React.FC<EngineConsoleProp> = (props) => {
  const { isMini } = props
  const timeRef = useRef<ReturnType<typeof setTimeout>>()
  const xtermRef = useRef<any>(null)
  // 缓存Console日志信息
  const { consoleLog, setConsoleInfo } = useEngineConsoleStore()
  const consoleLogRef = useRef<string>(consoleLog)
  useEffect(() => {
    if (!consoleLog.length) {
      consoleLogRef.current = ''
    }
  }, [consoleLog])

  const terminalOptions = useXTermOptions({
    getTerminal: () => xtermRef.current?.terminal,
  })

  useEffect(() => {
    if (!xtermRef) {
      return
    }
    const token = randomString(40)
    const updateConsoleLog = () => {
      setConsoleInfo(consoleLogRef.current)
    }
    timeRef.current = setInterval(updateConsoleLog, 300)

    const offData = yakitStream.onData(token, async (data: ExecResult) => {
      try {
        consoleLogRef.current += Uint8ArrayToString(data.Raw) + '\r\n'
        writeXTerm(xtermRef, Uint8ArrayToString(data.Raw) + '\r\n')
      } catch (e) {
        console.info(e)
      }
    })
    const offError = yakitStream.onError(token, (error) => {
      failed(`[AttachCombinedOutput] error:  ${error}`)
    })
    const offEnd = yakitStream.onEnd(token, () => {
      info('[AttachCombinedOutput] finished')
    })

    yakitEngine.attachCombinedOutput({}, token).then(() => {
      info(`启动输出监控成功`)
    })

    return () => {
      yakitStream.cancel('AttachCombinedOutput', token)
      offData()
      offError()
      offEnd()
      clearInterval(timeRef.current)
    }
  }, [xtermRef])

  const systemRef = useRef<YakitSystem>('Darwin')
  useEffect(() => {
    yakitSystem
      .fetchSystemName()
      .then((res) => (systemRef.current = res))
      .catch(() => {})
  }, [])

  const setCopy = useDebounceFn(
    useMemoizedFn((content: string) => {
      setClipboardText(content)
    }),
    { wait: 10 },
  ).run
  const onCopy = useMemoizedFn((e: KeyboardEvent) => {
    const isActiveCOrM = systemRef.current === 'Darwin' ? e.metaKey : e.ctrlKey
    const isCopy = e.code === 'KeyC' && isActiveCOrM
    if (isCopy) {
      const str = xtermRef.current.terminal.getSelection()
      setCopy(str || '')
      return false
    }
    return true
  })

  return (
    <div
      className={classNames(styles['engine-console'], {
        [styles['engine-console-noMini']]: !isMini,
      })}
    >
      <ReactResizeDetector
        onResize={(width, height) => {
          if (!width || !height) return

          const row = Math.floor(height / 18.5)
          const col = Math.floor(width / 10)
          if (xtermRef) xtermFit(xtermRef, col, row)
        }}
        handleWidth={true}
        handleHeight={true}
        refreshMode={'debounce'}
        refreshRate={50}
      />
      <XTerm
        ref={xtermRef}
        customKeyEventHandler={onCopy}
        options={terminalOptions}
        className={styles['baseConsole']}
      />
    </div>
  )
}
