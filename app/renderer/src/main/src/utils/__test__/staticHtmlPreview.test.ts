import { afterEach, describe, expect, it, vi } from 'vitest'
import DOMPurify from 'dompurify'
import { renderStaticHtml } from '../staticHtmlPreview'

const image = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('static HTTP response previews', () => {
  it('preserves head styles, html/body attributes, layout and inline CSS', () => {
    const doc = parse(
      renderStaticHtml(`<!doctype html><html class="app" lang="zh"><head>
        <style media="screen">.app .notice { color: red; display: flex }</style>
        </head><body class="page" style="margin:0">
        <div class="notice" style="gap:8px"><a class="link" href="/next">提示</a></div>
        </body></html>`),
    )

    expect(doc.documentElement.className).toBe('app')
    expect(doc.documentElement.lang).toBe('zh')
    expect(doc.body.className).toBe('page')
    expect(doc.body.style.margin).toBe('0px')
    expect(doc.head.querySelector('style')?.textContent).toContain('display: flex')
    expect(doc.head.querySelector('style')?.getAttribute('media')).toBe('screen')
    expect(doc.querySelector('.notice')?.getAttribute('style')).toBe('gap:8px')
    expect(doc.querySelector('a.link')?.textContent).toBe('提示')
    expect(doc.querySelector('a.link')?.hasAttribute('href')).toBe(false)
  })

  it('puts the application policy before any page styles and discards page policies', () => {
    const doc = parse(
      renderStaticHtml(`<html><head><meta http-equiv="refresh" content="0;url=https://example.invalid">
        <meta http-equiv="Content-Security-Policy" content="default-src *">
        <base href="https://example.invalid"><link rel="stylesheet" href="/app.css">
        <style>@import url(https://example.invalid/import.css); .box { background: url(/bg.png) }</style>
        </head><body><div class="box">offline</div></body></html>`),
    )
    const policies = doc.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')
    expect(policies).toHaveLength(1)
    expect(policies[0].getAttribute('content')).toContain("default-src 'none'")
    expect(policies[0].getAttribute('content')).toContain("script-src 'none'")
    expect(policies[0].getAttribute('content')).toContain("style-src 'unsafe-inline'")
    expect(policies[0].getAttribute('content')).toContain("connect-src 'none'")
    expect(policies[0].getAttribute('content')).toContain("form-action 'none'")
    expect(doc.head.children[1]).toBe(policies[0])
    expect(doc.head.children[2].tagName).toBe('STYLE')
    expect(doc.querySelector('base, link, meta[http-equiv="refresh"]')).toBeNull()
  })

  it('removes scripts, event handlers, embedded documents and navigation attributes', () => {
    const doc = parse(
      renderStaticHtml(`<script>parent.compromised = true</script>
        <iframe srcdoc="<script>alert(1)</script>" src="https://example.invalid/frame"></iframe>
        <object data="https://example.invalid/object"></object><embed src="https://example.invalid/embed">
        <form action="https://example.invalid/submit"><button formaction="https://example.invalid/button">send</button></form>
        <a href="javascript:alert(1)" target="_blank" ping="https://example.invalid/ping" onclick="alert(1)">link</a>
        <img src="https://example.invalid/image" srcset="https://example.invalid/large 2x" onerror="alert(1)">
        <div onmouseover="alert(1)" onanimationstart="alert(1)">text</div>`),
    )
    expect(doc.querySelector('script, iframe, object, embed')).toBeNull()
    for (const element of doc.querySelectorAll('*')) {
      for (const attribute of element.attributes) {
        expect(attribute.name).not.toMatch(/^on|^(?:href|srcdoc|srcset|action|formaction|target|ping)$/)
      }
    }
    expect(doc.querySelector('img')?.hasAttribute('src')).toBe(false)
  })

  it('allows embedded raster images but removes remote, local and active data sources', () => {
    const sources = [
      image,
      'https://example.invalid/track',
      '//example.invalid/track',
      '/relative.png',
      'file:///etc/passwd',
      'atom:///etc/passwd',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
    ]
    const doc = parse(renderStaticHtml(sources.map((src) => `<img src='${src}'>`).join('')))
    expect([...doc.querySelectorAll('img[src]')].map((img) => img.getAttribute('src'))).toEqual([image])
  })

  it('does not remove or invoke hooks belonging to other DOMPurify users', () => {
    const hook = vi.fn()
    DOMPurify.addHook('afterSanitizeElements', hook)
    try {
      renderStaticHtml('<p>preview</p>')
      expect(hook).not.toHaveBeenCalled()
      DOMPurify.sanitize('<p>outside preview</p>')
      expect(hook).toHaveBeenCalled()
    } finally {
      DOMPurify.removeHook('afterSanitizeElements')
    }
  })

  it('shows escaped text with the same offline policy if sanitization fails', async () => {
    vi.resetModules()
    vi.doMock('dompurify', () => ({
      default: () => {
        throw new Error('sanitization failed')
      },
    }))
    try {
      const { renderStaticHtml: renderFailing } = await import('../staticHtmlPreview')
      const body = '</pre><script>alert(1)</script><img src="https://example.invalid"> & text'
      const doc = parse(renderFailing(body))
      expect(doc.querySelector('pre')?.textContent).toBe(body)
      expect(doc.querySelector('script, img')).toBeNull()
      expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')).toContain(
        "default-src 'none'",
      )
    } finally {
      vi.doUnmock('dompurify')
      vi.resetModules()
    }
  })
})
