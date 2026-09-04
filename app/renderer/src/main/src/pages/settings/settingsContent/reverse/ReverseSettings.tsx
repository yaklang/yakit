import { useEffect, useMemo, useState } from 'react'
import { useGetState, useMemoizedFn } from 'ahooks'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitAutoComplete } from '@/components/yakitUI/YakitAutoComplete/YakitAutoComplete'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { RefreshIcon } from '@/assets/newIcon'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import {
  BRIDGE_ADDR,
  BRIDGE_SECRET,
  DNSLOG_ADDR,
  DNSLOG_INHERIT_BRIDGE,
  DNSLOG_SECRET,
} from '@/pages/reverse/ReverseServerPage'
import { failed, info } from '@/utils/notification'
import type { NetInterface } from '@/models/Traffic'
import { yakitReverse } from '@/services/electronBridge'
import { isCommunityEdition } from '@/utils/envfile'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './ReverseSettings.module.scss'

const YAK_BRIDGE_CMD = 'yak bridge --secret [your-password]'
const YAK_BRIDGE_DOCKER_CMD = 'docker run -it --rm --net=host v1ll4n/yak-bridge yak bridge --secret [your-password]'

export const ReverseSettings: React.FC = () => {
  const { t } = useI18nNamespaces(['setting', 'utils', 'yakitUi'])
  const [addr, setAddr, getAddr] = useGetState('')
  const [password, setPassword, getPassword] = useGetState('')
  const [localIP, setLocalIP] = useState('')
  const [ifaces, setIfaces] = useState<NetInterface[]>([])
  const [ok, setOk] = useState(false)
  const [inheritBridge, setInheritBridge] = useState(false)
  const [dnslogAddr, setDNSLogAddr] = useState('ns1.cybertunnel.run:64333')
  const [dnslogPassword, setDNSLogPassword] = useState('')

  const getStatus = useMemoizedFn(() => {
    yakitReverse.getStatus().then((r) => {
      setOk(r)
      if (!r) return
      setRemoteValue(BRIDGE_ADDR, getAddr())
      setRemoteValue(BRIDGE_SECRET, getPassword())
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

  useEffect(() => {
    getRemoteValue(BRIDGE_ADDR).then((data: string) => {
      if (data) setAddr(`${data}`)
    })
    getRemoteValue(BRIDGE_SECRET).then((data: string) => {
      if (data) setPassword(`${data}`)
    })
    getRemoteValue(DNSLOG_INHERIT_BRIDGE).then((data) => {
      switch (`${data}`) {
        case 'true':
          setInheritBridge(true)
          return
        case 'false':
          setInheritBridge(false)
          getRemoteValue(DNSLOG_ADDR).then((value: string) => {
            if (value) setDNSLogAddr(`${value}`)
          })
          getRemoteValue(DNSLOG_SECRET).then((value: string) => {
            if (value) setDNSLogPassword(`${value}`)
          })
          return
      }
    })
  }, [])

  const updateIface = useMemoizedFn(() => {
    yakitReverse.availableLocalAddr({}).then((data) => {
      const arr = (data.Interfaces || []).filter((i) => i.IP !== '127.0.0.1')
      setIfaces(arr)
    })
  })

  useEffect(() => {
    updateIface()
  }, [])

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

  const localIPOptions = useMemo(
    () => ifaces.filter((item) => !!item.IP).map((item) => ({ value: item.IP, label: item.IP })),
    [ifaces],
  )

  const onToggle = useMemoizedFn((checked: boolean) => {
    if (checked) {
      setRemoteValue(DNSLOG_INHERIT_BRIDGE, `${inheritBridge}`)
      login()
      return
    }
    cancel()
  })

  return (
    <div className={styles['reverse']}>
      <div className={styles['page-head']}>
        <div className={styles['page-title']}>{t('SettingsPage.item.reverse')}</div>
        <div className={styles['page-status']}>
          <span>{ok ? t('YakitButton.enabled') : t('YakitButton.notEnabled')}</span>
          <YakitSwitch size="large" checked={ok} onChange={onToggle} />
        </div>
      </div>

      <div className={styles['section']}>
        <div className={styles['section-head']}>
          <div className={styles['section-title']}>{t('basic.ConfigGlobalReverse.localReverseIP')}</div>
          <YakitButton type="text" size="middle" disabled={ok} onClick={updateIface} icon={<RefreshIcon />}>
            {t('basic.ConfigGlobalReverse.updateYakEngineLocalIP')}
          </YakitButton>
        </div>
        <div className={styles['local-ip-input']}>
          <YakitAutoComplete
            disabled={ok}
            value={localIP}
            options={localIPOptions}
            onChange={(value) => setLocalIP(value)}
          />
        </div>
      </div>

      <div className={styles['section']}>
        <div className={styles['section-title']}>{t('basic.ConfigGlobalReverse.publicReverseConfig')}</div>
        <div className={styles['list-panel']}>
          <div className={styles['hint-wrap']}>
            <div className={styles['hint-box']}>
              <span>{t('basic.ConfigGlobalReverse.runOnPublicServer')}</span>
              <YakitTag enableCopy color="main" copyText={YAK_BRIDGE_CMD} />
              <span>{t('basic.ConfigGlobalReverse.or')}</span>
              <YakitTag enableCopy color="main" copyText={YAK_BRIDGE_DOCKER_CMD} />
              <span>{t('basic.ConfigGlobalReverse.configured')}</span>
            </div>
          </div>
          <div className={styles['setting-row']}>
            <div className={styles['setting-row-text']}>
              <div className={styles['setting-row-title']}>{t('basic.ConfigGlobalReverse.yakBridgeAddress')}</div>
              <div className={styles['setting-row-desc']}>{t('basic.ConfigGlobalReverse.yakBridgeAddressHelp')}</div>
            </div>
            <div className={styles['setting-row-input']}>
              <YakitInput disabled={ok} value={addr} onChange={(e) => setAddr(e.target.value)} />
            </div>
          </div>
          <div className={styles['setting-row']}>
            <div className={styles['setting-row-text']}>
              <div className={styles['setting-row-title']}>{t('basic.ConfigGlobalReverse.yakBridgePassword')}</div>
              <div className={styles['setting-row-desc']}>{t('basic.ConfigGlobalReverse.yakBridgePasswordHelp')}</div>
            </div>
            <div className={styles['setting-row-input']}>
              <YakitInput.Password disabled={ok} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className={styles['section']}>
        <div className={styles['section-title']}>
          {isCommunityEdition() ? 'Yakit ' : ''}
          {t('basic.ConfigGlobalReverse.globalDNSLogConfig')}
        </div>
        <div className={styles['list-panel']}>
          <div className={styles['setting-row']}>
            <div className={styles['setting-row-title']}>{t('basic.ConfigGlobalReverse.reuseYakBridgeConfig')}</div>
            <YakitSwitch size="large" disabled={ok} checked={inheritBridge} onChange={setInheritBridge} />
          </div>
          {!inheritBridge && (
            <>
              <div className={styles['setting-row']}>
                <div className={styles['setting-row-text']}>
                  <div className={styles['setting-row-title']}>{t('basic.ConfigGlobalReverse.dnslogConfig')}</div>
                  <div className={styles['setting-row-desc']}>{t('basic.ConfigGlobalReverse.dnslogAddressHelp')}</div>
                </div>
                <div className={styles['setting-row-input']}>
                  <YakitInput disabled={ok} value={dnslogAddr} onChange={(e) => setDNSLogAddr(e.target.value)} />
                </div>
              </div>
              <div className={styles['setting-row']}>
                <div className={styles['setting-row-text']}>
                  <div className={styles['setting-row-title']}>{t('basic.ConfigGlobalReverse.dnslogPassword')}</div>
                </div>
                <div className={styles['setting-row-input']}>
                  <YakitInput.Password
                    disabled={ok}
                    value={dnslogPassword}
                    onChange={(e) => setDNSLogPassword(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
