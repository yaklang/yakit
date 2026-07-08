// global.d.ts
declare module '*.scss' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.sass' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

type BridgeCleanup = () => void

type System = import('./pages/StartupPage/types').System
type Architecture = import('./pages/StartupPage/types').Architecture
type DownloadingState = import('./pages/StartupPage/types').DownloadingState
type YaklangEngineMode = import('./pages/StartupPage/types').YaklangEngineMode
type YakitStatusType = import('./pages/StartupPage/types').YakitStatusType
type YaklangEngineWatchDogCredential = import('./pages/StartupPage/types').YaklangEngineWatchDogCredential
type TypeCallbackExtra = import('./pages/StartupPage/types').TypeCallbackExtra
type StartLocalEngine = import('./pages/StartupPage/types').StartLocalEngine
type YakitAuthInfo = import('./pages/StartupPage/components/RemoteEngine/RemoteEngineType').YakitAuthInfo
type CheckAllowSecretLocal = import('./pages/StartupPage/components/LocalEngine/LocalEngineType').CheckAllowSecretLocal
type FixupDatabase = import('./pages/StartupPage/components/LocalEngine/LocalEngineType').FixupDatabase
type ReclaimDatabaseSpace = import('./pages/StartupPage/components/LocalEngine/LocalEngineType').ReclaimDatabaseSpace
type AllowSecretLocalExecResult =
  import('./pages/StartupPage/components/LocalEngine/LocalEngineType').AllowSecretLocalExecResult
type FixupDatabaseExecResult =
  import('./pages/StartupPage/components/LocalEngine/LocalEngineType').FixupDatabaseExecResult
type StartupExecResult = import('./pages/StartupPage/components/LocalEngine/LocalEngineType').ExecResult

interface CredentialUpdatePayload {
  credential: YaklangEngineWatchDogCredential
}

