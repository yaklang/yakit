import { describe, expect, it } from 'vitest'
import {
  buildLargeRequestFileTagEdit,
  buildLargeRequestResourceChipLabel,
  matchLargeRequestReplacementLine,
  parseLargeRequestReplacementMarkers,
  sanitizeChipInjectedText,
  withLargeRequestReplacementLineNumber,
} from '../largeMultipartReplacement'

describe('matchLargeRequestReplacementLine', () => {
  it('recognizes an engine-owned ordinary file tag as a whole-body resource', () => {
    const tag = '{{file(/tmp/yakit/large-request-body-2026-id.txt)}}'
    expect(matchLargeRequestReplacementLine(tag)).toEqual({
      kind: 'body',
      sizeVerbose: 'large-request-body-2026-id',
      resourcePath: '/tmp/yakit/large-request-body-2026-id.txt',
      source: 'file',
      lineLength: tag.length,
    })
  })

  it('returns marker-only lineLength when a legacy trailing boundary is on the same line', () => {
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

  it('returns null for arbitrary file tags and inline or invalid marker-like text', () => {
    expect(matchLargeRequestReplacementLine('{{file(/tmp/user-authored.txt)}}')).toBeNull()
    expect(
      matchLargeRequestReplacementLine('prefix [[yakit: multipart file spilled, part=0, file=a.zip, size=1]]'),
    ).toBeNull()
    expect(
      matchLargeRequestReplacementLine('[[yakit: multipart file spilled, part=-1, file=a.zip, size=1]]'),
    ).toBeNull()
  })
})

describe('parseLargeRequestReplacementMarkers', () => {
  it('derives multipart part index and original filename from HTTP context around {{file}}', () => {
    const path = '/tmp/yakit/large-request-body-2026-id-parts/part-1-original.pdf.txt'
    const tag = `{{file(${path})}}`
    const packet = [
      'POST /upload HTTP/1.1',
      'Content-Type: multipart/form-data; boundary=boundary',
      '',
      '--boundary',
      'Content-Disposition: form-data; name="note"',
      '',
      'editable',
      '--boundary',
      'Content-Disposition: form-data; name="upload"; filename="original.pdf"',
      'Content-Type: application/pdf',
      '',
      tag,
      '--boundary--',
    ].join('\r\n')

    expect(parseLargeRequestReplacementMarkers(packet)).toEqual([
      {
        kind: 'multipart',
        partIndex: 1,
        filename: 'original.pdf',
        resourcePath: path,
        source: 'file',
        lineNumber: 12,
        lineLength: tag.length,
      },
    ])
  })

  it('parses an ordinary file tag used for a flat oversized body', () => {
    const path = '/tmp/yakit/large-request-body-2026-id.txt'
    const tag = `{{file(${path})}}`
    const packet = ['PUT /upload HTTP/1.1', 'Content-Type: text/plain', '', tag].join('\r\n')

    expect(parseLargeRequestReplacementMarkers(packet)).toEqual([
      {
        kind: 'body',
        sizeVerbose: 'large-request-body-2026-id',
        resourcePath: path,
        source: 'file',
        lineNumber: 4,
        lineLength: tag.length,
      },
    ])
  })

  it('keeps legacy marker metadata and line positions', () => {
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

  it('ignores user-authored file tags and invalid marker-like text', () => {
    const packet = [
      'POST / HTTP/1.1',
      '',
      '{{file(/tmp/user-authored.txt)}}',
      'prefix [[yakit: multipart file spilled, part=0, file=a.zip, size=1]]',
    ].join('\n')
    expect(parseLargeRequestReplacementMarkers(packet)).toEqual([])
  })

  it('does not treat body lines that only share a boundary prefix as a new part', () => {
    const path = '/tmp/yakit/large-request-body-2026-id-parts/part-0-note.txt'
    const tag = `{{file(${path})}}`
    const packet = [
      'POST /upload HTTP/1.1',
      'Content-Type: multipart/form-data; boundary=b',
      '',
      '--b',
      'Content-Disposition: form-data; name="note"; filename="note.txt"',
      '',
      tag,
      '--bx-not-a-boundary',
      '--b--',
    ].join('\r\n')

    expect(parseLargeRequestReplacementMarkers(packet)).toEqual([
      {
        kind: 'multipart',
        partIndex: 0,
        filename: 'note.txt',
        resourcePath: path,
        source: 'file',
        lineNumber: 7,
        lineLength: tag.length,
      },
    ])
  })
})

describe('buildLargeRequestFileTagEdit', () => {
  it('replaces a canonical file tag without adding a newline', () => {
    const path = '/tmp/yakit/large-request-body-id-parts/part-0-original.pdf.txt'
    const tag = `{{file(${path})}}`
    const packet = [
      'POST / HTTP/1.1',
      'Content-Type: multipart/form-data; boundary=b',
      '',
      '--b',
      'Content-Disposition: form-data; name="upload"; filename="original.pdf"',
      '',
      tag,
      '--b--',
    ].join('\r\n')
    const marker = parseLargeRequestReplacementMarkers(packet)[0]
    const edit = buildLargeRequestFileTagEdit(marker, '/tmp/replacement.bin', tag)

    expect(edit.endColumn).toBe(tag.length + 1)
    expect(edit.text).toBe('{{file(/tmp/replacement.bin)}}')
  })

  it('preserves a same-line boundary for a legacy marker', () => {
    const markerText = '[[yakit: multipart file spilled, part=1, file=a.bin, size=3]]'
    const boundary = '-----WebKitFormBoundary--'
    const matched = matchLargeRequestReplacementLine(markerText + boundary)
    expect(matched?.kind).toBe('multipart')
    if (!matched || matched.kind !== 'multipart') return

    const marker = withLargeRequestReplacementLineNumber(matched, 1)
    const edit = buildLargeRequestFileTagEdit(marker, '/tmp/a.bin', markerText + boundary)
    expect(edit.text).toBe('{{file(/tmp/a.bin)}}\n')
  })
})

describe('buildLargeRequestResourceChipLabel', () => {
  it('shows filename from multipart headers without inventing metadata in the file tag', () => {
    const path = '/tmp/yakit/large-request-body-id-parts/part-0-original.pdf.txt'
    const packet = [
      'POST / HTTP/1.1',
      'Content-Type: multipart/form-data; boundary=b',
      '',
      '--b',
      'Content-Disposition: form-data; name="upload"; filename="original.pdf"',
      '',
      `{{file(${path})}}`,
      '--b--',
    ].join('\r\n')
    const marker = parseLargeRequestReplacementMarkers(packet)[0]

    expect(buildLargeRequestResourceChipLabel(marker, '点击替换整个文件')).toBe('File[original.pdf] · 点击替换整个文件')
  })

  it('keeps the legacy size display where the legacy marker contains it', () => {
    const text = '[[yakit: multipart file spilled, part=0, file=original.pdf, size=524288]]'
    const matched = matchLargeRequestReplacementLine(text)
    expect(matched).not.toBeNull()
    if (!matched) return
    expect(buildLargeRequestResourceChipLabel(matched, '点击替换整个文件')).toBe(
      'File[original.pdf·512.0KB] · 点击替换整个文件',
    )
  })
})

describe('sanitizeChipInjectedText', () => {
  it('replaces spaces with NBSP and leaves other text unchanged', () => {
    expect(sanitizeChipInjectedText(' 点击替换整个文件')).toBe('\u00A0点击替换整个文件')
    expect(sanitizeChipInjectedText('[已替换: a.zip]')).toBe('[已替换:\u00A0a.zip]')
  })
})
