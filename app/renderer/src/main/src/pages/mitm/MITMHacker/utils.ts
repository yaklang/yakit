import { ipc } from '@/services/ipc'
import { getMITMSession, mitmSession, mitmV2Session, writeMITM } from '../mitmSession'
import { mitmFilterForUI, mitmRuleForUI, mitmHijackedForUI } from '../grpcAdapters'
import type { APIFunc, APINoRequestFunc } from '@/apiUtils/type'
import i18n from '@/i18n/i18n'
import type { ExecResult, YakScriptHooks } from '@/pages/invoker/schema'
import { yakitNotify } from '@/utils/notification'
import type { ClientCertificate } from '../MITMServerStartForm/MITMServerStartForm'
import type { ExtraMITMServerProps, MITMResponse, TraceInfo } from '../MITMPage'
import { omit } from 'lodash'
import { buildMitmExtraV2 } from '../MITMAdvancedConfig'
import type { YakExecutorParam } from '@/pages/invoker/YakExecutorParams'
import type { MITMFilterData, MITMFilterSchema } from '../MITMServerStartForm/MITMFilters'
import type { MITMContentReplacerRule } from '../MITMRule/MITMRuleType'
import { MITMVersion } from '../Context/MITMContext'
import { type ManualHijackListAction, type ManualHijackListStatus } from '@/defaultConstants/mitmV2'
const tOriginal = i18n.getFixedT(null, 'mitm')

function runMITM<T>(work: Promise<T>, hiddenError?: boolean): Promise<T> {
  return work.catch((error) => {
    if (!hiddenError) yakitNotify('error', String(error))
    throw error
  })
}

interface MITMBaseData {
  version: string
}
/**
 * 用于启动 MITM 开始之后，接受开始成功之后的第一个消息，如果收到，则认为说 MITM 启动成功了
 */
export const grpcClientMITMStartSuccess = (version: string) => {
  return { on: (callback: () => void) => getMITMSession(version).on('start', (value) => callback()) }
}

/**停止mitm劫持 */
export const grpcMITMStopCall: APIFunc<string, null> = (version, hiddenError) => {
  return runMITM(getMITMSession(version).stop(), hiddenError)
}
/**mitm 服务端给客户端发送提示信息 */
export const grpcClientMITMNotification = (version: string) => {
  return {
    on: (callback: (i: Uint8Array) => void) => getMITMSession(version).on('notification', (value) => callback(value)),
  }
}

export interface MITMHaveCurrentStreamResponse {
  haveStream: boolean
  host: string
  port: number
  downstreamProxy: string
  downstreamProxyRuleId?: string
}

/**用于前端恢复状态 */
export const grpcMITMHaveCurrentStream: APIFunc<string, MITMHaveCurrentStreamResponse> = (version, hiddenError) => {
  return runMITM(getMITMSession(version).status(), hiddenError)
}

/**exec result */
export const grpcClientMITMMessage = (version: string) => {
  return {
    on: (callback: (i: ExecResult) => void) => getMITMSession(version).on('message', (value) => callback(value)),
  }
}
/**捕获劫持error */
export const grpcClientMITMError = (version: string) => {
  return { on: (callback: (i: string) => void) => getMITMSession(version).on('error', (value) => callback(value)) }
}
/**恢复 MITM 会话 */
export const grpcMITMRecover: APIFunc<string, null> = (version, hiddenError) => {
  return runMITM(getMITMSession(version).recover(), hiddenError)
}

