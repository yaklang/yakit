/**
 * Vitest 全局 setup：
 * - 注册 @testing-library/jest-dom matchers
 * - 将 electronBridge 依赖的 window.yakitBridge 置为可用 stub（alias 之外的兜底）
 *
 * 使用 expect.extend(matchers)，避免 `@testing-library/jest-dom/vitest` 在嵌套
 * node_modules 下 require 到「另一份 vitest」导致 matchers 挂不上根目录 CI 的 expect。
 */
import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

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
