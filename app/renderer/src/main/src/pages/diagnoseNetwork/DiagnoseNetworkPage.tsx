import { ipc, type GrpcInput, type GrpcOutput } from '@/services/ipc'
import { int64ToSafeNumber } from '@/utils/int64'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { AutoCard } from '@/components/AutoCard'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { Divider, Space } from 'antd'
import { randomString } from '@/utils/randomUtil'
import { failed, yakitInfo } from '@/utils/notification'
import { useGetState, useMemoizedFn } from 'ahooks'
import { AutoSpin } from '@/components/AutoSpin'
import { XTerm } from 'xterm-for-react'
import { writeXTerm, xtermClear, xtermFit } from '@/utils/xtermUtils'
import ReactResizeDetector from 'react-resize-detector'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { DiagnoseNetworkForm, type DiagnoseNetworkParams } from '@/pages/diagnoseNetwork/DiagnoseNetworkForm'
import { CloseCircleIcon } from '@yakit-libs/yakit-ui-icons/oldicon'
import { DiagnoseNetworkDNSForm } from '@/pages/diagnoseNetwork/DiagnoseNetworkDNSForm'
import { TracerouteForm } from '@/pages/diagnoseNetwork/TracerouteForm'
import { useXTermOptions } from '@/hook/useXTermOptions/useXTermOptions'

export interface DiagnoseNetworkPageProp {}

interface DiagnoseNetworkResult {
  Title: string
  DiagnoseType: string
  DiagnoseResult: string
  LogLevel: string
}

export const DiagnoseNetworkPage: React.FC<DiagnoseNetworkPageProp> = (props) => {
  const sessionsRef = useRef(new Map<string, AbortController>())
  const [domain, setDomain] = useState('www.example.com')
  const [loading, setLoading] = useState(false)
  const [preHop, setPreHop, GetPreHop] = useGetState(0)
  const [preIp, setPreIp, GetPreIp] = useGetState('')
  const xtermRef = useRef<any>(null)

  const terminalOptions = useXTermOptions({
    getTerminal: () => xtermRef.current?.terminal,
  })

  const onDiagnosticData = useMemoizedFn((data: GrpcOutput<'DiagnoseNetwork'>) => {
    if (data.DiagnoseType === 'log') {
      writeXTerm(xtermRef, `[${data.LogLevel}]: ${data.Title} ${data.DiagnoseResult}\n`)
    } else {
      writeXTerm(xtermRef, `[${data.DiagnoseType}]: ${data.Title}\n ${data.DiagnoseResult}\n\n\n`)
    }
  })
  const onTraceData = useMemoizedFn((data: GrpcOutput<'TraceRoute'>) => {
    const hop = int64ToSafeNumber(data.Hop)
    if (hop !== GetPreHop()) writeXTerm(xtermRef, `hop ${hop}\t`)
    else if (data.Ip !== GetPreIp()) writeXTerm(xtermRef, '\t')
    if (data.Reason) {
      writeXTerm(xtermRef, '*\n')
      setPreIp('*')
    } else {
      if (data.Ip !== GetPreIp()) writeXTerm(xtermRef, `${data.Ip}\t${data.Rtt}ms\n`)
      setPreIp(data.Ip)
    }
    setPreHop(hop)
  })
  const begin = useMemoizedFn((api: string) => {
    sessionsRef.current.get(api)?.abort()
    const controller = new AbortController()
    sessionsRef.current.set(api, controller)
    setLoading(true)
    yakitInfo(`[${api}] started`)
    const finish = (error?: unknown) => {
      if (controller.signal.aborted || sessionsRef.current.get(api) !== controller) return
      sessionsRef.current.delete(api)
      setLoading(sessionsRef.current.size > 0)
      if (error) failed(`[${api}] error: ${error}`)
      else yakitInfo(`[${api}] finished`)
    }
    return { token: randomString(60), signal: controller.signal, onError: finish, onEnd: () => finish() }
  })
  const submit = useMemoizedFn((params: DiagnoseNetworkParams) => {
    const options = begin('DiagnoseNetwork')
    void ipc
      .openStream('grpc', 'DiagnoseNetwork', params, { ...options, onData: onDiagnosticData })
      .catch(options.onError)
  })
  const submitDNSDiag = useMemoizedFn((params: GrpcInput<'DiagnoseNetworkDNS'>) => {
    const options = begin('DiagnoseNetworkDNS')
    void ipc
      .openStream('grpc', 'DiagnoseNetworkDNS', params, { ...options, onData: onDiagnosticData })
      .catch(options.onError)
  })
  const submitTraceroute = useMemoizedFn((params: GrpcInput<'TraceRoute'>) => {
    setPreHop(0)
    setPreIp('')
    const options = begin('TraceRoute')
    void ipc.openStream('grpc', 'TraceRoute', params, { ...options, onData: onTraceData }).catch(options.onError)
  })
  useEffect(
    () => () => {
      for (const controller of sessionsRef.current.values()) controller.abort()
      sessionsRef.current.clear()
    },
    [],
  )

  return (
    <AutoCard
      title={
        <Space>
          网络诊断
          {loading && <AutoSpin size={'small'} />}
          <YakitButton
            type={'text'}
            colors="danger"
            icon={<CloseCircleIcon />}
            onClick={() => {
              xtermClear(xtermRef)
            }}
          />
        </Space>
      }
      bordered={false}
      size={'small'}
      bodyStyle={{ padding: 0 }}
    >
      <YakitResizeBox
        firstRatio={'300px'}
        firstMinSize={'300px'}
        firstNode={
          <div style={{ marginTop: 12 }}>
            <DiagnoseNetworkForm
              onSubmit={(params) => {
                submit(params)
              }}
            />
            <Divider />
            <DiagnoseNetworkDNSForm
              onSubmit={(params) => {
                submitDNSDiag(params)
              }}
            />
            <Divider />
            <TracerouteForm
              onSubmit={(params) => {
                submitTraceroute(params)
              }}
            />
          </div>
        }
        secondNode={
          <div style={{ height: '100%', backgroundColor: 'var(--Colors-Use-Neutral-Bg)' }}>
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
            <XTerm ref={xtermRef} options={terminalOptions} />
          </div>
        }
      />
    </AutoCard>
  )
}
