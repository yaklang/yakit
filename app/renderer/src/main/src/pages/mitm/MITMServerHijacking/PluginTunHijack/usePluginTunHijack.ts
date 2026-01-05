import {useCreation, useMemoizedFn, useSafeState} from "ahooks"
import {OptionalDebugPluginRequest, pluginTunHijackActionsProps, PluginTunHijackParams, PluginTunHijackStateProps, TunSessionStateProps} from "./PluginTunHijackType"
import {useEffect, useRef} from "react"
import {yakitNotify} from "@/utils/notification"
import {apiDebugPlugin, DebugPluginRequest} from "@/pages/plugins/utils"
import {randomString} from "@/utils/randomUtil"
import {HTTPRequestBuilderParams} from "@/models/HTTPRequestBuilder"
import useHoldGRPCStream from "@/hook/useHoldGRPCStream/useHoldGRPCStream"

// 会话级（Session-level）的状态，用于存储当前活动 TUN 设备的信息
// deviceName: 这是最核心的状态。一旦 “Tun劫持服务” 成功启动，其返回的设备名必须被存储在这里
export const tunSessionStateDefault: TunSessionStateProps = {
    deviceName: null,
    configuredRoutes: [],
    isQuitBtn: false
}

// 网络劫持HOOK插件-Tun劫持服务
const usePluginTunHijack = (params: PluginTunHijackParams) => {
    const {PluginName, onError, onEnd, setRuntimeId} = params
    const tokenRef = useRef<string>(randomString(40))
    
    /** 是否在执行中 */
    const [isExecuting, setIsExecuting] = useSafeState<boolean>(false)
    const [streamInfo, debugPluginStreamEvent] = useHoldGRPCStream({
        taskName: "debug-plugin",
        apiKey: "DebugPlugin",
        token: tokenRef.current,
        onEnd: () => {
            debugPluginStreamEvent.stop()
            onEnd?.()
            setIsExecuting(false)
        },
        onError: () => {
            onError?.()
        },
        setRuntimeId,
        isShowEnd: false
    })

    const startPluginTunHijack = useMemoizedFn((p?: OptionalDebugPluginRequest) => {
        const newParams = p || {}
        const params: DebugPluginRequest = {
            Code: "",
            PluginType: "yak",
            Input: "",
            HTTPRequestTemplate: {} as HTTPRequestBuilderParams,
            ExecParams: [],
            ...newParams,
            PluginName
        }
        apiDebugPlugin({
            params,
            token: tokenRef.current,
            isShowStartInfo: false
        }).then((res) => {
            setIsExecuting(true)
            debugPluginStreamEvent.start()
        })
    })

    const cancelPluginTunHijackById = useMemoizedFn(() => {
        debugPluginStreamEvent.cancel()
        debugPluginStreamEvent.reset()
    })

    const state = useCreation(() => ({isExecuting, streamInfo} as PluginTunHijackStateProps), [isExecuting, streamInfo])

    const actions = useCreation(
        () => ({
            startPluginTunHijack,
            cancelPluginTunHijackById
        } as pluginTunHijackActionsProps),
        [startPluginTunHijack, cancelPluginTunHijackById]
    )
    return [state, actions] as const
}

export default usePluginTunHijack
