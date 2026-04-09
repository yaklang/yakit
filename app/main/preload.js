const { ipcRenderer } = require('electron')

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args)
const send = (channel, ...args) => ipcRenderer.send(channel, ...args)
const sendSync = (channel, ...args) => ipcRenderer.sendSync(channel, ...args)

const subscribe = (channel, callback) => {
  const listener = (_event, ...args) => {
    callback(...args)
  }

  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const subscribeOnce = (channel, callback) => {
  let cleanup = () => {}
  const listener = (_event, ...args) => {
    cleanup()
    callback(...args)
  }

  ipcRenderer.on(channel, listener)
  cleanup = () => {
    ipcRenderer.removeListener(channel, listener)
  }

  return cleanup
}

const getStreamChannel = (token, suffix) => `${token}-${suffix}`

/** 判断渲染端是否崩溃白屏 */
const handleIsCrashed = () => {
  const bodyLength = document.body?.children?.length || 0
  const rootLength = document.getElementById('root')?.children?.length || 0
  if (!bodyLength || !rootLength) {
    ipcRenderer.invoke('render-crash-flag')
  }
}

process.on('loaded', function () {
  window.require = function (i) {
    if (i !== 'electron') {
      return
    }

    return { ipcRenderer }
  }

  window.yakitBridge = {
    app: {
      generateStartEngine: () => invoke('generate-start-engine'),
      generateChromePlugin: () => invoke('generate-chrome-plugin'),
      generateRunNode: (payload) => invoke('call-command-generate-node', payload),
      setEnterpriseToDomain: (flag) => invoke('is-enpritrace-to-domain', flag),
      syncEditBaseUrl: (baseUrl) => sendSync('sync-edit-baseUrl', { baseUrl }),
      syncUpdateUser: (user) => sendSync('sync-update-user', user),
      killRunNode: (pid) => invoke('kill-run-node', { pid }),
      userSignOut: () => send('user-sign-out'),
      triggerDevtool: () => invoke('trigger-devtool'),
      reload: () => invoke('trigger-reload'),
      reloadWithCacheBypass: () => invoke('trigger-reload-cache'),
      exitApp: (params) => invoke('app-exit', params),
      relaunch: () => invoke('relaunch'),
      completeMainWindow: (payload) => invoke('yakitMainWin-done', payload),
      updateCredential: (payload) => invoke('updateCredential', payload),
      onCloseWindow: (callback) => subscribe('close-windows-renderer', callback),
      onMinimizeWindow: (callback) => subscribe('minimize-windows-renderer', callback),
    },
    theme: {
      setTheme: (theme) => invoke('set-theme', theme),
      onUpdated: (callback) => subscribe('theme-updated', callback),
    },
    system: {
      fetchSystemName: () => invoke('fetch-system-name'),
      fetchCpuArch: () => invoke('fetch-cpu-arch'),
      isDev: () => invoke('is-dev'),
      fetchSystemAndArch: () => invoke('fetch-system-and-arch'),
    },
    network: {
      axiosApi: (params) => invoke('axios-api', params),
      logoutDynamicControl: (params) => invoke('lougin-out-dynamic-control', params),
      killDynamicControl: () => invoke('kill-dynamic-control'),
      exitDynamicControlPage: () => invoke('lougin-out-dynamic-control-page'),
      uploadRiskToOnline: (payload) => invoke('upload-risk-to-online', payload),
      httpFlowsToOnline: (payload) => invoke('HTTPFlowsToOnline', payload),
    },
    shell: {
      openExternal: (url) => invoke('shell-open-external', url),
      openAbsoluteFile: (targetPath) => invoke('shell-open-abs-file', targetPath),
      openSpecifiedFile: (targetPath) => invoke('open-specified-file', targetPath),
      openYakitPath: () => invoke('open-yakit-path'),
      checkYakitInstallFile: (filename) => invoke('check-yakit-install-file', filename),
      installIntranetYakit: (filePath) => invoke('install-intranet-yakit', filePath),
      openRemoteLink: () => invoke('open-remote-link'),
      getRemoteFilePath: () => invoke('fetch-remote-file-path'),
    },
    reverse: {
      getStatus: () => invoke('get-global-reverse-server-status'),
      cancel: () => invoke('cancel-global-reverse-server-status'),
      config: (payload) => invoke('ConfigGlobalReverse', payload),
      getServer: (params = {}) => invoke('GetGlobalReverseServer', params),
      setYakBridgeLogServer: (payload) => invoke('SetYakBridgeLogServer', payload),
      availableLocalAddr: (params = {}) => invoke('AvailableLocalAddr', params),
      onError: (callback) => subscribe('global-reverse-error', callback),
    },
    risk: {
      fetchLatestInfo: (payload) => invoke('fetch-latest-risk-info', payload),
      queryRisks: (payload) => invoke('QueryRisks', payload),
      setInfoRead: (payload) => invoke('set-risk-info-read', payload),
      query: (payload) => invoke('QueryRisk', payload),
      delete: (payload) => invoke('DeleteRisk', payload),
    },
    asset: {
      deleteDomains: (payload) => invoke('DeleteDomains', payload),
      deletePorts: (payload) => invoke('DeletePorts', payload),
    },
    httpFlow: {
      queryHistory: (payload) => invoke('query-http-flows', payload),
    },
    host: {
      getSystemProxy: (params = {}) => invoke('GetSystemProxy', params),
      setSystemProxy: (payload) => invoke('SetSystemProxy', payload),
      getChromePath: () => invoke('GetChromePath'),
      getMachineID: (params = {}) => invoke('GetMachineID', params),
      resetAndInvalidUserData: (payload) => invoke('ResetAndInvalidUserData', payload),
      isPrivilegedForNetRaw: (params = {}) => invoke('IsPrivilegedForNetRaw', params),
      promotePermissionForUserPcap: (params = {}) => invoke('PromotePermissionForUserPcap', params),
      verifySystemCertificate: (params = {}) => invoke('VerifySystemCertificate', params),
      installMITMCertificate: (params = {}) => invoke('InstallMITMCertificate', params),
      generateInstallScript: () => invoke('generate-install-script'),
    },
    window: {
      openChildWindow: (payload) => send('open-new-child-window', payload),
      focusChildWindow: () => send('onTop-childWin'),
      sendToChildWindow: (payload) => send('minWin-send-to-childWin', payload),
      openConsoleWindow: () => invoke('open-console-new-window'),
      focusConsoleWindow: () => send('onTop-console-new-window'),
      closeConsoleWindow: () => send('close-console-new-window'),
      forwardConsoleData: (payload) => send('forward-xterm-data', payload),
      forwardConsoleTheme: (payload) => send('forward-xterm-theme', payload),
      onConsoleWindowHash: (callback) => subscribe('engineConsole-window-hash', callback),
      onConsoleTerminalCopyData: (callback) => subscribe('console-terminal-window-copy-data', callback),
    },
    windowControls: {
      operate: (action) => invoke('UIOperate', action),
      requestMaximizeState: () => invoke('is-maximize-screen'),
      requestFullScreenState: () => invoke('is-full-screen'),
      onMaximizeState: (callback) => subscribe('callback-is-maximize-screen', callback),
      onFullScreenState: (callback) => subscribe('callback-is-full-screen', callback),
      onMaximize: (callback) => subscribe('callback-win-maximize', callback),
      onUnmaximize: (callback) => subscribe('callback-win-unmaximize', callback),
      onEnterFullScreen: (callback) => subscribe('callback-win-enter-full', callback),
      onLeaveFullScreen: (callback) => subscribe('callback-win-leave-full', callback),
    },
    childWindow: {
      operate: (action) => invoke('UIOperate-childWin', action),
      minimize: () => send('minimize-childWin'),
      maximize: () => send('maximize-childWin'),
      restore: () => send('restore-childWin'),
      close: () => send('close-childWin'),
    },
    dialog: {
      showSaveDialog: (name) => invoke('show-save-dialog', name),
      writeFile: (payload) => invoke('write-file', payload),
      openFileSystemDialog: (options) => invoke('open-file-system-dialog', options),
      saveFileSystemDialog: (options) => invoke('save-file-system-dialog', options),
    },
    logs: {
      openEngineLog: () => invoke('open-engine-log'),
      openRenderLog: () => invoke('open-render-log'),
      openPrintLog: () => invoke('open-print-log'),
      debugPrintLog: (message) => invoke('debug-print-log', message),
      onLiveEngineStdio: (callback) => subscribe('live-engine-stdio', callback),
      onLiveEngineLog: (callback) => subscribe('live-engine-log', callback),
    },
    editorTools: {
      compileAndFormat: (payload) => invoke('YaklangCompileAndFormat', payload),
      staticAnalyze: (payload) => invoke('StaticAnalyzeError', payload),
    },
    perf: {
      startComputePercent: () => invoke('start-compute-percent'),
      fetchComputePercent: () => invoke('fetch-compute-percent'),
      clearComputePercent: () => invoke('clear-compute-percent'),
    },
    cache: {
      setLocalCache: (key, value) => invoke('set-local-cache', key, value),
      getLocalCache: (key) => invoke('fetch-local-cache', key),
      getRemoteKey: (key) => invoke('GetKey', { Key: key }),
      setRemoteKey: (key, value) => invoke('SetKey', { Key: key, Value: value }),
      setRemoteKeyWithTTL: (key, value, ttl) => invoke('SetKey', { Key: key, Value: value, TTL: ttl }),
      getRemoteProjectKey: (key) => invoke('GetProjectKey', { Key: key }),
      setRemoteProjectKey: (key, value) => invoke('SetProjectKey', { Key: key, Value: value }),
    },
    clipboard: {
      setText: (text) => invoke('set-clipboard-text', text),
      getText: () => invoke('get-clipboard-text'),
    },
    profile: {
      getOnlineProfile: (params) => invoke('GetOnlineProfile', params),
      setOnlineProfile: (params) => invoke('SetOnlineProfile', params),
    },
    auth: {
      startUserSignIn: (payload) => send('user-sign-in', payload),
      companySignIn: (payload) => invoke('company-sign-in', payload),
      editBaseUrl: (baseUrl) => invoke('edit-baseUrl', { baseUrl }),
      requestPasswordReset: () => invoke('reset-password'),
      onSignInData: (callback) => subscribe('fetch-signin-data', callback),
      onBaseUrlStatus: (callback) => subscribe('edit-baseUrl-status', callback),
    },
    release: {
      setEditionRaw: (edition) => invoke('set-release-edition-raw', edition),
    },
    engine: {
      fetchLatestYakitVersion: (payload) => invoke('fetch-latest-yakit-version', payload),
      fetchEnterpriseUpdateInfo: () => invoke('update-enpritrace-info'),
      getAvailableOSSDomain: () => invoke('get-available-oss-domain'),
      fetchLatestYaklangVersion: () => invoke('fetch-latest-yaklang-version'),
      fetchYaklangVersionList: () => invoke('fetch-yaklang-version-list'),
      fetchYakitVersion: () => invoke('fetch-yakit-version'),
      getCurrentYak: () => invoke('get-current-yak'),
      isYaklangEngineInstalled: () => invoke('is-yaklang-engine-installed'),
      initCVEDatabase: () => invoke('InitCVEDatabase'),
      getBuildInEngineVersion: () => invoke('GetBuildInEngineVersion'),
      restoreEngineAndPlugin: (params = {}) => invoke('RestoreEngineAndPlugin', params),
      downloadLatestYak: (version) => invoke('download-latest-yak', version),
      cancelDownloadYakEngineVersion: (version) => invoke('cancel-download-yak-engine-version', version),
      downloadLatestYakit: (version, type) => invoke('download-latest-yakit', version, type),
      downloadLatestIntranetYakit: (filePath) => invoke('download-latest-intranet-yakit', filePath),
      cancelDownloadYakitVersion: () => invoke('cancel-download-yakit-version'),
      fetchCheckYaklangSource: (version, config) => invoke('fetch-check-yaklang-source', version, config),
      calcEngineSha265: () => invoke('CalcEngineSha265'),
      isCVEDatabaseReady: (params = {}) => invoke('IsCVEDatabaseReady', params),
      getDefaultProxy: (params = {}) => invoke('GetEngineDefaultProxy', params),
      setDefaultProxy: (payload) => invoke('SetEngineDefaultProxy', payload),
      getAvailablePort: () => invoke('get-avaiable-port'),
      getRandomLocalEnginePort: () => invoke('get-random-local-engine-port'),
      determineAdaptedVersionEngine: (payload) => invoke('determine-adapted-version-engine', payload),
      getGlobalProxyRulesConfig: () => invoke('GetGlobalProxyRulesConfig', {}),
      setGlobalProxyRulesConfig: (config) => invoke('SetGlobalProxyRulesConfig', { Config: config }),
      clearLocalYaklangVersionCache: () => invoke('clear-local-yaklang-version-cache'),
      fetchYaklangEngineAddr: () => invoke('fetch-yaklang-engine-addr'),
      requestYakVersion: () => invoke('fetch-yak-version'),
      listYakGrpc: () => invoke('ps-yak-grpc'),
      killYakGrpc: (pid) => invoke('kill-yak-grpc', pid),
      killOldEngineProcess: (type) => invoke('kill-old-engine-process', type),
      checkLocalDatabase: () => invoke('check-local-database'),
      fixLocalDatabase: () => invoke('fix-local-database'),
      isPortAvailable: (port) => invoke('is-port-available', port),
      startLocalYaklangEngine: (params) => invoke('start-local-yaklang-engine', params),
      connectYaklangEngine: (credential) => invoke('connect-yaklang-engine', credential),
      attachCombinedOutput: (params, token) => invoke('AttachCombinedOutput', params, token),
      echo: (payload) => invoke('Echo', payload),
      outputLogToWelcomeConsole: (message) => invoke('output-log-to-welcome-console', message),
      verifyYakEngineVersion: (version) => invoke('yak-engine-version-exists-and-correctness', version),
      installYakEngine: (version) => invoke('install-yak-engine', version),
      writeEngineKeyToYakitProjects: (version) => invoke('write-engine-key-to-yakit-projects', version),
      getRemoteAuthAll: () => invoke('get-yakit-remote-auth-all'),
      saveRemoteAuth: (params) => invoke('save-yakit-remote-auth', params),
      removeRemoteAuth: (name) => invoke('remove-yakit-remote-auth', name),
      onYakVersion: (callback) => subscribe('fetch-yak-version-callback', callback),
      onDownloadYakEngineProgress: (callback) => subscribe('download-yak-engine-progress', callback),
      onDownloadYakitProgress: (callback) => subscribe('download-yakit-engine-progress', callback),
    },
    upload: {
      splitUpload: (payload) => invoke('split-upload', payload),
      uploadImgBase64: (payload) => invoke('http-upload-img-base64', payload),
      uploadFile: (payload) => invoke('http-upload-file', payload),
    },
    exporter: {
      writeToFile: (payload) => invoke('ExtractDataToFile', payload),
    },
    extractor: {
      generateRule: (payload) => invoke('GenerateExtractRule', payload),
      run: (payload, token) => invoke('ExtractData', payload, token),
      cancel: (token) => invoke('cancel-ExtractData', token),
      sendToTable: (payload) => invoke('send-extracted-to-table', payload),
    },
    processEnv: {
      getAllKeys: (params = {}) => invoke('GetAllProcessEnvKey', params),
      setKey: (payload) => invoke('SetProcessEnvKey', payload),
      deleteKey: (payload) => invoke('DelKey', payload),
    },
    plugin: {
      queryYakScript: (params) => invoke('QueryYakScript', params),
      checkSyntaxFlowRuleUpdate: (params = {}) => invoke('CheckSyntaxFlowRuleUpdate', params),
      deleteByUserId: (payload) => invoke('DeletePluginByUserID', payload),
    },
    script: {
      execYakCode: (params, token) => invoke('ExecYakCode', params, token),
    },
    mcp: {
      startServer: (params, token) => invoke('StartMcpServer', params, token),
    },
    duplex: {
      start: (params, token) => invoke('DuplexConnection', params, token),
      write: (payload, token) => invoke('DuplexConnectionWrite', payload, token),
    },
    socket: {
      start: () => invoke('socket-start'),
      close: () => invoke('socket-close'),
      send: (payload) => invoke('socket-send', payload),
      onMessage: (callback) => subscribe('client-socket-message', callback),
      onOpen: (callback) => subscribe('client-socket-open', callback),
      onClose: (callback) => subscribe('client-socket-close', callback),
      onError: (callback) => subscribe('client-socket-error', callback),
    },
    stream: {
      onData: (token, callback) => subscribe(getStreamChannel(token, 'data'), callback),
      onError: (token, callback) => subscribe(getStreamChannel(token, 'error'), callback),
      onEnd: (token, callback) => subscribe(getStreamChannel(token, 'end'), callback),
      onceEnd: (token, callback) => subscribeOnce(getStreamChannel(token, 'end'), callback),
      cancel: (apiKey, token) => invoke(`cancel-${apiKey}`, token),
    },
    uiLayout: {
      markRendererReady: () => send('main-win-uilayout-render-ok'),
      onFromEngineLinkWindow: (callback) => subscribe('from-engineLinkWin', callback),
      clearRunnerTerminal: () => invoke('runner-terminal-clear'),
      refreshMainMenu: () => invoke('change-main-menu'),
      onKillOldEngineProcess: (callback) => subscribe('kill-old-engine-process-callback', callback),
      onLogoutDynamicControl: (callback) => subscribe('login-out-dynamic-control-callback', callback),
      requestSignOut: () => invoke('ipc-sign-out'),
      onSignOutRequested: (callback) => subscribe('ipc-sign-out-callback', callback),
      onJudgeLicenseLogin: (callback) => subscribe('again-judge-license-login', callback),
      onResetPassword: (callback) => subscribe('reset-password-callback', callback),
      setSwitchConnectionRefresh: (flag) => invoke('switch-conn-refresh', flag),
      onSwitchConnectionRefresh: (callback) => subscribe('fetch-switch-conn-refresh', callback),
      onOpenScreenCapModal: (callback) => subscribe('open-screenCap-modal', callback),
      requestOpenScreenCapModal: () => invoke('send-open-screenCap-modal'),
      isScreenRecorderReady: (params = {}) => invoke('IsScrecorderReady', params),
      cancelScreenRecorder: (token) => invoke('cancel-StartScrecorder', token),
      activateScreenshot: () => invoke('activate-screenshot'),
      onStartYaklangEngineError: (callback) => subscribe('start-yaklang-engine-error', callback),
    },
    project: {
      setCurrentProject: (params) => invoke('SetCurrentProject', params),
      getCurrentProjectEx: (params) => invoke('GetCurrentProjectEx', params),
      getDefaultProjectEx: (params) => invoke('GetDefaultProjectEx', params),
      getProjects: (params) => invoke('GetProjects', params),
      exportProject: (params, token) => invoke('ExportProject', params, token),
      cancelExportProject: (token) => invoke('cancel-ExportProject', token),
    },
    codec: {
      run: (params) => invoke('Codec', params),
      autoDecode: (payload) => invoke('AutoDecode', payload),
      mutateHttpRequest: (payload) => invoke('HTTPRequestMutate', payload),
    },
    fileSystem: {
      isFileExists: (targetPath) => invoke('is-file-exists', targetPath),
      fetchFileContent: (targetPath) => invoke('fetch-file-content', targetPath),
    },
    ai: {
      checkHahValidConfig: () => invoke('CheckHahValidAiConfig'),
    },
  }

  const unhandledrejectionError = (err) => {
    try {
      const { reason } = err || {}
      const content = reason?.stack || ''
      handleIsCrashed()
      if (content) ipcRenderer.invoke('render-error-log', `${content}\n`)
    } catch (error) {}
  }
  const errorLog = (err) => {
    try {
      const { message, error } = err || {}
      const content = error?.stack || ''
      handleIsCrashed()
      if (content) ipcRenderer.invoke('render-error-log', `${message || ''}\n${content}\n`)
    } catch (error) {}
  }
  window.addEventListener('unhandledrejection', unhandledrejectionError)
  window.addEventListener('error', errorLog)
})