interface FromMainWindowPayload extends TypeCallbackExtra {
  yakitStatus?: YakitStatusType | YaklangEngineMode
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

interface FetchCheckYaklangSourceConfig {
  timeout?: number
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

interface EchoPayload {
  text: string
}

interface EchoResult {
  result: string
}

interface YakitHomeConfig {
  YAKIT_HOME: string
  language: string
  workspaceHistory: string[]
  autoStart: boolean
  currentHome: string
  configDir: string
}

interface YakitBridge {
  app: {
    markRendererReady: () => void
    generateStartEngine: () => Promise<unknown>
    setEnterpriseToDomain: (flag: boolean) => Promise<unknown>
    exitApp: (params: Record<string, unknown>) => Promise<unknown>
    relaunch: () => Promise<unknown>
    completeEngineLink: (payload: CredentialUpdatePayload) => Promise<unknown>
    closeWindow: () => Promise<unknown>
    onCloseWindow: (callback: () => void) => BridgeCleanup
    onFromMainWindow: (callback: (data: FromMainWindowPayload) => void) => BridgeCleanup
    onCredentialUpdate: (callback: (data: CredentialUpdatePayload) => void) => BridgeCleanup
    getYakitHomeConfig: () => Promise<YakitHomeConfig>
    setYakitHomeConfig: (key: string, value: any) => Promise<{ success: boolean }>
    relaunchApp: () => Promise<unknown>
    getDirSize: (dirPath: string) => Promise<number>
    selectDirectory: () => Promise<string>
  }
  theme: {
    setTheme: (theme: 'light' | 'dark') => Promise<unknown>
    onUpdated: (callback: (theme: 'light' | 'dark') => void) => BridgeCleanup
  }
  shell: {
    openUrl: (url: string) => Promise<unknown>
    openSpecifiedFile: (targetPath: string) => Promise<unknown>
    openRemoteLink: () => Promise<unknown>
    openYakitPath: () => Promise<unknown>
    openYaklangPath: () => Promise<unknown>
    getRemoteFilePath: () => Promise<string>
  }
  clipboard: {
    setText: (text: string) => Promise<unknown>
    getText: () => Promise<string>
  }
  cache: {
    setLocalCache: (key: string, value: any) => Promise<unknown>
    getLocalCache: (key: string) => Promise<any>
    getRemoteKey: (key: string) => Promise<any>
    setRemoteKey: (key: string, value: string) => Promise<unknown>
    setRemoteKeyWithTTL: (key: string, value: string, ttl: number) => Promise<unknown>
  }
  system: {
    fetchSystemName: () => Promise<System>
    fetchCpuArch: () => Promise<Architecture>
    isDev: () => Promise<boolean>
  }
  logs: {
    openEngineLog: () => Promise<unknown>
    openRenderLog: () => Promise<unknown>
    openPrintLog: () => Promise<unknown>
    debugPrintLog: (message: string) => Promise<unknown>
    onLiveEngineStdio: (callback: (stdout: string) => void) => BridgeCleanup
    onLiveEngineLog: (callback: (stdout: string) => void) => BridgeCleanup
  }
  perf: {
    startComputePercent: () => Promise<unknown>
    fetchComputePercent: () => Promise<number[]>
    clearComputePercent: () => Promise<unknown>
  }
  engine: {
    initCVEDatabase: () => Promise<unknown>
    isYaklangEngineInstalled: () => Promise<boolean>
    getBuildInEngineVersion: () => Promise<string>
    restoreEngineAndPlugin: () => Promise<unknown>
    fetchLatestYaklangVersion: () => Promise<string>
    downloadLatestYak: (version: string) => Promise<unknown>
    writeEngineKeyToYakitProjects: (version?: string) => Promise<unknown>
    clearLocalYaklangVersionCache: () => Promise<unknown>
    installYakEngine: (version: string) => Promise<unknown>
    cancelDownloadYakEngineVersion: (version: string) => Promise<unknown>
    getAvailableOSSDomain: () => Promise<string>
    checkAllowSecretLocalYaklangEngine: (params: CheckAllowSecretLocal) => Promise<AllowSecretLocalExecResult>
    fixupDatabase: (params: FixupDatabase) => Promise<FixupDatabaseExecResult>
    reclaimDatabaseSpace: (params: ReclaimDatabaseSpace) => Promise<StartupExecResult>
    fetchYakitVersion: () => Promise<string>
    fetchLatestYakitVersion: (payload: FetchLatestYakitVersionPayload) => Promise<string>
    fetchYaklangVersionList: () => Promise<string>
    verifyYakEngineVersion: (version: string) => Promise<boolean>
    downloadLatestYakit: (version: string, type: DownloadYakitOptions) => Promise<unknown>
    cancelDownloadYakitVersion: () => Promise<unknown>
    getCurrentYak: () => Promise<string>
    fetchCheckYaklangSource: (version: string, config?: FetchCheckYaklangSourceConfig) => Promise<string>
    calcEngineSha265: () => Promise<string[]>
    startSecretLocalYaklangEngine: (params: StartLocalEngine) => Promise<StartupExecResult>
    echo: (payload: EchoPayload) => Promise<EchoResult>
    cancelAllTasks: () => Promise<any>
    killYakGrpc: (pid: number) => Promise<any>
    listYakGrpc: () => Promise<YakProcessInfo[]>
    fetchYaklangEngineAddr: () => Promise<YaklangEngineAddr>
    outputLogToWelcomeConsole: (message: string) => Promise<unknanyown>
    connectYaklangEngine: (credential: YaklangEngineWatchDogCredential) => Promise<any>
    getRemoteAuthAll: () => Promise<YakitAuthInfo[]>
    saveRemoteAuth: (params: YakitAuthInfo) => Promise<unknown>
    removeRemoteAuth: (name: string) => Promise<unknown>
    onStartYaklangEngineError: (callback: (message: string) => void) => BridgeCleanup
    onDownloadYakEngineProgress: (callback: (state: DownloadingState) => void) => BridgeCleanup
    onDownloadYakitProgress: (callback: (state: DownloadingState) => void) => BridgeCleanup
    onStartUpEngineMessage: (callback: (message: string) => void) => BridgeCleanup
  }
}

interface Window {
  yakitBridge: YakitBridge
}
