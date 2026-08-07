/**
 * Vitest 全局 setup：
 * - 注册 @testing-library/jest-dom matchers
 * - 将 electronBridge 依赖的 window.yakitBridge 置为可用 stub（alias 之外的兜底）
 *
 * 注意：根目录 CI 使用 vitest@0.34.x，须用 `@testing-library/jest-dom`（非 `/vitest` 入口）。
 * `/vitest` 面向 jest-dom v6 + 新版 Vitest，在 0.34 下会触发
 * `Object.defineProperty called on non-object`。
 */
import '@testing-library/jest-dom'

const asyncNoop = async () => undefined
const makeNs = () =>
  new Proxy(
    {},
    {
      get: () => asyncNoop,
    },
  )

if (typeof window !== 'undefined' && !window.yakitBridge) {
  window.yakitBridge = {
    app: makeNs(),
    theme: makeNs(),
    system: makeNs(),
    network: makeNs(),
    shell: makeNs(),
    reverse: makeNs(),
    risk: makeNs(),
    asset: makeNs(),
    httpFlow: makeNs(),
    host: makeNs(),
    window: makeNs(),
    windowControls: makeNs(),
    childWindow: makeNs(),
    auxWindow: makeNs(),
    dialog: makeNs(),
    logs: makeNs(),
    editorTools: makeNs(),
    perf: makeNs(),
    cache: makeNs(),
    clipboard: makeNs(),
    profile: makeNs(),
    auth: makeNs(),
    release: makeNs(),
    engine: makeNs(),
    upload: makeNs(),
    exporter: makeNs(),
    extractor: makeNs(),
    processEnv: makeNs(),
    plugin: makeNs(),
    script: makeNs(),
    mcp: makeNs(),
    duplex: makeNs(),
    socket: makeNs(),
    stream: makeNs(),
    uiLayout: makeNs(),
    project: makeNs(),
    codec: makeNs(),
    fileSystem: makeNs(),
    ai: makeNs(),
  } as unknown as YakitBridge
}
