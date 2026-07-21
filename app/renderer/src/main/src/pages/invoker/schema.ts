import { YakitPluginBaseAIInfo } from '../pluginEditor/base'
import { YakParamProps, YakRiskInfoProps } from '../plugins/pluginsType'

export interface ExecHistoryRecord {
  Script: string
  ScriptId: string
  Timestamp: number
  DurationMs: number
  Params: string
  Ok: boolean
  Reason: string
  Id: string
  Stdout: Uint8Array
  Stderr: Uint8Array
  StderrLen: number
  StdoutLen: number
  Messages: Uint8Array
  FromYakModule: string
  RuntimeId: string
  // 插件执行历史扩展字段（B 方案）
  Source?: string // plugin-op | plugin-hub
  StreamInfo?: string // JSON: HoldGRPCStreamInfo 快照，恢复 log/自定义 table/text/card
  ResultStatus?: string // finished | stopped
}

// 保存插件执行历史请求（前端执行结束/停止时 POST 回后端）
export interface SavePluginExecutionHistoryRequest {
  PluginId: number
  PluginName: string
  PluginUUID: string
  PluginType: string
  Source: string // plugin-op | plugin-hub
  Input: string
  // 以下均为 JSON 序列化后的字符串，后端透传不解析
  ExecParams: string
  FormValue: string
  ExtraParamsValue: string
  HTTPRequestTemplate: string
  LinkPluginConfig: string
  StreamInfo: string // HoldGRPCStreamInfo 快照
  ResultStatus: string // finished | stopped
  RuntimeId: string
  HeadImg: string
}

// 查询插件执行历史请求（复用 QueryExecHistory）
export interface QueryPluginExecutionHistoryRequest {
  Pagination?: PaginationSchema
  YakScriptId?: number
  YakScriptName?: string
  Source?: string // plugin-op | plugin-hub
}

// 插件使用次数排行项
export interface PluginExecutionUsageItem {
  PluginId: number
  PluginName: string
  PluginUUID: string
  PluginType: string
  HeadImg: string
  Count: number
  LastExecutedAt: number
}

export interface PluginExecutionUsageRankingResponse {
  Data: PluginExecutionUsageItem[]
}

export interface PaginationSchema {
  Page: number
  Limit: number
  OrderBy: string
  Order: string
  RawOrder?: string
  BeforeId?: number
  AfterId?: number
}

export type ExecHistoryRecordResponse = QueryGeneralResponse<ExecHistoryRecord>

export interface QueryGeneralResponse<T> {
  Data: T[]
  Pagination: PaginationSchema
  Total: number
}

export type QueryGeneralResponseProps<T, DataKey extends string = 'Data'> = {
  [key in DataKey]: T[]
} & {
  Pagination: PaginationSchema
  Total: number
}
export interface QueryGeneralRequest {
  Pagination: PaginationSchema
}

export const genDefaultPagination = (limit?: number, page?: number) => {
  return {
    Limit: limit || 10,
    Page: page || 1,
    OrderBy: 'updated_at',
    Order: 'desc',
  } as PaginationSchema
}

// export interface YakScriptParam {
//     Field: string
//     DefaultValue: string
//     TypeVerbose: string
//     FieldVerbose: string
//     Help: string
//     Value?: string | any
//     Required?: boolean
//     Group?: string
//     ExtraSetting?: string
//     BuildInParam?: boolean
// }

export interface YakScriptHooks {
  HookName: string
  Hooks: YakScriptHookItem[]
}

export interface YakScriptHookItem {
  Verbose: string
  YakScriptId: number
  YakScriptName: string
}

export interface YakScript extends Partial<YakitPluginBaseAIInfo> {
  Id: number
  Content: string
  Type: string
  Params: YakParamProps[]
  CreatedAt: number
  ScriptName: string
  Help: string
  Level: string
  Author: string
  Tags: string
  IsHistory: boolean
  IsIgnore?: boolean
  IsGeneralModule?: boolean
  GeneralModuleVerbose?: string
  GeneralModuleKey?: string
  FromGit?: string
  EnablePluginSelector?: boolean
  PluginSelectorTypes?: string
  OnlineId: number
  OnlineScriptName: string
  OnlineContributors: string
  UserId: number
  UUID: string
  OnlineIsPrivate?: boolean
  HeadImg?: string
  OnlineBaseUrl?: string
  BaseOnlineId?: number
  OnlineOfficial?: boolean
  OnlineGroup?: string
  IsCorePlugin?: boolean
  UpdatedAt?: number
  // RiskType?: string 废弃
  // RiskDetail?: YakRiskInfoProps[] 废弃
  // RiskAnnotation?: string 废弃
  CollaboratorInfo?: Collaborator[]
  /**前端判断使用，该插件是否为本地插件，OnlineBaseUrl与当前最新的私有域不一样则为本地插件 */
  isLocalPlugin?: boolean
  RiskInfo?: YakRiskInfoProps[]
  IsUpdate?: boolean
  /** 全局变量 */
  PluginEnvKey?: string[]
}

export interface Collaborator {
  HeadImg: string
  UserName: string
}

export type QueryYakScriptsResponse = QueryGeneralResponse<YakScript>

export interface QueryYakScriptRequest extends QueryGeneralRequest {
  Type?: string
  Keyword?: string
  IsHistory?: boolean
  IsIgnore?: boolean
  IsBatch?: boolean
  IsGeneralModule?: boolean
  ExcludeNucleiWorkflow?: boolean
  ExcludeScriptNames?: string[]
  IncludedScriptNames?: string[]
  Tag?: string[]
  NoResultReturn?: boolean
  UserId?: number
  UserName?: string

  // 展示信息中，插件商店的顺序和本地顺序不应该一样
  IgnoreGeneralModuleOrder?: boolean
  UUID?: string
  // 插件组
  Group?: { UnSetGroup: boolean; Group: string[]; IsPocBuiltIn?: string }
  ExcludeTypes?: string[]
  IsMITMParamPlugins?: number //0->默认全部 1->是mitm带参数插件 2->mitm不带参数;

  // 关键词搜索
  FieldKeywords?: string

  /** 为 true 时仅返回 enable_for_ai=true 的插件 */
  EnableForAI?: boolean
}

/*
* message ExecResult {
  string Hash = 1;
  string OutputJson = 2;
  bytes Raw = 3;
  bool IsMessage = 4;
  bytes Message = 5;
}
* */

export interface ExecResult {
  Hash: string
  OutputJson: string
  Raw: Uint8Array
  IsMessage: boolean
  Message: Uint8Array
  Id?: number
  Progress: number
  RuntimeID?: string
  PluginName?: string
}

export interface TagsAndType {
  Value: string
  Total: number
}

export interface GetYakScriptTagsAndTypeResponse {
  Type: TagsAndType[]
  Tag: TagsAndType[]
  Group: TagsAndType[]
}

export interface GroupCount {
  Value: string
  Total: number
  Default: boolean
  TemporaryId?: string
  IsPocBuiltIn?: boolean
}

export interface QueryYakScriptGroupResponse {
  Group: GroupCount[]
}

export interface GetYakScriptGroupResponse {
  SetGroup: string[]
  AllGroup: string[]
}

export interface SaveYakScriptGroupRequest {
  Filter: QueryYakScriptRequest
  SaveGroup: string[]
  RemoveGroup: string[]
  PageId?: string
}

export interface ResetYakScriptGroupRequest {
  Token: string
}
