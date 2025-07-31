import {APIFunc, APINoRequestFunc} from "@/apiUtils/type"
import {ExecResult, YakScriptHooks} from "@/pages/invoker/schema"
import {yakitNotify} from "@/utils/notification"
import {ClientCertificate} from "../MITMServerStartForm/MITMServerStartForm"
import {ExtraMITMServerProps, MITMResponse, TraceInfo} from "../MITMPage"
import {isEmpty, omit} from "lodash"
import {KVPair} from "@/models/kv"
import {YakExecutorParam} from "@/pages/invoker/YakExecutorParams"
import {MITMFilterData, MITMFilterSchema} from "../MITMServerStartForm/MITMFilters"
import {MITMContentReplacerRule} from "../MITMRule/MITMRuleType"
import {MITMVersion} from "../Context/MITMContext"
import {ManualHijackListAction, ManualHijackListStatus} from "@/defaultConstants/mitmV2"

const {ipcRenderer} = window.require("electron")

interface MITMBaseData {
    version: string
}
/**
 * 用于启动 MITM 开始之后，接受开始成功之后的第一个消息，如果收到，则认为说 MITM 启动成功了
 */
export const grpcClientMITMStartSuccess = (version: string) => {
    const url = `client-mitm${version}-start-success`
    return {
        on: (callback: () => void) => {
            return ipcRenderer.on(url, () => {
                callback()
            })
        },
        remove: () => {
            ipcRenderer.removeAllListeners(url)
        }
    }
}

/**停止mitm劫持 */
export const grpcMITMStopCall: APIFunc<string, null> = (version, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm${version}-stop-call`
        ipcRenderer
            .invoke(url)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMStopCall 失败:" + e)
                reject(e)
            })
    })
}
/**mitm 服务端给客户端发送提示信息 */
export const grpcClientMITMNotification = (version: string) => {
    const url = `client-mitm${version}-notification`
    return {
        on: (callback: (i: Uint8Array) => void) => {
            return ipcRenderer.on(url, (_, i: Uint8Array) => {
                callback(i)
            })
        },
        remove: () => {
            ipcRenderer.removeAllListeners(url)
        }
    }
}

export interface MITMHaveCurrentStreamResponse {
    haveStream: boolean
    host: string
    port: number
    downstreamProxy: string
}

/**用于前端恢复状态 */
export const grpcMITMHaveCurrentStream: APIFunc<string, MITMHaveCurrentStreamResponse> = (version, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm${version}-have-current-stream`
        ipcRenderer
            .invoke(url)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMHaveCurrentStream 失败:" + e)
                reject(e)
            })
    })
}

