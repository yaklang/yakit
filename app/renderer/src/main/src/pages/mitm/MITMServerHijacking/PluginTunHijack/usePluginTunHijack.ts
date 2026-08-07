import { useCreation, useMemoizedFn, useSafeState } from 'ahooks'
import {
  OptionalDebugPluginRequest,
  pluginTunHijackActionsProps,
  PluginTunHijackParams,
  PluginTunHijackStateProps,
  TunSessionStateProps,
} from './PluginTunHijackType'
import { useEffect, useRef } from 'react'
import { yakitNotify } from '@/utils/notification'
import { apiDebugPlugin, DebugPluginRequest } from '@/pages/plugins/utils'
import { randomString } from '@/utils/randomUtil'
import { HTTPRequestBuilderParams } from '@/models/HTTPRequestBuilder'
import useHoldGRPCStream from '@/hook/useHoldGRPCStream/useHoldGRPCStream'

// 会话级（Session-level）的状态，用于存储当前活动 TUN 设备的信息
// deviceName: 这是最核心的状态。一旦 “Tun劫持服务” 成功启动，其返回的设备名必须被存储在这里
export const tunSessionStateDefault: TunSessionStateProps = {
  deviceName: null,
  configuredRoutes: [],
}

// 网络劫持HOOK插件-Tun劫持服务
const usePluginTunHijack = (params: PluginTunHijackParams) => {
  const { PluginName, onError, onEnd, setRuntimeId } = params
  const tokenRef = useRef<string>(randomString(40))
  /** 主动取消时主进程不会再转发 end，需本地收尾；并避免与自然 onEnd 重复清理 */
  const isManualCancelRef = useRef<boolean>(false)

  /** 是否在执行中 */
  const [isExecuting, setIsExecuting] = useSafeState<boolean>(false)
  const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
    taskName: 'debug-plugin',
    apiKey: 'DebugPlugin',
    token: tokenRef.current,
    onEnd: () => {
      debugPluginStreamEvent.stop()
      if (isManualCancelRef.current) {
        isManualCancelRef.current = false
        return
      }
      onEnd?.()
      setIsExecuting(false)
    },
    onError: () => {
      onError?.()
    },
    setRuntimeId,
    isShowEnd: false,
  })

  const startPluginTunHijack = useMemoizedFn((p?: OptionalDebugPluginRequest) => {
    const newParams = p || {}
    const params: DebugPluginRequest = {
      Code: '',
      PluginType: 'yak',
      Input: '',
      HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
      ExecParams: [],
      ...newParams,
      PluginName,
    }
    isManualCancelRef.current = false
    apiDebugPlugin({
      params,
      token: tokenRef.current,
      isShowStartInfo: false,
    }).then((res) => {
      setIsExecuting(true)
      debugPluginStreamEvent.start()
    })
  })

  const cancelPluginTunHijackById = useMemoizedFn(() => {
    // cancel 后主进程不再转发 ${token}-end，需在此完成本地收尾
    isManualCancelRef.current = true
    debugPluginStreamEvent.cancel()
    debugPluginStreamEvent.stop()
    debugPluginStreamEvent.reset()
    setIsExecuting(false)
    onEnd?.()
  })

  const state = useCreation(() => ({ isExecuting, streamInfo }) as PluginTunHijackStateProps, [isExecuting, streamInfo])

  const actions = useCreation(
    () =>
      ({
        startPluginTunHijack,
        cancelPluginTunHijackById,
      }) as pluginTunHijackActionsProps,
    [startPluginTunHijack, cancelPluginTunHijackById],
  )
  return [state, actions] as const
}

export default usePluginTunHijack
