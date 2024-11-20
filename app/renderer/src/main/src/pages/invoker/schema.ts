import {YakParamProps, YakRiskInfoProps} from "../plugins/pluginsType"

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
}

export interface PaginationSchema {
    Page: number
    Limit: number
    OrderBy: string
    Order: string
    RawOrder?: string
}

export type ExecHistoryRecordResponse = QueryGeneralResponse<ExecHistoryRecord>

export interface QueryGeneralResponse<T> {
    Data: T[]
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
        OrderBy: "updated_at",
        Order: "desc"
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

export interface YakScript {
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
    Group?: {UnSetGroup: boolean; Group: string[]; IsPocBuiltIn?: string}
    ExcludeTypes?: string[]
    IsMITMParamPlugins?: number //0->默认全部 1->是mitm带参数插件 2->mitm不带参数;

    // 关键词搜索
    FieldKeywords?: string
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
