import { Buffer } from 'buffer'
import { embeddedImage, renderStaticHtml, resolvePreviewImageURL } from './staticHtmlPreview'

export interface CapturedImageContext {
  url?: string
  request?: string
  https?: boolean
  signal?: AbortSignal
}

type Invoke = (channel: string, params: unknown) => Promise<any>
const maxImageBytes = 4 * 1024 * 1024
const maxTotalBytes = 16 * 1024 * 1024
const maxImages = 64

export const capturedImageBaseURL = ({ url, request, https }: CapturedImageContext): string | undefined => {
  if (url) return resolvePreviewImageURL(url)
  const target = request?.match(/^\S+\s+(\S+)\s+HTTP\/\d/i)?.[1]
  if (!target) return
  const absolute = resolvePreviewImageURL(target)
  if (absolute) return absolute
  const host = request?.match(/(?:^|\r?\n)Host:[\t ]*([^\r\n]+)/i)?.[1]?.trim()
  return host ? resolvePreviewImageURL(target, `${https ? 'https' : 'http'}://${host}`) : undefined
}

/** Read only captured responses in the current project. Never fetch their URLs. */
export const replayCapturedImages = async (
  body: string,
  context: CapturedImageContext,
  invoke: Invoke,
): Promise<string> => {
  const baseUrl = capturedImageBaseURL(context)
  const urls = new Map<string, number>()
  const initial = renderStaticHtml(body, {
    baseUrl,
    onImageUrl: (url) => {
      if (urls.has(url) || urls.size < maxImages) urls.set(url, (urls.get(url) || 0) + 1)
    },
  })
  if (!urls.size || context.signal?.aborted) return initial

  const images = new Map<string, string>()
  const pending = [...urls.keys()]
  let totalBytes = 0
  let stopped = false
  const load = async (url: string): Promise<void> => {
    try {
      const result = await invoke('QueryHTTPFlows', {
        Pagination: { Page: 1, Limit: 20, OrderBy: 'id', Order: 'desc' },
        SearchURL: url,
        Methods: 'GET',
        StatusCode: '200',
        HaveBody: true,
        BeforeBodyLength: maxImageBytes,
        Full: false,
        ExcludeRequestRaw: true,
        ExcludeResponseRaw: true,
      })
      // SearchURL is fuzzy. Validate the full URL, including its query, locally.
      const matches = (result.Data || [])
        .filter((flow) => resolvePreviewImageURL(flow.Url) === url && Number(flow.StatusCode) === 200)
        .sort((a, b) => Number(b.Id) - Number(a.Id))
        .slice(0, 3)
      for (const candidate of matches) {
        if (stopped || context.signal?.aborted || totalBytes >= maxTotalBytes) return
        const flow = await invoke('GetHTTPFlowById', { Id: candidate.Id })
        if (
          stopped ||
          context.signal?.aborted ||
          resolvePreviewImageURL(flow.Url) !== url ||
          Number(flow.StatusCode) !== 200 ||
          flow.IsTooLargeResponse ||
          !flow.Response?.length ||
          flow.BodyLength > maxImageBytes ||
          flow.Response.length > maxImageBytes + 64 * 1024
        ) {
          continue
        }
        const decoded = await invoke('PacketPrettifyHelper', { Packet: flow.Response })
        if (stopped || context.signal?.aborted) return
        const size = decoded.Body?.length || 0
        // Each occurrence is inlined. Repeated references must count toward the
        // output budget too, rather than expanding one large capture unboundedly.
        const inlineBytes = size * (urls.get(url) || 1)
        if (!decoded.IsImage || !size || size > maxImageBytes || totalBytes + inlineBytes > maxTotalBytes) continue
        const tag = Buffer.from(decoded.ImageHtmlTag || []).toString('utf8')
        const image = tag.match(/\bsrc=(['"])(data:image\/[^'"]+)\1/i)?.[2]
        if (!image || !embeddedImage.test(image)) continue
        images.set(url, image)
        totalBytes += inlineBytes
        return
      }
    } catch {
      // A missing/deleted capture or a disconnected engine leaves the image blank.
    }
  }
  const workers = Promise.all(
    Array.from({ length: Math.min(4, pending.length) }, async () => {
      while (pending.length && !stopped && !context.signal?.aborted && totalBytes < maxTotalBytes) {
        await load(pending.shift()!)
      }
    }),
  )
  let timeout: ReturnType<typeof setTimeout> | undefined
  await Promise.race([workers, new Promise<void>((resolve) => (timeout = setTimeout(resolve, 3000)))])
  stopped = true
  clearTimeout(timeout)
  return images.size ? renderStaticHtml(body, { baseUrl, images }) : initial
}