export interface MITMStartCallRequestV1 {
  host: string
  port: number
  downstreamProxy: string
  downstreamProxyRuleId?: string
  enableHttp2: boolean
  ForceDisableKeepAlive: boolean
  certificates: ClientCertificate[]
  DisableTrafficGuard: boolean
  extra?: ExtraMITMServerProps
}
export interface MITMStartCallRequest extends MITMStartCallRequestV1, MITMBaseData {}
export interface MITMStartCallRequestV2 {
  Host: string
  Port: number
  DownstreamProxy: string
  DownstreamProxyRuleId?: string
  EnableHttp2: boolean
  ForceDisableKeepAlive: boolean
  Certificates: ClientCertificate[]
  extra?: ExtraMITMServerV2
  DisableTrafficGuard: boolean
}
type ExtraMITMServerV2 = NonNullable<ReturnType<typeof buildMitmExtraV2>>
/**转 mitm v1版本grpc参数 */
export const convertMITMStartCallV1 = (oldData: MITMStartCallRequest): MITMStartCallRequestV1 => {
  const data: MITMStartCallRequestV1 = omit(oldData, ['version', 'downstreamProxyRuleId']) as MITMStartCallRequestV1
  return data
}
/**转 mitm v2版本grpc参数 */
export const convertMITMStartCallV2 = (value: MITMStartCallRequest): MITMStartCallRequestV2 => {
  const data: MITMStartCallRequestV2 = {
    Host: value.host,
    Port: value.port,
    DownstreamProxy: value.downstreamProxy,
    DownstreamProxyRuleId: value.downstreamProxyRuleId,
    EnableHttp2: value.enableHttp2,
    ForceDisableKeepAlive: value.ForceDisableKeepAlive,
    Certificates: value.certificates,
    extra: buildMitmExtraV2(value.extra),
    DisableTrafficGuard: value.DisableTrafficGuard,
  }
  return data
}
/**启动 MITM 劫持 */
export const grpcMITMStartCall: APIFunc<MITMStartCallRequest, null> = (params, hiddenError) => {
  return new Promise((resolve, reject) => {
    const { version } = params

    switch (version) {
      case MITMVersion.V2: {
        const paramsV2 = convertMITMStartCallV2(params)
        grpcMITMStartCallV2(paramsV2, hiddenError).then(resolve).catch(reject)
        break
      }
      default: {
        const paramsV1 = convertMITMStartCallV1(params)
        grpcMITMStartCallV1(paramsV1, hiddenError).then(resolve).catch(reject)
        break
      }
    }
  })
}
/**启动 MITM 劫持 v1 */
export const grpcMITMStartCallV1: APIFunc<MITMStartCallRequestV1, null> = (params, hiddenError) => {
  const { extra, ...base } = params
  return runMITM(
    mitmSession.open({
      ...base,
      ...extra,
      DisableCACertPage: extra?.disableCACertPage,
      DisableWebsocketCompression: !extra?.DisableWebsocketCompression,
    }),
    hiddenError,
  )
}
/**启动 MITM 劫持 v2 */
export const grpcMITMStartCallV2: APIFunc<MITMStartCallRequestV2, null> = (params, hiddenError) => {
  const { extra, ...base } = params
  return runMITM(
    mitmV2Session.open({ ...base, ...extra, DisableWebsocketCompression: !extra?.DisableWebsocketCompression }),
    hiddenError,
  )
}

export interface MITMExecScriptByIdRequest extends MITMBaseData {
  id: string | number
  params: YakExecutorParam[]
}

/**MITM 启用插件，通过插件 ID  */
export const grpcMITMExecScriptById: APIFunc<MITMExecScriptByIdRequest, null> = (params, hiddenError) => {
  return runMITM(
    writeMITM(
      params.version,
      { setYakScript: true, yakScriptID: String(params.id), yakScriptParams: params.params },
      { SetYakScript: true, YakScriptID: String(params.id), YakScriptParams: params.params },
    ),
    hiddenError,
  )
}
export interface MITMRemoveHookRequest extends MITMBaseData {
  HookName: string[]
  RemoveHookID: string[]
}
/**劫持开启后的全选和清空 启动插件 */
export const grpcMITMRemoveHook: APIFunc<MITMRemoveHookRequest, null> = (params, hiddenError) => {
  const { version, ...value } = params
  return runMITM(
    writeMITM(version, { removeHook: true, removeHookParams: value }, { RemoveHook: true, RemoveHookParams: value }),
    hiddenError,
  )
}

/** 劫持开启后 过滤器重置 */
export const grpcMITMResetFilter: APIFunc<string, null> = (version, hiddenError) => {
  return runMITM(writeMITM(version, { setResetFilter: true }, { ResetFilter: true }), hiddenError)
}

