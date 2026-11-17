import { describe, expect, it, vi } from 'vitest'
import { getHiddenHTTPHeaderRanges } from '../hiddenHTTPHeaders'

function modelFor(packet: string) {
  const lines = packet.split(/\r\n|\n|\r/)
  return { getLineCount: () => lines.length, getLineContent: (line: number) => lines[line - 1] }
}

const lineRange = (start: number, end = start) => ({
  startLineNumber: start,
  startColumn: 1,
  endLineNumber: end,
  endColumn: 1,
})

describe('HTTP header visibility', () => {
  it('uses a custom case-insensitive list and treats an empty list as hiding nothing', () => {
    const model = modelFor('GET / HTTP/1.1\nAccept: */*\nX-Custom: value\n\nX-Custom: body')
    expect(getHiddenHTTPHeaderRanges(model, false, ['X-CUSTOM'])).toEqual([lineRange(3)])
    expect(getHiddenHTTPHeaderRanges(model, false, [])).toEqual([])
  })
  it.each(['\r\n', '\n'])('matches request headers case-insensitively and stops at the body (%j)', (eol) => {
    const packet = [
      'POST / HTTP/1.1',
      'Host: example.com',
      'AcCePt: */*',
      'Accept-Encoding: gzip',
      'Authorization: Bearer token',
      'Sec-CH-UA: browser',
      'Sec-CH-UA-Custom: keep',
      'Cookie: session=1',
      'Content-Type: text/plain',
      'Content-Length: 17',
      '',
      'Accept: body text',
    ].join(eol)
    expect(getHiddenHTTPHeaderRanges(modelFor(packet), false)).toEqual([lineRange(3, 4), lineRange(6)])
  })

  it('hides duplicate response headers and folded continuation lines without hiding retained headers', () => {
    const packet = [
      'HTTP/2 200 OK',
      'Content-Type: text/plain',
      'Date: Tue, 17 Nov 2026 03:03:49 GMT',
      'Set-Cookie: a=1',
      'Set-Cookie: b=2',
      'Content-Length: 0',
      'Cache-Control: private,',
      ' max-age=0,',
      '\tno-cache',
      'Location: /next',
      ' retained continuation',
      'Server: example',
      '',
      'Server: body text',
    ].join('\r\n')
    expect(getHiddenHTTPHeaderRanges(modelFor(packet), true)).toEqual([lineRange(3, 5), lineRange(7, 9), lineRange(12)])
  })

  it('uses separate request and response lists', () => {
    const headers = '\nAccept: */*\nServer: example\nConnection: keep-alive\n\n'
    expect(getHiddenHTTPHeaderRanges(modelFor('GET / HTTP/1.1' + headers), false)).toEqual([lineRange(2)])
    expect(getHiddenHTTPHeaderRanges(modelFor('HTTP/1.1 200 OK' + headers), true)).toEqual([lineRange(3, 4)])
  })

  it.each(['', 'not an HTTP packet\nAccept: body', 'GET / HTTP/1.1\nHost: example.com\n\n'])(
    'leaves packets without matching headers visible: %j',
    (packet) => expect(getHiddenHTTPHeaderRanges(modelFor(packet), false)).toEqual([]),
  )

  it('supports incomplete header sections and stops hiding at malformed lines', () => {
    const packet = 'GET / HTTP/1.1\nAccept: */*\nmalformed header\n continuation\nPriority: u=0'
    expect(getHiddenHTTPHeaderRanges(modelFor(packet), false)).toEqual([lineRange(2), lineRange(5)])
  })

  it('does not scan a large body', () => {
    const model = modelFor('HTTP/1.1 200 OK\nServer: example\n\n' + 'body\n'.repeat(10000))
    const getLineContent = vi.spyOn(model, 'getLineContent')
    expect(getHiddenHTTPHeaderRanges(model, true)).toEqual([lineRange(2)])
    expect(getLineContent).toHaveBeenCalledTimes(3)
  })
})
