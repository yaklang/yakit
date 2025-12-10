import {HoldGRPCStreamInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {DebugPluginRequest} from "@/pages/plugins/utils"
export interface TunSessionStateProps {
    deviceName: string | null
    configuredRoutes?: string[]
}

export interface PluginTunHijackStateProps {
    isExecuting: boolean
    streamInfo: HoldGRPCStreamInfo
}

export interface pluginTunHijackActionsProps {
    startPluginTunHijack: (v?: OptionalDebugPluginRequest) => void
    cancelPluginTunHijackById: () => void
}

export interface PluginTunHijackProps {
    ref?: React.ForwardedRef<PluginTunHijackRefProps>
    pluginTunHijackData: PluginTunHijackStateProps
    pluginTunHijackActions: pluginTunHijackActionsProps
}

export interface PluginTunHijackRefProps {}

export interface PluginTunHijackParams {
    PluginName: "Tun劫持服务" | "路由表增加" | "路由表删除" | "路由表查询"
    onError?: () => void
    onEnd?: () => void
}

export interface PluginTunHijackTableProps {
    cancelPluginTunHijack: () => void
    deviceName: string
}

type OptionalDebugPluginRequest = Partial<DebugPluginRequest>


export interface HijackTableDataProps {
    ip_addr: string
    tun_name: string
}