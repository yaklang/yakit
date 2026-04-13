const getBridge = (): YakitBridge => {
  if (!window.yakitBridge) {
    throw new Error('yakit bridge is unavailable')
  }

  return window.yakitBridge
}

export const yakitApp = getBridge().app
export const yakitTheme = getBridge().theme
export const yakitShell = getBridge().shell
export const yakitClipboard = getBridge().clipboard
export const yakitCache = getBridge().cache
export const yakitSystem = getBridge().system
export const yakitLogs = getBridge().logs
export const yakitPerf = getBridge().perf
export const yakitEngine = getBridge().engine