/**exec result */
export const grpcClientMITMMessage = (version: string) => {
    const url = `client-mitm${version}-message`
    return {
        on: (callback: (i: ExecResult) => void) => {
            return ipcRenderer.on(url, (_, i: ExecResult) => {
                callback(i)
            })
        },
        remove: () => {
            ipcRenderer.removeAllListeners(url)
        }
    }
}
/**捕获劫持error */
export const grpcClientMITMError = (version: string) => {
    const url = `client-mitm${version}-error`
    return {
        on: (callback: (i: string) => void) => {
            return ipcRenderer.on(url, (_, i: string) => {
                callback(i)
            })
        },
        remove: () => {
            ipcRenderer.removeAllListeners(url)
        }
    }
}
/**恢复 MITM 会话 */
export const grpcMITMRecover: APIFunc<string, null> = (version, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm${version}-recover`
        ipcRenderer
            .invoke(url)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMRecover 失败:" + e)
                reject(e)
            })
    })
}

export interface MITMStartCallRequestV1 {
    host: string
    port: number
    downstreamProxy: string
    enableHttp2: boolean
    ForceDisableKeepAlive: boolean
    certificates: ClientCertificate[]
    extra?: ExtraMITMServerProps
}
export interface MITMStartCallRequest extends MITMStartCallRequestV1, MITMBaseData {}
export interface MITMStartCallRequestV2 {
    Host: string
    Port: number
    DownstreamProxy: string
    EnableHttp2: boolean
    ForceDisableKeepAlive: boolean
    Certificates: ClientCertificate[]
    extra?: ExtraMITMServerV2
}
interface ExtraMITMServerV2 {
    /**@name 国密劫持*/
    EnableGMTLS?: boolean
    /**@name 随机TLS指纹*/
    RandomJA3?: boolean
    /**@name 代理认证 */
    EnableProxyAuth: boolean
    /**@name 仅国密 TLS */
    OnlyEnableGMTLS: boolean
    /**@name 国密TLS优先 TLS */
    PreferGMTLS: boolean
    ProxyPassword: string
    ProxyUsername: string
    DnsServers: string[]

    HostsMapping: KVPair[]
    /**@name 过滤WebSocket */
    FilterWebsocket: boolean
    /**禁用初始页 */
    DisableCACertPage: boolean
    DisableWebsocketCompression: boolean
    PluginConcurrency: number
}
/**转 mitm v1版本grpc参数 */
export const convertMITMStartCallV1 = (oldData: MITMStartCallRequest): MITMStartCallRequestV1 => {
    const data: MITMStartCallRequestV1 = omit(oldData, "version")
    return data
}
/**转 mitm v2版本grpc参数 */
export const convertMITMStartCallV2 = (value: MITMStartCallRequest): MITMStartCallRequestV2 => {
    const data: MITMStartCallRequestV2 = {
        Host: value.host,
        Port: value.port,
        DownstreamProxy: value.downstreamProxy,
        EnableHttp2: value.enableHttp2,
        ForceDisableKeepAlive: value.ForceDisableKeepAlive,
        Certificates: value.certificates,
        extra: isEmpty(value.extra)
            ? undefined
            : {
                  EnableGMTLS: value.extra.enableGMTLS,
                  RandomJA3: value.extra.RandomJA3,
                  EnableProxyAuth: value.extra.enableProxyAuth,
                  OnlyEnableGMTLS: value.extra.onlyEnableGMTLS,
                  PreferGMTLS: value.extra.preferGMTLS,
                  ProxyPassword: value.extra.proxyPassword,
                  ProxyUsername: value.extra.proxyUsername,
                  DnsServers: value.extra.dnsServers,
                  HostsMapping: value.extra.hosts,
                  FilterWebsocket: value.extra.filterWebsocket,
                  DisableCACertPage: value.extra.disableCACertPage,
                  DisableWebsocketCompression: value.extra.DisableWebsocketCompression,
                  PluginConcurrency: value.extra.PluginConcurrency,
              }
    }
    return data
}
/**启动 MITM 劫持 */
export const grpcMITMStartCall: APIFunc<MITMStartCallRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const {version} = params

        switch (version) {
            case MITMVersion.V2:
                const paramsV2 = convertMITMStartCallV2(params)
                grpcMITMStartCallV2(paramsV2, hiddenError).then(resolve).catch(reject)
                break

            default:
                const paramsV1 = convertMITMStartCallV1(params)
                grpcMITMStartCallV1(paramsV1, hiddenError).then(resolve).catch(reject)
                break
        }
    })
}
/**启动 MITM 劫持 v1 */
export const grpcMITMStartCallV1: APIFunc<MITMStartCallRequestV1, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-start-call`
        ipcRenderer
            .invoke(url, params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMStartCallV1 失败:" + e)
                reject(e)
            })
    })
}
/**启动 MITM 劫持 v2 */
export const grpcMITMStartCallV2: APIFunc<MITMStartCallRequestV2, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitmV2-start-call`
        ipcRenderer
            .invoke(url, params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMStartCallV2 失败:" + e)
                reject(e)
            })
    })
}

export interface MITMExecScriptByIdRequest extends MITMBaseData {
    id: number
    params: YakExecutorParam[]
}

/**MITM 启用插件，通过插件 ID  */
export const grpcMITMExecScriptById: APIFunc<MITMExecScriptByIdRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const {version} = params
        const url = `mitm${version}-exec-script-by-id`
        const value = omit(params, "version")
        ipcRenderer
            .invoke(url, value)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMExecScriptById 失败:" + e)
                reject(e)
            })
    })
}
export interface MITMRemoveHookRequest extends MITMBaseData {
    HookName: string[]
    RemoveHookID: string[]
}
/**劫持开启后的全选和清空 启动插件 */
export const grpcMITMRemoveHook: APIFunc<MITMRemoveHookRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const {version} = params
        const url = `mitm${version}-remove-hook`
        const value = omit(params, "version")
        ipcRenderer
            .invoke(url, value)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMRemoveHook 失败:" + e)
                reject(e)
            })
    })
}

/** 劫持开启后 过滤器重置 */
export const grpcMITMResetFilter: APIFunc<string, null> = (version, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm${version}-reset-filter`
        ipcRenderer
            .invoke(url)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMResetFilter 失败:" + e)
                reject(e)
            })
    })
}

