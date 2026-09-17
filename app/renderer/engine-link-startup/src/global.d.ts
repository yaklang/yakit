// global.d.ts
import type * as StartupTypes from './pages/StartupPage/types'
import type * as RemoteEngineTypes from './pages/StartupPage/components/RemoteEngine/RemoteEngineType'
import type * as LocalEngineTypes from './pages/StartupPage/components/LocalEngine/LocalEngineType'

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

declare global {
  type BridgeCleanup = () => void

  type System = StartupTypes.System
  type Architecture = StartupTypes.Architecture
  type DownloadingState = StartupTypes.DownloadingState
  type YaklangEngineMode = StartupTypes.YaklangEngineMode
  type YakitStatusType = StartupTypes.YakitStatusType
  type YaklangEngineWatchDogCredential = StartupTypes.YaklangEngineWatchDogCredential
  type TypeCallbackExtra = StartupTypes.TypeCallbackExtra
  type StartLocalEngine = StartupTypes.StartLocalEngine
  type YakitAuthInfo = RemoteEngineTypes.YakitAuthInfo
  type CheckAllowSecretLocal = LocalEngineTypes.CheckAllowSecretLocal
  type FixupDatabase = LocalEngineTypes.FixupDatabase
  type ReclaimDatabaseSpace = LocalEngineTypes.ReclaimDatabaseSpace
  type AllowSecretLocalExecResult = LocalEngineTypes.AllowSecretLocalExecResult
  type FixupDatabaseExecResult = LocalEngineTypes.FixupDatabaseExecResult
  type StartupExecResult = LocalEngineTypes.ExecResult

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
    softLange: string
    yakitMode: string
    softTheme: string
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
}

export {}
