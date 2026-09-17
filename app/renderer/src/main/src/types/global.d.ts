import type * as YakitGVDefine from '@/yakitGVDefine'
import type * as YaklangEngineWatchDog from '@/components/layout/YaklangEngineWatchDog'
import type * as YakitStore from '@/store'
import type * as RemoteEngineType from '@/components/layout/RemoteEngine/RemoteEngineType'
import type * as InvokerSchema from '@/pages/invoker/schema'
import type * as ProjectManage from '@/pages/softwareSettings/ProjectManage'
import type * as Encodec from '@/utils/encodec'
import type * as Fetch from '@/services/fetch'
import type * as Basic from '@/utils/basic'
import type * as YakQueryHTTPFlow from '@/utils/yakQueryHTTPFlow'
import type * as Exporter from '@/utils/exporter'
import type * as LayoutUtils from '@/components/layout/utils'
import type * as IRifyHomeType from '@/pages/irifyHome/IRifyHomeType'
import type * as YakitRiskTableType from '@/pages/risks/YakitRiskTable/YakitRiskTableType'
import type * as YakitRiskTableUtils from '@/pages/risks/YakitRiskTable/utils'
import type * as GlobalState from '@/components/layout/GlobalState'
import type * as UseUploadOSS from '@/hook/useUploadOSS/useUploadOSS'
import type * as RisksSchema from '@/pages/risks/schema'
import type * as ConfigSystemProxy from '@/utils/ConfigSystemProxy'
import type * as Grpc from '@/apiUtils/grpc'
import type * as EditorMarkers from '@/utils/editorMarkers'
import type * as HTTPFlowTableConstants from '@/components/HTTPFlowTable/HTTPFlowTable.constants'
import type * as TrafficModels from '@/models/Traffic'
import type * as NewApp from '@/newApp/NewApp'
import type * as SwaggerResponseType from '@/services/swagger/resposeType'

declare module 'react' {
  interface SVGAttributes<T> {
    pid?: string | number
  }
}

declare module 'fs' {
  interface FileItem extends File {
    path: string
    size: number
    type: string
    lastModifiedDate: number
  }
}

