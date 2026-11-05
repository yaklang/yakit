import type { ComponentProps, ReactNode } from 'react'
import { createRequire } from 'node:module'
import path from 'node:path'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isRequestChunkedData,
  isResponseChunkedData,
  ResponseViewer,
  type FuzzerResponse,
  type RandomChunkedResponse,
} from '../HTTPFuzzerPage'

vi.hoisted(() => {
  const ipcRenderer = {
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
    send: vi.fn(),
    invoke: vi.fn(async () => undefined),
  }
  Object.defineProperty(window, 'require', { configurable: true, value: () => ({ ipcRenderer }) })
})
vi.mock('lottie-web', () => ({ default: { loadAnimation: vi.fn(), destroy: vi.fn() } }))
vi.mock('@xterm/xterm', () => ({ Terminal: vi.fn() }))
vi.mock('@/utils/monacoSpec/yakEditor', () => ({
  setEditorContext: vi.fn(),
  YaklangMonacoSpec: 'yak',
  YAK_FORMATTER_COMMAND_ID: 'yak.format',
}))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'en' }, i18nRefresh: 0 }),
}))
vi.mock('@/utils/kv', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getRemoteValue: vi.fn(async () => undefined),
}))
vi.mock('@/components/yakitUI/YakitResizeBox/YakitResizeBox', () => ({
  YakitResizeBox: ({ firstNode }: { firstNode: ReactNode }) => firstNode,
}))
vi.mock('@/utils/editors', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  NewHTTPPacketEditor: ({ originValue, originalPackage }: { originValue: string; originalPackage?: Uint8Array }) => (
    <pre data-testid="response-editor" data-packet={Buffer.from(originalPackage || []).toString('base64')}>
      {originValue}
    </pre>
  ),
}))

const require = createRequire(import.meta.url)
const protoLoader = require('@grpc/proto-loader')
type FuzzerMethod = {
  responseSerialize: (response: Partial<FuzzerResponse>) => Buffer
  responseDeserialize: (bytes: Buffer) => FuzzerResponse
}

const loadMethod = (stringEnums: boolean): FuzzerMethod => {
  // Match app/main/ipc.js, including enum names and default values delivered over IPC.
  const definition = protoLoader.loadSync(path.resolve(process.cwd(), 'app/protos/grpc.proto'), {
    keepCase: true,
    longs: String,
    ...(stringEnums ? { enums: String } : {}),
    defaults: true,
    oneofs: true,
  })
  return definition['ypb.Yak'].HTTPFuzzer
}
const methods = [
  { name: 'Electron string enums', stringEnums: true, method: loadMethod(true) },
  { name: 'numeric enums', stringEnums: false, method: loadMethod(false) },
]

const chunk = (direction?: number | string, text = '', index = 1, isFinal = false): RandomChunkedResponse => ({
  Direction: direction,
  Data: Uint8Array.from(Buffer.from(text)),
  Index: index,
  ChunkedLength: Buffer.byteLength(text),
  CurrentChunkedDelayTime: 0,
  TotalDelayTime: 0,
  IsFinal: isFinal,
})
const decode = (method: FuzzerMethod, response: Partial<FuzzerResponse>) =>
  method.responseDeserialize(method.responseSerialize(response))

afterEach(cleanup)

