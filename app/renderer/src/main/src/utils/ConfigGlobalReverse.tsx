import React, { useEffect, useState } from 'react'
import { Alert, Divider, Form, Space } from 'antd'
import { InputItem, SwitchItem } from './inputUtil'
import { useGetState, useMemoizedFn } from 'ahooks'
import { getRemoteValue, setRemoteValue } from './kv'
import {
  BRIDGE_ADDR,
  BRIDGE_SECRET,
  DNSLOG_ADDR,
  DNSLOG_INHERIT_BRIDGE,
  DNSLOG_SECRET,
} from '../pages/reverse/ReverseServerPage'
import { failed, info } from './notification'
import type { NetInterface } from '@/models/Traffic'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { RefreshIcon } from '@yakit-libs/yakit-ui-icons/oldicon/RefreshIcon'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitReverse } from '@/services/electronBridge'
import { isCommunityEdition } from './envfile'

export const ConfigGlobalReverse = React.memo(() => {
  const { t, i18n } = useI18nNamespaces(['utils', 'yakitUi'])
  const [addr, setAddr, getAddr] = useGetState('')
  const [password, setPassword, getPassword] = useGetState('')
  const [localIP, setLocalIP, getLocalIP] = useGetState('')
  const [ifaces, setIfaces] = useState<NetInterface[]>([])
  const [ok, setOk] = useState(false)

  // dnslog 配置
  const [inheritBridge, setInheritBridge] = useState(false)
  const [dnslogAddr, setDNSLogAddr] = useState('ns1.cybertunnel.run:64333')
  const [dnslogPassword, setDNSLogPassword] = useState('')

  const getStatus = useMemoizedFn(() => {
    yakitReverse.getStatus().then((r) => {
      setOk(r)
      setRemoteValue(BRIDGE_ADDR, addr)
      setRemoteValue(BRIDGE_SECRET, password)
    })
  })

  useEffect(() => {
    getStatus()
    const id = setInterval(() => {
      getStatus()
    }, 1000)
    return () => {
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    if (!inheritBridge) {
      setDNSLogPassword('')
      setDNSLogAddr('ns1.cybertunnel.run:64333')
    }
  }, [inheritBridge])

  const cancel = useMemoizedFn(() => {
    yakitReverse.cancel().finally(() => {
      getStatus()
    })
  })
  const login = useMemoizedFn(() => {
    yakitReverse
      .config({
        ConnectParams: { Addr: addr, Secret: password },
        LocalAddr: localIP,
      })
      .then(() => {
        getStatus()
        if (inheritBridge) {
          yakitReverse
            .setYakBridgeLogServer({
              DNSLogAddr: addr,
              DNSLogSecret: password,
            })
            .then(() => {
              info(t('basic.ConfigGlobalReverse.dnslogSuccess'))
            })
            .catch((e) => {
              failed(t('basic.ConfigGlobalReverse.dnslogFailed', { error: e }))
            })
        } else {
          setRemoteValue(DNSLOG_ADDR, dnslogAddr)
          setRemoteValue(DNSLOG_SECRET, dnslogPassword)
          yakitReverse
            .setYakBridgeLogServer({
              DNSLogAddr: dnslogAddr,
              DNSLogSecret: dnslogPassword,
            })
            .then(() => {
              info(t('basic.ConfigGlobalReverse.dnslogSuccess'))
            })
            .catch((e) => {
              failed(t('basic.ConfigGlobalReverse.dnslogFailed', { error: e }))
            })
        }
      })
      .catch((e) => {
        failed(`Config Global Reverse Server failed: ${e}`)
      })
  })

  // 设置 Bridge
  useEffect(() => {
    getRemoteValue(BRIDGE_ADDR).then((data: string) => {
      if (data) {
        setAddr(`${data}`)
      }
    })

    getRemoteValue(BRIDGE_SECRET).then((data: string) => {
      if (data) {
        setPassword(`${data}`)
      }
    })

    getRemoteValue(DNSLOG_INHERIT_BRIDGE).then((data) => {
      switch (`${data}`) {
        case 'true':
          setInheritBridge(true)
          return
        case 'false':
          setInheritBridge(false)
          getRemoteValue(DNSLOG_ADDR).then((data: string) => {
            if (data) {
              setDNSLogAddr(`${data}`)
            }
          })
          getRemoteValue(DNSLOG_SECRET).then((data: string) => {
            if (data) {
              setDNSLogPassword(`${data}`)
            }
          })
          return
      }
    })

    return () => {
      // cancel()
    }
  }, [])

  // // 如果 addr 和 password 都存在，且没有连接，则马上连接一次
  // useEffect(() => {
  //     // 如果已经连上就退出
  //     if (ok) {
  //         return
  //     }
  //
  //     if (!!addr && !!password) {
  //         login()
  //         let id = setInterval(() => {
  //             login()
  //         }, 1000)
  //         return () => {
  //             clearInterval(id)
  //         }
  //     }
  // }, [addr, password, ok])

  const updateIface = useMemoizedFn(() => {
    yakitReverse.availableLocalAddr({}).then((data) => {
      const arr = (data.Interfaces || []).filter((i) => i.IP !== '127.0.0.1')
      setIfaces(arr)
    })
  })

  useEffect(() => {
    if (ifaces.length === 1) {
      setLocalIP(ifaces[0].IP)
    }
  }, [ifaces])

  useEffect(() => {
    const offError = yakitReverse.onError((data) => {
      failed(`全局反连配置失败：${data}`)
    })
    return () => {
      offError()
    }
  }, [])

  return (
    <div>
      <Form
        style={{ marginTop: 20 }}
        onSubmitCapture={(e) => {
          e.preventDefault()

          login()
          setRemoteValue(DNSLOG_INHERIT_BRIDGE, `${inheritBridge}`)
        }}
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 16 }}
      >
        <InputItem
          label={t('basic.ConfigGlobalReverse.localReverseIP')}
          value={localIP}
          disable={ok}
          setValue={setLocalIP}
          autoComplete={ifaces.filter((item) => !!item.IP).map((item) => item.IP)}
          help={
            <div>
              <YakitButton
                type={'text'}
                size={'small'}
                onClick={() => {
                  updateIface()
                }}
                icon={<RefreshIcon />}
              >
                {t('basic.ConfigGlobalReverse.updateYakEngineLocalIP')}
              </YakitButton>
            </div>
          }
        />
        <Divider orientation={'left'}>{t('basic.ConfigGlobalReverse.publicReverseConfig')}</Divider>
        <Form.Item label={' '} colon={false}>
          <Alert
            message={
              <Space direction={'vertical'}>
                <div>{t('basic.ConfigGlobalReverse.runOnPublicServer')}</div>
                <YakitTag enableCopy={true} color="blue" copyText={`yak bridge --secret [your-password]`}></YakitTag>
                <div>{t('basic.ConfigGlobalReverse.or')}</div>
                <YakitTag
                  enableCopy={true}
                  color="blue"
                  copyText={`docker run -it --rm --net=host v1ll4n/yak-bridge yak bridge --secret
                        [your-password]`}
                ></YakitTag>
                <div>{t('basic.ConfigGlobalReverse.configured')}</div>
              </Space>
            }
          />
        </Form.Item>
        <InputItem
          label={t('basic.ConfigGlobalReverse.yakBridgeAddress')}
          value={addr}
          setValue={setAddr}
          disable={ok}
          help={t('basic.ConfigGlobalReverse.yakBridgeAddressHelp')}
        />
        <InputItem
          label={t('basic.ConfigGlobalReverse.yakBridgePassword')}
          setValue={setPassword}
          value={password}
          type={'password'}
          disable={ok}
          help={t('basic.ConfigGlobalReverse.yakBridgePasswordHelp')}
        />
        <Divider orientation={'left'}>
          {isCommunityEdition() && 'Yakit'} {t('basic.ConfigGlobalReverse.globalDNSLogConfig')}
        </Divider>
        <SwitchItem
          label={t('basic.ConfigGlobalReverse.reuseYakBridgeConfig')}
          disabled={ok}
          value={inheritBridge}
          setValue={setInheritBridge}
          oldTheme={false}
        />
        {!inheritBridge && (
          <InputItem
            label={t('basic.ConfigGlobalReverse.dnslogConfig')}
            disable={ok}
            value={dnslogAddr}
            help={t('basic.ConfigGlobalReverse.dnslogAddressHelp')}
            setValue={setDNSLogAddr}
          />
        )}
        {!inheritBridge && (
          <InputItem
            label={t('basic.ConfigGlobalReverse.dnslogPassword')}
            disable={ok}
            value={dnslogPassword}
            setValue={setDNSLogPassword}
          />
        )}
        <Form.Item colon={false} label={' '}>
          <YakitButton type="primary" htmlType="submit" disabled={ok}>
            {' '}
            {t('basic.ConfigGlobalReverse.configureReverseConnection')}{' '}
          </YakitButton>
          {ok && (
            <YakitButton
              type="primary"
              danger={true}
              onClick={() => {
                cancel()
              }}
              style={{ marginLeft: 8 }}
            >
              {' '}
              {t('YakitButton.stop')}{' '}
            </YakitButton>
          )}
        </Form.Item>
      </Form>
    </div>
  )
})
