import { describe, expect, it, vi } from 'vitest'
import { Buffer } from 'buffer'
import { capturedImageBaseURL, replayCapturedImages } from '../capturedImageReplay'

const image = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
const bytes = (value: string) => new Uint8Array(Buffer.from(value))
const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')
const page = 'https://target.test/pages/index.html?view=1'
const captured = (url: string, id = 1) => ({
  Id: id,
  Url: url,
  StatusCode: 200,
  BodyLength: 34,
  Response: bytes('captured image response'),
})
const decoded = () => ({ IsImage: true, Body: new Uint8Array(34), ImageHtmlTag: bytes(`<img src="${image}" />`) })

const captureReader = (urls: string[]) => {
  const flows = urls.map((url, index) => captured(url, index + 1))
  return vi.fn(async (channel: string, params: any) => {
    if (channel === 'QueryHTTPFlows') return { Data: flows.filter((flow) => flow.Url === params.SearchURL) }
    if (channel === 'GetHTTPFlowById') return flows.find((flow) => flow.Id === params.Id)
    if (channel === 'PacketPrettifyHelper') return decoded()
    throw new Error(`unexpected operation ${channel}`)
  })
}

describe('captured image replay', () => {
  it('derives the page URL from explicit context or the original HTTP request', () => {
    expect(capturedImageBaseURL({ url: page, request: 'GET /other HTTP/1.1' })).toBe(page)
    expect(
      capturedImageBaseURL({ request: 'GET /pages/index.html?q=1 HTTP/1.1\r\nHost: target.test\r\n', https: true }),
    ).toBe('https://target.test/pages/index.html?q=1')
    expect(capturedImageBaseURL({ request: 'GET http://target.test/path HTTP/1.1\r\n' })).toBe(
      'http://target.test/path',
    )
    expect(capturedImageBaseURL({})).toBeUndefined()
  })

  it('replays captured img, picture/srcset, inline and stylesheet background images', async () => {
    const paths = ['/logo.gif?q=1', '/retina.gif', '/picture.gif', '/bg.gif', '/inline.gif', '/set.gif']
    const invoke = captureReader(paths.map((path) => `https://target.test${path}`))
    const html = await replayCapturedImages(
      `<html><head><style>.box { background: url('/bg.gif'); background-image: image-set("/set.gif" 1x) }</style></head><body>
      <img id="logo" src="../logo.gif?q=1#ignored">
      <img id="retina" src="/missing.gif" srcset="/retina.gif 2x, /missing2.gif 3x">
      <picture><source srcset="/picture.gif 1x"><img id="picture" alt="picture"></picture>
      <div class="box" style="background-image: url(/inline.gif)"></div></body></html>`,
      { url: page },
      invoke,
    )
    const doc = parse(html)
    for (const id of ['logo', 'retina', 'picture']) expect(doc.getElementById(id)?.getAttribute('src')).toBe(image)
    expect(doc.querySelector('[srcset]')).toBeNull()
    expect(doc.querySelector('style')?.textContent?.match(/data:image\/gif/g)).toHaveLength(2)
    expect(doc.querySelector('.box')?.getAttribute('style')).toContain(image)
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')).toContain(
      "connect-src 'none'",
    )
    expect(new Set(invoke.mock.calls.map(([channel]) => channel))).toEqual(
      new Set(['QueryHTTPFlows', 'GetHTTPFlowById', 'PacketPrettifyHelper']),
    )
  })

  it('respects the document base URL without keeping a navigable base element', async () => {
    const invoke = captureReader(['https://cdn.test/assets/logo.gif'])
    const doc = parse(
      await replayCapturedImages('<base href="https://cdn.test/assets/"><img src="logo.gif">', { url: page }, invoke),
    )
    expect(doc.querySelector('img')?.getAttribute('src')).toBe(image)
    expect(doc.querySelector('base')).toBeNull()
  })

  it('matches the complete captured URL and never accepts fuzzy matches or redirects', async () => {
    const url = 'https://target.test/logo.gif?v=1'
    const flow = captured(url, 3)
    const invoke = vi.fn(async (channel: string) => {
      if (channel === 'QueryHTTPFlows') {
        return {
          Data: [
            captured(`${url}0`, 9),
            captured('https://other.test/logo.gif?v=1', 8),
            { ...flow, Id: 7, StatusCode: 302 },
            flow,
          ],
        }
      }
      if (channel === 'GetHTTPFlowById') return flow
      return decoded()
    })
    const doc = parse(await replayCapturedImages(`<img src="${url}">`, {}, invoke))
    expect(doc.querySelector('img')?.getAttribute('src')).toBe(image)
    expect(invoke).toHaveBeenCalledWith('GetHTTPFlowById', { Id: 3 })
    expect(invoke.mock.calls.filter(([channel]) => channel === 'GetHTTPFlowById')).toHaveLength(1)
  })

  it('leaves missing captures blank and rechecks on the next preview', async () => {
    const invoke = captureReader([])
    const first = parse(await replayCapturedImages('<img src="/logo.gif">', { url: page }, invoke))
    expect(first.querySelector('img')?.hasAttribute('src')).toBe(false)
    const later = captureReader(['https://target.test/logo.gif'])
    const next = parse(await replayCapturedImages('<img src="/logo.gif">', { url: page }, later))
    expect(next.querySelector('img')?.getAttribute('src')).toBe(image)
  })

  it('skips invalid schemes, unresolved relative paths and existing embedded images', async () => {
    const invoke = captureReader([])
    await replayCapturedImages(
      `<img src="file:///secret"><img src="atom:///secret"><img src="javascript:alert(1)">
      <img src="/no-page-url.gif"><img src="${image}">`,
      {},
      invoke,
    )
    expect(invoke).not.toHaveBeenCalled()
  })

  it.each([
    { label: 'non-image response', result: { ...decoded(), IsImage: false } },
    {
      label: 'active data URL',
      result: { ...decoded(), ImageHtmlTag: bytes('<img src="data:text/html,<script>alert(1)</script>">') },
    },
    { label: 'oversized image', result: { ...decoded(), Body: new Uint8Array(4 * 1024 * 1024 + 1) } },
  ])('rejects $label even if the URL looks like an image', async ({ result }) => {
    const reader = captureReader(['https://target.test/logo.gif'])
    const invoke = vi.fn((channel: string, params: unknown) =>
      channel === 'PacketPrettifyHelper' ? Promise.resolve(result) : reader(channel, params),
    )
    const doc = parse(await replayCapturedImages('<img src="/logo.gif">', { url: page }, invoke))
    expect(doc.querySelector('img')?.hasAttribute('src')).toBe(false)
  })

  it('stops after an in-flight query when the selected response changes', async () => {
    const controller = new AbortController()
    let release!: (value: unknown) => void
    const invoke = vi.fn(() => new Promise((resolve) => (release = resolve)))
    const promise = replayCapturedImages('<img src="/logo.gif">', { url: page, signal: controller.signal }, invoke)
    controller.abort()
    release({ Data: [captured('https://target.test/logo.gif')] })
    const doc = parse(await promise)
    expect(doc.querySelector('img')?.hasAttribute('src')).toBe(false)
    expect(invoke).toHaveBeenCalledTimes(1)
  })

  it('deduplicates references, caps lookup count and limits concurrent database reads', async () => {
    let active = 0
    let maxActive = 0
    const invoke = vi.fn(async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((resolve) => setTimeout(resolve, 0))
      active--
      return { Data: [] }
    })
    const body = Array.from({ length: 100 }, (_, index) => `<img src="/img-${Math.floor(index / 2)}.gif">`).join('')
    await replayCapturedImages(body, { url: page }, invoke)
    expect(invoke).toHaveBeenCalledTimes(50)
    expect(maxActive).toBeLessThanOrEqual(4)
    invoke.mockClear()
    await replayCapturedImages(
      Array.from({ length: 80 }, (_, index) => `<img src="/${index}.gif">`).join(''),
      { url: page },
      invoke,
    )
    expect(invoke).toHaveBeenCalledTimes(64)
  })

  it('keeps static HTML usable when the project database is unavailable', async () => {
    const invoke = vi.fn().mockRejectedValue(new Error('engine disconnected'))
    const doc = parse(await replayCapturedImages('<p>text</p><img src="/missing.gif">', { url: page }, invoke))
    expect(doc.querySelector('p')?.textContent).toBe('text')
    expect(doc.querySelector('img')?.hasAttribute('src')).toBe(false)
  })

  it('bounds the total replayed bytes across concurrent images', async () => {
    const urls = Array.from({ length: 8 }, (_, i) => `https://target.test/${i}.gif`)
    const reader = captureReader(urls)
    const body = new Uint8Array(4 * 1024 * 1024)
    const invoke = (channel: string, params: unknown) =>
      channel === 'PacketPrettifyHelper' ? Promise.resolve({ ...decoded(), Body: body }) : reader(channel, params)
    const doc = parse(await replayCapturedImages(urls.map((url) => `<img src="${url}">`).join(''), {}, invoke))
    expect(doc.querySelectorAll('img[src]')).toHaveLength(4)
  })

  it('keeps the page usable if capture lookup stalls and ignores late results', async () => {
    vi.useFakeTimers()
    try {
      let release!: (value: unknown) => void
      const invoke = vi.fn(() => new Promise((resolve) => (release = resolve)))
      const promise = replayCapturedImages('<p>page</p><img src="/logo.gif">', { url: page }, invoke)
      await vi.advanceTimersByTimeAsync(3000)
      const doc = parse(await promise)
      expect(doc.querySelector('p')?.textContent).toBe('page')
      expect(doc.querySelector('img')?.hasAttribute('src')).toBe(false)
      release({ Data: [captured('https://target.test/logo.gif')] })
      await Promise.resolve()
      expect(invoke).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('counts repeated image references toward the inlined output budget', async () => {
    const reader = captureReader(['https://target.test/logo.gif'])
    const body = new Uint8Array(4 * 1024 * 1024)
    const invoke = (channel: string, params: unknown) =>
      channel === 'PacketPrettifyHelper' ? Promise.resolve({ ...decoded(), Body: body }) : reader(channel, params)
    const doc = parse(await replayCapturedImages('<img src="/logo.gif">'.repeat(8), { url: page }, invoke))
    expect(doc.querySelectorAll('img[src]')).toHaveLength(0)
    expect(reader.mock.calls.filter(([channel]) => channel === 'QueryHTTPFlows')).toHaveLength(1)
  })
})
