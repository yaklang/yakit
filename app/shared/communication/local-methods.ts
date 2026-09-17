import type { OpenDialogOptions, OpenDialogReturnValue, SaveDialogOptions, SaveDialogReturnValue } from 'electron'
import type { GrpcInput, GrpcOutput } from './protocol'

// Handwritten business contracts. These are deliberately separate from protobuf messages.
export interface LocalMethods {
  'yakit-connect-status': { request: {}; response: { addr: string; isTLS: boolean } }
  'fetch-yaklang-engine-addr': { request: {}; response: { addr: string; isTLS: boolean } }
  'get-available-oss-domain': { request: {}; response: string }
  'is-yaklang-engine-installed': { request: {}; response: boolean }
  'fetch-latest-yaklang-version': { request: {}; response: string }
  'fetch-yakit-version': { request: {}; response: string }
  'fetch-latest-yakit-version': {
    request: { config?: import('axios').AxiosRequestConfig; releaseEditionName: string }
    response: string
  }
  'fetch-check-yaklang-source': {
    request: { version: string; requestConfig?: import('axios').AxiosRequestConfig }
    response: string
  }
  'fetch-yaklang-version-list': { request: {}; response: string }
  'kill-old-engine-process': { request: unknown; response: void }
  'get-avaiable-port': { request: {}; response: number }
  'determine-adapted-version-engine': { request: { port: number | string; version: string }; response: boolean }
  'fetch-local-engine-path': { request: {}; response: string | undefined }
  'set-release-edition-raw': { request: string; response: string }
  'ps-yak-grpc': { request: {}; response: EngineProcess[] }
  'kill-yak-grpc': { request: unknown; response: string }
  'is-yak-engine-installed': { request: {}; response: boolean }
  'is-windows': { request: {}; response: boolean }
  'check-local-database': { request: {}; response: string }
  'fix-local-database': { request: {}; response: boolean }

