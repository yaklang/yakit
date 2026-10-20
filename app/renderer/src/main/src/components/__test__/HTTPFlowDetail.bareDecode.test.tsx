import type { ReactNode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HTTPFlow } from '../HTTPFlowTable/HTTPFlowTable.constants'

const mocks = vi.hoisted(() => ({
  ipcInvoke: vi.fn(),
}))

vi.hoisted(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({ fillStyle: '', fillRect: () => undefined }),
  })
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({
      ipcRenderer: { invoke: mocks.ipcInvoke, on: vi.fn(), removeListener: vi.fn() },
    }),
  })
  window.matchMedia = () =>
    ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList
})

vi.mock('ahooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, useInViewport: () => [true] }
})
vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn(), destroy: vi.fn() } }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18nRefresh: 0 }),
}))
vi.mock('@/utils/envfile', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, isEnterpriseEdition: () => false }
})
vi.mock('@/store', () => ({ useStore: () => ({ userInfo: { token: '', isLogin: false } }) }))
vi.mock('@/utils/kv', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    getRemoteValue: vi.fn(async () => undefined),
    setRemoteValue: vi.fn(),
    getLocalValue: vi.fn(async () => ''),
  }
})
vi.mock('@/store/binaryDisplayEnabled', () => ({
  binaryDisplayEnabledStore: { setEnabled: vi.fn() },
  useBinaryDisplayEnabled: () => false,
}))
vi.mock('@/store/httpFlow', () => ({
  useHttpFlowStore: () => ({ compareState: 0, setCompareLeft: vi.fn(), setCompareRight: vi.fn() }),
}))
vi.mock('../yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({ firstNode, secondNode }: { firstNode: () => ReactNode; secondNode: () => ReactNode }) => (
    <>
      {firstNode()}
      {secondNode()}
    </>
  ),
}))
vi.mock('../../utils/editors', () => ({
  NewHTTPPacketEditor: ({
    editorOperationRecord,
    dataCompare,
  }: {
    editorOperationRecord?: string
    dataCompare?: { rightCode?: string }
  }) => <div data-testid={editorOperationRecord}>{dataCompare?.rightCode || ''}</div>,
  NewHTTPCard: ({ children }: { children?: ReactNode }) => <>{children}</>,
}))

import { HTTPFlowDetailRequestAndResponse } from '../HTTPFlowDetail'

const flow = (tags: string): HTTPFlow =>
  ({
    Id: 1,
    Tags: tags,
    RequestString: 'GET / HTTP/1.1\r\n\r\n',
    ResponseString: 'HTTP/1.1 200 OK\r\n\r\nchanged',
    Request: new Uint8Array(),
    Response: new Uint8Array(),
  }) as HTTPFlow

const bare = (text: string) => ({
  Data: Uint8Array.from(Buffer.from(text)),
  Decoded: Uint8Array.from(Buffer.from(`decoded:${text}`)),
})

const renderDetail = (tags: string) =>
  render(
    <HTTPFlowDetailRequestAndResponse
      id={1}
      flow={flow(tags)}
      onDecode={() => undefined}
      execAutoDecodeCallback={() => undefined}
    />,
  )

describe('HTTPFlowDetail 对比用的解码状态', () => {
  afterEach(() => {
    cleanup()
    mocks.ipcInvoke.mockReset()
  })

  it('切到未压缩流量时清掉解码结果', async () => {
    mocks.ipcInvoke.mockImplementation(async (channel: string, params?: { BareType?: string }) => {
      if (channel !== 'GetHTTPFlowBare') return {}
      return bare(params?.BareType || '')
    })
    const view = renderDetail('[手动修改]')
    await waitFor(() => {
      expect(screen.getByTestId('HTTP_FLOW_DETAIL_REQUEST_AND_RESPONSE').textContent).toContain('decoded:response')
    })

    view.rerender(
      <HTTPFlowDetailRequestAndResponse
        id={1}
        flow={flow('')}
        onDecode={() => undefined}
        execAutoDecodeCallback={() => undefined}
      />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('HTTP_FLOW_DETAIL_REQUEST_AND_RESPONSE').textContent).toBe('')
      expect(screen.getByTestId('HTTP_FLOW_DETAIL_REQUEST_AND_REQUEST').textContent).toBe('')
    })
  })

  it('仅自动修复时清掉请求侧的解码结果', async () => {
    mocks.ipcInvoke.mockImplementation(async (channel: string, params?: { BareType?: string }) => {
      if (channel !== 'GetHTTPFlowBare') return {}
      return bare(params?.BareType || '')
    })
    const view = renderDetail('[手动修改]')
    await waitFor(() => {
      expect(screen.getByTestId('HTTP_FLOW_DETAIL_REQUEST_AND_REQUEST').textContent).toContain('decoded:request')
    })

    view.rerender(
      <HTTPFlowDetailRequestAndResponse
        id={1}
        flow={flow('[自动修复]')}
        onDecode={() => undefined}
        execAutoDecodeCallback={() => undefined}
      />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('HTTP_FLOW_DETAIL_REQUEST_AND_REQUEST').textContent).toBe('')
    })
  })

  it('拉取原始报文失败时清掉解码结果', async () => {
    mocks.ipcInvoke.mockImplementation(async (channel: string, params?: { BareType?: string }) => {
      if (channel !== 'GetHTTPFlowBare') return {}
      return bare(params?.BareType || '')
    })
    const view = renderDetail('[手动修改]')
    await waitFor(() => {
      expect(screen.getByTestId('HTTP_FLOW_DETAIL_REQUEST_AND_RESPONSE').textContent).toContain('decoded:response')
    })

    mocks.ipcInvoke.mockRejectedValue(new Error('bare failed'))
    view.rerender(
      <HTTPFlowDetailRequestAndResponse
        id={1}
        flow={flow('[手动修改]|再次')}
        onDecode={() => undefined}
        execAutoDecodeCallback={() => undefined}
      />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('HTTP_FLOW_DETAIL_REQUEST_AND_RESPONSE').textContent).toBe('')
      expect(screen.getByTestId('HTTP_FLOW_DETAIL_REQUEST_AND_REQUEST').textContent).toBe('')
    })
  })
})