describe('Web Fuzzer chunk directions', () => {
  it.each([
    { direction: undefined, response: true, request: false },
    { direction: 0, response: true, request: false },
    { direction: 1, response: false, request: true },
    { direction: 2, response: true, request: false },
    { direction: 'CHUNKED_DATA_DIRECTION_UNSPECIFIED', response: true, request: false },
    { direction: 'CHUNKED_DATA_DIRECTION_REQUEST', response: false, request: true },
    { direction: 'CHUNKED_DATA_DIRECTION_RESPONSE', response: true, request: false },
    { direction: 99, response: false, request: false },
    { direction: 'unknown', response: false, request: false },
  ])('classifies $direction without mixing request and response bytes', ({ direction, response, request }) => {
    expect(isResponseChunkedData(chunk(direction))).toBe(response)
    expect(isRequestChunkedData(chunk(direction))).toBe(request)
  })

  it('ignores absent chunks', () => {
    expect(isResponseChunkedData()).toBe(false)
    expect(isRequestChunkedData()).toBe(false)
  })

  it.each(methods)('classifies actual protobuf output with $name', ({ method, stringEnums }) => {
    const response = decode(method, { RandomChunkedData: [chunk(0), chunk(1), chunk(2)] })
    expect(response.RandomChunkedData.map((part) => part.Direction)).toEqual(
      stringEnums
        ? ['CHUNKED_DATA_DIRECTION_UNSPECIFIED', 'CHUNKED_DATA_DIRECTION_REQUEST', 'CHUNKED_DATA_DIRECTION_RESPONSE']
        : [0, 1, 2],
    )
    expect(response.RandomChunkedData.map(isResponseChunkedData)).toEqual([true, false, true])
    expect(response.RandomChunkedData.map(isRequestChunkedData)).toEqual([false, true, false])
  })

  it('keeps SSE chunks from engines that omit the direction field', () => {
    const response = decode(methods[0].method, { RandomChunkedData: [chunk(undefined, 'data: legacy\n\n')] })
    expect(response.RandomChunkedData[0].Direction).toBe('CHUNKED_DATA_DIRECTION_UNSPECIFIED')
    expect(response.RandomChunkedData.filter(isResponseChunkedData)).toHaveLength(1)
  })
})

describe('Web Fuzzer SSE response rendering', () => {
  const header = 'HTTP/2.0 200 OK\r\nContent-Type: text/event-stream\r\n\r\n'
  const firstEvent = 'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n'
  const lastEvent = 'data: [DONE]\n\n'
  const requestBody = '{"stream":true,"messages":[{"content":"DO_NOT_ECHO_REQUEST"}]}'

  it.each(methods)('renders the complete SSE response with $name', async ({ method }) => {
    const response = decode(method, {
      Ok: true,
      UUID: 'sse-response',
      RequestRaw: Uint8Array.from(Buffer.from('POST /v2/chat/completions HTTP/2\r\nHost: example.test\r\n\r\n')),
      ResponseRaw: Uint8Array.from(Buffer.from(header)),
      BodyLength: Buffer.byteLength(firstEvent + lastEvent),
      RandomChunkedData: [chunk(1, requestBody), chunk(2, lastEvent, 2), chunk(2, firstEvent), chunk(2, '', 3, true)],
    })
    const props: ComponentProps<typeof ResponseViewer> = {
      fuzzerResponse: response,
      defaultResponseSearch: '',
      loading: false,
      showMatcherAndExtraction: false,
      setShowMatcherAndExtraction: vi.fn(),
      showExtra: false,
      setShowExtra: vi.fn(),
      matcherValue: { matchersList: [] },
      extractorValue: { extractorList: [] },
      defActiveKey: '',
      defActiveType: 'matchers',
      defActiveKeyAndOrder: { order: 0, defActiveKey: '' },
      onSaveMatcherAndExtraction: vi.fn(),
      webFuzzerValue: '',
      request: Buffer.from(response.RequestRaw).toString(),
      showResponseInfoSecondEditor: false,
      setShowResponseInfoSecondEditor: vi.fn(),
      onSetOnlyOneResEditor: vi.fn(),
    }
    render(<ResponseViewer {...props} />)

    await waitFor(() => expect(screen.getByTestId('response-editor').textContent).toBe(header + firstEvent + lastEvent))
    const packet = screen.getByTestId('response-editor').getAttribute('data-packet') || ''
    expect(Buffer.from(packet, 'base64').toString()).toBe(header + firstEvent + lastEvent)
    expect(screen.getByTestId('response-editor').textContent).not.toContain('DO_NOT_ECHO_REQUEST')
  })
})
