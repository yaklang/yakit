import { describe, expect, it, vi } from 'vitest'
import { Buffer } from 'buffer'
import { loadHTTPPreviewResources } from '../httpPreviewResources'

const page = 'https://target.test/path/page'
const bytes = (value: string) => new Uint8Array(Buffer.from(value))
const html = (text: string) => new DOMParser().parseFromString(text, 'text/html')
const fixture = (entries: Record<string, [string, string]>) =>
  vi.fn(async (channel: string, params: any) => {
    if (channel === 'QueryHTTPFlows') return { Data: [] }
    if (channel === 'cancel-FetchHTTPPreviewResource') return
    if (channel !== 'FetchHTTPPreviewResource') throw new Error(channel)
    const resource = entries[params.URL]
    if (!resource) throw new Error('missing')
    return { URL: params.URL, MimeType: resource[0], Data: bytes(resource[1]) }
  })

describe('manual HTTP static resource loading', () => {
  it('inlines linked/imported CSS, CSS-relative images and fonts without exposing network URLs', async () => {
    const invoke = fixture({
      'https://target.test/css/main.css': [
        'text/css',
        '@import "nested/theme.css" screen and (min-width:1px); @font-face{font-family:icons;src:url(fonts/icons.woff2)} body{background:url(../img/bg.png)}',
      ],
      'https://target.test/css/nested/theme.css': ['text/css', 'h1{color:red}'],
      'https://target.test/css/fonts/icons.woff2': ['font/woff2', 'wOF2-test'],
      'https://target.test/img/bg.png': ['image/png', 'png-test'],
      'https://target.test/img/logo.png': ['image/png', 'logo-test'],
    })
    const result = await loadHTTPPreviewResources(
      '<link rel="stylesheet" href="/css/main.css"><style>p{color:blue}</style><img src="/img/logo.png"><script src="/evil.js"></script>',
      { url: page, network: { Proxy: 'http://proxy:8080' } },
      invoke,
    )
    const doc = html(result)
    const styles = [...doc.querySelectorAll('style')].map((n) => n.textContent).join('\n')
    expect(styles).toContain('@media screen and (min-width:1px)')
    expect(styles).toContain('h1{color:red}')
    expect(
      invoke.mock.calls.filter((c) => c[0] === 'FetchHTTPPreviewResource').map((c) => [c[1].URL, c[1].Kind]),
    ).toContainEqual(['https://target.test/css/fonts/icons.woff2', 'font'])
    expect(styles).toContain('data:font/woff2;base64,')
    expect(styles).toContain('data:image/png;base64,')
    expect(styles).not.toContain('@import')
    expect(doc.querySelector('img')?.src).toMatch(/^data:image\/png;base64,/)
    expect(doc.querySelector('script,link')).toBeNull()
    expect(doc.querySelector('meta[http-equiv]')?.getAttribute('content')).toContain("connect-src 'none'")
    const calls = invoke.mock.calls.filter((c) => c[0] === 'FetchHTTPPreviewResource')
    expect(calls).toHaveLength(5)
    expect(calls.map((c) => c[1].Kind).sort()).toEqual(['css', 'css', 'font', 'image', 'image'])
    expect(calls.every((c) => c[1].Network.Proxy === 'http://proxy:8080')).toBe(true)
  })

  it('falls back to captured images for an old engine', async () => {
    const image = 'data:image/png;base64,cG5n'
    const invoke = vi.fn(async (channel: string, params: any) => {
      if (channel === 'QueryHTTPFlows')
        return {
          Data: params.SearchURL.endsWith('/captured.png') ? [{ Id: 1, Url: params.SearchURL, StatusCode: 200 }] : [],
        }
      if (channel === 'GetHTTPFlowById')
        return { Url: 'https://target.test/captured.png', StatusCode: 200, Response: bytes('packet') }
      if (channel === 'PacketPrettifyHelper')
        return { IsImage: true, Body: bytes('png'), ImageHtmlTag: bytes(`<img src="${image}">`) }
      if (channel === 'FetchHTTPPreviewResource') return { Unsupported: true }
    })
    const result = await loadHTTPPreviewResources(
      '<img src="/captured.png"><img src="/missing.png"><link rel="stylesheet" href="/style.css">',
      { url: page, network: {} },
      invoke,
    )
    expect(html(result).querySelector('img')?.getAttribute('src')).toBe(image)
    expect(html(result).querySelector('link')).toBeNull()
  })

  it('does not request scripts, navigation, embedded content or preload hints', async () => {
    const invoke = fixture({})
    await loadHTTPPreviewResources(
      '<script src="/evil.js"></script><iframe src="/frame"></iframe><link rel="preload" href="/track"><a href="/logout">x</a><img src="file:///etc/passwd">',
      { url: page, network: {} },
      invoke,
    )
    expect(invoke.mock.calls.filter((c) => c[0] === 'FetchHTTPPreviewResource')).toHaveLength(0)
  })

  it('bounds import cycles, strips CSS closing tags, and keeps stylesheet order', async () => {
    const invoke = fixture({
      'https://target.test/a.css': [
        'text/css',
        '@import "b.css";body{color:red}p:after{content:"</style><img src=x onerror=alert(1)>"}',
      ],
      'https://target.test/b.css': ['text/css', '@import "a.css";h1{color:green}'],
    })
    const result = await loadHTTPPreviewResources(
      '<link rel="stylesheet" href="/a.css"><style>body{color:blue}</style>',
      { url: page, network: {} },
      invoke,
    )
    const doc = html(result)
    expect(doc.querySelectorAll('style')).toHaveLength(2)
    expect(doc.querySelector('style')?.textContent).toContain('color:red')
    expect(doc.querySelector('img,script')).toBeNull()
    expect(invoke.mock.calls.filter((c) => c[0] === 'FetchHTTPPreviewResource')).toHaveLength(2)
  })

  it('cancels in-flight engine calls when changing response and starts no follow-up work', async () => {
    const controller = new AbortController()
    let resolve!: (value: unknown) => void
    const invoke = vi.fn(async (channel: string) => {
      if (channel === 'QueryHTTPFlows') return { Data: [] }
      if (channel === 'FetchHTTPPreviewResource')
        return new Promise((r) => {
          resolve = r
        })
    })
    const pending = loadHTTPPreviewResources(
      '<link rel="stylesheet" href="/main.css">',
      { url: page, network: {}, signal: controller.signal },
      invoke,
    )
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    controller.abort()
    resolve({ MimeType: 'text/css', Data: bytes('body{background:url(/later.png)}') })
    await pending
    expect(invoke.mock.calls.some((c) => c[0] === 'cancel-FetchHTTPPreviewResource')).toBe(true)
    expect(invoke.mock.calls.filter((c) => c[0] === 'FetchHTTPPreviewResource')).toHaveLength(1)
  })

  it('limits unique resource requests and excludes execution and credential parameters', async () => {
    const invoke = fixture({})
    await loadHTTPPreviewResources(
      Array.from({ length: 100 }, (_, i) => `<img src="/${i}.png">`).join(''),
      {
        url: page,
        network: { Proxy: 'http://proxy', ...{ HotPatchCode: 'evil', RequestRaw: bytes('Authorization: secret') } },
      },
      invoke,
    )
    const calls = invoke.mock.calls.filter((c) => c[0] === 'FetchHTTPPreviewResource')
    expect(calls).toHaveLength(64)
    expect(calls[0][1].Network).not.toHaveProperty('HotPatchCode')
    expect(calls[0][1].Network).not.toHaveProperty('RequestRaw')
  })
})
