import DOMPurify from 'dompurify'
import valueParser from 'postcss-value-parser'

// CSS is kept for layout, but none of its external resources may be fetched.
const previewCSP = [
  "default-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline'",
  'img-src data:',
  'font-src data:',
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

export const embeddedImage =
  /^data:image\/(?:png|gif|jpe?g|webp|avif|bmp|x-icon|vnd\.microsoft\.icon);base64,[a-z\d+/=\s]*$/i

export const resolvePreviewImageURL = (value: string, baseUrl?: string): string | undefined => {
  try {
    const url = new URL(value, baseUrl)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return
    url.hash = ''
    return url.href
  } catch {
    return
  }
}

interface StaticHtmlOptions {
  baseUrl?: string
  inlineBudget?: number
  images?: ReadonlyMap<string, string>
  onImageUrl?: (url: string) => void
  onStyleUrl?: (url: string) => void
  styles?: ReadonlyMap<string, string>
  cssTransform?: (css: string, baseUrl?: string) => string
}

// Follow srcset's URL/descriptor separation without splitting data URL commas.
const srcsetURLs = (srcset: string): string[] => {
  const urls: string[] = []
  let remaining = srcset
  while (remaining) {
    remaining = remaining.replace(/^[\s,]+/, '')
    const token = remaining.match(/^\S+/)?.[0]
    if (!token) break
    urls.push(token.replace(/,+$/, ''))
    remaining = remaining.slice(token.length)
    if (!token.endsWith(',')) {
      const comma = remaining.indexOf(',')
      remaining = comma < 0 ? '' : remaining.slice(comma + 1)
    }
  }
  return urls
}

const unescapeCss = (value: string) =>
  value.replace(/\\(?:([\da-f]{1,6})\s?|([^\r\n])|\r?\n)/gi, (_match, hex, char) =>
    hex ? String.fromCodePoint(Math.min(parseInt(hex, 16) || 0xfffd, 0x10ffff)) : char || '',
  )

/** Build a complete, offline document for an iframe with sandbox="". */
export const renderStaticHtml = (body: string, options: StaticHtmlOptions = {}): string => {
  try {
    let baseUrl = options.baseUrl
    let remaining = options.inlineBudget ?? Infinity
    const reserve = (value: string | undefined) => {
      if (!value || value.length > remaining) return undefined
      remaining -= value.length
      return value
    }
    const pictureSources = new WeakMap<Node, string[]>()
    const compiledStyles = new WeakSet<Node>()
    const imageFor = (value: string): string | undefined => {
      if (embeddedImage.test(value.trim())) return reserve(value.trim())
      const url = resolvePreviewImageURL(value, baseUrl)
      if (!url) return
      options.onImageUrl?.(url)
      const image = options.images?.get(url)
      return image && embeddedImage.test(image) ? reserve(image) : undefined
    }
    const rewriteCss = (css: string): string => {
      if (options.cssTransform) return reserve(options.cssTransform(css, baseUrl)) || ''
      if (!options.onImageUrl && !options.images) return css
      const parsed = valueParser(css)
      parsed.walk((node) => {
        if (node.type !== 'function') return
        if (node.value.toLowerCase() === 'url') {
          const raw = node.nodes.length === 1 ? node.nodes[0].value : valueParser.stringify(node.nodes)
          const image = imageFor(unescapeCss(raw.trim()))
          if (image) node.nodes = [{ type: 'word', value: image, sourceIndex: 0, sourceEndIndex: image.length }]
          return false
        }
        if (/^(?:-webkit-)?image-set$/i.test(node.value)) {
          for (const child of node.nodes) {
            if (child.type === 'string') child.value = imageFor(unescapeCss(child.value)) || child.value
          }
        }
      })
      return reserve(parsed.toString()) || ''
    }
    // Use a separate instance so HTTP previews do not change any shared hooks.
    const purifier = DOMPurify(window)
    purifier.addHook('beforeSanitizeElements', (node) => {
      if (node.nodeName === 'HTML') {
        const base = (node as Element).querySelector('base[href]')?.getAttribute('href')
        if (base) baseUrl = resolvePreviewImageURL(base, baseUrl) || baseUrl
      }
      if (node.nodeName === 'PICTURE') {
        pictureSources.set(
          node,
          [...(node as Element).querySelectorAll('source[srcset]')].flatMap((source) =>
            srcsetURLs(source.getAttribute('srcset') || ''),
          ),
        )
      }
      if (node.nodeName === 'LINK') {
        const element = node as Element
        if (element.getAttribute('rel')?.toLowerCase().split(/\s+/).includes('stylesheet')) {
          const url = resolvePreviewImageURL(element.getAttribute('href') || '', baseUrl)
          if (url) {
            options.onStyleUrl?.(url)
            const css = reserve(options.styles?.get(url))
            if (css !== undefined) {
              const style = node.ownerDocument!.createElement('style')
              compiledStyles.add(style)
              style.textContent = css.replace(/</g, '\\3c ')
              const media = element.getAttribute('media')
              if (media) style.setAttribute('media', media)
              node.parentNode?.replaceChild(style, node)
            }
          }
        }
      }
      if (node.nodeName === 'STYLE' && !compiledStyles.has(node))
        node.textContent = rewriteCss(node.textContent || '').replace(/</g, '\\3c ')
    })
    purifier.addHook('beforeSanitizeAttributes', (node) => {
      if (node.nodeName !== 'IMG') return
      const candidates = [
        node.getAttribute('src') || '',
        ...srcsetURLs(node.getAttribute('srcset') || ''),
        ...(pictureSources.get(node.parentNode!) || []),
      ].filter(Boolean)
      const images = candidates.map(imageFor)
      const image = images.find(Boolean)
      if (image) node.setAttribute('src', image)
      else node.removeAttribute('src')
    })
    purifier.addHook('uponSanitizeAttribute', (_node, data) => {
      if (data.attrName === 'src' && !embeddedImage.test(data.attrValue.trim())) {
        data.keepAttr = false
      }
      if (data.attrName === 'style') data.attrValue = rewriteCss(data.attrValue)
    })
    const html = purifier.sanitize(body, {
      WHOLE_DOCUMENT: true,
      RETURN_DOM: true,
      ALLOWED_ATTR: [
        'class',
        'style',
        'id',
        'src',
        'alt',
        'title',
        'width',
        'height',
        'colspan',
        'rowspan',
        'align',
        'valign',
        'border',
        'cellpadding',
        'cellspacing',
        'media',
        'lang',
        'dir',
      ],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base'],
      SANITIZE_DOM: true,
    })
    if (!(html instanceof window.HTMLElement)) throw new Error('Unexpected preview document')
    const head = html.querySelector('head')!
    const charset = html.ownerDocument.createElement('meta')
    charset.setAttribute('charset', 'utf-8')
    const csp = html.ownerDocument.createElement('meta')
    csp.setAttribute('http-equiv', 'Content-Security-Policy')
    csp.setAttribute('content', previewCSP)
    // The policy must precede all untrusted styles and markup.
    head.prepend(charset, csp)
    return `<!doctype html>${html.outerHTML}`
  } catch {
    // A failed sanitizer must never return executable, unfiltered markup.
    const escaped = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${previewCSP}"></head><body><pre>${escaped}</pre></body></html>`
  }
}
