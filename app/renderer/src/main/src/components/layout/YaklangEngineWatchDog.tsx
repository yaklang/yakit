import React, { useEffect, useRef } from 'react'
import { useMemoizedFn } from 'ahooks'
import { isEngineConnectionAlive } from '@/components/layout/WelcomeConsoleUtil'
import type { EngineWatchDogCallbackType, YaklangEngineMode } from '@/yakitGVDefine'
import { failed } from '@/utils/notification'
import { setRemoteValue } from '@/utils/kv'
import { useYakitDynamicStatus } from '@/store'
import { remoteOperation } from '@/pages/dynamicControl/remoteOperation'
import { getRemoteHttpSettingGV } from '@/utils/envfile'
import emiter from '@/utils/eventBus/eventBus'
import { debugToPrintLog } from '@/utils/logCollection'
import { yakitEngine } from '@/services/electronBridge'

export interface YaklangEngineWatchDogCredential {
  Mode?: YaklangEngineMode
  Host: string
  Port?: number
  Endpoint?: LocalEngineEndpoint
  InstanceId?: string
  LaunchId?: string

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
    const { dynamicStatus, setDynamicStatus } = useYakitDynamicStatus()

    /** 引擎信息认证 */
    const engineTest = useMemoizedFn((isDynamicControl?: boolean) => {
      debugToPrintLog(
        `[IFNO] engine-test mode:${props.credential.Mode} port:${props.credential.Port} isDynamicControl:${isDynamicControl}`,
      )
      // 重置状态
      const mode = props.credential.Mode
      if (!mode) {
        return
      }

      if (mode === 'remote' && (props.credential.Port || 0) <= 0) {
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
              // A disconnected session must be recovered explicitly in the startup UI.
              props.onKeepaliveShouldChange?.(false)
              failed(String(e))
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

    const failedCountRef = useRef(0)
    const readyNotifiedRef = useRef(false)

    /**
     * 引擎连接尝试逻辑
     * 未连接每 1s 探活，已连接每 3s。
     * 上一轮未完成不阻塞后续 tick，避免单次 Echo 挂起后探活与失败通知停止。
     * 引擎连接有效尝试次数: 1-10
     */
    useEffect(() => {
      if (!props.keepalive) {
        failedCountRef.current = 0
        readyNotifiedRef.current = false
        props.onFailed?.(100)
        return
      }
      debugToPrintLog(`------ 开始启动引擎进程探活逻辑------`)

      const connect = () => {
        isEngineConnectionAlive()
          .then(() => {
            if (!props.keepalive) return
            failedCountRef.current = 0
            if (!readyNotifiedRef.current) {
              readyNotifiedRef.current = true
              props.onReady?.()
            }
          })
          .catch(() => {
            failedCountRef.current += 1
            readyNotifiedRef.current = false
            props.onFailed?.(failedCountRef.current)
          })
      }
      connect()
      const id = setInterval(connect, props.engineLink ? 3000 : 1000)
      return () => {
        clearInterval(id)
      }
    }, [props.keepalive, props.engineLink, props.onReady, props.onFailed])
    return <></>
  },
)
