/**
 * WebsocketFuzzer 断开连接状态复位回归测试。
 *
 * 背景：cancel-CreateWebsocketFuzzer 后主进程不再转发 -end 事件，
 * 若不在本地复位 executing/loading，UI 会停留在「已连接」假状态。
 */
const { ipcInvokeMock } = vi.hoisted(() => {
  const ipcInvokeMock = vi.fn((channel: string) => {
    if (channel === 'CreateWebsocketFuzzer') return Promise.resolve(true)
    return Promise.resolve({})
  })
  ;(window as any).require = (id: string) => {
    if (id === 'electron') {
      return {
        ipcRenderer: {
          invoke: ipcInvokeMock,
          on: () => {},
          off: () => {},
          send: () => {},
          removeAllListeners: () => {},
        },
      }
    }
    return {}
  }
  ;(window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })
  ;(window as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  return { ipcInvokeMock }
})

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' }, i18nRefresh: 0 }),
}))

vi.mock('lottie-web', () => ({ default: vi.fn() }))

// monacoSpec 各模块顶层注册调用需要可调用的 monaco 命名空间（Proxy 兜底，同 src/types/monacoEditorStub 思路）
vi.mock('react-monaco-editor', () => {
  const lazyFn = (): ((...args: unknown[]) => unknown) => {
    const fn = (...args: unknown[]) => makeProxy()
    return fn
  }
  const makeProxy = (): unknown =>
    new Proxy(lazyFn(), {
      get: (target: object, prop: string | symbol) => {
        if (prop === Symbol.toPrimitive) return () => 'monaco-mock'
        if (prop === 'then') return undefined
        return makeProxy()
      },
    })
  return {
    default: () => null,
    monaco: makeProxy(),
  }
})

vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({ firstNode, secondNode }: { firstNode: React.ReactNode; secondNode: React.ReactNode }) => (
    <>
      {firstNode}
      {secondNode}
    </>
  ),
}))

const { WebsocketFuzzer } = await import('../WebsocketFuzzer')

describe('WebsocketFuzzer 断开连接复位', () => {
  it('连接后断开：cancel 被调用且 executing 复位回连接按钮', async () => {
    render(<WebsocketFuzzer pageId="test-page" />)

    // 点击「连接」，invoke resolve 后 executing=true，按钮切换为「断开」
    fireEvent.click(screen.getByRole('button', { name: 'WebsocketFuzzer.connect' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'WebsocketFuzzer.disconnect' })).toBeInTheDocument()
    })

    // 点击「断开」→ Popconfirm 确认 → handleDisConnect
    fireEvent.click(screen.getByRole('button', { name: 'WebsocketFuzzer.disconnect' }))
    const confirmBtn = await screen.findByRole('button', { name: /YakitButton\.ok/ })
    fireEvent.click(confirmBtn)

    // cancel 已被调用（组件内引用即该 mock），executing 已复位（按钮回到「连接」）
    await waitFor(() => {
      expect(ipcInvokeMock).toHaveBeenCalledWith('cancel-CreateWebsocketFuzzer', expect.any(String))
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'WebsocketFuzzer.connect' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'WebsocketFuzzer.disconnect' })).not.toBeInTheDocument()
    })
  })
})