  'fetch-yak-version': { request: {}; response: string }
  'engine-status': { request: {}; response: boolean }
  'get-random-local-engine-port': { request: {}; response: number }
  'is-port-available': { request: number; response: void }
  'start-local-yaklang-engine': {
    request: { port: number | string; version?: string; isEnpriTraceAgent?: boolean; isIRify?: boolean }
    response: void
  }
  'start-remote-yaklang-engine': {
    request: { host: string; port: number | string; caPem?: string; password?: string }
    response: void
  }
  'connect-yaklang-engine': {
    request: { Host?: string; Port: number | string; PemBytes?: Uint8Array | string; Password?: string }
    response: GrpcOutput<'Echo'>
  }
  'output-log-to-welcome-console': { request: string; response: void }
  'call-command-generate-node': {
    request: { ipOrdomain: string; port: number | string; nodename: string }
    response: number
  }
  'kill-run-node': { request: { pid: unknown }; response: string }
  'check-allow-secret-local-yaklang-engine': {
    request: { port: number | string; softwareVersion: string }
    response: StartupResult
  }
  'fixup-database': { request: { softwareVersion: string }; response: StartupResult }
  reclaimDatabaseSpace: { request: { dbPath: string[] }; response: StartupResult }
  'start-secret-local-yaklang-engine': {
    request: {
      port: number | string
      softwareVersion: string
      version?: string
      password: string
      isEnpriTraceAgent?: boolean
    }
    response: StartupResult
  }
  'cancel-all-tasks': { request: {}; response: { ok: boolean; canceled: number } }
  'save-yakit-remote-auth': { request: RemoteEngineAuth; response: void }
  'remove-yakit-remote-auth': { request: string; response: void }
  'get-yakit-remote-auth-all': { request: {}; response: (Omit<RemoteEngineAuth, 'port'> & { port: number })[] }
  'get-yakit-remote-auth-dir': { request: {}; response: string }
  'clear-local-yaklang-version-cache': { request: {}; response: void }
  'get-current-yak': { request: {}; response: string }
  'diagnosing-yak-version': { request: {}; response: string }
  'write-engine-key-to-yakit-projects': { request: string | undefined; response: void }
  'fetch-yak-engine-build-type': { request: string | undefined; response: 'full' | 'slim' }
  'yak-engine-version-exists-and-correctness': { request: string; response: boolean }
  'download-latest-yak': { request: string; response: void; progress: DownloadProgress | 100 }
  'install-yak-engine': { request: string; response: void }
  'download-latest-yakit': {
    request: { version: string; edition: { isEnterprise: boolean; isIRify: boolean; isMemfit: boolean } }
    response: void
    progress: DownloadProgress | 100
  }
  'download-latest-intranet-yakit': { request: string; response: true | void; progress: DownloadProgress | 100 }
  'download-enpriTrace-latest-yakit': { request: string; response: true | void; progress: DownloadProgress | 100 }
  'update-enpritrace-info': { request: {}; response: { version: string } }
  'get-windows-install-dir': { request: {}; response: string }
  'fetch-code-path': { request: {}; response: string }
  'open-specified-file': { request: string; response: void }
  'generate-install-script': { request: {}; response: string }
  'generate-start-engine': { request: {}; response: string }
  'generate-chrome-plugin': { request: {}; response: string }
  InitCVEDatabase: { request: {}; response: void }
  GetBuildInEngineVersion: { request: {}; response: string }
  RestoreEngineAndPlugin: { request: {}; response: void }
  DownloadFingerprint: { request: string; response: string }
  'aux-window:create': { request: AuxWindowOptions; response: AuxWindowResult }
  'aux-window:close': { request: { windowId: string }; response: boolean }
  'aux-window:focus': { request: { windowId: string }; response: boolean }
  'aux-window:push': { request: { windowId: string; payload: unknown }; response: boolean }
  'aux-window:app-sync': { request: { type: 'theme' | 'i18n'; payload: string }; response: boolean }
  'aux-window:ready': { request: { windowId: string }; response: void }
  'forward-xterm-theme': { request: unknown; response: void }
  'forward-xterm-data': { request: unknown; response: void }
  'open-console-new-window': { request: {}; response: AuxWindowResult }
  'close-console-new-window': { request: {}; response: void }
  'onTop-console-new-window': { request: {}; response: void }
  'open-ai-chat-log-window': { request: {}; response: AuxWindowResult | undefined }
  'close-ai-chat-window': { request: {}; response: void }
  'forward-ai-chat-log-data': {
    request: { sessionId?: string; level?: string; timestamp?: string; message?: string; isStream?: boolean }
    response: void
  }
  'clear-ai-chat-log-data': { request: {}; response: void }
  'fetch-concurrent-stream-contents': {
    request: { session?: string; token?: string; chatType?: string }
    response: unknown
  }
  'reply-concurrent-stream-contents': { request: { requestId: string; data: unknown }; response: void }
  'open-ai-concurrent-stream-window': {
    request: {
      session: string
      token: string
      chatType: string
      taskName?: string
      rootType?: string
      renderNum?: number
    }
    response: AuxWindowResult
  }
  'minWin-send-to-childWin': { request: unknown; response: void }
  'close-childWin': { request: {}; response: void }
  'minimize-childWin': { request: {}; response: void }
  'maximize-childWin': { request: {}; response: void }
  'restore-childWin': { request: {}; response: void }
  'onTop-childWin': { request: {}; response: void }
  'request-parent-data': { request: {}; response: void }
  'UIOperate-childWin': { request: 'close' | 'min' | 'full' | 'max'; response: void }
  'open-new-child-window': { request: unknown; response: void }
  'split-upload': {
    request: UploadParams
    response: { TaskStatus: boolean; resArr: UploadReply[] }
    progress: UploadProgress
  }
  'oss-split-upload': {
    request: UploadParams
    response: { TaskStatus: boolean; resArr: UploadReply[] }
    progress: UploadProgress
  }
  'download-url-to-path': {
    request: { url: string; path?: string; fileName?: string; isEncodeURI?: boolean }
    response: string
    progress: { state: DownloadProgress | 100; openPath: string }
  }
  'get-template-file': { request: {}; response: string }
  'get-http-file-link-info': { request: string; response: { fileName: string; size: number; type: string } }
  'upload-group-data': { request: FileUpload; response: UploadReply }
  'http-upload-file': { request: FileUpload; response: UploadReply }
  'http-upload-img-path': { request: FileUpload; response: UploadReply }
  'http-upload-img-base64': { request: FileUpload; response: UploadReply }
  'user-sign-in': { request: { url: string; type: 'github' | 'wechat' | 'qq' }; response: void }
  'company-sign-in': {
    request: {
      from_platform: string
      name: string
      head_img: string
      role: string | null
      user_id: number | string
      token: string
    }
    response: { next: boolean }
  }
  'company-refresh-in': { request: {}; response: void }
  'get-login-user-info': { request: {}; response: AccountUser }
  'user-sign-out': { request: { isEnpriTrace?: boolean }; response: void }
  'sync-update-user': { request: AccountUser; response: AccountUser }
  'edit-baseUrl': { request: { baseUrl: string }; response: void }
  'reset-password': { request: {}; response: void }
  'get-ws-url': { request: {}; response: string }
  'socket-start': { request: {}; response: void }
  'socket-send': { request: unknown; response: void }
  'socket-close': { request: {}; response: void }
  'trigger-reload': { request: {}; response: void }
  'trigger-reload-cache': { request: {}; response: void }
  'set-main-window-zoom-factor': { request: number; response: void }
  'engine-win-render-ok': { request: {}; response: void }
  'main-win-uilayout-render-ok': { request: {}; response: void }
  'engineLinkWin-done': { request: { credential: EngineCredential }; response: void }
  'yakitMainWin-done': { request: { yakitStatus: string; dbPath?: string[] }; response: void }
  updateCredential: { request: { credential: EngineCredential }; response: void }
  relaunch: { request: {}; response: void }
  'app-exit': { request: { showCloseMessageBox?: boolean; isIRify?: boolean; isMemfit?: boolean }; response: void }
  'activate-screenshot': { request: {}; response: void }
  'fetch-file-content': { request: string; response: string | WorkbookData[] }
  'fetch-certificate-content': { request: string; response: Uint8Array }
  'add-log': { request: LogEntry; response: void }
  'add-simple-log': { request: LogEntry; response: void }
  'add-data-compare': { request: { type: number | string; info: unknown }; response: void }
  'reset-data-compare': { request: {}; response: void }
  'create-compare-token': { request: {}; response: { token: string; info?: CompareData } }
  'forward-data-compare': { request: { token: string; info?: CompareData }; response: void }
  'forward-switch-compare-page': { request: unknown; response: void }
  'forward-main-container-add-compare': { request: unknown; response: void }
  IsChromeLaunched: { request: {}; response: boolean }
  getDefaultUserDataDir: { request: {}; response: string }
  LaunchChromeWithParams: { request: ChromeParams; response: string }
  GetChromePath: { request: {}; response: string | null }
  StopAllChrome: { request: {}; response: void }
  DownloadHtmlReport: {
    request: { outputDir: string; JsonRaw: unknown; reportName: string }
    response: { ok: boolean; outputDir: string }
  }
  PrintReportPdfFromTemplate: {
    request: { outputPath: string; JsonRaw: unknown; reportName?: string; hideCatalog?: boolean }
    response: { ok: boolean }
  }
  PrintMarkdownPdfFromTemplate: {
    request: { outputPath: string; code: string; theme?: string }
    response: { ok: boolean }
  }
  GetMarkdownPdfPrintPayload: { request: string; response: { code: string; theme: string } | null }
  MarkdownPdfPrintReady: { request: string; response: { ok: boolean } }
  'get-yakit-home-config': {
    request: {}
    response: {
      YAKIT_HOME: string
      workspaceHistory: string[]
      autoStart: boolean
      softTheme: string
      softLange: string
      yakitMode: string
      currentHome: string
      configDir: string
    }
  }
  'set-yakit-home-config': { request: { key: string; value: unknown }; response: { success: boolean } }
  'relaunch-app': { request: {}; response: void }
  'get-dir-size': { request: string; response: number }
  'start-compute-percent': { request: {}; response: void }
  'fetch-compute-percent': { request: {}; response: number[] }
  'clear-compute-percent': { request: {}; response: void }
  'open-yaklang-path': { request: {}; response: string }
  'open-yakit-path': { request: {}; response: string }
  'fetch-remote-file-path': { request: {}; response: string }
  'open-remote-link': { request: {}; response: string }
  'check-yakit-install-file': { request: string; response: boolean }
  'fetch-computer-name': { request: {}; response: string }
  'install-intranet-yakit': { request: string; response: string }
  ScreenshotReady: { request: {}; response: void }
  ScreenshotReset: { request: { resetId: string }; response: void }
  ScreenshotCancel: { request: {}; response: void }
  ScreenshotOK: { request: { buffer: Uint8Array; data: ScreenshotData }; response: void }
  ScreenshotSave: { request: { buffer: Uint8Array; data: ScreenshotData }; response: void }
  CalcEngineSha265: { request: {}; response: string[] }
  'save-ai-image': {
    request: { buffer: Uint8Array; filename: string; sessionID?: string; chatDataStoreKey: string }
    response: string
    progress: number
  }
  'delete-ai-image': {
    request: { sessionID?: string[]; chatDataStoreKey: string }
    response: boolean
    progress: number
  }
  GenerateTempFilePath: { request: string; response: string }
  GenerateProjectsFilePath: { request: string; response: string }
  GetProjectsFilePath: { request: {}; response: string }
  'start-dynamic-control': {
    request: { note: string; secret: string; server: string; gen_tls_crt: boolean | string }
    response: { alive: boolean }
  }
  'kill-dynamic-control': { request: {}; response: void }
  'alive-dynamic-control-status': { request: {}; response: boolean }
  'axios-api': { request: LocalHttpRequest; response: unknown }
  'is-enpritrace-to-domain': { request: boolean; response: boolean }
  'sync-edit-baseUrl': { request: { baseUrl: string }; response: { baseUrl: string } | { error: string } }
  'fetch-netWork-status': { request: {}; response: boolean }
  'fetch-netWork-status-by-request-interface': { request: {}; response: { code: number; message: string } }
  ForwardMainEvent: { request: { event: (typeof mainEventNames)[number]; data?: unknown }; response: void }
  'fetch-local-cache': { request: string; response: unknown }
  'set-local-cache': { request: { key: string; value: unknown }; response: void }
  'fetch-extra-cache': { request: string; response: unknown }
  'set-extra-cache': { request: { key: string; value: unknown }; response: void }
  'manual-write-file': { request: 'cache' | 'extraCache'; response: void }
  'open-url': { request: string; response: void }
  'shell-open-external': { request: string; response: void }
  'shell-open-abs-file': { request: string; response: string }
  'fetch-path-file-name': { request: string; response: string }
  'is-file-exists': { request: string; response: boolean }
  'open-file-system-dialog': { request: OpenDialogOptions; response: OpenDialogReturnValue }
  'save-file-system-dialog': { request: SaveDialogOptions; response: SaveDialogReturnValue }
  'set-clipboard-text': { request: string; response: void }
  'get-clipboard-text': { request: {}; response: string }
  'check-clipboard-image': { request: {}; response: boolean }
  'get-clipboard-image': { request: {}; response: { size: { width: number; height: number }; blob: string } }
  UIOperate: { request: 'close' | 'min' | 'full' | 'max'; response: void }
  'is-full-screen': { request: {}; response: boolean }
  'is-maximize-screen': { request: {}; response: boolean }
  'trigger-devtool': { request: {}; response: void }
  'render-crash-flag': { request: {}; response: void }
  'open-engine-log': { request: {}; response: void }
  'open-render-log': { request: {}; response: void }
  'open-print-log': { request: {}; response: void }
  'render-error-log': { request: string; response: void }
  'debug-print-log': { request: string; response: void }
  'read-file-content': { request: string; response: string }
  pathJoin: { request: { dir: string; file: string }; response: string }
  pathParent: { request: { filePath: string }; response: string }
  pathFileName: { request: { filePath: string; isExtra?: boolean }; response: string }
  relativePathByBase: { request: { basePath: string; filePath: string }; response: string }
  'show-save-dialog': {
    request: string
    response: { canceled: boolean; filePath?: string; name: string; bookmark?: string }
  }
  'delelte-code-file': { request: string; response: string }
  'assert-file-absent': { request: string; response: void }
  'rename-file': { request: { old: string; new: string }; response: string }
  'write-file': { request: { route: string; data: string | Uint8Array }; response: string }
  SaveCodecOutputToTxt: {
    request: { outputDir: string; fileName: string; data: string | Uint8Array }
    response: { ok: boolean; outputDir: string }
  }
  importCodecByPath: { request: string; response: string }
  'fetch-file-info-by-path': {
    request: string
    response: { size: number; mtimeMs: number; ctimeMs: number; isDirectory: boolean }
  }
  'export-risk-html': { request: { htmlContent: string; fileName: string; data: unknown }; response: string }
  'fetch-file-name-by-path': { request: string; response: { name: string; suffix: string } }
  'fetch-file-is-dir-by-path': { request: string; response: boolean }
  'fetch-path-contains-relation': { request: { pathA: string; pathB: string }; response: number }
  'get-relevant-paths': { request: { basePath: string; targetPath: string[] }; response: string[] }
  UploadLocalFileToEngine: { request: { FilePath: string }; response: GrpcOutput<'UploadToTemporaryFile'> }
  ExportAILogs: { request: GrpcInput<'ExportAILogs'>; response: GrpcOutput<'ExportAILogs'> }
  DownloadOnlinePluginById: {
    request: GrpcInput<'DownloadOnlinePluginById'>
    response: GrpcOutput<'DownloadOnlinePluginById'>
  }
  DownloadOnlinePluginBatch: {
    request: GrpcInput<'DownloadOnlinePluginBatch'>
    response: GrpcOutput<'DownloadOnlinePluginBatch'>
  }
  DownloadOnlinePluginByPluginName: {
    request: GrpcInput<'DownloadOnlinePluginByPluginName'>
    response: GrpcOutput<'DownloadOnlinePluginByPluginName'>
  }
  QueryHTTPFlowsWithTiming: {
    request: GrpcInput<'QueryHTTPFlows'>
    response: GrpcOutput<'QueryHTTPFlows'> & {
      YakitMainProcessTiming: {
        MainReceivedAtUnixMs: number
        GRPCStartedAtUnixMs: number
        GRPCFinishedAtUnixMs: number
        GRPCElapsedUs: number
      }
    }
  }
  SaveHTTPFlowBody: { request: GrpcInput<'GetHTTPFlowBodyById'>; response: boolean }
  GetMITMSession: {
    request: { api: 'MITM' | 'MITMV2' }
    response: {
      haveStream: boolean
      host: string
      port: number
      downstreamProxy: string
      downstreamProxyRuleId?: string
    }
  }
  ReplaceMITMRequestFile: {
    request: {
      token: string
      instanceId: string
      TaskID: string
      ReplaceBody?: boolean
      PartIndex?: number
      FilePath: string
    }
    response: { Filename: string; Size: number }
  }
  StartIMControl: { request: GrpcInput<'StartIMControl'>; response: GrpcOutput<'StartIMControl'> }
  'fetch-system-name': { request: {}; response: 'Linux' | 'Darwin' | 'Windows_NT' }
  'fetch-cpu-arch': {
    request: {}
    response: 'arm' | 'arm64' | 'ia32' | 'mips' | 'mipsel' | 'ppc' | 'ppc64' | 'riscv64' | 's390' | 's390x' | 'x64'
  }
  'fetch-system-and-arch': { request: {}; response: string }
  'is-dev': { request: {}; response: boolean }
}

