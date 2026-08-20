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
        size: number
      }
    | {
        kind: 'body'
        sizeVerbose: string
      }
  )

/** 不含 lineNumber，供 Monaco model 行扫描时填入真实行号。 */
export type LargeRequestReplacementLineMatch =
  | {
      kind: 'multipart'
      partIndex: number
      filename: string
      size: number
      lineLength: number
    }
  | {
      kind: 'body'
      sizeVerbose: string
      lineLength: number
    }

const LARGE_MULTIPART_MARKER = /^\[\[yakit: multipart file spilled, part=(\d+), file=(.*?), size=(\d+)\]\]/
const LARGE_REQUEST_BODY_MARKER =
  /^\[\[request(?: |-)too(?: |-)large\(([^)]+)\), truncated\]\](?: use GetHTTPFlowBodyById\(IsRequest=true\) for full body)?$/i

export const getLargeRequestReplacementKey = (
  marker: LargeRequestReplacementMarker | LargeRequestReplacementLineMatch
): string => {
  return marker.kind === 'body' ? 'body' : `multipart:${marker.partIndex}`
}

/** 为单行匹配结果补上 Monaco / split 行号，避免 union spread 拓宽报错。 */
export const withLargeRequestReplacementLineNumber = (
  matched: LargeRequestReplacementLineMatch,
  lineNumber: number
): LargeRequestReplacementMarker => {
  if (matched.kind === 'multipart') {
    return {
      kind: 'multipart',
      partIndex: matched.partIndex,
      filename: matched.filename,
      size: matched.size,
      lineLength: matched.lineLength,
      lineNumber,
    }
  }
  return {
    kind: 'body',
    sizeVerbose: matched.sizeVerbose,
    lineLength: matched.lineLength,
    lineNumber,
  }
}

/** 匹配单行占位标记；lineLength 仅为 [[...]] 长度，不含同行尾部 boundary。 */
export const matchLargeRequestReplacementLine = (line: string): LargeRequestReplacementLineMatch | null => {
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
  packet.split(/\r?\n/).forEach((line, index) => {
    const matched = matchLargeRequestReplacementLine(line)
    if (!matched) return
    markers.push(withLargeRequestReplacementLineNumber(matched, index + 1))
  })
  return markers
}
