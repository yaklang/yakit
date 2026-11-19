/**
 * Link 构建中替代主窗 `@/services/electronBridge` 的窄 facade。
 * 只导出 link preload 具备的能力；共享模块若引用未暴露的 bridge，
 * 构建期会因缺少命名导出直接失败，而不是等到运行时才报错。
 */
export {
  yakitApp,
  yakitTheme,
  yakitShell,
  yakitClipboard,
  yakitCache,
  yakitSystem,
  yakitLogs,
  yakitPerf,
  yakitEngine,
  yakitDialog,
  yakitFileSystem,
  yakitRelease,
} from './electronBridge'