/** Reviewed renderer-to-main-window notifications; arbitrary event names are rejected. */
export const mainEventNames = [
  'fetch-new-main-menu',
  'refresh-public-menu-callback',
  'fetch-send-to-tab',
  'fetch-send-to-yak-running',
  'fetch-close-tab',
  'open-route-page-callback',
  'fetch-open-customize-menu',
  'fetch-switch-conn-refresh',
  'fetch-judge-license',
  'fetch-simple-open-report',
  'open-screenCap-modal',
  'fetch-positioning-http-history',
  'fetch-add-group',
  'dnslog-page-to-menu-callback',
  'dnslog-menu-to-page-callback',
  'dnslog-page-change-menu-callback',
  'dnslog-info-details-callback',
  'fetch-extracted-to-table',
  'login-out-dynamic-control-callback',
  'lougin-out-dynamic-control-page-callback',
  'ipc-sign-out-callback',
] as const

export interface LocalHttpRequest {
  url?: string
  method?: LocalHttpMethod | Uppercase<LocalHttpMethod>
  params?: unknown
  data?: unknown
  headers?: Record<string, string | number | boolean>
  timeout?: number
  diyHome?: string
  responseType?: 'arraybuffer' | 'json' | 'text'
  withCredentials?: boolean
  auth?: { username: string; password: string }
}