/** 过滤器重置 */
export const grpcResetMITMFilter: APINoRequestFunc<null> = (hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `ResetMITMFilter`
        ipcRenderer
            .invoke(url)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcResetMITMFilter 失败:" + e)
                reject(e)
            })
    })
}

/**监听 MITM 过滤器状态 */
export const grpcClientMITMfilter = (version: string) => {
    const url = `client-mitm${version}-filter`
    return {
        on: (callback: (i: MITMFilterData) => void) => {
            return ipcRenderer.on(url, (_, filterData: MITMFilterData) => {
                callback(filterData)
            })
        },
        remove: () => {
            ipcRenderer.removeAllListeners(url)
        }
    }
}

export interface MITMSetFilterRequest extends MITMBaseData {
    FilterData: MITMFilterData
}
/**劫持开启后 filter 设置过滤器 */
export const grpcMITMSetFilter: APIFunc<MITMSetFilterRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const {version} = params
        const url = `mitm${version}-set-filter`
        const value = omit(params, "version")
        ipcRenderer
            .invoke(url, value)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMSetFilter 失败:" + e)
                reject(e)
            })
    })
}
/**获取过滤器 filter */
export const grpcMITMGetFilter: APINoRequestFunc<MITMFilterSchema> = (hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-get-filter`
        ipcRenderer
            .invoke(url)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMGetFilter 失败:" + e)
                reject(e)
            })
    })
}
export interface MITMHijackSetFilterRequest extends MITMBaseData {
    FilterData: MITMFilterData
}

/**劫持开启后 hijackFilter 设置过滤器 */
export const grpcMITMHijackSetFilter: APIFunc<MITMHijackSetFilterRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const {version} = params
        const url = `mitm${version}-hijack-set-filter`
        const value = omit(params, "version")
        ipcRenderer
            .invoke(url, value)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMHijackSetFilter 失败:" + e)
                reject(e)
            })
    })
}

/**获取过滤器 hijack */
export const grpcMITMHijackGetFilter: APINoRequestFunc<MITMFilterSchema> = (hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-hijack-get-filter`
        ipcRenderer
            .invoke(url)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMHijackGetFilter 失败:" + e)
                reject(e)
            })
    })
}

export interface MITMHijackGetFilterRequest extends MITMBaseData {
    isManual: boolean
}
/**设置是否开启手动劫持 */
export const grpcMITMAutoForward: APIFunc<MITMHijackGetFilterRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const {version} = params
        const url = `mitm${version}-auto-forward`
        ipcRenderer
            .invoke(url, params.isManual)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMAutoForward 失败:" + e)
                reject(e)
            })
    })
}

export interface MITMV2Response {
    //filter
    JustFilter: boolean
    FilterData: MITMFilterData
    //Replacer
    JustContentReplacer: boolean
    Replacers: MITMContentReplacerRule[]
    //exec result
    HaveMessage: boolean
    Message: ExecResult
    GetCurrentHook: boolean
    Hooks: YakScriptHooks[]
    //server notification, just show a dialog
    HaveNotification: boolean
    NotificationContent: string
    //这两个标志是用来设置 MITM 加载状态的，用于服务端控制用户端的 "加载中"
    HaveLoadingSetter: boolean
    LoadingFlag: boolean
    //add\delete\update\reload
    ManualHijackListAction: ManualHijackListAction
    //top 20 hijack message
    ManualHijackList: SingleManualHijackInfoMessage[]
}

