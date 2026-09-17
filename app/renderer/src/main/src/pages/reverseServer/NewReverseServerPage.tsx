import { ipc } from '@/services/ipc'
import type React from 'react'
import { useState, useEffect, useRef } from 'react'
import { Form, Divider, Typography, Row, Col } from 'antd'
import { YakitPageHeader } from '../../components/YakitPageHeader'
import { useGetState, useMemoizedFn } from 'ahooks'
import { randomString } from '../../utils/randomUtil'
import { failed, warn, info } from '../../utils/notification'
import type { ExecResultLog } from '../invoker/batch/ExecMessageViewer'
import { ExtractExecResultMessage } from '../../components/yakitLogSchema'
import { type ReverseNotification, ReverseTable } from './ReverseTable'
import {
  convertRequest,
  type ParamsRefProps,
  PayloadCode,
  PayloadForm,
  type YsoGeneraterRequest,
} from '../payloadGenerater/NewJavaPayloadPage'
import { getRemoteValue } from '@/utils/kv'

import './reverseServerPage.scss'
import type { NetInterface } from '@/models/Traffic'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitInputNumber } from '@/components/yakitUI/YakitInputNumber/YakitInputNumber'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

const { Text } = Typography

export interface FacadeOptionsProp {}

export interface SettingReverseParamsInfo {
  IsRemote: boolean
  BridgeParam: { Addr: string; Secret: string }
  ReversePort: number
  ReverseHost: string
}
interface ApplyFacadesRequest {
  Token: string
  GenerateClassParams: YsoGeneraterRequest
}
export type FacadesRequest = SettingReverseParamsInfo & ApplyFacadesRequest

export const NewReverseServerPage: React.FC<FacadeOptionsProp> = (props) => {
  const { t } = useI18nNamespaces(['reverse'])
  const [status, setStatus] = useState<'setting' | 'start'>('setting')
  const [token, setToken, getToken] = useGetState(randomString(40))
  const [addrParams, setAddrParams] = useState<SettingReverseParamsInfo>({
    BridgeParam: { Addr: '', Secret: '' },
    IsRemote: false,
    ReversePort: 8085,
    ReverseHost: '127.0.0.1',
  })
  const [remoteIp, setRemoteIp] = useState<string>('')

  const startFacadeServer = useMemoizedFn((params: SettingReverseParamsInfo, remoteIp: string) => {
    setAddrParams(params)
    setRemoteIp(remoteIp)
    setStatus('start')
  })

  return (
    <div className="reverse-server-page-wrapper">
      {status === 'setting' && (
        <YakitPageHeader
          className="reverse-server-page-head"
          backIcon={false}
          title={t('NewReverseServerPage.reverseServer')}
          subTitle={t('NewReverseServerPage.reverseServerSubTitle')}
        >
          <SettingReverseServer
            defaultSetting={{ ...addrParams }}
            setServer={(setting) => {
              setAddrParams(setting.setting)
              setRemoteIp(setting.remoteIp)
              startFacadeServer(setting.setting, setting.remoteIp)
            }}
          />
        </YakitPageHeader>
      )}
      {status === 'start' && addrParams && (
        <StartReverseServer
          token={getToken()}
          addr={addrParams}
          remoteIp={remoteIp}
          stop={(isCancel) => {
            setStatus('setting')
            setToken(randomString(40))
          }}
        />
      )}
    </div>
  )
}

export interface SettingReverseServerProp {
  defaultSetting: SettingReverseParamsInfo
  setServer: (params: { setting: SettingReverseParamsInfo; remoteIp: string }) => any
}

