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

const LARGE_MULTIPART_MARKER = /^\[\[yakit: multipart file spilled, part=(\d+), file=(.*), size=(\d+)\]\]$/
const LARGE_REQUEST_BODY_MARKER =
  /^\[\[request(?: |-)too(?: |-)large\(([^)]+)\), truncated\]\](?: use GetHTTPFlowBodyById\(IsRequest=true\) for full body)?$/i

export const getLargeRequestReplacementKey = (marker: LargeRequestReplacementMarker): string => {
  return marker.kind === 'body' ? 'body' : `multipart:${marker.partIndex}`
}

export const parseLargeRequestReplacementMarkers = (packet: string): LargeRequestReplacementMarker[] => {
  const markers: LargeRequestReplacementMarker[] = []
  packet.split(/\r?\n/).forEach((line, index) => {
    const match = line.match(LARGE_MULTIPART_MARKER)
    if (match) {
      const partIndex = Number(match[1])
      const size = Number(match[3])
      if (!Number.isSafeInteger(partIndex) || partIndex < 0 || !Number.isSafeInteger(size) || size < 0) return
      markers.push({
        kind: 'multipart',
        partIndex,
        filename: match[2],
        size,
        lineNumber: index + 1,
        lineLength: line.length,
      })
      return
    }
    const bodyMatch = line.match(LARGE_REQUEST_BODY_MARKER)
    if (!bodyMatch) return
    markers.push({
      kind: 'body',
      sizeVerbose: bodyMatch[1],
      lineNumber: index + 1,
      lineLength: line.length,
    })
  })
  return markers
}
