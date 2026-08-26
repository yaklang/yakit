interface LargeRequestMarkerPosition {
  lineNumber: number
  lineLength: number
}

export type LargeRequestReplacementMarker = LargeRequestMarkerPosition &
  (
    | {
        kind: 'multipart'
        partIndex: number
        filename: string
        size?: number
        resourcePath?: string
        source?: 'file'
      }
    | {
        kind: 'body'
        sizeVerbose: string
        resourcePath?: string
        source?: 'file'
      }
  )

/** 不含 lineNumber，供 Monaco model 行扫描时填入真实行号。 */
export type LargeRequestReplacementLineMatch =
  | {
      kind: 'multipart'
      partIndex: number
      filename: string
      size?: number
      resourcePath?: string
      source?: 'file'
      lineLength: number
    }
  | {
      kind: 'body'
      sizeVerbose: string
      resourcePath?: string
      source?: 'file'
      lineLength: number
    }

const LARGE_MULTIPART_MARKER = /^\[\[yakit: multipart file spilled, part=(\d+), file=(.*?), size=(\d+)\]\]/
const LARGE_REQUEST_BODY_MARKER =
  /^\[\[request(?: |-)too(?: |-)large\(([^)]+)\), truncated\]\](?: use GetHTTPFlowBodyById\(IsRequest=true\) for full body)?$/i
const FILE_FUZZTAG = /^\{\{file\(([^)\r\n|]+)\)\}\}/

const formatFileResourceSize = (size: number): string => {
  if (size < 1024) return `${size}B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(1)}GB`
}

const isLargeRequestResourcePath = (path: string): boolean => {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/')
  const basename = parts[parts.length - 1] || ''
  const parent = parts[parts.length - 2] || ''
  return (
    /^large-request-body-/.test(basename) ||
    (/^large-request-body-.*-parts$/.test(parent) && /^part-\d+-/.test(basename))
  )
}

const resourcePathBasename = (path: string): string => {
  const basename = path.replace(/\\/g, '/').split('/').pop() || 'file'
  return basename.replace(/^part-\d+-/, '').replace(/\.txt$/, '') || basename
}

export const getLargeRequestReplacementKey = (
  marker: LargeRequestReplacementMarker | LargeRequestReplacementLineMatch,
): string => {
  return marker.kind === 'body' ? 'body' : `multipart:${marker.partIndex}`
}

/** 为单行匹配结果补上 Monaco / split 行号，避免 union spread 拓宽报错。 */
export const withLargeRequestReplacementLineNumber = (
  matched: LargeRequestReplacementLineMatch,
  lineNumber: number,
): LargeRequestReplacementMarker => {
  if (matched.kind === 'multipart') {
    return {
      kind: 'multipart',
      partIndex: matched.partIndex,
      filename: matched.filename,
      size: matched.size,
      resourcePath: matched.resourcePath,
      source: matched.source,
      lineLength: matched.lineLength,
      lineNumber,
    }
  }
  return {
    kind: 'body',
    sizeVerbose: matched.sizeVerbose,
    resourcePath: matched.resourcePath,
    source: matched.source,
    lineLength: matched.lineLength,
    lineNumber,
  }
}

/** 匹配单行占位标记；lineLength 仅为 [[...]] 长度，不含同行尾部 boundary。 */
export const matchLargeRequestReplacementLine = (line: string): LargeRequestReplacementLineMatch | null => {
  const fileMatch = line.match(FILE_FUZZTAG)
  if (fileMatch && isLargeRequestResourcePath(fileMatch[1])) {
    return {
      kind: 'body',
      sizeVerbose: resourcePathBasename(fileMatch[1]),
      resourcePath: fileMatch[1],
      source: 'file',
      lineLength: fileMatch[0].length,
    }
  }
  const match = line.match(LARGE_MULTIPART_MARKER)
  if (match) {
    const partIndex = Number(match[1])
    const size = Number(match[3])
    if (!Number.isSafeInteger(partIndex) || partIndex < 0 || !Number.isSafeInteger(size) || size < 0) return null
    return {
      kind: 'multipart',
      partIndex,
      filename: match[2],
      size,
      lineLength: match[0].length,
    }
  }
  const bodyMatch = line.match(LARGE_REQUEST_BODY_MARKER)
  if (!bodyMatch) return null
  return {
    kind: 'body',
    sizeVerbose: bodyMatch[1],
    lineLength: bodyMatch[0].length,
  }
}