export const BRIDGE_ADDR = 'yak-bridge-addr'
export const BRIDGE_SECRET = 'yak-bridge-secret'
export const SettingReverseServer: React.FC<SettingReverseServerProp> = (props) => {
  const { t } = useI18nNamespaces(['reverse'])
  const [formInstance] = Form.useForm()
  const [loading, setLoading] = useState<boolean>(false)
  const [params, setParams] = useState<SettingReverseParamsInfo>({ ...props.defaultSetting })
  const remoteIp = useRef<string>('')

  useEffect(() => {
    const initParams = { ...params }
    if (initParams.ReverseHost !== '127.0.0.1') return

    setLoading(true)
    getRemoteValue(BRIDGE_ADDR).then((addr: string) => {
      if (addr) {
        initParams.BridgeParam.Addr = addr
        getRemoteValue(BRIDGE_SECRET)
          .then((secret: string) => {
            initParams.BridgeParam.Secret = secret
            initParams.IsRemote = true
          })
          .finally(() => {
            ipc
              .invoke('grpc', 'AvailableLocalAddr', {})
              .then((data) => {
                const arr = (data.Interfaces || []).filter((i) => i.IP !== '127.0.0.1')
                if (arr.length > 0) initParams.ReverseHost = arr[0].IP
              })
              .finally(() => {
                setValue({ ...initParams })
                setTimeout(() => setLoading(false), 300)
              })
          })
      } else {
        ipc
          .invoke('grpc', 'AvailableLocalAddr', {})
          .then((data) => {
            const arr = (data.Interfaces || []).filter((i) => i.IP !== '127.0.0.1')
            if (arr.length > 0) initParams.ReverseHost = arr[0].IP
          })
          .finally(() => {
            setValue({ ...initParams })
            setTimeout(() => setLoading(false), 300)
          })
      }
    })
  }, [])

  const setValue = useMemoizedFn((data: SettingReverseParamsInfo) => {
    formInstance.setFieldsValue({ ...data })
    setParams({ ...data })
  })

  const submit = useMemoizedFn(() => {
    if (params.IsRemote) remoteAddrConvert()
    else {
      props.setServer({ setting: { ...params }, remoteIp: '' })
      remoteIp.current = ''
    }
  })

  const remoteAddrConvert = useMemoizedFn(() => {
    setLoading(true)
    ipc
      .invoke('grpc', 'GetTunnelServerExternalIP', {
        Addr: params.BridgeParam.Addr,
        Secret: params.BridgeParam.Secret,
      })
      .then((data) => (remoteIp.current = data.IP))
      .catch((e: any) => {
        failed(t('SettingReverseServer.getRemoteAddrFailed') + `${e}`)
        remoteIp.current = ''
      })
      .finally(() => setTimeout(() => setLoading(false), 300))
  })

  useEffect(() => {
    if (!loading && params.IsRemote && !!remoteIp.current) {
      props.setServer({ setting: { ...params }, remoteIp: remoteIp.current })
      remoteIp.current = ''
    }
  }, [loading])

  return (
    <div className="setting-reverse-server-wrapper">
      <YakitSpin spinning={loading}>
        <Form
          form={formInstance}
          initialValues={{ ...props.defaultSetting }}
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          onFinish={submit}
        >
          <Form.Item
            label={t('SettingReverseServer.enablePublicTunnel')}
            name="IsRemote"
            help={
              params.IsRemote && (
                <div style={{ color: 'var(--Colors-Use-Neutral-Text-1-Title)' }}>
                  {t('SettingReverseServer.publicTunnelHelp')}{' '}
                  <YakitTag enableCopy={true} color="blue" copyText={`yak bridge --secret [your-pass]`}></YakitTag>{' '}
                  {t('SettingReverseServer.yakBridgeService')} <Divider type={'vertical'} />
                  <Text style={{ color: 'var(--Colors-Use-Neutral-Text-4-Help-text)' }}>
                    {t('SettingReverseServer.yakVersionRequirement')}
                  </Text>
                </div>
              )
            }
          >
            <YakitSwitch checked={params.IsRemote} onChange={(IsRemote) => setValue({ ...params, IsRemote })} />
          </Form.Item>

          {params.IsRemote && (
            <>
              <Form.Item
                label={t('SettingReverseServer.publicBridgeAddr')}
                name={['BridgeParam', 'Addr']}
                rules={[{ required: true, message: '' }]}
              >
                <YakitInput
                  allowClear
                  value={params.BridgeParam.Addr}
                  onChange={(e) => {
                    params.BridgeParam.Addr = e.target.value
                    setValue({ ...params })
                  }}
                />
              </Form.Item>
              <Form.Item label={t('SettingReverseServer.password')} name={['BridgeParam', 'Secret']}>
                <YakitInput
                  allowClear
                  value={params.BridgeParam.Secret}
                  onChange={(e) => {
                    params.BridgeParam.Secret = e.target.value
                    setValue({ ...params })
                  }}
                />
              </Form.Item>
            </>
          )}
          {!params.IsRemote && (
            <Form.Item
              label={t('SettingReverseServer.reverseAddr')}
              name="ReverseHost"
              rules={[{ required: true, message: '' }]}
            >
              <YakitInput
                allowClear
                value={params.ReverseHost}
                onChange={(e) => setValue({ ...params, ReverseHost: e.target.value })}
              />
            </Form.Item>
          )}
          <Form.Item
            label={t('SettingReverseServer.reversePort')}
            name="ReversePort"
            rules={[{ required: true, message: '' }]}
          >
            <YakitInputNumber
              width="100%"
              min={0}
              max={65535}
              precision={0}
              value={params.ReversePort}
              onChange={(ReversePort) => setValue({ ...params, ReversePort: ReversePort as number })}
            />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 8 }}>
            <YakitButton type="primary" htmlType="submit">
              {t('SettingReverseServer.startFacadeServerBtn')}
            </YakitButton>
          </Form.Item>
        </Form>
      </YakitSpin>
    </div>
  )
}