export type ManualHijackListStatusType = `${ManualHijackListStatus}`
export interface SingleManualHijackInfoMessage {
    /**前端展示使用，到达顺序 */
    arrivalOrder?: number
    manualHijackListAction: ManualHijackListAction
    TaskID: string
    Request: Uint8Array
    Response: Uint8Array
    Status: ManualHijackListStatusType
    HijackResponse: Uint8Array
    Tags: string[]
    IsHttps: boolean
    URL: string
    RemoteAddr: string
    //websocket
    IsWebsocket: boolean
    Payload: Uint8Array
    WebsocketEncode: string[]
    TraceInfo: TraceInfo
    Method: string
}
export type ClientMITMHijackedResponse = MITMResponse | MITMV2Response
export const isMITMResponse = (value: ClientMITMHijackedResponse): value is MITMResponse => {
    return "id" in value // 检查是否存在MITMResponse独有的属性
}
export const isMITMV2Response = (value: ClientMITMHijackedResponse): value is MITMV2Response => {
    return "ManualHijackList" in value // 检查是否存在MITMResponse独有的属性
}
/**自动转发劫持，进行的操作 */
export const grpcClientMITMHijacked = (version: string) => {
    const url = `client-mitm${version}-hijacked`
    return {
        on: (callback: (i: ClientMITMHijackedResponse) => void) => {
            return ipcRenderer.on(url, (_, i: ClientMITMHijackedResponse) => {
                callback(i)
            })
        },
        remove: () => {
            ipcRenderer.removeAllListeners(url)
        }
    }
}
/**通过Id丢弃请求 */
export const grpcMITMDropRequestById: APIFunc<number, null> = (id, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-drop-request`
        ipcRenderer
            .invoke(url, id)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMDropRequestById 失败:" + e)
                reject(e)
            })
    })
}
/**通过Id丢弃响应 */
export const grpcMITMDropResponseById: APIFunc<number, null> = (id, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-drop-response`
        ipcRenderer
            .invoke(url, id)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMDropResponseById 失败:" + e)
                reject(e)
            })
    })
}
/** forward request */
export const grpcMITMForwardRequestById: APIFunc<number, null> = (id, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-forward-request`
        ipcRenderer
            .invoke(url, id)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMForwardRequestById 失败:" + e)
                reject(e)
            })
    })
}
/** forward response */
export const grpcMITMForwardResponseById: APIFunc<number, null> = (id, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-forward-response`
        ipcRenderer
            .invoke(url, id)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMForwardResponseById 失败:" + e)
                reject(e)
            })
    })
}
/** hijacked */
export const grpcMITMHijackedCurrentResponseById: APIFunc<number, null> = (id, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-hijacked-current-response`
        ipcRenderer
            .invoke(url, id, true)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMHijackedCurrentResponseById 失败:" + e)
                reject(e)
            })
    })
}
/**cancel hijacked */
export const grpcMITMCancelHijackedCurrentResponseById: APIFunc<number, null> = (id, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-hijacked-current-response`
        ipcRenderer
            .invoke(url, id, false)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMCancelHijackedCurrentResponseById 失败:" + e)
                reject(e)
            })
    })
}
export interface MITMEnablePluginModeRequest extends MITMBaseData {
    initPluginNames: string[]
}
/** 设置启用插件模式，自动加载所有主插件;如果不设置 initPluginNames 的话，启动所有默认插件 */
export const grpcMITMEnablePluginMode: APIFunc<MITMEnablePluginModeRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const {version} = params
        const url = `mitm${version}-enable-plugin-mode`
        const value = omit(params, "version")
        ipcRenderer
            .invoke(url, value.initPluginNames)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMEnablePluginMode 失败:" + e)
                reject(e)
            })
    })
}
export interface MITMForwardModifiedRequest {
    id: number
    request: Buffer
    Tags: string[]
    autoForwardValue: boolean
}
/**MITM 转发 */
export const grpcMITMForwardModifiedRequest: APIFunc<MITMForwardModifiedRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-forward-modified-request`
        ipcRenderer
            .invoke(url, params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMForwardModifiedRequest 失败:" + e)
                reject(e)
            })
    })
}
export interface MITMForwardModifiedResponseRequest {
    response: Buffer
    responseId: number
}
/** MITM转发 - HTTP响应 */
export const grpcMITMForwardModifiedResponse: APIFunc<MITMForwardModifiedResponseRequest, null> = (
    params,
    hiddenError
) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-forward-modified-response`
        ipcRenderer
            .invoke(url, params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMForwardModifiedResponse 失败:" + e)
                reject(e)
            })
    })
}

export interface MITMExecScriptContentRequest extends MITMBaseData {
    YakScriptContent: string
}
/** 热加载 */
export const grpcMITMExecScriptContent: APIFunc<MITMExecScriptContentRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const {version} = params
        const url = `mitm${version}-exec-script-content`
        ipcRenderer
            .invoke(url, params.YakScriptContent)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMExecScriptContent 失败:" + e)
                reject(e)
            })
    })
}

