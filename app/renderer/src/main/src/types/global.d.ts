declare module 'fs' {
  interface FileItem extends File {
    path: string
    size: number
    type: string
    lastModifiedDate: number
  }
}

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

type DownloadingState = import('@/yakitGVDefine').DownloadingState
type YaklangEngineMode = import('@/yakitGVDefine').YaklangEngineMode
type YakitStatusType = import('@/yakitGVDefine').YakitStatusType
type YakitSettingCallbackType = import('@/yakitGVDefine').YakitSettingCallbackType
type YaklangEngineWatchDogCredential =
  import('@/components/layout/YaklangEngineWatchDog').YaklangEngineWatchDogCredential
type UserInfoProps = import('@/store').UserInfoProps
type YakitAuthInfo = import('@/components/layout/RemoteEngine/RemoteEngineType').YakitAuthInfo
type ExecResult = import('@/pages/invoker/schema').ExecResult
type ProjectIOProgress = import('@/pages/softwareSettings/ProjectManage').ProjectIOProgress
type MutateHTTPRequestResponse = import('@/utils/encodec').MutateHTTPRequestResponse
type AxiosBridgeParams = import('@/services/fetch').requestConfig
type QueryYakScriptRequest = import('@/pages/invoker/schema').QueryYakScriptRequest
type YakScriptParam = import('@/utils/basic').YakScriptParam
type MutateHTTPRequestParams = import('@/utils/encodec').MutateHTTPRequestParams
type YakQueryHTTPFlowRequest = import('@/utils/yakQueryHTTPFlow').YakQueryHTTPFlowRequest
type ExtractableData = import('@/utils/exporter').ExtractableData
type ProjectParamsProp = import('@/pages/softwareSettings/ProjectManage').ProjectParamsProp
type ExportProjectRequest = import('@/components/layout/utils').ExportProjectRequest
type GetSSAWorkbenchDashboardRequest = import('@/pages/irifyHome/IRifyHomeType').GetSSAWorkbenchDashboardRequest
type QueryRisksRequest = import('@/pages/risks/YakitRiskTable/YakitRiskTableType').QueryRisksRequest
type DeleteRiskRequest = import('@/pages/risks/YakitRiskTable/utils').DeleteRiskRequest
type CheckSyntaxFlowRuleUpdateResponse = import('@/components/layout/GlobalState').CheckSyntaxFlowRuleUpdateResponse
type UploadImgTypeProps = import('@/hook/useUploadOSS/useUploadOSS').UploadImgTypeProps
type QueryRisksResponse = import('@/pages/risks/YakitRiskTable/YakitRiskTableType').QueryRisksResponse
type Risk = import('@/pages/risks/schema').Risk
type QueryYakScriptsResponse = import('@/pages/invoker/schema').QueryYakScriptsResponse
type ProjectsResponse = import('@/pages/softwareSettings/ProjectManage').ProjectsResponse
type ProjectDescription = import('@/pages/softwareSettings/ProjectManage').ProjectDescription
type GetSSAWorkbenchDashboardResponse = import('@/pages/irifyHome/IRifyHomeType').GetSSAWorkbenchDashboardResponse
type GetSystemProxyResult = import('@/utils/ConfigSystemProxy').GetSystemProxyResult
type GlobalProxyRulesConfig = import('@/apiUtils/grpc').GlobalProxyRulesConfig
type AutoDecodeResult = import('@/utils/encodec').AutoDecodeResult
type YakStaticAnalyzeErrorResult = import('@/utils/editorMarkers').YakStaticAnalyzeErrorResult
type YakQueryHTTPFlowResponse = import('@/components/HTTPFlowTable/HTTPFlowTable.constants').YakQueryHTTPFlowResponse
type LayoutSplitUploadResponse = import('@/components/layout/utils').SplitUploadResponse
type NetInterface = import('@/models/Traffic').NetInterface
type OnlineProfileProps = import('@/NewApp').OnlineProfileProps
type API = import('@/services/swagger/resposeType').API
type AxiosResponseProps = import('@/services/fetch').AxiosResponseProps
type AxiosResponseInfoProps = import('@/services/fetch').AxiosResponseInfoProps

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
  AfterId?: number
}

