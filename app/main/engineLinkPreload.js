const { contextBridge, ipcRenderer } = require('electron')

const ENGINE_LINK_PREFIX = 'EngineLink:'

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args)
const invokePrefixed = (channel, ...args) => invoke(`${ENGINE_LINK_PREFIX}${channel}`, ...args)
const send = (channel, ...args) => ipcRenderer.send(channel, ...args)

const subscribe = (channel, callback) => {
  const listener = (_event, ...args) => {
    callback(...args)
  }

  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

/** 判断渲染端是否崩溃白屏 */
const handleIsCrashed = () => {
  const bodyLength = document.body?.children?.length || 0
  const rootLength = document.getElementById('root')?.children?.length || 0
  if (!bodyLength || !rootLength) {
    invokePrefixed('render-crash-flag')
  }
}

contextBridge.exposeInMainWorld('yakitBridge', {
  app: {
    markRendererReady: () => send('engine-win-render-ok'),
    generateStartEngine: () => invokePrefixed('generate-start-engine'),
    setEnterpriseToDomain: (flag) => invokePrefixed('is-enpritrace-to-domain', flag),
    exitApp: (params) => invoke('app-exit', params),
    relaunch: () => invoke('relaunch'),
    completeEngineLink: (payload) => invoke('engineLinkWin-done', payload),
    closeWindow: () => invokePrefixed('UIOperate', 'close'),
    onCloseWindow: (callback) => subscribe('close-engineLinkWin-renderer', () => callback()),
    onFromMainWindow: (callback) => subscribe('from-win', callback),
    onCredentialUpdate: (callback) => subscribe('from-win-updateCredential', callback),
  },
  theme: {
    setTheme: (theme) => invoke('set-theme', theme),
    onUpdated: (callback) => subscribe('theme-updated', callback),
  },
  shell: {
    openUrl: (url) => invokePrefixed('open-url', url),
    openSpecifiedFile: (targetPath) => invokePrefixed('open-specified-file', targetPath),
    openRemoteLink: () => invokePrefixed('open-remote-link'),
    openYakitPath: () => invokePrefixed('open-yaklang-path'),
    getRemoteFilePath: () => invokePrefixed('fetch-remote-file-path'),
  },
  clipboard: {
    setText: (text) => invokePrefixed('set-clipboard-text', text),
    getText: () => invokePrefixed('get-clipboard-text'),
  },
  cache: {
    setLocalCache: (key, value) => invokePrefixed('set-local-cache', key, value),
    getLocalCache: (key) => invokePrefixed('fetch-local-cache', key),
    getRemoteKey: (key) => invokePrefixed('GetKey', { Key: key }),
    setRemoteKey: (key, value) => invokePrefixed('SetKey', { Key: key, Value: value }),
    setRemoteKeyWithTTL: (key, value, ttl) => invokePrefixed('SetKey', { Key: key, Value: value, TTL: ttl }),
  },
  system: {
    fetchSystemName: () => invokePrefixed('fetch-system-name'),
    fetchCpuArch: () => invokePrefixed('fetch-cpu-arch'),
    isDev: () => invokePrefixed('is-dev'),
  },
  logs: {
    openEngineLog: () => invokePrefixed('open-engine-log'),
    openRenderLog: () => invokePrefixed('open-render-log'),
    openPrintLog: () => invokePrefixed('open-print-log'),
    debugPrintLog: (message) => invokePrefixed('debug-print-log', message),
    onLiveEngineStdio: (callback) => subscribe('live-engine-stdio', callback),
    onLiveEngineLog: (callback) => subscribe('live-engine-log', callback),
  },
  perf: {
    startComputePercent: () => invokePrefixed('start-compute-percent'),
    fetchComputePercent: () => invokePrefixed('fetch-compute-percent'),
    clearComputePercent: () => invokePrefixed('clear-compute-percent'),
  },
  engine: {
    initCVEDatabase: () => invokePrefixed('InitCVEDatabase'),
    isYaklangEngineInstalled: () => invokePrefixed('is-yaklang-engine-installed'),
    getBuildInEngineVersion: () => invokePrefixed('GetBuildInEngineVersion'),
    restoreEngineAndPlugin: () => invokePrefixed('RestoreEngineAndPlugin', {}),
    fetchLatestYaklangVersion: () => invokePrefixed('fetch-latest-yaklang-version'),
    downloadLatestYak: (version) => invokePrefixed('download-latest-yak', version),
    writeEngineKeyToYakitProjects: (version) => invokePrefixed('write-engine-key-to-yakit-projects', version),
    clearLocalYaklangVersionCache: () => invokePrefixed('clear-local-yaklang-version-cache'),
    installYakEngine: (version) => invokePrefixed('install-yak-engine', version),
    cancelDownloadYakEngineVersion: (version) => invokePrefixed('cancel-download-yak-engine-version', version),
    getAvailableOSSDomain: () => invokePrefixed('get-available-oss-domain'),
    checkAllowSecretLocalYaklangEngine: (params) => invokePrefixed('check-allow-secret-local-yaklang-engine', params),
    fixupDatabase: (params) => invokePrefixed('fixup-database', params),
    reclaimDatabaseSpace: (params) => invokePrefixed('reclaimDatabaseSpace', params),
    fetchYakitVersion: () => invokePrefixed('fetch-yakit-version'),
    fetchLatestYakitVersion: (payload) => invokePrefixed('fetch-latest-yakit-version', payload),
    downloadLatestYakit: (version, type) => invokePrefixed('download-latest-yakit', version, type),
    cancelDownloadYakitVersion: () => invokePrefixed('cancel-download-yakit-version'),
    getCurrentYak: () => invokePrefixed('get-current-yak'),
    fetchCheckYaklangSource: (version, config) => invokePrefixed('fetch-check-yaklang-source', version, config),
    calcEngineSha265: () => invokePrefixed('CalcEngineSha265'),
    startSecretLocalYaklangEngine: (params) => invokePrefixed('start-secret-local-yaklang-engine', params),
    echo: (payload) => invokePrefixed('Echo', payload),
    cancelAllTasks: () => invokePrefixed('cancel-all-tasks'),
    killYakGrpc: (pid) => invokePrefixed('kill-yak-grpc', pid),
    listYakGrpc: () => invokePrefixed('ps-yak-grpc'),
    fetchYaklangEngineAddr: () => invokePrefixed('fetch-yaklang-engine-addr'),
    outputLogToWelcomeConsole: (message) => invokePrefixed('output-log-to-welcome-console', message),
    connectYaklangEngine: (credential) => invokePrefixed('connect-yaklang-engine', credential),
    getRemoteAuthAll: () => invokePrefixed('get-yakit-remote-auth-all'),
    saveRemoteAuth: (params) => invokePrefixed('save-yakit-remote-auth', params),
    removeRemoteAuth: (name) => invokePrefixed('remove-yakit-remote-auth', name),
    onStartYaklangEngineError: (callback) => subscribe('start-yaklang-engine-error', callback),
    onDownloadYakEngineProgress: (callback) => subscribe('download-yak-engine-progress', callback),
    onDownloadYakitProgress: (callback) => subscribe('download-yakit-engine-progress', callback),
    onStartUpEngineMessage: (callback) => subscribe('startUp-engine-msg', callback),
  },
})

const unhandledrejectionError = (err) => {
  try {
    const { reason } = err || {}
    const content = reason?.stack || ''
    handleIsCrashed()
    if (content) invokePrefixed('render-error-log', `${content}\n`)
  } catch (error) {}
}

const errorLog = (err) => {
  try {
    const { message, error } = err || {}
    const content = error?.stack || ''
    handleIsCrashed()
    if (content) invokePrefixed('render-error-log', `${message || ''}\n${content}\n`)
  } catch (error) {}
}

window.addEventListener('unhandledrejection', unhandledrejectionError)
window.addEventListener('error', errorLog)