declare global {
  /** Electron 渲染进程里 `<input type="file">` 选中的 File 带本地绝对路径；其它来源的 File 可能没有 */
  interface File {
    readonly path?: string
  }

  type DownloadingState = YakitGVDefine.DownloadingState
  type YaklangEngineMode = YakitGVDefine.YaklangEngineMode
  type YakitStatusType = YakitGVDefine.YakitStatusType
  type YakitSettingCallbackType = YakitGVDefine.YakitSettingCallbackType
  type YaklangEngineWatchDogCredential = YaklangEngineWatchDog.YaklangEngineWatchDogCredential
  type UserInfoProps = YakitStore.UserInfoProps
  type YakitAuthInfo = RemoteEngineType.YakitAuthInfo
  type ExecResult = InvokerSchema.ExecResult
  type ProjectIOProgress = ProjectManage.ProjectIOProgress
  type MutateHTTPRequestResponse = Encodec.MutateHTTPRequestResponse
  type AxiosBridgeParams = Fetch.requestConfig
  type QueryYakScriptRequest = InvokerSchema.QueryYakScriptRequest
  type YakScriptParam = Basic.YakScriptParam
  type MutateHTTPRequestParams = Encodec.MutateHTTPRequestParams
  type YakQueryHTTPFlowRequest = YakQueryHTTPFlow.YakQueryHTTPFlowRequest
  type ExtractableData = Exporter.ExtractableData
  type ProjectParamsProp = ProjectManage.ProjectParamsProp
  type GetSSAWorkbenchDashboardRequest = IRifyHomeType.GetSSAWorkbenchDashboardRequest
  type QueryRisksRequest = YakitRiskTableType.QueryRisksRequest
  type DeleteRiskRequest = YakitRiskTableUtils.DeleteRiskRequest
  type CheckSyntaxFlowRuleUpdateResponse = GlobalState.CheckSyntaxFlowRuleUpdateResponse
  type UploadImgTypeProps = UseUploadOSS.UploadImgTypeProps
  type QueryRisksResponse = YakitRiskTableType.QueryRisksResponse
  type Risk = RisksSchema.Risk
  type QueryYakScriptsResponse = InvokerSchema.QueryYakScriptsResponse
  type ProjectsResponse = ProjectManage.ProjectsResponse
  type ProjectDescription = ProjectManage.ProjectDescription
  type GetSSAWorkbenchDashboardResponse = IRifyHomeType.GetSSAWorkbenchDashboardResponse
  type GetSystemProxyResult = ConfigSystemProxy.GetSystemProxyResult
  type GlobalProxyRulesConfig = Grpc.GlobalProxyRulesConfig
  type AutoDecodeResult = Encodec.AutoDecodeResult
  type YakStaticAnalyzeErrorResult = EditorMarkers.YakStaticAnalyzeErrorResult
  type YakQueryHTTPFlowResponse = HTTPFlowTableConstants.YakQueryHTTPFlowResponse
  type LayoutSplitUploadResponse = LayoutUtils.SplitUploadResponse
  type NetInterface = TrafficModels.NetInterface
  type OnlineProfileProps = NewApp.OnlineProfileProps
  type API = SwaggerResponseType.API
  type AxiosResponseProps = Fetch.AxiosResponseProps
  type AxiosResponseInfoProps = Fetch.AxiosResponseInfoProps

  type BridgeCleanup = () => void

  type YakitSystem = 'Linux' | 'Darwin' | 'Windows_NT'

  type YakitArchitecture =
    | 'arm'
    | 'arm64'
    | 'ia32'
    | 'mips'
    | 'mipsel'
    | 'ppc'
    | 'ppc64'
    | 'riscv64'
    | 's390'
    | 's390x'
    | 'x64'

  /** gRPC 空请求（对应 proto Empty） */
  type GrpcEmptyRequest = Record<string, never>

  /** gRPC 空响应（对应 proto Empty） */
  type GrpcEmptyResponse = void

  /** 双向流写入请求包装（token + 单次 write 参数） */
  interface GrpcStreamWritePayload<T> {
    token: string
    params: T
  }

  interface OnlineProfileRequest {
    BaseUrl?: string
    Password?: string
    Proxy?: string
    IsCompany?: boolean
  }

  interface UploadRiskToOnlineRequest {
    Token?: string
    ProjectName?: string
    Hash?: string[]
    ExternalModule?: string
    ExternalProjectCode?: string
  }

  interface HTTPFlowsToOnlineRequest {
    Token?: string
    ProjectName?: string
    ProjectDescription?: string
    ExternalModule?: string
    ExternalProjectCode?: string
  }

  interface GetTunnelServerExternalIPParams {
    Addr?: string
    Secret?: string
  }

  interface ConfigGlobalReverseRequest {
    ConnectParams?: GetTunnelServerExternalIPParams
    LocalAddr?: string
  }

  interface YakDNSLogBridgeAddr {
    DNSLogAddr?: string
    DNSLogAddrSecret?: string
    /** 前端常用字段名，对应 proto DNSLogAddrSecret */
    DNSLogSecret?: string
    DNSMode?: string
    UseLocal?: boolean
    UseRemote?: boolean
  }

  interface QueryNewRiskRequest {
    AfterId?: string | number
  }

  interface NewRiskReadRequest {
    AfterId?: string | number
    Ids?: number[]
    Filter?: Partial<QueryRisksRequest>
  }

  interface QueryRiskRequest {
    Id?: number
    Hash?: string
    Ids?: number[]
    Filter?: Partial<QueryRisksRequest>
  }

  interface DeleteDomainsRequest {
    DeleteAll?: boolean
    DomainKeyword?: string
    Network?: string
    ID?: number
    IDs?: number[]
    Filter?: Record<string, unknown>
  }

  interface DeletePortsRequest {
    Hosts?: string
    Ports?: string
    Id?: number[]
    All?: boolean
    Ids?: number[]
    DeleteAll?: boolean
    Filter?: Record<string, unknown>
  }

  interface SetSystemProxyRequest {
    HttpProxy?: string
    Enable?: boolean
  }

  interface ResetAndInvalidUserDataRequest {
    OnlyClearCache?: boolean
  }

  interface YaklangCompileAndFormatRequest {
    Code?: string
  }

  interface StaticAnalyzeErrorRequest {
    Code?: Uint8Array
    PluginType?: string
    SessionID?: string
  }

  interface DefaultProxyResult {
    Proxy: string
  }

  interface DetermineAdaptedVersionEngineRequest {
    port?: number
    version?: string
  }

  interface SplitUploadBasePayload {
    url: string
    type?: string
    token?: string
    filedHash?: string
  }

  interface SplitUploadPathPayload extends SplitUploadBasePayload {
    path: string
  }

  interface SplitUploadBase64Payload extends SplitUploadBasePayload {
    base64: string
    imgInfo?: { filename?: string; contentType?: string }
  }

  type SplitUploadPayload = SplitUploadPathPayload | SplitUploadBase64Payload

  interface UploadImgBase64Payload {
    base64: string
    imgInfo?: { filename?: string; contentType?: string }
    type?: UploadImgTypeProps
    filedHash?: string
  }

  interface UploadFilePayload {
    path: string
    name: string
  }

  interface GenerateExtractRuleRequest {
    Data?: Uint8Array
    Selected?: Uint8Array
    OffsetSize?: number
  }

  interface SendExtractedToTablePayload {
    type: string
    extractedMap: Map<string, string> | Record<string, string>
  }

  interface SetKeyRequest {
    Key: string
    Value?: string
    TTL?: number
  }

  interface DeletePluginByUserIDRequest {
    UserID?: number | null
    OnlineBaseUrl?: string
  }

  interface SubscribeHTTPFlowsRequest {
    ProtocolVersion?: number
    LastSeenSequence?: number | string
    LastSeenId?: number | string
    ProjectGeneration?: number | string
    DatabaseIdentity?: string
    SessionId?: string
    Filter?: {
      SourceType?: string
    }
  }

  interface HTTPFlowLiveSummary {
    Id?: number | string
    IsHTTPS?: boolean
    Url?: string
    SourceType?: string
    Path?: string
    Method?: string
    BodyLength?: number | string
    BodySizeVerbose?: string
    RequestLength?: number | string
    RequestSizeVerbose?: string
    ContentType?: string
    StatusCode?: number | string
    GetParamsTotal?: number | string
    PostParamsTotal?: number | string
    CookieParamsTotal?: number | string
    UpdatedAt?: number | string
    CreatedAt?: number | string
    Hash?: string
    HostPort?: string
    IPAddress?: string
    HtmlTitle?: string
    Tags?: string
    NoFixContentLength?: boolean
    IsWebsocket?: boolean
    WebsocketHash?: string
    IsReadTooSlowResponse?: boolean
    IsTooLargeResponse?: boolean
    TooLargeResponseHeaderFile?: string
    TooLargeResponseBodyFile?: string
    DurationMs?: number | string
    HiddenIndex?: string
    FromPlugin?: string
    Host?: string
    PathSuffix?: string
    IsTooLargeRequest?: boolean
    TooLargeRequestHeaderFile?: string
    TooLargeRequestBodyFile?: string
    IsRequestOversize?: boolean
  }

  interface HTTPFlowLiveGap {
    Reason?: string
    RequestedSequence?: number | string
    OldestAvailableSequence?: number | string
    LatestSequence?: number | string
    HighWaterId?: number | string
  }

  interface HTTPFlowLiveEvent {
    ProtocolVersion?: number
    Type?: string
    Sequence?: number | string
    ProjectGeneration?: number | string
    DatabaseIdentity?: string
    ServerAtUnixMs?: number | string
    CommittedAtUnixMs?: number | string
    HighWaterId?: number | string
    Flow?: HTTPFlowLiveSummary
    Gap?: HTTPFlowLiveGap
    SessionId?: string
    Replayed?: boolean
    RequestHijackAtUnixMs?: number | string
    ResponseMirrorAtUnixMs?: number | string
    FlowBuiltAtUnixMs?: number | string
    PersistEnqueuedAtUnixMs?: number | string
    PersistStartedAtUnixMs?: number | string
  }

  interface StartMcpServerRequest {
    Host?: string
    Port?: number
    Tool?: string[]
    DisableTool?: string[]
    Resource?: string[]
    DisableResource?: string[]
    Script?: string[]
    EnableAll?: boolean
    EnableAIToolFramework?: boolean
    EnableBridgeExternalMCP?: boolean
  }

  interface DuplexConnectionRequest {
    Data?: Uint8Array
    MessageType?: string
    Timestamp?: number
  }

  interface SetCurrentProjectRequest {
    ProjectName?: string
    Id?: number
    Type?: string
  }

  interface GetCurrentProjectExRequest {
    Type?: string
  }

  interface GetDefaultProjectExRequest {
    Type?: string
  }

  interface AutoDecodeRequest {
    Data?: string
    ModifyResult?: Array<{
      Type?: string
      TypeVerbose?: string
      Origin?: Uint8Array
      Result?: Uint8Array
      Modify?: boolean
    }>
  }

  interface NewRisk {
    Title: string
    Id: number
    CreatedAt: number
    UpdatedAt: number
    Verbose: string
    TitleVerbose: string
    IsRead: boolean
  }

  interface QueryNewRiskResponse {
    Data: NewRisk[]
    NewRiskTotal: number
    Total: number
    Unread: number
  }

  interface GetGlobalReverseServerResponse {
    PublicReverseIP: string
    PublicReversePort: number
    LocalReverseAddr: string
    LocalReversePort: number
  }

  interface GetMachineIDResponse {
    MachineID: string
  }

  interface IsPrivilegedForNetRawResponse {
    IsPrivileged: boolean
    Advice: string
    AdviceVerbose: string
  }

  interface VerifySystemCertificateResponse {
    valid: boolean
    Reason: string
  }

  interface GeneralResponse {
    Ok: boolean
    Reason?: string
  }

  interface IsCVEDatabaseReadyResponse {
    Ok: boolean
    Reason: string
    ShouldUpdate: boolean
  }

  interface IsScrecorderReadyResponse {
    Ok: boolean
    Reason: string
  }

  interface GenerateExtractRuleResponse {
    PrefixRegexp: string
    SuffixRegexp: string
    SelectedRegexp: string
  }

  interface YaklangCompileAndFormatResponse {
    Code: string
    Errors: YakStaticAnalyzeErrorResult[]
  }

  interface StaticAnalyzeErrorResponse {
    Result: YakStaticAnalyzeErrorResult[]
  }

  interface AutoDecodeResponse {
    Results: AutoDecodeResult[]
  }

  interface ProcessEnvStorage {
    Key: string
    Value: string
    ExpiredAt: number
    ProcessEnv?: boolean
    Verbose?: string
    Group?: string
  }

  interface GetProcessEnvKeyResult {
    Results: ProcessEnvStorage[]
  }

  interface UploadImgApiResponse {
    code?: number
    message?: string
    data?: {
      from?: string
      reason?: string
    } & string
  }

  interface UploadFileApiResponse {
    code?: number
    message?: string
    data?: string | { reason?: string }
  }

  type SplitUploadResponse = LayoutSplitUploadResponse & {
    resArr?: UploadImgApiResponse[]
  }

  interface AppSyncMessage {
    type: 'theme' | 'i18n'
    payload: string
  }

  interface GenerateRunNodePayload {
    ipOrdomain: string
    port: string
    nodename: string
  }

  interface CompleteMainWindowPayload {
    yakitStatus: YakitStatusType | YaklangEngineMode | YakitSettingCallbackType | 'reclaimDatabaseSpace_start'
    dbPath?: string[]
  }

  interface EngineLinkFromMainWindowPayload {
    credential: YaklangEngineWatchDogCredential
  }

  interface CredentialUpdatePayload {
    credential: YaklangEngineWatchDogCredential
  }

  interface SignInDataPayload {
    ok: boolean
    info: string
  }

  interface YakProcessInfo {
    port: number
    pid: number
    ppid?: number
    cmd: string
    origin: unknown
  }

  interface YaklangEngineAddr {
    addr: string
  }

  interface FetchLatestYakitVersionPayload {
    config?: { timeout?: number }
    releaseEditionName?: string
  }

  interface DownloadYakitOptions {
    isEnterprise?: boolean
    isIRify?: boolean
    isMemfit?: boolean
  }

  interface StartLocalYaklangEngineParams {
    port: number
    version?: string
    isEnpriTraceAgent: boolean
    isIRify?: boolean
    password?: string
  }

  interface FetchCheckYaklangSourceConfig {
    timeout?: number
  }

  interface ChildWindowPayload {
    type: string
    data?: unknown
    hash?: string
  }

  interface ConsoleThemePayload {
    xtermThemeVars: Record<string, unknown>
  }
  interface YakitHomeConfig {
    YAKIT_HOME: string
    softLange: string
    yakitMode: string
    workspaceHistory: string[]
    autoStart: boolean
    currentHome: string
    configDir: string
  }

  interface OpenFileDialogOptions {
    title?: string
    defaultPath?: string
    buttonLabel?: string
    filters?: { extensions: string[]; name: string }[]
    properties?: Array<
      | 'openFile'
      | 'openDirectory'
      | 'multiSelections'
      | 'showHiddenFiles'
      | 'createDirectory'
      | 'promptToCreate'
      | 'noResolveAliases'
      | 'treatPackageAsDirectory'
      | 'dontAddToRecent'
    >
    message?: string
    securityScopedBookmarks?: boolean
  }

  interface OpenFileDialogReturnValue {
    canceled: boolean
    filePaths: string[]
    bookmarks?: string[]
  }

  interface SaveFileDialogOptions {
    title?: string
    defaultPath?: string
    buttonLabel?: string
    filters?: { extensions: string[]; name: string }[]
    message?: string
    nameFieldLabel?: string
    showsTagField?: boolean
    properties?: Array<
      | 'showHiddenFiles'
      | 'createDirectory'
      | 'treatPackageAsDirectory'
      | 'showOverwriteConfirmation'
      | 'dontAddToRecent'
    >
    securityScopedBookmarks?: boolean
  }

  interface SaveFileDialogReturnValue {
    canceled: boolean
    filePath?: string
    bookmark?: string
  }

  interface EchoPayload {
    text: string
  }

  interface EchoResult {
    result: string
  }

  interface FetchEnterpriseUpdateInfoResult {
    version: string
  }

  interface CheckHahValidConfigResult {
    Ok: boolean
  }

  interface LogoutDynamicControlParams {
    loginOut?: boolean
  }

  interface AvailableLocalAddrResult {
    Interfaces: NetInterface[]
  }

  interface CodecRunParams {
    Type: string
    Text: string
    Params?: {
      Key: string
      Value: string
    }[]
    ScriptName?: string
  }

  interface CodecRunResult {
    Result: string
  }
}

export {}
