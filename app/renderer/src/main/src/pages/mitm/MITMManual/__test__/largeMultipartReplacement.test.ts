import { describe, expect, it } from 'vitest'
import { parseLargeRequestReplacementMarkers } from '../largeMultipartReplacement'

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

  it('ignores invalid or inline marker-like text', () => {
    const packet = [
      'prefix [[yakit: multipart file spilled, part=0, file=a.zip, size=1]]',
      '[[yakit: multipart file spilled, part=-1, file=a.zip, size=1]]',
      'prefix [[request too large(10MB), truncated]]',
    ].join('\n')
    expect(parseLargeRequestReplacementMarkers(packet)).toEqual([])
  })
})
