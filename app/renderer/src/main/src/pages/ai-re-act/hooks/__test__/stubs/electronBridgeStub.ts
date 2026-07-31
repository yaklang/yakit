/** Vitest stub: avoid requiring real window.yakitBridge at module load */
const noop = () => undefined
const asyncNoop = async () => undefined

const makeNs = () =>
  new Proxy(
    {},
    {
      get: () => asyncNoop,
    },
  )

export const yakitApp = makeNs()
export const yakitTheme = makeNs()
export const yakitSystem = makeNs()
export const yakitNetwork = makeNs()
export const yakitShell = makeNs()
export const yakitReverse = makeNs()
export const yakitRisk = makeNs()
export const yakitAsset = makeNs()
export const yakitHTTPFlow = makeNs()
export const yakitHost = makeNs()
export const yakitWindow = makeNs()
export const yakitWindowControls = makeNs()
export const yakitChildWindow = makeNs()
export const yakitAuxWindow = makeNs()
export const yakitDialog = makeNs()
export const yakitLogs = {
  openEngineLog: noop,
  openRenderLog: noop,
  openPrintLog: noop,
  printLog: noop,
}
export const yakitEditorTools = makeNs()
export const yakitPerf = makeNs()
export const yakitCache = makeNs()
export const yakitClipboard = makeNs()
export const yakitProfile = makeNs()
export const yakitAuth = makeNs()
export const yakitRelease = makeNs()
export const yakitEngine = makeNs()
export const yakitUpload = makeNs()
export const yakitExporter = makeNs()
export const yakitExtractor = makeNs()
export const yakitProcessEnv = makeNs()
export const yakitPlugin = makeNs()
export const yakitScript = makeNs()
export const yakitMcp = makeNs()
export const yakitDuplex = makeNs()