type LocalHttpMethod = 'get' | 'delete' | 'head' | 'options' | 'post' | 'put' | 'patch' | 'purge' | 'link' | 'unlink'

export interface ScreenshotData {
  bounds: { x: number; y: number; width: number; height: number }
  display: { id: number; x: number; y: number; width: number; height: number; scaleFactor: number }
}

export interface LogEntry {
  name: string
  title: string
  content?: unknown
  time?: string
  status?: 'start' | 'end'
  withNewLine?: boolean
}
export type WorkbookData = { name: string; data: (string | number | boolean)[][] }
export type CompareData = { type: number; left?: unknown; right?: unknown; ''?: unknown }
export interface ChromeParams {
  port: number | string
  host: string
  chromePath?: string
  userDataDir?: string
  username?: string
  password?: string
  disableCACertPage: boolean
  chromeFlags: { disabled?: boolean; parameterName: string; variableValues?: string }[]
}

export interface EngineCredential {
  Mode?: string
  Host: string
  Port: number
  IsTLS?: boolean
  PemBytes?: Uint8Array
  Password?: string
}

export interface AccountUser {
  isLogin: boolean
  platform: string | null
  githubName: string | null
  githubHeadImg: string | null
  wechatName: string | null
  wechatHeadImg: string | null
  companyName: string | null
  companyHeadImg: string | null
  qqName: string | null
  qqHeadImg: string | null
  role: string | null
  token: string | null
  user_id: number | string | null
}

