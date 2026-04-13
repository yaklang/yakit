const getBridge = (): YakitBridge => {
  if (!window.yakitBridge) {
    throw new Error('yakit bridge is unavailable')
  }

  return window.yakitBridge
}

export const yakitApp = getBridge().app
export const yakitTheme = getBridge().theme
export const yakitSystem = getBridge().system
export const yakitNetwork = getBridge().network
export const yakitShell = getBridge().shell
export const yakitReverse = getBridge().reverse
export const yakitRisk = getBridge().risk
export const yakitAsset = getBridge().asset
export const yakitHTTPFlow = getBridge().httpFlow
export const yakitHost = getBridge().host
export const yakitWindow = getBridge().window
export const yakitWindowControls = getBridge().windowControls
export const yakitChildWindow = getBridge().childWindow
export const yakitDialog = getBridge().dialog
export const yakitLogs = getBridge().logs
export const yakitEditorTools = getBridge().editorTools
export const yakitPerf = getBridge().perf
export const yakitCache = getBridge().cache
export const yakitClipboard = getBridge().clipboard
export const yakitProfile = getBridge().profile
export const yakitAuth = getBridge().auth
export const yakitRelease = getBridge().release
export const yakitEngine = getBridge().engine
export const yakitUpload = getBridge().upload
export const yakitExporter = getBridge().exporter
export const yakitExtractor = getBridge().extractor
export const yakitProcessEnv = getBridge().processEnv
export const yakitPlugin = getBridge().plugin
export const yakitScript = getBridge().script
export const yakitMcp = getBridge().mcp
export const yakitDuplex = getBridge().duplex
export const yakitSocket = getBridge().socket
export const yakitStream = getBridge().stream
export const yakitUILayout = getBridge().uiLayout
export const yakitProject = getBridge().project
export const yakitCodec = getBridge().codec
export const yakitFileSystem = getBridge().fileSystem
export const yakitAI = getBridge().ai
