import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Buffer } from 'buffer'
import type * as PacketRender from '../prettifyPacket'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@/utils/editors', () => ({ YakEditor: () => null }))
vi.mock('@/utils/notification', () => ({ failed: vi.fn(), yakitNotify: vi.fn(), yakitFailed: vi.fn() }))
vi.mock('@/components/yakitUI/YakitModal/YakitModalConfirm', () => ({ debugYakitModalAny: vi.fn() }))
vi.mock('@/i18n/i18n', () => ({ default: { getFixedT: () => (key: string) => key } }))

let packetRender: typeof PacketRender
const bytes = (value: string) => new Uint8Array(Buffer.from(value))
const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')
const image = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

beforeAll(async () => {
  window.require = (() => ({ ipcRenderer: { invoke } })) as unknown as typeof window.require
  packetRender = await import('../prettifyPacket')
})

beforeEach(() => {
  invoke.mockReset()
})

describe('HTTP packet rendering used by shared editors and MITM', () => {
  it('renders HTML with head styles without changing the original response bytes', async () => {
    const body =
      '<html><head><style>.notice { color: red }</style></head><body><p class="notice">错误</p></body></html>'
    const packet = bytes(`HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n${body}`)
    const original = packet.slice()
    invoke.mockResolvedValueOnce({ ContentType: 'text/html; charset=utf-8', Body: bytes(body) })

    const html = (await packetRender.prettifyPacketRender(packet)) as string
    const doc = parse(html)
    expect(doc.head.querySelector('style')?.textContent).toContain('color: red')
    expect(doc.querySelector('.notice')?.textContent).toBe('错误')
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]')).not.toBeNull()
    expect(invoke).toHaveBeenCalledExactlyOnceWith('PacketPrettifyHelper', { Packet: packet })
    expect(packet).toEqual(original)
  })

  it('keeps standalone image responses visible inside the offline document', async () => {
    invoke.mockResolvedValueOnce({
      ContentType: 'image/gif',
      IsImage: true,
      ImageHtmlTag: bytes(`<img src="${image}" />`),
    })
    const html = (await packetRender.prettifyPacketRender(bytes('image response'))) as string
    const doc = parse(html)
    expect(doc.querySelector('img')?.getAttribute('src')).toBe(image)
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]')).not.toBeNull()
  })

  it('does not query image captures while only detecting the render button', async () => {
    invoke.mockResolvedValueOnce({ ContentType: 'text/html', Body: bytes('<img src="https://target.test/logo.gif">') })
    await new Promise((resolve) => packetRender.formatPacketRender(bytes('HTML response'), resolve))
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke.mock.calls[0][0]).toBe('PacketPrettifyHelper')
  })

  it('replays image captures only when preview context is explicitly supplied', async () => {
    const response = bytes('captured image')
    invoke
      .mockResolvedValueOnce({ ContentType: 'text/html', Body: bytes('<img src="logo.gif">') })
      .mockResolvedValueOnce({ Data: [{ Id: 1, Url: 'https://target.test/logo.gif', StatusCode: 200 }] })
      .mockResolvedValueOnce({ Url: 'https://target.test/logo.gif', StatusCode: 200, Response: response })
      .mockResolvedValueOnce({ IsImage: true, Body: new Uint8Array(34), ImageHtmlTag: bytes(`<img src="${image}">`) })
    const html = (await packetRender.prettifyPacketRender(bytes('HTML response'), {
      url: 'https://target.test/',
    })) as string
    expect(parse(html).querySelector('img')?.getAttribute('src')).toBe(image)
    expect(invoke.mock.calls.map(([channel]) => channel)).toEqual([
      'PacketPrettifyHelper',
      'QueryHTTPFlows',
      'GetHTTPFlowById',
      'PacketPrettifyHelper',
    ])
  })

  it.each(['application/json', 'text/plain', 'application/javascript', 'application/octet-stream'])(
    'does not turn %s responses into HTML previews',
    async (contentType) => {
      invoke.mockResolvedValueOnce({ ContentType: contentType, Body: bytes('{"message":"unchanged"}') })
      await expect(packetRender.prettifyPacketRender(bytes('non-HTML response'))).resolves.toBeUndefined()
    },
  )

  it('completes empty responses without invoking the backend', async () => {
    await expect(packetRender.prettifyPacketRender(new Uint8Array())).resolves.toBeUndefined()
    expect(invoke).not.toHaveBeenCalled()
  })

  it('does not offer an HTML preview when packet decoding fails', async () => {
    invoke.mockRejectedValueOnce(new Error('decode failed'))
    await expect(packetRender.prettifyPacketRender(bytes('invalid response'))).resolves.toBeUndefined()
  })
})
