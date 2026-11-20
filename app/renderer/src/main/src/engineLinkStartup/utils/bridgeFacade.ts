import { getYakitBridge } from '../../services/yakitBridge'

/**
 * Link 构建中替代主窗 `@/services/electronBridge` 的窄 facade。
 * 只导出 link preload 具备的能力；共享模块若引用未暴露的 bridge，
 * 构建期会因缺少命名导出直接失败，而不是等到运行时才报错。
 */
const getBridge = (): EngineLinkBridge => {
  const bridge = getYakitBridge()
  if (!bridge) {
    throw new Error('yakit bridge is unavailable')
  }

  return bridge as unknown as EngineLinkBridge
}

export const getEngineLinkBridge = (): EngineLinkBridge | undefined =>
  getYakitBridge() as unknown as EngineLinkBridge | undefined

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
