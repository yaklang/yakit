import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { Form, Space } from 'antd'
import { ipc } from '@/services/ipc'
import type { GrpcOutput } from '../../../../../../shared/communication/protocol'
import { AutoCard } from '@/components/AutoCard'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { failed, info } from '@/utils/notification'
import { useMemoizedFn } from 'ahooks'
import { PacketListDemo } from '@/components/playground/PacketListDemo'
import { DemoItemSelectMultiForString } from '@/demoComponents/itemSelect/ItemSelect'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

export interface PcapXDemoProp {}

interface PcapXRequest {
  NetInterfaceList: string[]
}

export const PcapXDemo: React.FC<PcapXDemoProp> = (props) => {
  const { t } = useI18nNamespaces(['components'])
  const [pcapMeta, setPcapMeta] = useState<GrpcOutput<'GetPcapMetadata'>>()
  const streamAbort = useRef<AbortController>()
  const [loading, setLoading] = useState(false)

  const [firstRequest, setFirstRequest] = useState<PcapXRequest>({
    NetInterfaceList: [],
  })

  useEffect(() => {
    const controller = new AbortController()
    void ipc
      .invoke('grpc', 'GetPcapMetadata', {}, { signal: controller.signal })
      .then((data) => {
        setPcapMeta(data)
        if (data?.DefaultPublicNetInterface) {
          setFirstRequest({ ...firstRequest, NetInterfaceList: [data.DefaultPublicNetInterface.Name] })
        }
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) failed(error.message)
      })
    return () => {
      controller.abort()
      streamAbort.current?.abort()
    }
  }, [])

  const cancel = useMemoizedFn(() => {
    streamAbort.current?.abort()
    streamAbort.current = undefined
    setLoading(false)
  })

  const startSniff = useMemoizedFn(() => {
    if (streamAbort.current) return
    const controller = new AbortController()
    streamAbort.current = controller
    setLoading(true)
    const finish = () => {
      if (streamAbort.current !== controller) return
      streamAbort.current = undefined
      setLoading(false)
    }
    const onError = (error: Error) => {
      if (controller.signal.aborted) return
      failed(`[PcapX] error: ${error.message}`)
      finish()
    }
    void ipc
      .openStream('grpc', 'PcapX', firstRequest, {
        signal: controller.signal,
        onError,
        onEnd() {
          info('[PcapX] finished')
          finish()
        },
      })
      .catch(onError)
  })

  return (
    <YakitResizeBox
      firstNode={
        <AutoCard
          size={'small'}
          bordered={false}
          title={t('playground.PcapXDemo.configure')}
          extra={
            <Space>
              {loading ? (
                <YakitButton
                  colors={'danger'}
                  onClick={() => {
                    cancel()
                  }}
                >
                  {t('playground.PcapXDemo.stopSniffing')}
                </YakitButton>
              ) : (
                <YakitButton
                  onClick={() => {
                    startSniff()
                  }}
                >
                  {t('playground.PcapXDemo.startSniffing')}
                </YakitButton>
              )}
            </Space>
          }
          style={{ marginTop: 3 }}
        >
          <Form
            onSubmitCapture={(e) => {
              e.preventDefault()
            }}
            labelCol={{ span: 5 }}
            wrapperCol={{ span: 14 }}
            size={'small'}
          >
            <DemoItemSelectMultiForString
              data={(pcapMeta?.AvailablePcapDevices || []).map((i) => ({
                value: i.Name,
                label: `${i.Name} ${i.IP}`,
              }))}
              label={t('playground.PcapXDemo.netInterface')}
              setValue={(data) => {
                setFirstRequest({ ...firstRequest, NetInterfaceList: data.split(',') })
              }}
              value={firstRequest.NetInterfaceList.join(',')}
              help={
                <Space>
                  {pcapMeta?.DefaultPublicNetInterface && (
                    <div>
                      {t('playground.PcapXDemo.defaultInterface')} {pcapMeta?.DefaultPublicNetInterface.Name}
                    </div>
                  )}
                </Space>
              }
              disabled={loading}
            />

            {loading ? (
              <>
                <DemoItemSelectMultiForString
                  label={t('playground.PcapXDemo.viewTable')}
                  data={[
                    { value: 'raw', label: t('playground.PcapXDemo.rawPacket') },
                    { value: 'tcp-reassembled', label: t('playground.PcapXDemo.tcpData') },
                    { value: 'session', label: t('playground.PcapXDemo.activeSession') },
                  ]}
                />
                <DemoItemSelectMultiForString
                  data={(pcapMeta?.AvailableSessionTypes || []).map((i) => ({ value: i.Value, label: i.Key }))}
                  label={t('playground.PcapXDemo.sessionProtocol')}
                />
                <DemoItemSelectMultiForString
                  data={(pcapMeta?.AvailableLinkLayerTypes || []).map((i) => ({ value: i.Value, label: i.Key }))}
                  label={t('playground.PcapXDemo.linkLayerProtocol')}
                />
                <DemoItemSelectMultiForString
                  data={(pcapMeta?.AvailableNetworkLayerTypes || []).map((i) => ({ value: i.Value, label: i.Key }))}
                  label={t('playground.PcapXDemo.networkLayerProtocol')}
                />
                <DemoItemSelectMultiForString
                  data={(pcapMeta?.AvailableTransportLayerTypes || []).map((i) => ({ value: i.Value, label: i.Key }))}
                  label={t('playground.PcapXDemo.transportLayerProtocol')}
                />
              </>
            ) : (
              <></>
            )}
          </Form>
        </AutoCard>
      }
      firstRatio={'400px'}
      secondNode={
        <div style={{ overflow: 'hidden', height: '100%', background: '#fcfcfc' }}>
          <PacketListDemo />
        </div>
      }
    />
  )
}
