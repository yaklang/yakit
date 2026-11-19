/** 主窗口与 link 窗口共用 window.yakitBridge 声明，link preload 只暴露其子集 */
export const getEngineLinkBridge = (): EngineLinkBridge | undefined =>
  window.yakitBridge as unknown as EngineLinkBridge | undefined

const getBridge = (): EngineLinkBridge => {
  const bridge = getEngineLinkBridge()
  if (!bridge) {
    throw new Error('yakit bridge is unavailable')
  }

  return bridge
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
export const yakitDialog = getBridge().dialog
export const yakitFileSystem = getBridge().fileSystem
export const yakitRelease = getBridge().release
