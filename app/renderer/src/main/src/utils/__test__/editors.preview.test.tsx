import type React from 'react'
import type * as Hooks from 'ahooks'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NewHTTPPacketEditor, type NewHTTPPacketEditorProp } from '../editors'

const mocks = vi.hoisted(() => ({ detect: vi.fn(), render: vi.fn(), noop: vi.fn() }))
vi.mock('../prettifyPacket', () => ({
  formatPacketRender: mocks.detect,
  prettifyPacketRender: mocks.render,
  prettifyPacketCode: vi.fn(),
}))
vi.mock('ahooks', async (original) => ({
  ...(await original<typeof Hooks>()),
  useSize: () => ({ width: 1000, height: 500 }),
}))
vi.mock('react-monaco-editor', () => ({ default: () => null, monaco: { editor: {} } }))
vi.mock('../monacoSpec/theme', () => ({ applyYakitMonacoTheme: vi.fn() }))
vi.mock('../monacoSpec/fuzzHTTPMonacoSpec', () => ({}))
vi.mock('../monacoSpec/yakEditor', () => ({ setEditorContext: vi.fn(), YAK_FORMATTER_COMMAND_ID: 'format' }))
vi.mock('../monacoSpec/html', () => ({}))
vi.mock('@/utils/editorMarkers', () => ({ ConvertYakStaticAnalyzeErrorToMarker: vi.fn() }))
vi.mock('@/components/yakitUI/YakitEditor/extraYakitEditor', () => ({
  HTTPPacketYakitEditor: ({ value }: { value: string }) => <div data-testid="packet">{value}</div>,
}))
vi.mock('@/components/yakitUI/YakitEditor/binaryFuzztag', () => ({
  packetTextToRawBytes: (text: string) => new TextEncoder().encode(text),
  rawBytesToPacketText: (bytes: Uint8Array) => new TextDecoder().decode(bytes),
}))
vi.mock('@/utils/kv', () => ({ getRemoteValue: async () => undefined }))
vi.mock('antd', () => ({
  Card: ({ title, extra, children }: React.PropsWithChildren<{ title?: React.ReactNode; extra?: React.ReactNode }>) => (
    <div>
      {title}
      {extra}
      {children}
    </div>
  ),
  Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Form: Object.assign(({ children }: React.PropsWithChildren) => <form>{children}</form>, {
    Item: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  }),
}))
vi.mock('@ant-design/icons', () => ({
  EnterOutlined: () => null,
  FullscreenOutlined: () => null,
  SettingOutlined: () => null,
  ThunderboltFilled: () => null,
}))
vi.mock('@yakit-libs/yakit-ui-icons/outline', () => ({ DotsVerticalOutlined: () => null }))
vi.mock('@/components/yakitUI/YakitTag/YakitCheckableTag', () => ({
  YakitCheckableTag: ({
    checked,
    onChange,
    children,
  }: React.PropsWithChildren<{ checked: boolean; onChange: (checked: boolean) => void }>) => (
    <button aria-pressed={checked} onClick={() => onChange(!checked)}>
      {children}
    </button>
  ),
}))
vi.mock('@/components/yakitUI/YakitSwitch/YakitSwitch', () => ({ YakitSwitch: () => null }))
vi.mock('@/components/yakitUI/YakitButton/YakitButton', () => ({ YakitButton: () => null }))
vi.mock('@/components/yakitUI/YakitPopover/YakitPopover', () => ({
  YakitPopover: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))
vi.mock('@/components/yakitUI/YakitSelect/YakitSelect', () => ({ YakitSelect: () => null }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({ showYakitModal: vi.fn() }))
vi.mock('@/components/yakitUI/YakitDrawer/YakitDrawer', () => ({ showYakitDrawer: vi.fn() }))
vi.mock('../eventBus/eventBus', () => ({ default: { on: vi.fn(), off: vi.fn() } }))
vi.mock('@/pages/plugins/builtInData', () => ({ GetPluginLanguage: () => 'http' }))
vi.mock('@/hook/useTheme', () => ({ useTheme: () => ({ theme: 'light' }) }))
vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => key, i18n: { language: 'zh' } }),
}))
vi.mock('@/store/editorFontSize', () => ({
  fontSizeOptions: [],
  useEditorFontSize: () => ({ fontSize: 12, setFontSize: mocks.noop, initFontSize: mocks.noop }),
}))
vi.mock('@/store/editorShowLineBreaks', () => ({
  useEditorShowLineBreaks: () => ({
    showLineBreaks: false,
    setShowLineBreaks: mocks.noop,
    initShowLineBreaks: mocks.noop,
  }),
}))
vi.mock('../notification', () => ({ failed: vi.fn(), yakitNotify: vi.fn(), yakitFailed: vi.fn() }))
vi.mock('../tool', () => ({ JSONParseLog: JSON.parse }))
vi.mock('@/components/yakitUI/YakitEditor/editorUtils', () => ({ resolveWebFuzzerPacket: vi.fn() }))

