declare module 'fs' {
  interface FileItem extends File {
    path: string
    size: number
    type: string
    lastModifiedDate: number
  }
}

type BridgeCleanup = () => void

interface YakitBridge {
  app: {
    generateStartEngine: () => Promise<unknown>
    generateChromePlugin: () => Promise<string>
    generateRunNode: (payload: any) => Promise<any>
    setEnterpriseToDomain: (flag: boolean) => Promise<unknown>
    syncEditBaseUrl: (baseUrl: string) => unknown
    syncUpdateUser: (user: any) => unknown
    killRunNode: (pid: number) => Promise<unknown>
    userSignOut: () => void
    triggerDevtool: () => Promise<unknown>
    reload: () => Promise<unknown>
    reloadWithCacheBypass: () => Promise<unknown>
    exitApp: (params: Record<string, unknown>) => Promise<unknown>
    relaunch: () => Promise<unknown>
    completeMainWindow: (payload: any) => Promise<unknown>
    updateCredential: (payload: { credential: any }) => Promise<unknown>
    onCloseWindow: (callback: (payload?: any) => void) => BridgeCleanup
    onMinimizeWindow: (callback: (payload?: any) => void) => BridgeCleanup
  }
  theme: {
    setTheme: (theme: 'light' | 'dark') => Promise<unknown>
    onUpdated: (callback: (theme: 'light' | 'dark') => void) => BridgeCleanup
  }
  system: {
    fetchSystemName: () => Promise<any>
    fetchCpuArch: () => Promise<any>
    isDev: () => Promise<boolean>
    fetchSystemAndArch: () => Promise<string>
  }
  network: {
    axiosApi: (params: any) => Promise<any>
    logoutDynamicControl: (params: any) => Promise<any>
    killDynamicControl: () => Promise<any>
    exitDynamicControlPage: () => Promise<any>
    uploadRiskToOnline: (payload: any) => Promise<any>
    httpFlowsToOnline: (payload: any) => Promise<any>
  }
  shell: {
    openExternal: (url: string) => Promise<unknown>
    openAbsoluteFile: (targetPath: string) => Promise<unknown>
    openSpecifiedFile: (targetPath: string) => Promise<unknown>
    openYakitPath: () => Promise<unknown>
    checkYakitInstallFile: (filename: string) => Promise<boolean>
    installIntranetYakit: (filePath: string) => Promise<any>
    openRemoteLink: () => Promise<unknown>
    getRemoteFilePath: () => Promise<string>
  }
  reverse: {
    getStatus: () => Promise<boolean>
    cancel: () => Promise<unknown>
    config: (payload: any) => Promise<any>
    getServer: (params?: any) => Promise<any>
    setYakBridgeLogServer: (payload: any) => Promise<any>
    availableLocalAddr: (params?: any) => Promise<any>
    onError: (callback: (message: string) => void) => BridgeCleanup
  }
  risk: {
    fetchLatestInfo: (payload: any) => Promise<any>
    queryRisks: (payload: any) => Promise<any>
    setInfoRead: (payload: any) => Promise<any>
    query: (payload: any) => Promise<any>
    delete: (payload: any) => Promise<any>
  }
  asset: {
    deleteDomains: (payload: any) => Promise<any>
    deletePorts: (payload: any) => Promise<any>
  }
  httpFlow: {
    queryHistory: (payload: any) => Promise<any>
  }
  host: {
    getSystemProxy: (params?: any) => Promise<any>
    setSystemProxy: (payload: any) => Promise<any>
    getChromePath: () => Promise<string | null>
    getMachineID: (params?: any) => Promise<any>
    resetAndInvalidUserData: (payload: any) => Promise<any>
    isPrivilegedForNetRaw: (params?: any) => Promise<any>
    promotePermissionForUserPcap: (params?: any) => Promise<any>
    verifySystemCertificate: (params?: any) => Promise<any>
    installMITMCertificate: (params?: any) => Promise<any>
    generateInstallScript: () => Promise<string>
  }
  window: {
    openChildWindow: (payload: any) => void
    focusChildWindow: () => void
    sendToChildWindow: (payload: any) => void
    openConsoleWindow: () => Promise<unknown>
    focusConsoleWindow: () => void
    closeConsoleWindow: () => void
    forwardConsoleData: (payload: string) => void
    forwardConsoleTheme: (payload: any) => void
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
  dialog: {
    showSaveDialog: (name: string) => Promise<{ canceled: boolean; filePath?: string }>
    writeFile: (payload: { route: string; data: string }) => Promise<unknown>
    openFileSystemDialog: (options: any) => Promise<any>
    saveFileSystemDialog: (options: any) => Promise<any>
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
    compileAndFormat: (payload: any) => Promise<any>
    staticAnalyze: (payload: any) => Promise<any>
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
    getOnlineProfile: (params: any) => Promise<any>
    setOnlineProfile: (params: any) => Promise<any>
  }
  auth: {
    startUserSignIn: (payload: { url: string; type: string }) => void
    companySignIn: (payload: any) => Promise<any>
    editBaseUrl: (baseUrl: string) => Promise<any>
    requestPasswordReset: () => Promise<any>
    onSignInData: (callback: (payload: any) => void) => BridgeCleanup
    onBaseUrlStatus: (callback: (payload: any) => void) => BridgeCleanup
  }
  release: {
    setEditionRaw: (edition: string) => Promise<unknown>
  }
  engine: {
    fetchLatestYakitVersion: (payload: any) => Promise<string>
    fetchEnterpriseUpdateInfo: () => Promise<any>
    getAvailableOSSDomain: () => Promise<string>
    fetchLatestYaklangVersion: () => Promise<string>
    fetchYaklangVersionList: () => Promise<string>
    fetchYakitVersion: () => Promise<string>
    getCurrentYak: () => Promise<string>
    isYaklangEngineInstalled: () => Promise<boolean>
    initCVEDatabase: () => Promise<any>
    getBuildInEngineVersion: () => Promise<string>
    restoreEngineAndPlugin: (params?: any) => Promise<any>
    downloadLatestYak: (version: string) => Promise<any>
    cancelDownloadYakEngineVersion: (version?: string) => Promise<any>
    downloadLatestYakit: (version: string, type?: any) => Promise<any>
    downloadLatestIntranetYakit: (filePath: string) => Promise<any>
    cancelDownloadYakitVersion: () => Promise<any>
    fetchCheckYaklangSource: (version: string, config?: any) => Promise<string>
    calcEngineSha265: () => Promise<string[]>
    isCVEDatabaseReady: (params?: any) => Promise<any>
    getDefaultProxy: (params?: any) => Promise<any>
    setDefaultProxy: (payload: any) => Promise<any>
    getAvailablePort: () => Promise<number>
    getRandomLocalEnginePort: () => Promise<number>
    determineAdaptedVersionEngine: (payload: any) => Promise<boolean>
    getGlobalProxyRulesConfig: () => Promise<any>
    setGlobalProxyRulesConfig: (config: any) => Promise<any>
    clearLocalYaklangVersionCache: () => Promise<any>
    fetchYaklangEngineAddr: () => Promise<any>
    requestYakVersion: () => Promise<any>
    listYakGrpc: () => Promise<any[]>
    killYakGrpc: (pid: number) => Promise<any>
    killOldEngineProcess: (type?: any) => Promise<any>
    checkLocalDatabase: () => Promise<any>
    fixLocalDatabase: () => Promise<any>
    isPortAvailable: (port: number) => Promise<any>
    startLocalYaklangEngine: (params: any) => Promise<any>
    connectYaklangEngine: (credential: any) => Promise<any>
    attachCombinedOutput: (params: any, token: string) => Promise<any>
    echo: (payload: any) => Promise<any>
    outputLogToWelcomeConsole: (message: string) => Promise<any>
    verifyYakEngineVersion: (version: string) => Promise<boolean>
    installYakEngine: (version: string) => Promise<any>
    writeEngineKeyToYakitProjects: (version?: string) => Promise<any>
    getRemoteAuthAll: () => Promise<any[]>
    saveRemoteAuth: (params: any) => Promise<any>
    removeRemoteAuth: (name: string) => Promise<any>
    onYakVersion: (callback: (version: string) => void) => BridgeCleanup
    onDownloadYakEngineProgress: (callback: (payload: any) => void) => BridgeCleanup
    onDownloadYakitProgress: (callback: (payload: any) => void) => BridgeCleanup
  }
  upload: {
    splitUpload: (payload: any) => Promise<any>
    uploadImgBase64: (payload: any) => Promise<any>
    uploadFile: (payload: any) => Promise<any>
  }
  exporter: {
    writeToFile: (payload: any) => Promise<any>
  }
  extractor: {
    generateRule: (payload: any) => Promise<any>
    run: (payload: any, token: string) => Promise<any>
    cancel: (token: string) => Promise<any>
    sendToTable: (payload: any) => Promise<any>
  }
  processEnv: {
    getAllKeys: (params?: any) => Promise<any>
    setKey: (payload: any) => Promise<any>
    deleteKey: (payload: any) => Promise<any>
  }
  plugin: {
    queryYakScript: (params: any) => Promise<any>
    checkSyntaxFlowRuleUpdate: (params?: any) => Promise<any>
    deleteByUserId: (payload: any) => Promise<any>
  }
  script: {
    execYakCode: (params: any, token: string) => Promise<any>
  }
  mcp: {
    startServer: (params: any, token: string) => Promise<any>
  }
  duplex: {
    start: (params: any, token: string) => Promise<any>
    write: (payload: any, token: string) => Promise<any>
  }
  socket: {
    start: () => Promise<unknown>
    close: () => Promise<unknown>
    send: (payload: any) => Promise<unknown>
    onMessage: (callback: (payload: any) => void) => BridgeCleanup
    onOpen: (callback: (payload?: any) => void) => BridgeCleanup
    onClose: (callback: (payload?: any) => void) => BridgeCleanup
    onError: (callback: (payload: any) => void) => BridgeCleanup
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
    onFromEngineLinkWindow: (callback: (payload: any) => void) => BridgeCleanup
    clearRunnerTerminal: () => Promise<unknown>
    refreshMainMenu: () => Promise<any>
    onKillOldEngineProcess: (callback: (payload?: any) => void) => BridgeCleanup
    onLogoutDynamicControl: (callback: (payload?: any) => void) => BridgeCleanup
    requestSignOut: () => Promise<unknown>
    onSignOutRequested: (callback: (payload?: any) => void) => BridgeCleanup
    onJudgeLicenseLogin: (callback: () => void) => BridgeCleanup
    onResetPassword: (callback: (payload?: any) => void) => BridgeCleanup
    setSwitchConnectionRefresh: (flag: boolean) => Promise<unknown>
    onSwitchConnectionRefresh: (callback: (value: boolean) => void) => BridgeCleanup
    onOpenScreenCapModal: (callback: (payload?: any) => void) => BridgeCleanup
    requestOpenScreenCapModal: () => Promise<unknown>
    isScreenRecorderReady: (params?: any) => Promise<any>
    cancelScreenRecorder: (token: string) => Promise<unknown>
    activateScreenshot: () => Promise<unknown>
    onStartYaklangEngineError: (callback: (error: string) => void) => BridgeCleanup
  }
  project: {
    setCurrentProject: (params: any) => Promise<any>
    getCurrentProjectEx: (params: any) => Promise<any>
    getDefaultProjectEx: (params: any) => Promise<any>
    getProjects: (params: any) => Promise<any>
    exportProject: (params: any, token: string) => Promise<any>
    cancelExportProject: (token: string) => Promise<any>
  }
  codec: {
    run: (params: any) => Promise<any>
    autoDecode: (payload: any) => Promise<any>
    mutateHttpRequest: (payload: any) => Promise<any>
  }
  fileSystem: {
    isFileExists: (targetPath: string) => Promise<boolean>
    fetchFileContent: (targetPath: string) => Promise<any>
  }
  ai: {
    checkHahValidConfig: () => Promise<any>
  }
}

interface Window {
  yakitBridge: YakitBridge
}
