import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FuzzerResponse } from '@/pages/fuzzer/HTTPFuzzerPage'

const mocks = vi.hoisted(() => ({
  ipcInvoke: vi.fn(async (channel: string, _payload?: unknown) => {
    if (channel === 'GetHTTPFlowById') return new Promise(() => undefined)
    return { Id: 1 }
  }),
  fills: new Map<string, (row: FuzzerResponse) => void>(),
}))

vi.hoisted(() => {
  Object.defineProperty(window, 'require', {
    configurable: true,
    value: () => ({
      ipcRenderer: { invoke: mocks.ipcInvoke, on: vi.fn(), removeListener: vi.fn() },
    }),
  })
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
vi.mock('@/utils/kv', () => ({
  getRemoteValue: vi.fn(async () => undefined),
  setRemoteValue: vi.fn(),
}))
vi.mock('@/store/binaryDisplayEnabled', () => ({
  binaryDisplayEnabledStore: { setEnabled: vi.fn() },
  useBinaryDisplayEnabled: () => false,
}))
vi.mock('@/pages/fuzzer/fuzzerRawStore', () => ({
  fillFuzzerRaw: (row: FuzzerResponse) =>
    new Promise<FuzzerResponse>((resolve) => {
      mocks.fills.set(row.UUID, resolve)
    }),
}))
vi.mock('../../utils/editors', () => ({
  NewHTTPPacketEditor: () => null,
  NewHTTPCard: () => null,
}))

import { FuzzerResponseToHTTPFlowDetail } from '../HTTPFlowDetail'

const row = (uuid: string) =>
  ({
    UUID: uuid,
    Payloads: [],
    ResponseRaw: new Uint8Array(),
  }) as unknown as FuzzerResponse

const convertedUuids = () =>
  mocks.ipcInvoke.mock.calls
    .filter((call) => call[0] === 'ConvertFuzzerResponseToHTTPFlow')
    .map((call) => (call[1] as FuzzerResponse).UUID)

describe('FuzzerResponseToHTTPFlowDetail stale fill', () => {
  afterEach(() => {
    cleanup()
    mocks.fills.clear()
    mocks.ipcInvoke.mockClear()
  })

  it('keeps the later row when the earlier fill returns last', async () => {
    const view = render(<FuzzerResponseToHTTPFlowDetail response={row('A')} index={0} />)
    view.rerender(<FuzzerResponseToHTTPFlowDetail response={row('B')} index={1} />)

    mocks.fills.get('B')?.(row('B'))
    await waitFor(() => expect(convertedUuids()).toEqual(['B']))

    mocks.fills.get('A')?.(row('A'))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(convertedUuids()).toEqual(['B'])
  })
})