export interface StartReverseServerProp {
  token: string
  addr: SettingReverseParamsInfo
  remoteIp: string
  stop: (isCancel?: boolean) => any
}
export const StartReverseServer: React.FC<StartReverseServerProp> = (props) => {
  const { t } = useI18nNamespaces(['reverse'])
  const { token, addr, remoteIp, stop } = props
  const reverseAddr = addr.IsRemote ? `${remoteIp}:${addr.ReversePort}` : `${addr.ReverseHost}:${addr.ReversePort}`

  const [loading, setLoading] = useState<boolean>(false)
  const dataRef = useRef<ReverseNotification[]>([])
  const [data, setData, getData] = useGetState<ReverseNotification[]>([])
  const totalRef = useRef<number>(0)

  const [classRequest, setClassRequest] = useState<ParamsRefProps>({ useGadget: false, Gadget: '', Class: '' })
  const [codeRefresh, setCodeRefresh] = useState<boolean>(false)

  const [isExtra, setIsExtra] = useState<boolean>(false)
  const [isShowCode, setIsShowCode] = useState<boolean>(false)
  const [codeExtra, setCodeExtra] = useState<boolean>(false)

  useEffect(() => {
    if (!token) return

    dataRef.current = []
    totalRef.current = 0
    setData([])
    const controller = new AbortController()
    const onError = (error: unknown) => {
      if (controller.signal.aborted) return
      failed(String(error))
      stop(true)
    }
    void ipc
      .openStream(
        'grpc',
        'StartFacadesWithYsoObject',
        {
          ...addr,
          ReverseHost: addr.IsRemote ? remoteIp : addr.ReverseHost,
          GenerateClassParams: { Gadget: '', Class: '', Options: [] },
          Token: token,
        },
        {
          token,
          signal: controller.signal,
          onData(data) {
            if (controller.signal.aborted) return
            if (!data.IsMessage) {
              return
            }
            const datas = dataRef.current
            try {
              const message = ExtractExecResultMessage(data) as ExecResultLog
              if (message.level !== 'facades-msg') {
                switch (message.level) {
                  case 'error':
                  case 'mirror_error':
                    failed(`${message.level}: ${message.data}`)
                    stop()
                    break
                  case 'warning':
                    warn(message.data)
                    break
                  default:
                    info(JSON.stringify(message))
                }
                return
              }
              const obj = JSON.parse(message.data) as ReverseNotification
              obj.timestamp = message.timestamp
              let isUpdata = false
              for (let i = 0; i < datas.length; i++) {
                if (datas[i].connect_hash === obj.connect_hash) {
                  datas[i] = obj
                  isUpdata = true
                  break
                }
              }
              if (!isUpdata) {
                datas.unshift(obj)
                totalRef.current = totalRef.current + 1
              }

              if (datas.length > 100) datas.pop()
            } catch (e) {}
          },
          onError,
          onEnd() {
            if (!controller.signal.aborted) stop(true)
          },
        },
      )
      .catch(onError)
    const id = setInterval(() => {
      const datas = dataRef.current

      if (getData().length === 0) setData([...datas])
      if (getData().length > 0 && datas[0]?.uuid !== getData()[0]?.uuid) setData([...datas])
    }, 1000)
    return () => {
      clearInterval(id)
      controller.abort()
    }
  }, [token])

  const clearData = () => {
    dataRef.current = []
    totalRef.current = 0
    setData([])
  }

  const onApply = useMemoizedFn((value: ParamsRefProps) => {
    const data = convertRequest(value)
    setClassRequest({ ...value })
    ipc
      .invoke('grpc', 'ApplyClassToFacades', { Token: token, GenerateClassParams: { ...data } })
      .then((res) => info(t('StartReverseServer.applyToFacadeServerSuccess')))
      .catch((err) => failed(`${t('StartReverseServer.applyToFacadeServerFailed')}${err}`))
      .finally(() => setTimeout(() => setLoading(false), 300))
    setCodeRefresh(!codeRefresh)
  })

  return (
    <div className="start-reverse-server-wrapper">
      <div className={`payload-${isExtra ? (codeExtra ? 'extra-' : '') : 'hidden-'}wrapper payload-container`}>
        <div className={`payload-${isShowCode ? (codeExtra ? 'hidden-' : 'code-') : ''}setting`}>
          <PayloadForm
            isReverse={true}
            isShowCode={isShowCode}
            showCode={() => setIsShowCode(!isShowCode)}
            paramsData={{ useGadget: false, Gadget: '', Class: '' }}
            setParamsData={() => {}}
            loading={loading}
            setLoading={setLoading}
            onApply={onApply}
          />
        </div>
        <div className={`payload-${isShowCode ? '' : 'hidden-'}code`} style={{ marginTop: !codeExtra ? '-1px' : 0 }}>
          <PayloadCode
            isMin={true}
            codeExtra={codeExtra}
            data={{ ...classRequest }}
            RefreshTrigger={codeRefresh}
            onExtra={() => setCodeExtra(!codeExtra)}
          />
        </div>
      </div>

      <div className={`reverse-${codeExtra ? 'hidden-' : ''}wrapper`}>
        <div className="reverse-body">
          <YakitPageHeader
            className="reverse-server-pagehead"
            backIcon={false}
            title={t('NewReverseServerPage.reverseServer')}
            subTitle={t('NewReverseServerPage.reverseServerSubTitle')}
            extra={
              <div className="pagehead-extra-body">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--Colors-Use-Neutral-Text-1-Title)',
                  }}
                >
                  {t('StartReverseServer.payloadConfig')}
                  <YakitSwitch checked={isExtra} onChange={(checked) => setIsExtra(checked)} />
                </div>
                <YakitButton className="body-btn" type="primary" danger={true} size="small" onClick={() => stop()}>
                  {t('StartReverseServer.stopReverse')}
                </YakitButton>
              </div>
            }
          >
            <Row align="middle">
              <Col>
                <div className="addr-body">
                  {t('StartReverseServer.httpReverseAddr')}&nbsp;&nbsp;
                  <YakitTag
                    enableCopy={true}
                    color="blue"
                    copyText={`http://${reverseAddr}/${
                      classRequest?.className ? classRequest?.className + '.class' : ''
                    }`}
                  ></YakitTag>
                </div>
              </Col>
              <Col>
                <div className="addr-body">
                  {t('StartReverseServer.rmiReverseAddr')}&nbsp;&nbsp;
                  <YakitTag
                    enableCopy={true}
                    color="success"
                    copyText={`rmi://${reverseAddr}/${classRequest?.className || ''}`}
                  ></YakitTag>
                </div>
              </Col>
              <Col>
                <div className="addr-body">
                  {t('StartReverseServer.ldapReverseAddr')}&nbsp;&nbsp;
                  <YakitTag
                    enableCopy={true}
                    color="purple"
                    copyText={`ldap://${reverseAddr}/${classRequest?.className || ''}`}
                  ></YakitTag>
                </div>
              </Col>
            </Row>
          </YakitPageHeader>
          <div className="reverse-server-data">
            <ReverseTable total={totalRef.current} data={data} clearData={clearData} />
          </div>
        </div>
      </div>
    </div>
  )
}
