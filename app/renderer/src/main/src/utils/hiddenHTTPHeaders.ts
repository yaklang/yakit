import type { editor, IRange } from 'monaco-editor'

const requestHeaders = [
  'accept',
  'accept-encoding',
  'accept-language',
  'if-modified-since',
  'if-none-match',
  'priority',
  'sec-ch-ua',
  'sec-ch-ua-arch',
  'sec-ch-ua-bitness',
  'sec-ch-ua-full-version',
  'sec-ch-ua-full-version-list',
  'sec-ch-ua-mobile',
  'sec-ch-ua-model',
  'sec-ch-ua-platform',
  'sec-ch-ua-platform-version',
  'sec-ch-ua-wow64',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-user',
  'upgrade-insecure-requests',
  'x-requested-with',
]

const responseHeaders = [
  'accept-ranges',
  'alt-svc',
  'cache-control',
  'cf-ray',
  'connection',
  'content-security-policy',
  'cross-origin-embedder-policy',
  'date',
  'etag',
  'expires',
  'last-modified',
  'nel',
  'p3p',
  'permissions-policy',
  'pragma',
  'referrer-policy',
  'report-to',
  'server',
  'set-cookie',
  'strict-transport-security',
  'vary',
  'via',
  'x-content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'x-ua-compatible',
  'x-xss-protection',
]

export const DEFAULT_HIDDEN_HTTP_HEADERS: Readonly<Record<'request' | 'response', readonly string[]>> = {
  request: requestHeaders,
  response: responseHeaders,
}

export const isValidHTTPHeaderName = (name: string) => /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)

export const normalizeHTTPHeaderNames = (headers: readonly string[]) =>
  Array.from(new Set(headers.map((header) => header.trim().toLowerCase())))

/** Only inspect the header section; the model and its original bytes are never changed. */
export function getHiddenHTTPHeaderRanges(
  model: Pick<editor.ITextModel, 'getLineCount' | 'getLineContent'>,
  isResponse: boolean,
  headerNames: readonly string[] = isResponse ? responseHeaders : requestHeaders,
): IRange[] {
  const firstLine = model.getLineContent(1)
  const startLinePattern = isResponse
    ? /^HTTP\/\d(?:\.\d)?[ \t]+\d{3}(?:[ \t]|$)/
    : /^\S+[ \t]+.+[ \t]+HTTP\/\d(?:\.\d)?[ \t]*$/
  if (!startLinePattern.test(firstLine)) return []

  const headers = new Set(normalizeHTTPHeaderNames(headerNames))
  const ranges: IRange[] = []
  let hide = false
  for (let lineNumber = 2; lineNumber <= model.getLineCount(); lineNumber++) {
    const line = model.getLineContent(lineNumber)
    if (line === '') break

    // Obsolete folded headers still occur in captured traffic. Hide their continuation lines too.
    if (!/^[ \t]/.test(line)) {
      const colon = line.indexOf(':')
      hide = colon > 0 && headers.has(line.slice(0, colon).trim().toLowerCase())
    }
    if (!hide) continue

    const previous = ranges[ranges.length - 1]
    if (previous?.endLineNumber === lineNumber - 1) {
      ranges[ranges.length - 1] = { ...previous, endLineNumber: lineNumber }
    } else {
      ranges.push({ startLineNumber: lineNumber, startColumn: 1, endLineNumber: lineNumber, endColumn: 1 })
    }
  }
  return ranges
}
