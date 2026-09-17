/**
 * Vitest 全局 setup：
 * - 注册 @testing-library/jest-dom matchers
 * - 提供 UI 测试所需的最小 IPC transport
 *
 * 使用 expect.extend(matchers)，避免 `@testing-library/jest-dom/vitest` 在嵌套
 * node_modules 下 require 到「另一份 vitest」导致 matchers 挂不上根目录 CI 的 expect。
 */
import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

// Ordinary UI tests have no Electron preload. Communication-specific tests replace
// this transport with their own request/event fixture.
if (typeof window !== 'undefined' && !window.yakitTransport) {
  window.yakitTransport = {
    request: async () => ({ ok: true, data: undefined }),
    subscribe: () => () => {},
  }
}
