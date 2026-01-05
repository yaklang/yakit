import {HoldGRPCStreamInfo} from "@/hook/useHoldGRPCStream/useHoldGRPCStreamType"
import {DebugPluginRequest} from "@/pages/plugins/utils"
export interface TunSessionStateProps {
    deviceName: string | null
    configuredRoutes?: string[]
    // Tun劫持是否已经可退出 （PS:防止Tun劫持导致所有grpc接口死锁）
    isQuitBtn: boolean
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
    hidden?: boolean
    pluginTunHijackData: PluginTunHijackStateProps
    pluginTunHijackActions: pluginTunHijackActionsProps
    pluginTunHijackDel: PluginTunHijackStateProps
    onQuitTunHijackFun: () => void
    handleDeleteRoute: (ipList?: string[]) => void
    onCloseTunHijackFun: () => void
}

export interface PluginTunHijackRefProps {
    updatePluginTunHijack: () => void
    closeTunHijackError: () => void
}

export interface PluginTunHijackParams {
    PluginName: "Tun劫持服务" | "路由表增加" | "路由表删除" | "路由表查询" | "劫持进程"
    onError?: () => void
    onEnd?: () => void
    setRuntimeId?: (id: string) => void
}

export interface PluginTunHijackTableProps {
    ref?: React.ForwardedRef<PluginTunHijackRefProps>
    deviceName: string
    pluginTunHijackDel: PluginTunHijackStateProps
    onQuitTunHijackFun: () => void
    handleDeleteRoute: (ipList?: string[]) => void
    onCloseTunHijackFun: () => void
}

type OptionalDebugPluginRequest = Partial<DebugPluginRequest>

export interface HijackTableDataProps {
    ip_addr: string
    tun_name: string
}

interface WatchProcessStartParams {
    CheckIntervalSeconds?: number
    DisableReserveDNS?: boolean
}

export interface WatchProcessRequest {
    StartParams?: WatchProcessStartParams
    QueryPid?: number
}

export interface ProcessInfo {
    Pid: number
    Name: string
    Exe: string
    Cmdline: string
}

interface ConnectionInfo {
    LocalAddress: string
    RemoteAddress: string
    Status: string
    Domain: string[]
}
export interface WatchProcessResponse {
    Action: "start" | "exit" | "refresh" | "refresh_connections"
    Process: ProcessInfo
    Connections: ConnectionInfo[]
}

export interface TunHijackProcessTableProps {
    deviceName: string
    setTableType: (type: "process" | "route") => void
    pluginTunHijackAddActionsFun: (target: string) => void
    processTableData: ProcessInfo[]
    setProcessTableData: (data: ProcessInfo[]) => void
}

export interface HijackProcessInfoModalProps {
    hijackProcessInfo?: ConnectionInfo[]
    setHijackProcessInfo: (info?: ConnectionInfo[]) => void
    pluginTunHijackAddActionsFun: (target: string) => void
    setTableType: (type: "process" | "route") => void
}

export interface ConnectionInfoItemProps {
    data: ConnectionInfo
    onPluginTunHijackAddActionsByConnection: (target: string) => void
}


export interface StopPluginTunHijackBtnProps {
    cancelPluginTunHijack: () => void;
}

export interface QuitTunHijackBtnProps {
    onQuitTunHijackFun: () => void;
    processTableData: ProcessInfo[];
}