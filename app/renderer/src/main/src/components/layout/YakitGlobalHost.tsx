import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { yakitEngine } from '@/services/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

import styles from './yakitGlobalHost.module.scss'

export interface YakitGlobalHostProp {
  isEngineLink: boolean
}

export const YakitGlobalHost: React.FC<YakitGlobalHostProp> = (props) => {
  const { isEngineLink } = props
  const { t } = useI18nNamespaces(['layout'])

  const [host, setHost] = useState<YaklangEngineAddr>({ addr: '' })
  /** 获取连接引擎地址计时器 */
  const timeRef = useRef<any>(null)

  /** 获取连接引擎的地址参数 */
  const getGlobalHost = useMemoizedFn(() => {
    yakitEngine
      .fetchYaklangEngineAddr()
      .then((data) => {
        setHost(data)
      })
      .catch(() => {})
  })

  /** 引擎连接和断开时的展示内容处理 */
  useEffect(() => {
    if (isEngineLink) {
      if (timeRef.current) clearInterval(timeRef.current)
      void getGlobalHost()
      timeRef.current = setInterval(getGlobalHost, 1000)

      return () => {
        clearInterval(timeRef.current)
      }
    } else {
      if (timeRef.current) clearInterval(timeRef.current)
      timeRef.current = null
      setHost({ addr: '' })
    }
  }, [isEngineLink])

  return (
    <div className={styles['yakit-global-host-wrapper']}>
      <div className={styles['yakit-global-host-body']}>
        <span
          data-testid="engine-connection-label"
          title={host.instance?.displayEndpoint || host.addr}
          style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {host.instance
            ? t(`EngineManagement.local_${host.instance.transport}`) +
              (host.instance.transport === 'tcp' ? ` · ${host.instance.displayEndpoint}` : '')
            : host.addr
              ? `${t('EngineManagement.remote')}${host.isTLS ? ' TLS' : ''} · ${host.addr}`
              : t('EngineManagement.disconnected')}
        </span>
      </div>
    </div>
  )
}
