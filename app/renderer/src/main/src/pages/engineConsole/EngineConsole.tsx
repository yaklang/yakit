import React, { useEffect, useRef } from 'react'
import { randomString } from '@/utils/randomUtil'
import { failed, info } from '@/utils/notification'
import { ExecResult } from '@/pages/invoker/schema'
import { Uint8ArrayToString } from '@/utils/str'
import { writeXTerm, xtermFit } from '@/utils/xtermUtils'
import { XTerm } from 'xterm-for-react'
import ReactResizeDetector from 'react-resize-detector'
import { useXTermOptions } from '@/hook/useXTermOptions/useXTermOptions'
import { yakitEngine, yakitStream } from '@/services/electronBridge'

export interface EngineConsoleProp {}

export const EngineConsole: React.FC<EngineConsoleProp> = (props) => {
  const xtermRef = useRef<any>(null)

  const terminalOptions = useXTermOptions({
    getTerminal: () => xtermRef.current?.terminal,
  })

  useEffect(() => {
    if (!xtermRef) {
      return
    }

    const token = randomString(40)
    const offData = yakitStream.onData(token, async (data: ExecResult) => {
      try {
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
    }
  }, [xtermRef])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--Colors-Use-Neutral-Bg)',
      }}
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
        options={terminalOptions}
        // onResize={(r) => {
        //     xtermFit(xtermRef, 120, 18)
        // }}
      />
    </div>
  )
}