interface NewRiskReadRequest {
  AfterId?: number
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

interface ExtractDataToFileRequest {
  JsonOutput?: boolean
  CSVOutput?: boolean
  DirName?: string
  /** map<string, ExtractableData>，键为字段名 */
  Data?: Record<string, ExtractableData> | ExtractableData
  /** 前端传 FilePattern，proto 为 FileNamePattern */
  FilePattern?: string
  FileNamePattern?: string
  Finished?: boolean
}

type ExtractDataToFilePayload = GrpcStreamWritePayload<ExtractDataToFileRequest>

interface GenerateExtractRuleRequest {
  Data?: Uint8Array
  Selected?: Uint8Array
  OffsetSize?: number
}

interface ExtractDataRequest {
  Data?: Uint8Array
  Mode?: string
  PrefixRegexp?: string
  SuffixRegexp?: string
  MatchRegexp?: string
  Token?: string
  End?: boolean
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

type ExportProjectParams = Omit<ExportProjectRequest, 'token'>

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
    'showHiddenFiles' | 'createDirectory' | 'treatPackageAsDirectory' | 'showOverwriteConfirmation' | 'dontAddToRecent'
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

interface YakitBridge {
  app: {
    generateStartEngine: () => Promise<unknown>
    generateChromePlugin: () => Promise<string>
    generateRunNode: (payload: GenerateRunNodePayload) => Promise<string | number>
    setEnterpriseToDomain: (flag: boolean) => Promise<unknown>
    syncEditBaseUrl: (baseUrl: string) => unknown
    syncUpdateUser: (user: UserInfoProps) => unknown
    killRunNode: (pid: number) => Promise<unknown>
    userSignOut: (params: { isEnpriTrace?: boolean }) => void
    triggerDevtool: () => Promise<unknown>
    setZoomFactor: (factor: number) => Promise<unknown>
    reload: () => Promise<unknown>
    reloadWithCacheBypass: () => Promise<unknown>
    exitApp: (params: Record<string, unknown>) => Promise<unknown>
    relaunch: () => Promise<unknown>
    completeMainWindow: (payload: CompleteMainWindowPayload) => Promise<unknown>
    updateCredential: (payload: CredentialUpdatePayload) => Promise<unknown>
    onCloseWindow: (callback: () => void) => BridgeCleanup
    onMinimizeWindow: (callback: () => void) => BridgeCleanup
    sync: (message: AppSyncMessage) => Promise<unknown>
    onSync: (callback: (message: AppSyncMessage) => void) => BridgeCleanup
  }
  theme: {
    setTheme: (theme: 'light' | 'dark') => Promise<unknown>
    onUpdated: (callback: (theme: 'light' | 'dark') => void) => BridgeCleanup
  }
  system: {
    fetchSystemName: () => Promise<YakitSystem>
    fetchCpuArch: () => Promise<YakitArchitecture>
    isDev: () => Promise<boolean>
    fetchSystemAndArch: () => Promise<string>
  }
  network: {
    axiosApi: (params: AxiosBridgeParams) => Promise<AxiosResponseProps<AxiosResponseInfoProps>>
    logoutDynamicControl: (params: LogoutDynamicControlParams) => Promise<unknown>
    killDynamicControl: () => Promise<unknown>
    exitDynamicControlPage: () => Promise<unknown>
    uploadRiskToOnline: (payload: UploadRiskToOnlineRequest) => Promise<GrpcEmptyResponse>
    httpFlowsToOnline: (payload: HTTPFlowsToOnlineRequest) => Promise<GrpcEmptyResponse>
  }
  shell: {
    openExternal: (url: string) => Promise<unknown>
    openAbsoluteFile: (targetPath: string) => Promise<unknown>
    openSpecifiedFile: (targetPath: string) => Promise<unknown>
    openYakitPath: () => Promise<unknown>
    checkYakitInstallFile: (filename: string) => Promise<boolean>
    installIntranetYakit: (filePath: string) => Promise<unknown>
    openRemoteLink: () => Promise<unknown>
    getRemoteFilePath: () => Promise<string>
  }
  reverse: {
    getStatus: () => Promise<boolean>
    cancel: () => Promise<unknown>
    config: (payload: ConfigGlobalReverseRequest) => Promise<GrpcEmptyResponse>
    getServer: (params?: GrpcEmptyRequest) => Promise<GetGlobalReverseServerResponse>
    setYakBridgeLogServer: (payload: YakDNSLogBridgeAddr) => Promise<GrpcEmptyResponse>
    availableLocalAddr: (params?: GrpcEmptyRequest) => Promise<AvailableLocalAddrResult>
    onError: (callback: (message: string) => void) => BridgeCleanup
  }
  risk: {
    fetchLatestInfo: (payload: QueryNewRiskRequest) => Promise<QueryNewRiskResponse>
    queryRisks: (payload: Partial<QueryRisksRequest>) => Promise<QueryRisksResponse>
    setInfoRead: (payload: NewRiskReadRequest) => Promise<GrpcEmptyResponse>
    query: (payload: QueryRiskRequest) => Promise<Risk>
    delete: (payload: DeleteRiskRequest) => Promise<GrpcEmptyResponse>
  }
  asset: {
    deleteDomains: (payload: DeleteDomainsRequest) => Promise<GrpcEmptyResponse>
    deletePorts: (payload: DeletePortsRequest) => Promise<GrpcEmptyResponse>
  }
  httpFlow: {
    queryHistory: (payload: YakQueryHTTPFlowRequest) => Promise<GrpcEmptyResponse>
  }
  host: {
    getSystemProxy: (params?: GrpcEmptyRequest) => Promise<GetSystemProxyResult>
    setSystemProxy: (payload: SetSystemProxyRequest) => Promise<GrpcEmptyResponse>
    getChromePath: () => Promise<string | null>
    getMachineID: (params?: GrpcEmptyRequest) => Promise<GetMachineIDResponse>
    resetAndInvalidUserData: (payload: ResetAndInvalidUserDataRequest) => Promise<GrpcEmptyResponse>
    isPrivilegedForNetRaw: (params?: GrpcEmptyRequest) => Promise<IsPrivilegedForNetRawResponse>
    promotePermissionForUserPcap: (params?: GrpcEmptyRequest) => Promise<GeneralResponse>
    verifySystemCertificate: (params?: GrpcEmptyRequest) => Promise<VerifySystemCertificateResponse>
    installMITMCertificate: (params?: GrpcEmptyRequest) => Promise<GeneralResponse>
    generateInstallScript: () => Promise<string>
  }
  window: {
    openChildWindow: (payload: ChildWindowPayload) => void
    focusChildWindow: () => void
    sendToChildWindow: (payload: ChildWindowPayload) => void
    openConsoleWindow: () => Promise<unknown>
    focusConsoleWindow: () => void
    closeConsoleWindow: () => void
    forwardConsoleData: (payload: string) => void
    forwardConsoleTheme: (payload: ConsoleThemePayload) => void
    onConsoleWindowHash: (callback: (payload: { hash: string }) => void) => BridgeCleanup
    onConsoleTerminalCopyData: (callback: (payload: string) => void) => BridgeCleanup
  }
  windowControls: {
    operate: (action: 'close' | 'min' | 'max' | 'full') => Promise<unknown>
    requestMaximizeState: () => Promise<unknown>
    requestFullScreenState: () => Promise<unknown>
    onMaximizeState: (callback: (value: boolean) => void) => BridgeCleanup
    onFullScreenState: (callback: (value: boolean) => void) => BridgeCleanup
    onMaximize: (callback: () => void) => BridgeCleanup
    onUnmaximize: (callback: () => void) => BridgeCleanup
    onEnterFullScreen: (callback: () => void) => BridgeCleanup
    onLeaveFullScreen: (callback: () => void) => BridgeCleanup
  }
  childWindow: {
    operate: (action: 'close' | 'min' | 'max' | 'full') => Promise<unknown>
    minimize: () => void
    maximize: () => void
    restore: () => void
    close: () => void
  }
  auxWindow: {
    ready: (windowId: string) => void
    onInit: (callback: (payload: AuxWindowInitPayload) => void) => BridgeCleanup
    onPush: (callback: (payload: AuxWindowPushPayload) => void) => BridgeCleanup
  }
  dialog: {
    showSaveDialog: (name: string) => Promise<{ canceled: boolean; filePath?: string }>
    writeFile: (payload: { route: string; data: string }) => Promise<unknown>
    openFileSystemDialog: (options: OpenFileDialogOptions) => Promise<OpenFileDialogReturnValue>
    saveFileSystemDialog: (options: SaveFileDialogOptions) => Promise<SaveFileDialogReturnValue>
  }
  logs: {
    openEngineLog: () => Promise<unknown>
    openRenderLog: () => Promise<unknown>
    openPrintLog: () => Promise<unknown>
    debugPrintLog: (message: string) => Promise<unknown>
    onLiveEngineStdio: (callback: (stdout: string) => void) => BridgeCleanup
    onLiveEngineLog: (callback: (stdout: string) => void) => BridgeCleanup
  }
  editorTools: {
    compileAndFormat: (payload: YaklangCompileAndFormatRequest) => Promise<YaklangCompileAndFormatResponse>
    staticAnalyze: (payload: StaticAnalyzeErrorRequest) => Promise<StaticAnalyzeErrorResponse>
  }
  perf: {
    startComputePercent: () => Promise<unknown>
    fetchComputePercent: () => Promise<number[]>
    clearComputePercent: () => Promise<unknown>
  }
  cache: {
    setLocalCache: (key: string, value: any) => Promise<unknown>
    getLocalCache: (key: string) => Promise<any>
    getRemoteKey: (key: string) => Promise<any>
    setRemoteKey: (key: string, value: string) => Promise<unknown>
    setRemoteKeyWithTTL: (key: string, value: string, ttl: number) => Promise<unknown>
    getRemoteProjectKey: (key: string) => Promise<any>
    setRemoteProjectKey: (key: string, value: string) => Promise<unknown>
  }
  clipboard: {
    setText: (text: string) => Promise<unknown>
    getText: () => Promise<string>
  }
  profile: {
    getOnlineProfile: (params?: GrpcEmptyRequest) => Promise<OnlineProfileProps>
    setOnlineProfile: (params: OnlineProfileRequest) => Promise<GrpcEmptyResponse>
  }
  auth: {
    startUserSignIn: (payload: { url: string; type: string }) => void
    companySignIn: (payload: Record<string, any>) => Promise<{ next?: boolean; info?: string }>
    editBaseUrl: (baseUrl: string) => Promise<any>
    requestPasswordReset: () => Promise<any>
    onSignInData: (callback: (payload: any) => void) => BridgeCleanup
    onSignCCBInData: (callback: (payload: any) => void) => BridgeCleanup
    onBaseUrlStatus: (callback: (payload: any) => void) => BridgeCleanup
  }
  release: {
    setEditionRaw: (edition: string) => Promise<unknown>
  }
  engine: {
    fetchLatestYakitVersion: (payload: FetchLatestYakitVersionPayload) => Promise<string>
    fetchEnterpriseUpdateInfo: () => Promise<FetchEnterpriseUpdateInfoResult>
    getAvailableOSSDomain: () => Promise<string>
    fetchLatestYaklangVersion: () => Promise<string>
    fetchYaklangVersionList: () => Promise<string>
    fetchYakitVersion: () => Promise<string>
    getCurrentYak: () => Promise<string>
    isYaklangEngineInstalled: () => Promise<boolean>
    initCVEDatabase: () => Promise<unknown>
    getBuildInEngineVersion: () => Promise<string>
    restoreEngineAndPlugin: (params?: GrpcEmptyRequest) => Promise<unknown>
    downloadLatestYak: (version: string) => Promise<unknown>
    cancelDownloadYakEngineVersion: (version?: string) => Promise<unknown>
    downloadLatestYakit: (version: string, type?: DownloadYakitOptions) => Promise<unknown>
    downloadLatestIntranetYakit: (filePath: string) => Promise<any>
    cancelDownloadYakitVersion: () => Promise<unknown>
    fetchCheckYaklangSource: (version: string, config?: FetchCheckYaklangSourceConfig) => Promise<string>
    calcEngineSha265: () => Promise<string[]>
    isCVEDatabaseReady: (params?: GrpcEmptyRequest) => Promise<IsCVEDatabaseReadyResponse>
    getDefaultProxy: (params?: GrpcEmptyRequest) => Promise<DefaultProxyResult>
    setDefaultProxy: (payload: DefaultProxyResult) => Promise<GrpcEmptyResponse>
    getAvailablePort: () => Promise<number>
    getRandomLocalEnginePort: () => Promise<number>
    determineAdaptedVersionEngine: (payload: DetermineAdaptedVersionEngineRequest) => Promise<boolean>
    getGlobalProxyRulesConfig: () => Promise<GlobalProxyRulesConfig>
    setGlobalProxyRulesConfig: (config: GlobalProxyRulesConfig) => Promise<GrpcEmptyResponse>
    clearLocalYaklangVersionCache: () => Promise<unknown>
    fetchYaklangEngineAddr: () => Promise<YaklangEngineAddr>
    requestYakVersion: () => Promise<unknown>
    listYakGrpc: () => Promise<YakProcessInfo[]>
    killYakGrpc: (pid: number) => Promise<any>
    killOldEngineProcess: (type?: string) => Promise<any>
    checkLocalDatabase: () => Promise<unknown>
    fixLocalDatabase: () => Promise<unknown>
    isPortAvailable: (port: number) => Promise<unknown>
    startLocalYaklangEngine: (params: StartLocalYaklangEngineParams) => Promise<unknown>
    connectYaklangEngine: (credential: YaklangEngineWatchDogCredential) => Promise<unknown>
    attachCombinedOutput: (params: GrpcEmptyRequest, token: string) => Promise<unknown>
    echo: (payload: EchoPayload) => Promise<EchoResult>
    outputLogToWelcomeConsole: (message: string) => Promise<unknown>
    verifyYakEngineVersion: (version: string) => Promise<boolean>
    installYakEngine: (version: string) => Promise<unknown>
    writeEngineKeyToYakitProjects: (version?: string) => Promise<unknown>
    getRemoteAuthAll: () => Promise<YakitAuthInfo[]>
    saveRemoteAuth: (params: YakitAuthInfo) => Promise<unknown>
    removeRemoteAuth: (name: string) => Promise<unknown>
    onYakVersion: (callback: (version: string) => void) => BridgeCleanup
    onDownloadYakEngineProgress: (callback: (payload: DownloadingState) => void) => BridgeCleanup
    onDownloadYakitProgress: (callback: (payload: DownloadingState) => void) => BridgeCleanup
    getApiKeyByOnline: (params: { Token: string }) => Promise<{
      ApiKey: string
    }>
  }
  upload: {
    splitUpload: (payload: SplitUploadPayload) => Promise<SplitUploadResponse>
    uploadImgBase64: (payload: UploadImgBase64Payload) => Promise<UploadImgApiResponse>
    uploadFile: (payload: UploadFilePayload) => Promise<UploadFileApiResponse>
  }
  exporter: {
    writeToFile: (payload: ExtractDataToFilePayload) => Promise<GrpcEmptyResponse>
  }
  extractor: {
    generateRule: (payload: GenerateExtractRuleRequest) => Promise<GenerateExtractRuleResponse>
    run: (payload: ExtractDataRequest, token: string) => Promise<GrpcEmptyResponse>
    cancel: (token: string) => Promise<GrpcEmptyResponse>
    sendToTable: (payload: SendExtractedToTablePayload) => Promise<GrpcEmptyResponse>
  }
  processEnv: {
    getAllKeys: (params?: GrpcEmptyRequest) => Promise<GetProcessEnvKeyResult>
    setKey: (payload: SetKeyRequest) => Promise<GrpcEmptyResponse>
    deleteKey: (payload: Pick<SetKeyRequest, 'Key'>) => Promise<GrpcEmptyResponse>
  }
  plugin: {
    queryYakScript: (params: QueryYakScriptRequest) => Promise<QueryYakScriptsResponse>
    checkSyntaxFlowRuleUpdate: (params?: GrpcEmptyRequest) => Promise<CheckSyntaxFlowRuleUpdateResponse>
    deleteByUserId: (payload: DeletePluginByUserIDRequest) => Promise<GrpcEmptyResponse>
  }
  script: {
    execYakCode: (params: YakScriptParam, token: string) => Promise<GrpcEmptyResponse>
  }
  mcp: {
    startServer: (params: StartMcpServerRequest, token: string) => Promise<GrpcEmptyResponse>
  }
  duplex: {
    start: (params: DuplexConnectionRequest, token: string) => Promise<GrpcEmptyResponse>
    write: (payload: DuplexConnectionRequest, token: string) => Promise<GrpcEmptyResponse>
  }
  socket: {
    start: () => Promise<unknown>
    close: () => Promise<unknown>
    send: (payload: API.WsRequest) => Promise<unknown>
    onMessage: (callback: (payload: Uint8Array) => void) => BridgeCleanup
    onOpen: (callback: () => void) => BridgeCleanup
    onClose: (callback: () => void) => BridgeCleanup
    onError: (callback: (payload: unknown) => void) => BridgeCleanup
  }
  stream: {
    onData: (token: string, callback: (payload: any) => void) => BridgeCleanup
    onError: (token: string, callback: (payload: any) => void) => BridgeCleanup
    onEnd: (token: string, callback: (payload?: any) => void) => BridgeCleanup
    onceEnd: (token: string, callback: (payload?: any) => void) => BridgeCleanup
    cancel: (apiKey: string, token: string) => Promise<unknown>
  }
  uiLayout: {
    markRendererReady: () => void
    onFromEngineLinkWindow: (callback: (payload: EngineLinkFromMainWindowPayload) => void) => BridgeCleanup
    clearRunnerTerminal: () => Promise<unknown>
    refreshMainMenu: () => Promise<unknown>
    onKillOldEngineProcess: (callback: (payload?: any) => void) => BridgeCleanup
    onLogoutDynamicControl: (callback: (payload?: any) => void) => BridgeCleanup
    requestSignOut: () => Promise<unknown>
    onSignOutRequested: (callback: () => void) => BridgeCleanup
    onJudgeLicenseLogin: (callback: () => void) => BridgeCleanup
    onResetPassword: (callback: () => void) => BridgeCleanup
    setSwitchConnectionRefresh: (flag: boolean) => Promise<unknown>
    onSwitchConnectionRefresh: (callback: (value: boolean) => void) => BridgeCleanup
    onOpenScreenCapModal: (callback: () => void) => BridgeCleanup
    requestOpenScreenCapModal: () => Promise<unknown>
    isScreenRecorderReady: (params?: GrpcEmptyRequest) => Promise<IsScrecorderReadyResponse>
    cancelScreenRecorder: (token: string) => Promise<unknown>
    activateScreenshot: () => Promise<unknown>
    onStartYaklangEngineError: (callback: (error: string) => void) => BridgeCleanup
  }
  project: {
    setCurrentProject: (params: SetCurrentProjectRequest) => Promise<GrpcEmptyResponse>
    getCurrentProjectEx: (params: GetCurrentProjectExRequest) => Promise<ProjectDescription>
    getSSAWorkbenchDashboard: (params: GetSSAWorkbenchDashboardRequest) => Promise<GetSSAWorkbenchDashboardResponse>
    getDefaultProjectEx: (params: GetDefaultProjectExRequest) => Promise<ProjectDescription>
    getProjects: (params: ProjectParamsProp) => Promise<ProjectsResponse>
    exportProject: (params: ExportProjectParams, token: string) => Promise<unknown>
    cancelExportProject: (token: string) => Promise<unknown>
  }
  codec: {
    run: (params: CodecRunParams) => Promise<CodecRunResult>
    autoDecode: (payload: AutoDecodeRequest) => Promise<AutoDecodeResponse>
    mutateHttpRequest: (payload: MutateHTTPRequestParams) => Promise<MutateHTTPRequestResponse>
  }
  fileSystem: {
    isFileExists: (targetPath: string) => Promise<boolean>
    fetchFileContent: (targetPath: string) => Promise<string>
  }
  ai: {
    checkHahValidConfig: () => Promise<CheckHahValidConfigResult>
  }
}

interface Window {
  yakitBridge: YakitBridge
}