/** 过滤器重置 */
export const grpcResetMITMFilter: APINoRequestFunc<null> = (hiddenError) => {
  return runMITM(
    ipc.invoke('grpc', 'ResetMITMFilter', {}).then(() => null),
    hiddenError,
  )
}

/**监听 MITM 过滤器状态 */
export const grpcClientMITMfilter = (version: string) => {
  return {
    on: (callback: (i: MITMFilterData) => void) =>
      getMITMSession(version).on('filter', (value) => callback(mitmFilterForUI(value))),
  }
}

export interface MITMSetFilterRequest extends MITMBaseData {
  FilterData: MITMFilterData
}
/**劫持开启后 filter 设置过滤器 */
export const grpcMITMSetFilter: APIFunc<MITMSetFilterRequest, null> = (params, hiddenError) => {
  const { version, ...value } = params
  return runMITM(
    (async () => {
      const status = await getMITMSession(version).status()
      if (status.haveStream)
        await writeMITM(version, { ...value, updateFilter: true }, { ...value, UpdateFilter: true })
      await ipc.invoke('grpc', 'SetMITMFilter', value)
      return null
    })(),
    hiddenError,
  )
}
/**获取过滤器 filter */
export const grpcMITMGetFilter: APINoRequestFunc<MITMFilterSchema> = (hiddenError) => {
  return runMITM(
    ipc
      .invoke('grpc', 'GetMITMFilter', {})
      .then((value) => ({ ...value, FilterData: mitmFilterForUI(value.FilterData) })),
    hiddenError,
  )
}
export interface MITMHijackSetFilterRequest extends MITMBaseData {
  FilterData: MITMFilterData
}

/**劫持开启后 hijackFilter 设置过滤器 */
export const grpcMITMHijackSetFilter: APIFunc<MITMHijackSetFilterRequest, null> = (params, hiddenError) => {
  const { version, ...value } = params
  return runMITM(
    (async () => {
      const status = await getMITMSession(version).status()
      if (status.haveStream)
        await writeMITM(
          version,
          { HijackFilterData: value.FilterData, updateHijackFilter: true },
          { HijackFilterData: value.FilterData, UpdateHijackFilter: true },
        )
      await ipc.invoke('grpc', 'SetMITMHijackFilter', value)
      return null
    })(),
    hiddenError,
  )
}

/**获取过滤器 hijack */
export const grpcMITMHijackGetFilter: APINoRequestFunc<MITMFilterSchema> = (hiddenError) => {
  return runMITM(
    ipc
      .invoke('grpc', 'GetMITMHijackFilter', {})
      .then((value) => ({ ...value, FilterData: mitmFilterForUI(value.FilterData) })),
    hiddenError,
  )
}

export interface MITMHijackGetFilterRequest extends MITMBaseData {
  isManual: boolean
}
/**设置是否开启手动劫持 */
export const grpcMITMAutoForward: APIFunc<MITMHijackGetFilterRequest, null> = (params, hiddenError) => {
  return runMITM(
    writeMITM(
      params.version,
      { setAutoForward: true, autoForwardValue: params.isManual },
      { SetAutoForward: true, AutoForwardValue: params.isManual },
    ),
    hiddenError,
  )
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
  Message: ExecResult | null
  GetCurrentHook: boolean
  Hooks: YakScriptHooks[]
  //server notification, just show a dialog
  HaveNotification: boolean
  NotificationContent: Uint8Array
  //这两个标志是用来设置 MITM 加载状态的，用于服务端控制用户端的 "加载中"
  HaveLoadingSetter: boolean
  LoadingFlag: boolean
  //add\delete\update\reload
  ManualHijackListAction: `${ManualHijackListAction}`
  //top 20 hijack message
  ManualHijackList: SingleManualHijackInfoMessage[]
}

