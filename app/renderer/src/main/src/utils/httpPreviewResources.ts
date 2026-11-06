import { Buffer } from 'buffer'
import postcss from 'postcss'
import valueParser from 'postcss-value-parser'
import type { CapturedImageContext } from './capturedImageReplay'
import { capturedImageBaseURL, replayCapturedImages } from './capturedImageReplay'
import { embeddedImage, renderStaticHtml, resolvePreviewImageURL } from './staticHtmlPreview'

// Only transport settings are consumed by the engine, never Fuzzer execution options.
export interface PreviewNetwork {
  Proxy?: string
  ProxyRuleId?: string
  NoSystemProxy?: boolean
  DNSServers?: string[]
  EtcHosts?: { Key: string; Value: string }[]
  ActualAddr?: string
  OverwriteSNI?: boolean
  SNI?: string
  IsGmTLS?: boolean
  RandomJA3?: boolean
  BrowserExtensionDeviceId?: string
  BrowserTransformProfileId?: string
}
export interface OnlinePreviewContext extends CapturedImageContext {
  network: PreviewNetwork
}
type Invoke = (channel: string, ...args: any[]) => Promise<any>
type Kind = 'image' | 'font' | 'css'
const unescapeCss = (value: string) =>
  value.replace(/\\(?:([\da-f]{1,6})\s?|([^\r\n]))/gi, (_, hex, char) =>
    hex ? String.fromCodePoint(Math.min(parseInt(hex, 16) || 0xfffd, 0x10ffff)) : char,
  )