/** Get Current Hook */
export const grpcMITMGetCurrentHook: APIFunc<string, null> = (version, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm${version}-get-current-hook`
        ipcRenderer
            .invoke(url)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMGetCurrentHook 失败:" + e)
                reject(e)
            })
    })
}
export interface MITMContentReplacersRequest {
    version: string
    replacers: MITMContentReplacerRule[]
}
/**设置正则替换 */
export const grpcMITMContentReplacers: APIFunc<MITMContentReplacersRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const {version} = params
        const url = `mitm${version}-content-replacers`
        const value = omit(params, "version")
        ipcRenderer
            .invoke(url, value.replacers)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMContentReplacers 失败:" + e)
                reject(e)
            })
    })
}

/**清除插件缓存 */
export const grpcMITMClearPluginCache: APIFunc<string, null> = (version, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm${version}-clear-plugin-cache`
        ipcRenderer
            .invoke(url)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMClearPluginCache 失败:" + e)
                reject(e)
            })
    })
}
export interface MITMFilterWebsocketRequest extends MITMBaseData {
    filterWebsocket: boolean
}
/**过滤 ws */
export const grpcMITMFilterWebsocket: APIFunc<MITMFilterWebsocketRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const {version} = params
        const url = `mitm${version}-filter-websocket`
        ipcRenderer
            .invoke(url, params.filterWebsocket)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMFilterWebsocket 失败:" + e)
                reject(e)
            })
    })
}

export interface MITMSetDownstreamProxyRequest extends MITMBaseData {
    downstreamProxy: string
}
/**下游代理 */
export const grpcMITMSetDownstreamProxy: APIFunc<MITMSetDownstreamProxyRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const {version} = params
        const url = `mitm${version}-set-downstream-proxy`
        ipcRenderer
            .invoke(url, params.downstreamProxy)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMSetDownstreamProxy 失败:" + e)
                reject(e)
            })
    })
}
export interface MITMHotPortRequest extends MITMBaseData {
    host: string
    port: number
}
/**host port */
export const grpcMITMHotPort: APIFunc<MITMHotPortRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const {version} = params
        const url = `mitm${version}-host-port`
        const value = omit(params, "version")
        ipcRenderer
            .invoke(url, value)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMHotPort 失败:" + e)
                reject(e)
            })
    })
}
/** mitm 服务端控制客户端加载状态 */
export const grpcClientMITMLoading = (version: string) => {
    const url = `client-mitm${version}-loading`
    return {
        on: (callback: (i: boolean) => void) => {
            return ipcRenderer.on(url, (_, f: boolean) => {
                callback(f)
            })
        },
        remove: () => {
            ipcRenderer.removeAllListeners(url)
        }
    }
}

/** 更新替代规则 */
export const grpcClientMITMContentReplacerUpdate = (version: string) => {
    const url = `client-mitm${version}-content-replacer-update`
    return {
        on: (callback: (i: MITMContentReplacerRule[]) => void) => {
            return ipcRenderer.on(url, (_, i: MITMContentReplacerRule[]) => {
                callback(i)
            })
        },
        remove: () => {
            ipcRenderer.removeAllListeners(url)
        }
    }
}
/**当前系统的 hooks */
export const grpcClientMITMHooks = (version: string) => {
    const url = `client-mitm${version}-hooks`
    return {
        on: (callback: (i: YakScriptHooks[]) => void) => {
            return ipcRenderer.on(url, (_, i: YakScriptHooks[]) => {
                callback(i)
            })
        },
        remove: () => {
            ipcRenderer.removeAllListeners(url)
        }
    }
}

type TraceControlMode = "start_stream" | "stop_stream" | "cancel_trace" | "set_tracing"
interface PluginTraceRequest {
    // 控制字段
    ControlMode: TraceControlMode
    TraceID?: string
    EnableTracing: boolean
}
/**开始追踪*/
export const grpcMITMStartPluginTrace: APIFunc<PluginTraceRequest, null> = (params, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `start-mitm-plugin-trace`
        ipcRenderer
            .invoke(url, params)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMStartPluginTrace 失败:" + e)
                reject(e)
            })
    })
}
/**停止追踪 */
export const grpcMITMStopPluginTrace: APINoRequestFunc<null> = (hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-plugin-trace-stop`
        ipcRenderer
            .invoke(url)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMStopPluginTrace 失败:" + e)
                reject(e)
            })
    })
}
/**取消特定Trace */
export const grpcMITMPluginTraceIDCancel: APIFunc<string, null> = (traceID, hiddenError) => {
    return new Promise((resolve, reject) => {
        const url = `mitm-plugin-traceID-cancel`
        ipcRenderer
            .invoke(url, traceID)
            .then(resolve)
            .catch((e) => {
                if (!hiddenError) yakitNotify("error", "grpcMITMPluginTraceIDCancel 失败:" + e)
                reject(e)
            })
    })
}
