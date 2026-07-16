import React, { useEffect, useRef, useState } from 'react'
import { YakitStatusType, YaklangEngineWatchDogCredential } from '../../types'
import { useDebounceEffect, useMemoizedFn } from 'ahooks'
import { debugToPrintLog } from '@/utils/logCollection'
import { yakitNotify } from '@/utils/notification'
import { __PLATFORM__, FetchSoftwareVersion, isEnpriTraceAgent } from '@/utils/envfile'
import emiter from '@/utils/eventBus/eventBus'
import { grpcStartLocalEngine, isEngineConnectionAlive } from '../../grpc'
import { outputToWelcomeConsole } from '../../utils'
import { yakitEngine } from '@/utils/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'

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
  const { t } = useI18nNamespaces(['link'])
  const yakitStatusRef = useRef<YakitStatusType>(props.yakitStatus)
  // 是否自动重启引擎进程
  const [autoStartProgress, setAutoStartProgress] = useState(false)
  // 是否正在重启引擎进程
  const startingUp = useRef<boolean>(false)
  const latestStartCallIdRef = useRef(0)

  useEffect(() => {
    yakitStatusRef.current = props.yakitStatus
  }, [props.yakitStatus])

  useEffect(() => {
    if (!props.engineLink) setAutoStartProgress(false)
  }, [props.engineLink])

  /** 接受连接引擎的指令 */
  useEffect(() => {
    emiter.on('startAndCreateEngineProcess', () => {
      engineTest()
    })
    return () => {
      emiter.off('startAndCreateEngineProcess')
    }
  }, [])

  /** 引擎信息认证 */
  const engineTest = useMemoizedFn(() => {
    debugToPrintLog(`[IFNO] engine-test mode:${props.credential.Mode} port:${props.credential.Port}`)
    // 重置状态
    setAutoStartProgress(false)

    const mode = props.credential.Mode
    if (!mode) {
      return
    }

    if (props.credential.Port <= 0) {
      outputToWelcomeConsole(t('YaklangEngineWatchDog.port_empty_cannot_connect'))
      return
    }

    /**
     * 认证要小心做，拿到准确的信息之后，尝试连接一次，确定连接成功之后才可以开始后续步骤
     * 当然引擎没有启动的时候无法连接成功，要准备根据引擎状态选择合适的方式启动引擎
     */
    outputToWelcomeConsole(t('YaklangEngineWatchDog.start_connecting_core_engine'))
    debugToPrintLog(`------ 测试目标引擎是否存在进程存活情况------`)
    yakitEngine
      .connectYaklangEngine(props.credential)
      .then(() => {
        debugToPrintLog(`------ 目标引擎进程存活 ------`)
        outputToWelcomeConsole(t('YaklangEngineWatchDog.connect_core_engine_success'))
        if (props.onKeepaliveShouldChange) {
          props.onKeepaliveShouldChange(true)
        }
      })
      .catch((e) => {
        debugToPrintLog(`------ 目标引擎进程不存在 ------`)
        outputToWelcomeConsole(t('YaklangEngineWatchDog.engine_not_connected_try_start'))
        switch (mode) {
          case 'local':
            outputToWelcomeConsole(t('YaklangEngineWatchDog.try_start_local_process'))
            setAutoStartProgress(true)
            return
          case 'remote':
            outputToWelcomeConsole(t('YaklangEngineWatchDog.remote_mode_no_auto_start'))
            yakitNotify('error', e + '')
            return
        }
      })
  })

  useDebounceEffect(
    () => {
      const mode = props.credential.Mode

      if (!mode) {
        return
      }
      if (mode === 'remote') {
        return
      }
      if (props.credential.Port <= 0) {
        return
      }
      if (!autoStartProgress) {
        // 不启动进程的话，就直接退出
        return
      }
      debugToPrintLog(`[INFO] 尝试启动新的引擎进程 port:${props.credential.Port}`)
      // 只有普通模式才涉及到引擎启动的流程
      outputToWelcomeConsole(t('YaklangEngineWatchDog.start_local_engine_with_port', { port: props.credential.Port }))

      if (mode === 'local') {
        if (!startingUp.current) {
          const callId = ++latestStartCallIdRef.current
          grpcStartLocalEngine({
            port: props.credential.Port,
            password: props.credential.Password,
            version: __PLATFORM__,
            isEnpriTraceAgent: isEnpriTraceAgent(),
            softwareVersion: FetchSoftwareVersion(),
          })
            .then((res) => {
              if (yakitStatusRef.current === 'break') return

              if (res.ok && res.status === 'success') {
                debugToPrintLog(`[INFO] 本地新引擎进程启动成功`)
                if (props.onKeepaliveShouldChange) {
                  props.onKeepaliveShouldChange(true)
                }
              } else {
                if (res.status === 'timeout') {
                  props.setCheckLog([t('YaklangEngineWatchDog.command_timeout_retry')])
                  props.setYakitStatus('start_timeout')
                } else {
                  outputToWelcomeConsole(
                    t('YaklangEngineWatchDog.engine_start_failed', {
                      status: res.status,
                      message: res.message,
                    }),
                  )
                }
                debugToPrintLog(`[ERROR] 本地新引擎进程启动失败: ${res.status + ':' + res.message}`)
              }
              startingUp.current = false
            })
            .catch((error) => {
              // 旧调用直接跳过
              if (callId !== latestStartCallIdRef.current) return
              // 如果手动中断 显示中断界面 意外情况暂时不做处理
              outputToWelcomeConsole(t('YaklangEngineWatchDog.engine_start_interrupted', { error }))
              props.setCheckLog([t('YaklangEngineWatchDog.engine_start_interrupted_check_log')])
            })
        }
      }
    },
    [autoStartProgress, props.onKeepaliveShouldChange, props.credential],
    {
      leading: false,
      wait: 1000,
    },
  )

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

    let count = 0
    let failedCount = 0
    let notified = false

    const connect = () => {
      count++
      isEngineConnectionAlive()
        .then(() => {
          if (!keepalive) {
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
        .catch((e) => {
          failedCount++
          if (failedCount > 0 && failedCount <= 10) {
            outputToWelcomeConsole(t('YaklangEngineWatchDog.engine_not_fully_started', { count: failedCount }))
          }
          if (props.onFailed) {
            props.onFailed(failedCount)
          }
        })
    }
    connect()
    const id = setInterval(connect, 3000)
    return () => {
      clearInterval(id)
    }
  }, [props.keepalive, props.onReady, props.onFailed])

  return <></>
})