const a = new TextEncoder().encode('HTTP/1.1 200 OK\r\n\r\nresponse A')
const b = new TextEncoder().encode('HTTP/1.1 200 OK\r\n\r\nresponse B')
const getNetwork = vi.fn(() => ({ Proxy: 'http://proxy:8080' }))
const props: NewHTTPPacketEditorProp = {
  originValue: new TextDecoder().decode(a),
  originalPackage: a,
  url: 'https://target.test/page',
  previewResponseId: 'A',
  isResponse: true,
  readOnly: true,
  showDefaultExtra: false,
  getPreviewNetwork: getNetwork,
}
const next = { ...props, originValue: new TextDecoder().decode(b), originalPackage: b, previewResponseId: 'B' }
const clickRender = () => fireEvent.click(screen.getByRole('button', { name: 'NewHTTPPacketEditor.render' }))
const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  mocks.detect.mockImplementation((_packet, done) => done('<p>renderable</p>'))
  mocks.render.mockReset().mockResolvedValue('<p>preview</p>')
})
afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('NewHTTPPacketEditor preview interactions', () => {
  it('requires the real render control and waits for the 300 ms debounce', async () => {
    const view = render(<NewHTTPPacketEditor {...props} />)
    expect(mocks.render).not.toHaveBeenCalled()
    expect(getNetwork).not.toHaveBeenCalled()
    clickRender()
    await advance(299)
    expect(mocks.render).not.toHaveBeenCalled()
    await advance(1)
    expect(mocks.render).toHaveBeenCalledExactlyOnceWith(
      a,
      expect.objectContaining({ network: { Proxy: 'http://proxy:8080' } }),
    )
    expect(view.container.querySelector('iframe')?.getAttribute('srcdoc')).toBe('<p>preview</p>')
    expect(view.container.querySelector('iframe')?.getAttribute('sandbox')).toBe('')
  })

  it('restores render mode without granting online loading', async () => {
    render(<NewHTTPPacketEditor {...props} typeOptionVal="render" />)
    await advance(300)
    expect(mocks.render).toHaveBeenCalledExactlyOnceWith(a, expect.objectContaining({ network: undefined }))
    expect(getNetwork).not.toHaveBeenCalled()
  })

  it('revokes the click when the response changes during debounce', async () => {
    const view = render(<NewHTTPPacketEditor {...props} />)
    clickRender()
    await advance(100)
    view.rerender(<NewHTTPPacketEditor {...next} />)
    await advance(299)
    expect(mocks.render).not.toHaveBeenCalled()
    await advance(1)
    expect(mocks.render).toHaveBeenCalledExactlyOnceWith(b, expect.objectContaining({ network: undefined }))
  })

  it('cancels the old request and prevents its late result from replacing the new response', async () => {
    let resolveA!: (html: string) => void
    let resolveB!: (html: string) => void
    mocks.render
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveA = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveB = resolve
          }),
      )
    const view = render(<NewHTTPPacketEditor {...props} />)
    clickRender()
    await advance(300)
    const first = mocks.render.mock.calls[0][1].signal as AbortSignal
    expect(first.aborted).toBe(false)
    view.rerender(<NewHTTPPacketEditor {...next} />)
    expect(first.aborted).toBe(true)
    await advance(300)
    await act(async () => {
      resolveB('<p>B</p>')
    })
    expect(view.container.querySelector('iframe')?.getAttribute('srcdoc')).toBe('<p>B</p>')
    await act(async () => {
      resolveA('<p>stale A</p>')
    })
    expect(view.container.querySelector('iframe')?.getAttribute('srcdoc')).toBe('<p>B</p>')
  })

  it.each(['leave render', 'unmount'])('cancels the active request on %s', async (action) => {
    mocks.render.mockImplementation(() => new Promise(() => {}))
    const view = render(<NewHTTPPacketEditor {...props} />)
    clickRender()
    await advance(300)
    const signal = mocks.render.mock.calls[0][1].signal as AbortSignal
    if (action === 'unmount') view.unmount()
    else clickRender()
    expect(signal.aborted).toBe(true)
    expect(view.container.querySelector('iframe')).toBeNull()
  })

  it('cancels a pending debounce on unmount', async () => {
    const view = render(<NewHTTPPacketEditor {...props} />)
    clickRender()
    view.unmount()
    await advance(300)
    expect(mocks.render).not.toHaveBeenCalled()
  })
})
