// global.d.ts
import type * as StartupTypes from './pages/StartupPage/types'
import type * as LocalEngineTypes from './pages/StartupPage/components/LocalEngine/LocalEngineType'

declare global {
  type System = StartupTypes.System
  type Architecture = StartupTypes.Architecture
  type YakitLinkStatusType = StartupTypes.YakitLinkStatusType
  type TypeCallbackExtra = StartupTypes.TypeCallbackExtra
  type StartLocalEngine = StartupTypes.StartLocalEngine
  type CancelTasksResult = StartupTypes.CancelTasksResult
  type CheckAllowSecretLocal = LocalEngineTypes.CheckAllowSecretLocal
  type FixupDatabase = LocalEngineTypes.FixupDatabase
  type ReclaimDatabaseSpace = LocalEngineTypes.ReclaimDatabaseSpace
  type AllowSecretLocalExecResult = LocalEngineTypes.AllowSecretLocalExecResult
  type FixupDatabaseExecResult = LocalEngineTypes.FixupDatabaseExecResult
  type StartupExecResult = LocalEngineTypes.ExecResult

  interface FromMainWindowPayload extends TypeCallbackExtra {
    yakitStatus?: YakitLinkStatusType | YaklangEngineMode
  }

  interface EngineLinkAppSyncMessage {
    type: 'theme' | 'i18n'
    payload: string
  }

  interface EngineLinkBridge {
    app: {
      getPathForFile: (file: File) => string
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
      sync: (message: EngineLinkAppSyncMessage) => Promise<unknown>
      onSync: (callback: (message: EngineLinkAppSyncMessage) => void) => BridgeCleanup
    }
    theme: {
      setTheme: (theme: 'light' | 'dark' | 'system') => Promise<unknown>
    }
    release: {
      setEditionRaw: (edition: string) => Promise<unknown>
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
      fetchYakEngineBuildType: (version?: string) => Promise<'full' | 'slim'>
      fetchBundledEngineBuildType: () => Promise<'full' | 'slim'>
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
      cancelAllTasks: () => Promise<CancelTasksResult>
      killYakGrpc: (pid: number) => Promise<any>
      listYakGrpc: () => Promise<YakProcessInfo[]>
      currentLocalEngine: () => Promise<LocalEngineInstance | null>
      stopLocalEngine: (id: string) => Promise<EngineStopResult>
      stopAllLocalEngines: () => Promise<EngineStopResult>
      disconnectLocalEngine: () => Promise<{ ok: boolean }>
      fetchYaklangEngineAddr: () => Promise<YaklangEngineAddr>
      outputLogToWelcomeConsole: (message: string) => Promise<unknown>
      connectYaklangEngine: (credential: YaklangEngineWatchDogCredential) => Promise<any>
      getRemoteAuthAll: () => Promise<YakitAuthInfo[]>
      saveRemoteAuth: (params: YakitAuthInfo) => Promise<unknown>
      removeRemoteAuth: (name: string) => Promise<unknown>
      onStartYaklangEngineError: (callback: (message: string) => void) => BridgeCleanup
      onDownloadYakEngineProgress: (callback: (state: DownloadingState) => void) => BridgeCleanup
      onDownloadYakitProgress: (callback: (state: DownloadingState) => void) => BridgeCleanup
      /** startUp-engine-msg：payload 为 link 命名空间 i18n key（如 LocalEngine.xxx） */
      onStartUpEngineMessage: (callback: (i18nKey: string) => void) => BridgeCleanup
    }
    dialog: {
      openFileSystemDialog: (options: OpenFileDialogOptions) => Promise<OpenFileDialogReturnValue>
    }
    fileSystem: {
      fetchFileContent: (targetPath: string) => Promise<string>
      fetchFileInfoByPath: (targetPath: string) => Promise<{ size: number }>
    }
  }
}

export {}
