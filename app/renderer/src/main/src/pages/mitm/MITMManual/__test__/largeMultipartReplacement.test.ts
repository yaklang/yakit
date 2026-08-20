import { describe, expect, it } from 'vitest'
import {
  matchLargeRequestReplacementLine,
  parseLargeRequestReplacementMarkers,
} from '../largeMultipartReplacement'

describe('matchLargeRequestReplacementLine', () => {
  it('returns marker-only lineLength when trailing boundary is on the same line', () => {
    const marker = '[[yakit: multipart file spilled, part=0, file=yak_windows_amd64.exe.(3).zip, size=67856048]]'
    const trailingBoundary = '-----WebKitFormBoundarygrBMpnQW1ehMjVAI--'
    expect(matchLargeRequestReplacementLine(marker + trailingBoundary)).toEqual({
      kind: 'multipart',
      partIndex: 0,
      filename: 'yak_windows_amd64.exe.(3).zip',
      size: 67856048,
      lineLength: marker.length,
    })
  })

  it('returns null for inline or invalid marker-like text', () => {
    expect(
      matchLargeRequestReplacementLine('prefix [[yakit: multipart file spilled, part=0, file=a.zip, size=1]]')
    ).toBeNull()
    expect(
      matchLargeRequestReplacementLine('[[yakit: multipart file spilled, part=-1, file=a.zip, size=1]]')
    ).toBeNull()
  })
})

describe('parseLargeRequestReplacementMarkers', () => {
  it('parses spilled multipart marker metadata and line positions', () => {
    const marker = '[[yakit: multipart file spilled, part=3, file=archive,final.zip, size=141953271]]'
    const packet = ['POST /upload HTTP/1.1', '', '--boundary', marker, '--boundary--'].join('\r\n')

    expect(parseLargeRequestReplacementMarkers(packet)).toEqual([
      {
        kind: 'multipart',
        partIndex: 3,
        filename: 'archive,final.zip',
        size: 141953271,
        lineNumber: 4,
        lineLength: marker.length,
      },
    ])
  })

  it('parses a flat oversized request body marker', () => {
    const marker =
      '[[request too large(141.9MB), truncated]] use GetHTTPFlowBodyById(IsRequest=true) for full body'
    const packet = ['PUT /upload HTTP/1.1', '', marker].join('\r\n')

    expect(parseLargeRequestReplacementMarkers(packet)).toEqual([
      {
        kind: 'body',
        sizeVerbose: '141.9MB',
        lineNumber: 3,
        lineLength: marker.length,
      },
    ])
  })

  it('parses a marker followed directly by a multipart boundary on the same line', () => {
    const marker = '[[yakit: multipart file spilled, part=0, file=yak_windows_amd64.exe.(3).zip, size=67856048]]'
    const trailingBoundary = '-----WebKitFormBoundarygrBMpnQW1ehMjVAI--'
    const packet = ['POST /upload HTTP/1.1', '', '--boundary', marker + trailingBoundary].join('\r\n')

    expect(parseLargeRequestReplacementMarkers(packet)).toEqual([
      {
        kind: 'multipart',
        partIndex: 0,
        filename: 'yak_windows_amd64.exe.(3).zip',
        size: 67856048,
        lineNumber: 4,
        lineLength: marker.length,
      },
    ])
  })

  it('ignores invalid or inline marker-like text', () => {
    const packet = [
      'prefix [[yakit: multipart file spilled, part=0, file=a.zip, size=1]]',
      '[[yakit: multipart file spilled, part=-1, file=a.zip, size=1]]',
      'prefix [[request too large(10MB), truncated]]',
    ].join('\n')
    expect(parseLargeRequestReplacementMarkers(packet)).toEqual([])
  })
})
