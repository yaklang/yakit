import type React from 'react'
import { useEffect, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import classNames from 'classnames'
import { yakitEngine } from '@/services/electronBridge'
import { startIdleVisibleInterval } from '@/utils/scheduleIdleTask'

import styles from './yakitGlobalHost.module.scss'

export interface YakitGlobalHostProp {
  isEngineLink: boolean
  compact?: boolean
}

export const YakitGlobalHost: React.FC<YakitGlobalHostProp> = (props) => {
  const { isEngineLink, compact } = props

  const [host, setHost] = useState<{ addr: string; port: string }>({ addr: '??', port: '??' })

  /** 获取连接引擎的地址参数 */
  const getGlobalHost = useMemoizedFn(() => {
    yakitEngine
      .fetchYaklangEngineAddr()
      .then((data) => {
        if (data.addr === `${host.addr}:${host.port}`) return
        const hosts: string[] = (data.addr as string).split(':')
        if (hosts.length !== 2) return
        setHost({ addr: hosts[0], port: hosts[1] })
      })
      .catch(() => {})
  })

  /** 引擎连接和断开时的展示内容处理 */
  useEffect(() => {
    if (!isEngineLink) {
      setHost({ addr: '??', port: '??' })
      return
    }
    return startIdleVisibleInterval(getGlobalHost, 1000, { runImmediately: true })
  }, [isEngineLink])

  return (
    <div
      className={classNames(styles['yakit-global-host-wrapper'], {
        [styles['yakit-global-host-wrapper-compact']]: compact,
      })}
    >
      <div className={styles['yakit-global-host-body']}>
        <span className={styles['addr-ip']}>{`${host.addr} `}</span>
        <span className={styles['addr-port']}>{host.port}</span>
      </div>
    </div>
  )
}