export interface FileUpload {
  path?: string
  base64?: string
  imgInfo?: { filename?: string; contentType?: string; knownLength?: number }
  name?: string
  type?: string
  filedHash?: string
}
export interface UploadParams extends FileUpload {
  url: string
  type: string
  filedHash?: string
}
export interface UploadReply {
  code: number
  data?: unknown
  message?: unknown
}
export interface UploadProgress {
  res: UploadReply
  progress: number
}
export interface DownloadProgress {
  time: { elapsed: number; remaining: number }
  speed: number
  percent: number
  size: { total: number; transferred: number }
}

export interface AuxWindowOptions {
  route?: string
  payload?: Record<string, unknown>
  singletonKey?: string
  title?: string
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  titleBarStyle?: 'default' | 'hidden'
  openDevTools?: boolean
}
export interface AuxWindowResult {
  windowId: string
  focused: boolean
  created: boolean
}

export interface RemoteEngineAuth {
  name: string
  host: string
  port: string | number
  tls: boolean
  password: string
  caPem: string
}

export interface StartupResult {
  ok: boolean
  status: string
  message: string
  json?: Record<string, unknown> | null
  msg1?: string
}

export interface EngineProcess {
  pid: number
  name?: string
  cmd: string
  port: number
  origin: unknown
  bin?: string
  ppid?: number
  uid?: number
}
