import { getEngineLinkBridge } from './bridgeFacade'

/** link 入口与主项目共享组件依赖的 preload 能力 */
const REQUIRED_BRIDGE_CAPABILITIES = [
  ['app.generateStartEngine', (bridge: EngineLinkBridge) => bridge.app?.generateStartEngine],
  ['app.onSync', (bridge: EngineLinkBridge) => bridge.app?.onSync],
  ['cache.getLocalCache', (bridge: EngineLinkBridge) => bridge.cache?.getLocalCache],
  ['clipboard.setText', (bridge: EngineLinkBridge) => bridge.clipboard?.setText],
  ['dialog.openFileSystemDialog', (bridge: EngineLinkBridge) => bridge.dialog?.openFileSystemDialog],
  ['fileSystem.fetchFileContent', (bridge: EngineLinkBridge) => bridge.fileSystem?.fetchFileContent],
  ['fileSystem.fetchFileInfoByPath', (bridge: EngineLinkBridge) => bridge.fileSystem?.fetchFileInfoByPath],
  ['logs.debugPrintLog', (bridge: EngineLinkBridge) => bridge.logs?.debugPrintLog],
  ['release.setEditionRaw', (bridge: EngineLinkBridge) => bridge.release?.setEditionRaw],
  ['theme.setTheme', (bridge: EngineLinkBridge) => bridge.theme?.setTheme],
] as const

/** dev 下检查 link preload 是否提供共享组件所需能力，缺失时仅报错不阻断启动 */
export const checkLinkBridgeCapabilities = (): string[] => {
  const bridge = getEngineLinkBridge()
  if (!bridge) {
    const missing = ['yakitBridge']
    console.error(`[engine-link] missing bridge capabilities: ${missing.join(', ')}`)
    return missing
  }

  const missing = REQUIRED_BRIDGE_CAPABILITIES.filter(([, read]) => typeof read(bridge) !== 'function').map(
    ([name]) => name,
  )
  if (missing.length > 0) {
    console.error(`[engine-link] missing bridge capabilities: ${missing.join(', ')}`)
  }
  return missing
}