export const parseLargeRequestReplacementMarkers = (packet: string): LargeRequestReplacementMarker[] => {
  const markers: LargeRequestReplacementMarker[] = []
  const lines = packet.split(/\r?\n/)
  const contentType = lines.find((line) => /^content-type\s*:/i.test(line)) || ''
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType)
  const boundary = boundaryMatch?.[1] || boundaryMatch?.[2] || ''
  let partIndex = -1
  let partFilename = ''

  lines.forEach((line, index) => {
    if (boundary && line.startsWith(`--${boundary}`)) {
      if (!line.startsWith(`--${boundary}--`)) partIndex++
      partFilename = ''
      return
    }
    const disposition = /^content-disposition\s*:\s*(.*)$/i.exec(line)
    if (disposition) {
      const filenameMatch = /filename=(?:"([^"]*)"|([^;\s]+))/i.exec(disposition[1])
      partFilename = filenameMatch?.[1] || filenameMatch?.[2] || ''
      return
    }

    const fileMatch = line.match(FILE_FUZZTAG)
    if (fileMatch && isLargeRequestResourcePath(fileMatch[1])) {
      if (boundary && partIndex >= 0) {
        markers.push({
          kind: 'multipart',
          partIndex,
          filename: partFilename || resourcePathBasename(fileMatch[1]),
          resourcePath: fileMatch[1],
          source: 'file',
          lineNumber: index + 1,
          lineLength: fileMatch[0].length,
        })
      } else {
        markers.push({
          kind: 'body',
          sizeVerbose: resourcePathBasename(fileMatch[1]),
          resourcePath: fileMatch[1],
          source: 'file',
          lineNumber: index + 1,
          lineLength: fileMatch[0].length,
        })
      }
      return
    }

    const matched = matchLargeRequestReplacementLine(line)
    if (!matched) return
    markers.push(withLargeRequestReplacementLineNumber(matched, index + 1))
  })
  return markers
}

/**
 * The standard file tag carries only a path. Multipart filename comes from
 * Content-Disposition; legacy markers retain their historical size display.
 */
export const buildLargeRequestResourceChipLabel = (
  marker: LargeRequestReplacementMarker | LargeRequestReplacementLineMatch,
  action: string,
): string => {
  const resource =
    marker.kind === 'multipart'
      ? `File[${marker.filename}${marker.size === undefined ? '' : `·${formatFileResourceSize(marker.size)}`}]`
      : `Body[${marker.sizeVerbose}]`
  return `${resource} · ${action}`
}

/**
 * Build the Monaco edit that replaces an engine-owned resource reference with
 * another normal WebFuzzer file-compatible tag. Only the marker itself is replaced: legacy
 * multipart packets can have the next boundary immediately after the marker
 * on the same line. In that case a newline is inserted before the preserved
 * suffix so the boundary remains present and structurally valid.
 */
export const buildLargeRequestFileTagEdit = (
  marker: LargeRequestReplacementMarker,
  filePath: string,
  lineContent: string,
): { endColumn: number; text: string } => ({
  endColumn: marker.lineLength + 1,
  text: `{{file(${filePath})}}${
    marker.kind === 'multipart' && marker.source !== 'file' && lineContent.length > marker.lineLength ? '\n' : ''
  }`,
})

/** InjectedText 提示文案：普通空格转 NBSP，避免折行点与 renderWhitespace 圆点。 */
export const sanitizeChipInjectedText = (text: string): string => text.replace(/ /g, '\u00A0')
