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

/*
* message YakScript {
  int64 Id = 1;
  string Content = 2;
  string Type = 3;
  repeated YakScriptParam Params = 4;
  int64 CreatedAt = 5;
  string ScriptName = 6;
  string Help = 7;
}
*
* message YakScriptParam {
  string Field = 1;
  string DefaultValue = 2;

  // int/number/integer/float/str/bool
  string TypeVerbose = 3;

  string FieldVerbose = 4;

  string Help = 5;
}
* */
export interface YakScriptParam {
    Field: string
    DefaultValue: string
    TypeVerbose: string
    FieldVerbose: string
    Help: string
    Value?: string | any
    Required?: boolean
    Group?: string
    ExtraSetting?: string
    BuildInParam?: boolean
}

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
    Params: YakScriptParam[]
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
}