export type ManualHijackListStatusType = `${ManualHijackListStatus}`
export interface SingleManualHijackInfoMessage {
  /**前端展示使用，到达顺序 */
  arrivalOrder?: number
  manualHijackListAction: `${ManualHijackListAction}`
  TaskID: string
  Request: Uint8Array
  Response: Uint8Array
  Status: ManualHijackListStatusType
  HijackResponse: boolean
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
  return 'id' in value // 检查是否存在MITMResponse独有的属性
}
export const isMITMV2Response = (value: ClientMITMHijackedResponse): value is MITMV2Response => {
  return 'ManualHijackList' in value // 检查是否存在MITMResponse独有的属性
}
/**自动转发劫持，进行的操作 */
export const grpcClientMITMHijacked = (version: string) => {
  return {
    on: (callback: (i: ClientMITMHijackedResponse) => void) =>
      getMITMSession(version).on('hijacked', (value) => callback(mitmHijackedForUI(value))),
  }
}
/**通过Id丢弃请求 */
export const grpcMITMDropRequestById: APIFunc<string | number, null> = (id, hiddenError) => {
  return runMITM(mitmSession.write({ id, drop: true }), hiddenError)
}
/**通过Id丢弃响应 */
export const grpcMITMDropResponseById: APIFunc<string | number, null> = (id, hiddenError) => {
  return runMITM(mitmSession.write({ responseId: id, drop: true }), hiddenError)
}
/** forward request */
export const grpcMITMForwardRequestById: APIFunc<string | number, null> = (id, hiddenError) => {
  return runMITM(mitmSession.write({ id, forward: true }), hiddenError)
}
/** forward response */
export const grpcMITMForwardResponseById: APIFunc<string | number, null> = (id, hiddenError) => {
  return runMITM(mitmSession.write({ responseId: id, forward: true }), hiddenError)
}
/** hijacked */
export const grpcMITMHijackedCurrentResponseById: APIFunc<string | number, null> = (id, hiddenError) => {
  return runMITM(mitmSession.write({ id, hijackResponse: true }), hiddenError)
}
/**cancel hijacked */
export const grpcMITMCancelHijackedCurrentResponseById: APIFunc<string | number, null> = (id, hiddenError) => {
  return runMITM(mitmSession.write({ id, cancelhijackResponse: true }), hiddenError)
}
export interface MITMEnablePluginModeRequest extends MITMBaseData {
  initPluginNames: string[]
}
/** 设置启用插件模式，自动加载所有主插件;如果不设置 initPluginNames 的话，启动所有默认插件 */
export const grpcMITMEnablePluginMode: APIFunc<MITMEnablePluginModeRequest, null> = (params, hiddenError) => {
  return runMITM(
    writeMITM(
      params.version,
      { setPluginMode: true, initPluginNames: params.initPluginNames },
      { SetPluginMode: true, InitPluginNames: params.initPluginNames },
    ),
    hiddenError,
  )
}
export interface MITMForwardModifiedRequest {
  id: string | number
  request: Uint8Array
  Tags: string[]
  autoForwardValue: boolean
}
/**MITM 转发 */
export const grpcMITMForwardModifiedRequest: APIFunc<MITMForwardModifiedRequest, null> = (params, hiddenError) => {
  return runMITM(
    mitmSession.write({
      id: params.id,
      request: params.request,
      Tags: params.Tags,
      setAutoForward: true,
      autoForwardValue: params.autoForwardValue,
    }),
    hiddenError,
  )
}
export interface MITMForwardModifiedResponseRequest {
  response: Uint8Array
  responseId: string | number
}
/** MITM转发 - HTTP响应 */
export const grpcMITMForwardModifiedResponse: APIFunc<MITMForwardModifiedResponseRequest, null> = (
  params,
  hiddenError,
) => {
  return runMITM(mitmSession.write(params), hiddenError)
}

export interface MITMExecScriptContentRequest extends MITMBaseData {
  YakScriptContent: string
}
/** 热加载 */
export const grpcMITMExecScriptContent: APIFunc<MITMExecScriptContentRequest, null> = (params, hiddenError) => {
  return runMITM(
    writeMITM(
      params.version,
      { setYakScript: true, yakScriptContent: params.YakScriptContent },
      { SetYakScript: true, YakScriptContent: params.YakScriptContent },
    ),
    hiddenError,
  )
}

