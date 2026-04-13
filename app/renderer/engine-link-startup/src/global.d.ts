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

interface YakitBridge {
  app: {
    markRendererReady: () => void
    generateStartEngine: () => Promise<unknown>
    setEnterpriseToDomain: (flag: boolean) => Promise<unknown>
    exitApp: (params: Record<string, unknown>) => Promise<unknown>
    relaunch: () => Promise<unknown>
    completeEngineLink: (payload: Record<string, unknown>) => Promise<unknown>
    closeWindow: () => Promise<unknown>
    onCloseWindow: (callback: () => void) => BridgeCleanup
    onFromMainWindow: (callback: (data: any) => void) => BridgeCleanup
    onCredentialUpdate: (callback: (data: any) => void) => BridgeCleanup
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
    fetchSystemName: () => Promise<any>
    fetchCpuArch: () => Promise<any>
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
    initCVEDatabase: () => Promise<any>
    isYaklangEngineInstalled: () => Promise<boolean>
    getBuildInEngineVersion: () => Promise<string>
    restoreEngineAndPlugin: () => Promise<any>
    fetchLatestYaklangVersion: () => Promise<string>
    downloadLatestYak: (version: string) => Promise<any>
    writeEngineKeyToYakitProjects: (version?: string) => Promise<any>
    clearLocalYaklangVersionCache: () => Promise<any>
    installYakEngine: (version: string) => Promise<any>
    cancelDownloadYakEngineVersion: (version: string) => Promise<any>
    getAvailableOSSDomain: () => Promise<string>
    checkAllowSecretLocalYaklangEngine: (params: any) => Promise<any>
    fixupDatabase: (params: any) => Promise<any>
    reclaimDatabaseSpace: (params: any) => Promise<any>
    fetchYakitVersion: () => Promise<string>
    fetchLatestYakitVersion: (payload: any) => Promise<string>
    downloadLatestYakit: (version: string, type: any) => Promise<any>
    cancelDownloadYakitVersion: () => Promise<any>
    getCurrentYak: () => Promise<string>
    fetchCheckYaklangSource: (version: string, config?: any) => Promise<string>
    calcEngineSha265: () => Promise<string[]>
    startSecretLocalYaklangEngine: (params: any) => Promise<any>
    echo: (payload: { text: string }) => Promise<{ result: string }>
    cancelAllTasks: () => Promise<any>
    killYakGrpc: (pid: number) => Promise<any>
    listYakGrpc: () => Promise<any[]>
    fetchYaklangEngineAddr: () => Promise<{ addr: string }>
    outputLogToWelcomeConsole: (message: string) => Promise<any>
    connectYaklangEngine: (credential: any) => Promise<any>
    getRemoteAuthAll: () => Promise<any[]>
    saveRemoteAuth: (params: any) => Promise<any>
    removeRemoteAuth: (name: string) => Promise<any>
    onStartYaklangEngineError: (callback: (message: string) => void) => BridgeCleanup
    onDownloadYakEngineProgress: (callback: (state: any) => void) => BridgeCleanup
    onDownloadYakitProgress: (callback: (state: any) => void) => BridgeCleanup
    onStartUpEngineMessage: (callback: (message: string) => void) => BridgeCleanup
  }
}

interface Window {
  yakitBridge: YakitBridge
}
