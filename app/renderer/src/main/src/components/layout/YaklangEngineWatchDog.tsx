import React, { useEffect, useRef, useState } from 'react'
import { useDebounceEffect, useMemoizedFn } from 'ahooks'
import { isEngineConnectionAlive } from '@/components/layout/WelcomeConsoleUtil'
import { EngineWatchDogCallbackType, YaklangEngineMode } from '@/yakitGVDefine'
import { EngineModeVerbose } from '@/components/basics/YakitLoading'
import { failed } from '@/utils/notification'
import { setRemoteValue } from '@/utils/kv'
import { yakitDynamicStatus } from '@/store'
import { remoteOperation } from '@/pages/dynamicControl/DynamicControl'
import { fetchEnv, getRemoteHttpSettingGV, isEnpriTraceAgent, isIRify } from '@/utils/envfile'
import emiter from '@/utils/eventBus/eventBus'
import { debugToPrintLog } from '@/utils/logCollection'
import { yakitEngine } from '@/services/electronBridge'

export interface YaklangEngineWatchDogCredential {
  Mode?: YaklangEngineMode
  Host: string
  Port: number

  /**
   * 高级登陆验证信息
   * */
  IsTLS?: boolean
  PemBytes?: Uint8Array
  Password?: string
}
export interface YaklangEngineWatchDogProps {
  credential: YaklangEngineWatchDogCredential
  keepalive: boolean
  engineLink: boolean

  onReady?: () => any
  onFailed?: (failedCount: number) => any
  onKeepaliveShouldChange?: (keepalive: boolean) => any

  failedCallback: (type: EngineWatchDogCallbackType) => any
}

export const YaklangEngineWatchDog: React.FC<YaklangEngineWatchDogProps> = React.memo(
  (props: YaklangEngineWatchDogProps) => {
    // 是否自动重启引擎进程
    const [autoStartProgress, setAutoStartProgress] = useState(false)
    // 是否正在重启引擎进程
    const startingUp = useRef<boolean>(false)
    const { dynamicStatus, setDynamicStatus } = yakitDynamicStatus()

    /** 引擎信息认证 */
    const engineTest = useMemoizedFn((isDynamicControl?: boolean) => {
      debugToPrintLog(
        `[IFNO] engine-test mode:${props.credential.Mode} port:${props.credential.Port} isDynamicControl:${isDynamicControl}`,
      )
      // 重置状态
      setAutoStartProgress(false)
      const mode = props.credential.Mode
      if (!mode) {
        return
      }

      if (props.credential.Port <= 0) {
        return
      }

      /**
       * 认证要小心做，拿到准确的信息之后，尝试连接一次，确定连接成功之后才可以开始后续步骤
       * 当然引擎没有启动的时候无法连接成功，要准备根据引擎状态选择合适的方式启动引擎
       */
      debugToPrintLog(`------ 测试目标引擎是否存在进程存活情况------`)
      yakitEngine
        .connectYaklangEngine(props.credential)
        .then(() => {
          debugToPrintLog(`------ 目标引擎进程存活------`)
          if (props.onKeepaliveShouldChange) {
            props.onKeepaliveShouldChange(true)
          }
          // 如果为远程控制 则修改私有域为
          if (isDynamicControl) {
            // 远程控制生效
            setDynamicStatus({ ...dynamicStatus, isDynamicStatus: true })
            remoteOperation(true, dynamicStatus)
            if (dynamicStatus.baseUrl && dynamicStatus.baseUrl.length > 0) {
              setRemoteValue(getRemoteHttpSettingGV(), JSON.stringify({ BaseUrl: dynamicStatus.baseUrl }))
            }
          }
        })
        .catch((e) => {
          debugToPrintLog(`------ 目标引擎进程不存在 ------`)
          switch (mode) {
            case 'local':
              setAutoStartProgress(true)
              return
            case 'remote':
              if (isDynamicControl) {
                props.failedCallback('control-remote-connect-failed')
              } else {
                props.failedCallback('remote-connect-failed')
              }
              failed(`${e}`)
              return
          }
        })
    })

    /** 接受连接引擎的指令 */
    useEffect(() => {
      emiter.on('startAndCreateEngineProcess', (v?: boolean) => {
        engineTest(!!v)
      })
      return () => {
        emiter.off('startAndCreateEngineProcess')
      }
    }, [])

    // 这个 hook
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

        setTimeout(() => {
          if (props.onKeepaliveShouldChange) {
            props.onKeepaliveShouldChange(true)
          }
        }, 600)

        yakitEngine
          .isPortAvailable(props.credential.Port)
          .then(() => {
            if (startingUp.current) {
              return
            }
            startingUp.current = true
            yakitEngine
              .startLocalYaklangEngine({
                port: props.credential.Port,
                version: fetchEnv(),
                isEnpriTraceAgent: isEnpriTraceAgent(),
                isIRify: isIRify(),
              })
              .then(() => {
                debugToPrintLog(`[INFO] 本地新引擎进程启动成功`)
              })
              .catch((e) => {
                console.info(e)
                debugToPrintLog(`[ERROR] 本地新引擎进程启动失败: ${e}`)
              })
              .finally(() => {
                startingUp.current = false
              })
          })
          .catch((e) => {
            debugToPrintLog(`[ERROR] 新引擎进程启动出错: 端口被占用: ${e}`)
          })
      },
      [autoStartProgress, props.onKeepaliveShouldChange, props.credential],
      { leading: false, wait: 1000 },
    )

    useEffect(() => {
      if (!props.engineLink) setAutoStartProgress(false)
    }, [props.engineLink])

    /** 未连接引擎前, 每隔1秒尝试连接一次, 连接引擎后, 每隔5秒尝试连接一次 */
    const attemptConnectTime = useMemoizedFn(() => {
      return props.engineLink ? 5000 : 1000
    })

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
            // debugToPrintLog(`[INFO] 探活结果: 存活`)
            if (!keepalive) {
              return
            }
            if (!notified) {
              notified = true
            }
            failedCount = 0
            if (props.onReady) {
              props.onReady()
            }
          })
          .catch((e) => {
            // debugToPrintLog(`[INFO] 探活结果: 不存在`)
            failedCount++
            if (props.onFailed) {
              props.onFailed(failedCount)
            }
          })
      }
      connect()
      const id = setInterval(connect, attemptConnectTime())
      return () => {
        clearInterval(id)
      }
    }, [props.keepalive, props.onReady, props.onFailed])
    return <></>
  },
)