/** Called only with a fresh grant from the render control, never by mode restoration. */
export const loadHTTPPreviewResources = async (body: string, context: OnlinePreviewContext, invoke: Invoke) => {
  const {
    Proxy,
    ProxyRuleId,
    NoSystemProxy,
    DNSServers,
    EtcHosts,
    ActualAddr,
    OverwriteSNI,
    SNI,
    IsGmTLS,
    RandomJA3,
    BrowserExtensionDeviceId,
    BrowserTransformProfileId,
  } = context.network
  const network: PreviewNetwork = {
    Proxy,
    ProxyRuleId,
    NoSystemProxy,
    DNSServers,
    EtcHosts,
    ActualAddr,
    OverwriteSNI,
    SNI,
    IsGmTLS,
    RandomJA3,
    BrowserExtensionDeviceId,
    BrowserTransformProfileId,
  }
  const offline = await replayCapturedImages(body, context, invoke)
  const pageUrl = capturedImageBaseURL(context)
  if (!pageUrl || context.signal?.aborted) return offline
  const controller = new AbortController()
  const abort = () => controller.abort()
  context.signal?.addEventListener('abort', abort, { once: true })
  const deadline = setTimeout(abort, 15000)
  const assets = new Map<string, string>()
  const styles = new Map<string, string>()
  const seen = new Set<string>()
  const pending: { url: string; kind: Kind; depth: number }[] = []
  const cssSources = new Map<string, { text: string; base: string; depth: number }>()
  let total = 0
  let unsupported = false
  let sequence = 0
  let cssBudget = 24 * 1024 * 1024
  const enqueue = (value: string, base: string | undefined, kind: Kind, depth = 0) => {
    const url = resolvePreviewImageURL(value, base)
    if (!url || seen.has(url) || seen.size >= 64 || depth > 3 || assets.has(url)) return
    seen.add(url)
    pending.push({ url, kind, depth })
  }
  const transformCss = (css: string, base: string | undefined, depth = 0, collect = false): string => {
    try {
      if (css.length > 6 * 1024 * 1024) return ''
      let remaining = 6 * 1024 * 1024
      const reserve = (size: number) => {
        if (size > remaining || size > cssBudget) return false
        remaining -= size
        cssBudget -= size
        return true
      }
      // Account for raw-text escaping before parsing or allocating expanded CSS.
      let escapedSize = css.length
      for (let i = 0; i < css.length; i++) if (css[i] === '<') escapedSize += 3
      if (!collect && !reserve(escapedSize)) return ''
      const root = postcss.parse(css)
      const compiledDeclarations = new WeakSet<postcss.Declaration>()
      root.walkAtRules((rule) => {
        if (rule.name.toLowerCase() !== 'import') return
        const nodes = valueParser(rule.params).nodes.filter((n) => n.type !== 'space' && n.type !== 'comment')
        const first = nodes[0]
        const raw =
          first?.type === 'string'
            ? first.value
            : first?.type === 'function' && first.value.toLowerCase() === 'url'
              ? valueParser.stringify(first.nodes).replace(/^(['"])(.*)\1$/, '$2')
              : ''
        const url = resolvePreviewImageURL(unescapeCss(raw), base)
        if (collect) {
          if (url) enqueue(url, undefined, 'css', depth + 1)
          return
        }
        const imported = url && depth < 3 ? compileSheet(url, depth + 1) : undefined
        if (!imported || !reserve(imported.length + rule.params.length + 64)) {
          rule.remove()
          return
        }
        let index = 1
        let layer: string | undefined
        let supports: string | undefined
        const layerNode = nodes[index]
        if (
          (layerNode?.type === 'word' || layerNode?.type === 'function') &&
          layerNode.value.toLowerCase() === 'layer'
        ) {
          layer = layerNode.type === 'function' ? valueParser.stringify(layerNode.nodes).trim() : ''
          index++
        }
        const supportsNode = nodes[index]
        if (supportsNode?.type === 'function' && supportsNode.value.toLowerCase() === 'supports') {
          supports = valueParser.stringify(supportsNode.nodes).trim()
          if (!supports) {
            rule.remove()
            return
          }
          index++
        }
        const media = rule.params.slice(nodes[index - 1].sourceEndIndex).trim()
        // Conditions enclose the layer so unsupported imports do not introduce it.
        const importedRoot = postcss.parse(imported)
        importedRoot.walkDecls((decl) => {
          compiledDeclarations.add(decl)
        })
        let children: postcss.ChildNode[] = importedRoot.nodes
        const wrappers: [string, string | undefined][] = [
          ['layer', layer],
          ['media', media || undefined],
          ['supports', supports ? `(${supports})` : undefined],
        ]
        for (const [name, params] of wrappers) {
          if (params === undefined) continue
          const wrapper = postcss.atRule({ name, params })
          wrapper.append(children)
          children = [wrapper]
        }
        rule.replaceWith(children)
      })
      root.walkDecls((decl) => {
        if (compiledDeclarations.has(decl)) return
        const kind: Kind =
          decl.parent?.type === 'atrule' && decl.parent.name.toLowerCase() === 'font-face' ? 'font' : 'image'
        const parsed = valueParser(decl.value)
        const replace = (raw: string) => {
          const url = resolvePreviewImageURL(unescapeCss(raw), base)
          if (collect) {
            enqueue(unescapeCss(raw), base, kind, depth)
            return ''
          }
          const value =
            (url && assets.get(url)) ||
            (embeddedImage.test(raw) || /^data:font\/(?:woff2?|otf|ttf);base64,[a-z\d+/=\s]+$/i.test(raw) ? raw : '')
          // Reserve every occurrence before placing a data URL in the value AST.
          // Repeated url()/image-set() entries must never reach serialization first.
          return value && reserve(value.length + 16) ? value : ''
        }
        parsed.walk((node) => {
          if (node.type !== 'function') return
          if (node.value.toLowerCase() === 'url') {
            const raw = node.nodes.length === 1 ? node.nodes[0].value : valueParser.stringify(node.nodes)
            const value = replace(raw.trim())
            if (!collect)
              node.nodes = [{ type: 'string', quote: '"', value, sourceIndex: 0, sourceEndIndex: value.length }]
            return false
          }
          if (/^(?:-webkit-)?image-set$/i.test(node.value)) {
            for (const child of node.nodes) {
              if (child.type !== 'string') continue
              const value = replace(child.value)
              if (!collect) child.value = value
            }
          }
        })
        if (!collect) decl.value = parsed.toString()
      })
      // Discovery only inspects original values; it never expands or serializes.
      return collect ? css : root.toString().replace(/</g, '\\3c ')
    } catch {
      return ''
    }
  }
  const compiling = new Set<string>()
  const compiledSheets = new Map<string, string>()
  let stylesheetBudget = 24 * 1024 * 1024
  const compileSheet = (url: string, depth: number): string | undefined => {
    const key = `${depth}:${url}`
    if (compiledSheets.has(key)) return compiledSheets.get(key)
    const sheet = cssSources.get(url)
    if (!sheet || compiling.has(url) || depth > 3) return
    compiling.add(url)
    const css = transformCss(sheet.text, sheet.base, depth)
    compiling.delete(url)
    if (css.length > stylesheetBudget) return
    stylesheetBudget -= css.length
    compiledSheets.set(key, css)
    return css
  }
  // Discover through the same inert sanitizer used for offline rendering.
  renderStaticHtml(body, {
    baseUrl: pageUrl,
    onImageUrl: (url) => enqueue(url, undefined, 'image'),
    onStyleUrl: (url) => enqueue(url, undefined, 'css'),
    cssTransform: (css, base) => {
      transformCss(css, base, 0, true)
      return css
    },
  })
  const load = async ({ url, kind, depth }: (typeof pending)[number]) => {
    const token = `preview-${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2)}`
    const cancel = () => {
      void invoke('cancel-FetchHTTPPreviewResource', token).catch(() => {})
    }
    controller.signal.addEventListener('abort', cancel, { once: true })
    try {
      const result = await invoke(
        'FetchHTTPPreviewResource',
        { URL: url, PageURL: pageUrl, Kind: kind, Network: network },
        token,
      )
      if (result.Unsupported) {
        unsupported = true
        controller.abort()
        return
      }
      if (controller.signal.aborted) return
      const data = Buffer.from(result.Data || [])
      if (!data.length || data.length > 4 * 1024 * 1024 || total + data.length > 16 * 1024 * 1024) return
      total += data.length
      if (kind === 'css' && result.MimeType === 'text/css') {
        const text = data.toString('utf8')
        const base = resolvePreviewImageURL(result.URL) || url
        cssSources.set(url, { text, base, depth })
        transformCss(text, base, depth, true)
      } else {
        const value = `data:${result.MimeType};base64,${data.toString('base64')}`
        if (
          (kind === 'image' && embeddedImage.test(value)) ||
          (kind === 'font' && /^font\/(?:woff2?|otf|ttf)$/.test(result.MimeType))
        )
          assets.set(url, value)
      }
    } catch {
      /* Failed resources leave the static document usable. */
    } finally {
      controller.signal.removeEventListener('abort', cancel)
    }
  }
  try {
    while (pending.length && !controller.signal.aborted && total < 16 * 1024 * 1024) {
      await Promise.all(pending.splice(0, 4).map(load))
    }
    if (unsupported || context.signal?.aborted) return offline
    for (const url of cssSources.keys()) styles.set(url, compileSheet(url, 0) || '')
    const html = renderStaticHtml(body, {
      baseUrl: pageUrl,
      images: assets,
      styles,
      inlineBudget: 24 * 1024 * 1024,
      cssTransform: (css, base) => transformCss(css, base),
    })
    // Repeated references are inlined; bound the final document as well as downloads.
    return html.length <= 24 * 1024 * 1024 ? html : offline
  } finally {
    clearTimeout(deadline)
    context.signal?.removeEventListener('abort', abort)
    controller.abort()
  }
}