/** Get Current Hook */
export const grpcMITMGetCurrentHook: APIFunc<string, null> = (version, hiddenError) => {
  return runMITM(writeMITM(version, { getCurrentHook: true }, { GetCurrentHook: true }), hiddenError)
}
export interface MITMContentReplacersRequest {
  version: string
  replacers: MITMContentReplacerRule[]
}
/**设置正则替换 */
export const grpcMITMContentReplacers: APIFunc<MITMContentReplacersRequest, null> = (params, hiddenError) => {
  return runMITM(
    writeMITM(
      params.version,
      { replacers: params.replacers, setContentReplacers: true },
      { Replacers: params.replacers, SetContentReplacers: true },
    ),
    hiddenError,
  )
}

/**清除插件缓存 */
export const grpcMITMClearPluginCache: APIFunc<string, null> = (version, hiddenError) => {
  return runMITM(
    writeMITM(version, { setClearMITMPluginContext: true }, { SetClearMITMPluginContext: true }),
    hiddenError,
  )
}
export interface MITMFilterWebsocketRequest extends MITMBaseData {
  filterWebsocket: boolean
}
/**过滤 ws */
export const grpcMITMFilterWebsocket: APIFunc<MITMFilterWebsocketRequest, null> = (params, hiddenError) => {
  return runMITM(
    writeMITM(
      params.version,
      { filterWebsocket: params.filterWebsocket, updateFilterWebsocket: true },
      { FilterWebsocket: params.filterWebsocket, UpdateFilterWebsocket: true },
    ),
    hiddenError,
  )
}

export interface MITMSetDownstreamProxyRequest extends MITMBaseData {
  downstreamProxy: string
  downstreamProxyRuleId: string
}
/**下游代理 */
export const grpcMITMSetDownstreamProxy: APIFunc<MITMSetDownstreamProxyRequest, null> = (params, hiddenError) => {
  return runMITM(
    writeMITM(
      params.version,
      { SetDownstreamProxy: true, downstreamProxy: params.downstreamProxy },
      {
        SetDownstreamProxy: true,
        DownstreamProxy: params.downstreamProxy,
        DownstreamProxyRuleId: params.downstreamProxyRuleId,
      },
    ),
    hiddenError,
  )
}

export interface MITMSetDisableSystemProxyRequest extends MITMBaseData {
  setDisableSystemProxy: boolean
}
/**设置禁用系统代理 */
export const grpcMITMSetDisableSystemProxy: APIFunc<MITMSetDisableSystemProxyRequest, null> = (params, hiddenError) => {
  return runMITM(mitmV2Session.write({ SetDisableSystemProxy: params.setDisableSystemProxy }), hiddenError)
}

export interface MITMHotPortRequest extends MITMBaseData {
  host: string
  port: number
}
/**host port */
export const grpcMITMHotPort: APIFunc<MITMHotPortRequest, null> = (params, hiddenError) => {
  return runMITM(
    writeMITM(params.version, { host: params.host, port: params.port }, { Host: params.host, Port: params.port }),
    hiddenError,
  )
}
/** mitm 服务端控制客户端加载状态 */
export const grpcClientMITMLoading = (version: string) => {
  return { on: (callback: (i: boolean) => void) => getMITMSession(version).on('loading', (value) => callback(value)) }
}

/** 更新替代规则 */
export const grpcClientMITMContentReplacerUpdate = (version: string) => {
  return {
    on: (callback: (i: MITMContentReplacerRule[]) => void) =>
      getMITMSession(version).on('replacers', (value) => callback(value.map(mitmRuleForUI))),
  }
}
/**当前系统的 hooks */
export const grpcClientMITMHooks = (version: string) => {
  return {
    on: (callback: (i: YakScriptHooks[]) => void) => getMITMSession(version).on('hooks', (value) => callback(value)),
  }
}

export interface MITMDisableTrafficGuardRequest extends MITMBaseData {
  DisableTrafficGuard: boolean
}
/** 内置规则开关 */
export const grpcDisableTrafficGuard: APIFunc<MITMDisableTrafficGuardRequest, null> = (params, hiddenError) => {
  return runMITM(
    writeMITM(
      params.version,
      { DisableTrafficGuard: params.DisableTrafficGuard },
      { DisableTrafficGuard: params.DisableTrafficGuard },
    ),
    hiddenError,
  )
}
