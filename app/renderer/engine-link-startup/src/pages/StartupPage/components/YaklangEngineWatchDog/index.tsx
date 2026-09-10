import React, { useEffect, useRef } from 'react'
import type { YakitStatusType, YaklangEngineWatchDogCredential } from '../../types'
import { useMemoizedFn } from 'ahooks'
import { debugToPrintLog } from '@/utils/logCollection'
import { yakitNotify } from '@/utils/notification'
import { __PLATFORM__, FetchSoftwareVersion, isEnpriTraceAgent, toEngineHandshakeName } from '@/utils/envfile'
import emiter from '@/utils/eventBus/eventBus'
import { grpcStartLocalEngine, isEngineConnectionAlive } from '../../grpc'
import { outputToWelcomeConsole } from '../../utils'
import { yakitEngine } from '@/utils/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { engineFailureMessage, engineFailureStatus } from '../../engineFailure'

export interface YaklangEngineWatchDogProps {
  credential: YaklangEngineWatchDogCredential
  keepalive: boolean
  engineLink: boolean

  onReady?: () => void
  onFailed?: (failedCount: number) => void
  onKeepaliveShouldChange?: (keepalive: boolean) => void

  yakitStatus: YakitStatusType
  setYakitStatus: (v: YakitStatusType) => void

  setCheckLog: (log: string[]) => void
}

export const YaklangEngineWatchDog: React.FC<YaklangEngineWatchDogProps> = React.memo((props) => {
  const { t, i18n } = useI18nNamespaces(['link'])
  const yakitStatusRef = useRef(props.yakitStatus)
  const credentialRef = useRef(props.credential)
  const mounted = useRef(true)
  const startingUp = useRef(false)
  const pendingCredential = useRef(props.credential)
  const latestStartCallIdRef = useRef(0)
  yakitStatusRef.current = props.yakitStatus
  credentialRef.current = props.credential

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      latestStartCallIdRef.current++
    }
  }, [])
  useEffect(() => {
    if (props.yakitStatus === 'break') {
      latestStartCallIdRef.current++
      startingUp.current = false
    }
  }, [props.yakitStatus])

  const engineTest = useMemoizedFn(async () => {
    const credential = props.credential
    if (!credential.Mode || credential.Port <= 0 || yakitStatusRef.current === 'break') return
    if (startingUp.current && pendingCredential.current === credential) return
    const callId = ++latestStartCallIdRef.current
    pendingCredential.current = credential
    startingUp.current = true
    const isCurrent = () =>
      mounted.current &&
      callId === latestStartCallIdRef.current &&
      credentialRef.current === credential &&
      yakitStatusRef.current !== 'break'
    outputToWelcomeConsole(t('YaklangEngineWatchDog.start_connecting_core_engine'))
    try {
      try {
        await yakitEngine.connectYaklangEngine(credential)
        if (isCurrent()) props.onKeepaliveShouldChange?.(true)
        return
      } catch (error) {
        if (!isCurrent()) return
        if (credential.Mode === 'remote') {
          yakitNotify('error', String(error))
          return
        }
      }
      outputToWelcomeConsole(t('YaklangEngineWatchDog.start_local_engine_with_port', { port: credential.Port }))
      const result = await grpcStartLocalEngine({
        port: credential.Port,
        password: credential.Password,
        version: toEngineHandshakeName(__PLATFORM__),
        isEnpriTraceAgent: isEnpriTraceAgent(),
        softwareVersion: FetchSoftwareVersion(),
      })
      if (!isCurrent()) return
      if (result.ok && result.status === 'success') {
        debugToPrintLog('[INFO] 本地引擎认证连接成功')
        props.onKeepaliveShouldChange?.(true)
      } else {
        const status = engineFailureStatus(result.status, 'start')
        if (!status) return
        const message = engineFailureMessage(result, i18n.language, t('YaklangEngineWatchDog.startup_failed'))
        outputToWelcomeConsole(message)
        props.setCheckLog([message])
        props.setYakitStatus(status)
      }
    } catch (error) {
      if (!isCurrent()) return
      props.setCheckLog([t('YaklangEngineWatchDog.startup_failed')])
      props.setYakitStatus('start_timeout')
    } finally {
      if (callId === latestStartCallIdRef.current) startingUp.current = false
    }
  })

  useEffect(() => {
    const start = () => {
      void engineTest()
    }
    emiter.on('startAndCreateEngineProcess', start)
    return () => emiter.off('startAndCreateEngineProcess', start)
  }, [engineTest])

  /**
   * 引擎连接尝试逻辑
   * 引擎连接有效尝试次数: 1-10
   */
  useEffect(() => {
    const keepalive = props.keepalive
    if (!keepalive) {
      if (props.onFailed) {
        props.onFailed(100)
      }
      return
    }
    debugToPrintLog(`------ 开始启动引擎进程探活逻辑------`)

    let disposed = false
    let pending = false
    let failedCount = 0
    let notified = false

    const connect = () => {
      if (pending || disposed) return
      pending = true
      isEngineConnectionAlive()
        .then(() => {
          if (disposed) {
            return
          }
          if (!notified) {
            outputToWelcomeConsole(t('YaklangEngineWatchDog.engine_ready_to_connect'))
            notified = true
          }
          failedCount = 0
          if (props.onReady) {
            props.onReady()
          }
        })
        .catch(() => {
          if (disposed) return
          failedCount++
          if (failedCount > 0 && failedCount <= 10) {
            outputToWelcomeConsole(t('YaklangEngineWatchDog.engine_not_fully_started', { count: failedCount }))
          }
          if (props.onFailed) {
            props.onFailed(failedCount)
          }
        })
        .finally(() => {
          pending = false
        })
    }
    connect()
    const id = setInterval(connect, 3000)
    return () => {
      disposed = true
      clearInterval(id)
    }
  }, [props.keepalive, props.onReady, props.onFailed])

  return <></>
})
