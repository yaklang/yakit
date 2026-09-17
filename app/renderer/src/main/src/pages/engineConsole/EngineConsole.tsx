import { ipc } from '@/services/ipc'
import type React from 'react'
import { useEffect, useRef } from 'react'
import { randomString } from '@/utils/randomUtil'
import { failed, info } from '@/utils/notification'
import type { ExecResult } from '@/pages/invoker/schema'
import { Uint8ArrayToString } from '@/utils/str'
import { writeXTerm, xtermFit } from '@/utils/xtermUtils'
import { XTerm } from 'xterm-for-react'
import ReactResizeDetector from 'react-resize-detector'
import { useXTermOptions } from '@/hook/useXTermOptions/useXTermOptions'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export interface EngineConsoleProp {}

export const EngineConsole: React.FC<EngineConsoleProp> = (props) => {
  const { t } = useI18nNamespaces(['engineConsole'])
  const xtermRef = useRef<any>(null)

  const terminalOptions = useXTermOptions({
    getTerminal: () => xtermRef.current?.terminal,
  })

  useEffect(() => {
    if (!xtermRef) {
      return
    }

    const token = randomString(40)
    const controller = new AbortController()
    const onError = (error: unknown) => {
      if (controller.signal.aborted) return
      failed(`[AttachCombinedOutput] error: ${error}`)
    }
    info(t('EngineConsole.monitorStarted'))
    void ipc
      .openStream(
        'grpc',
        'AttachCombinedOutput',
        {},
        {
          token,
          signal: controller.signal,
          onData(data) {
            if (controller.signal.aborted) return
            try {
              writeXTerm(xtermRef, Uint8ArrayToString(data.Raw) + '\r\n')
            } catch (e) {
              console.info(e)
            }
          },
          onError,
          onEnd() {
            if (controller.signal.aborted) return
            info('[AttachCombinedOutput] finished')
          },
        },
      )
      .catch(onError)
    return () => {
      controller.abort()
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
