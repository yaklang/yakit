import { ipc } from '@/services/ipc'
import type React from 'react'
import { useEffect, useState, useRef } from 'react'
import { Button, Form } from 'antd'
import { InputInteger } from '@/utils/inputUtil'
import { info, failed } from '@/utils/notification'

export interface PacketScanFormProp {
  token: string
  httpFlowIds?: (string | number)[]
  plugins: string[]
  https?: boolean
  httpRequest?: Uint8Array
}

export interface ExecPacketScanRequest {
  HTTPFlow: (string | number)[]
  HTTPRequest?: Uint8Array
  HTTPS: boolean
  AllowFuzzTag?: boolean
  TotalTimeoutSeconds?: number
  Timeout?: number
  PluginConcurrent?: number
  PacketConcurrent?: number
  PluginList: string[]
  Proxy?: string
}

function defaultPacketScanRequestParams(): ExecPacketScanRequest {
  return {
    HTTPFlow: [],
    HTTPRequest: new Uint8Array(),
    HTTPS: false,
    AllowFuzzTag: false,
    TotalTimeoutSeconds: 300,
    Timeout: 10,
    PacketConcurrent: 10,
    PluginConcurrent: 10,
    PluginList: [] as string[],
    Proxy: '',
  }
}

export const PacketScanForm: React.FC<PacketScanFormProp> = (props) => {
  const [params, setParams] = useState(defaultPacketScanRequestParams())
  const [loading, setLoading] = useState(false)

  const { token, httpFlowIds, plugins, https, httpRequest } = props

  const controllerRef = useRef<AbortController>()
  useEffect(() => () => controllerRef.current?.abort(), [token])

  return (
    <Form
      onSubmitCapture={(e) => {
        e.preventDefault()

        if (plugins.length === 0) {
          info('未选择插件无法进行扫描')
          return
        }

        setLoading(true)
        controllerRef.current?.abort()
        const controller = new AbortController()
        controllerRef.current = controller
        const onError = (error: unknown) => {
          if (controller.signal.aborted) return
          failed(`[ExecPacketScan] error: ${error}`)
          setLoading(false)
        }
        info('开始扫描数据包')
        void ipc
          .openStream(
            'grpc',
            'ExecPacketScan',
            {
              ...params,
              HTTPFlow: httpFlowIds,
              HTTPS: https,
              HTTPRequest: httpRequest,
              PluginList: plugins,
            },
            {
              token,
              signal: controller.signal,
              onError,
              onEnd() {
                if (!controller.signal.aborted) {
                  info('[ExecPacketScan] finished')
                  setLoading(false)
                }
              },
            },
          )
          .catch(onError)
      }}
      layout={'horizontal'}
    >
      <Form.Item style={{ marginBottom: 4 }}>
        {loading && (
          <Button
            type={'primary'}
            danger={true}
            onClick={() => {
              controllerRef.current?.abort()
              setLoading(false)
            }}
          >
            停止任务
          </Button>
        )}
        {!loading && (
          <Button type="primary" htmlType="submit">
            {' '}
            开始扫描{' '}
          </Button>
        )}
      </Form.Item>
      {/*<InputInteger*/}
      {/*    label={"设置请求超时时间"}*/}
      {/*    setValue={Timeout => setParams({...params, Timeout})} value={params.Timeout}*/}
      {/*/>*/}
      <InputInteger
        size={'small'}
        label={'总超时时间'}
        setValue={(TotalTimeoutSeconds) => setParams({ ...params, TotalTimeoutSeconds })}
        value={params.TotalTimeoutSeconds}
      />
    </Form>
  )
}
