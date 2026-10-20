import zlib from 'node:zlib'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const { decodeBarePacket } = createRequire(import.meta.url)('../handlers/decodeBarePacket.js')

const packet = (headers, body) => Buffer.concat([Buffer.from(`${headers.join('\r\n')}\r\n\r\n`, 'latin1'), body])

describe('decodeBarePacket', () => {
  it('gzip 正文解成明文', () => {
    const body = Buffer.from('hello 原文')
    const raw = packet(['HTTP/1.1 200 OK', 'Content-Encoding: gzip'], zlib.gzipSync(body))
    expect(decodeBarePacket(raw).toString('utf8')).toContain('hello 原文')
  })

  it('未压缩报文原样返回 null', () => {
    const raw = packet(['HTTP/1.1 200 OK'], Buffer.from('ok'))
    expect(decodeBarePacket(raw)).toBeNull()
  })

  it('chunked + gzip 先去分块再解压', () => {
    const gzipped = zlib.gzipSync(Buffer.from('chunk-body'))
    const chunked = Buffer.concat([
      Buffer.from(`${gzipped.length.toString(16)}\r\n`),
      gzipped,
      Buffer.from('\r\n0\r\n\r\n'),
    ])
    const raw = packet(['HTTP/1.1 200 OK', 'Transfer-Encoding: chunked', 'Content-Encoding: gzip'], chunked)
    expect(decodeBarePacket(raw).toString('utf8')).toContain('chunk-body')
  })

  it('deflate 正文解成明文', () => {
    const raw = packet(['HTTP/1.1 200 OK', 'Content-Encoding: deflate'], zlib.deflateSync(Buffer.from('deflate-body')))
    expect(decodeBarePacket(raw).toString('utf8')).toContain('deflate-body')
  })

  it('deflate 裸流（无 zlib 头）走 inflateRaw 兜底', () => {
    const raw = packet(
      ['HTTP/1.1 200 OK', 'Content-Encoding: deflate'],
      zlib.deflateRawSync(Buffer.from('raw-deflate-body')),
    )
    expect(decodeBarePacket(raw).toString('utf8')).toContain('raw-deflate-body')
  })

  it('br 正文解成明文', () => {
    const raw = packet(['HTTP/1.1 200 OK', 'Content-Encoding: br'], zlib.brotliCompressSync(Buffer.from('br-body')))
    expect(decodeBarePacket(raw).toString('utf8')).toContain('br-body')
  })

  it('解压失败返回 null', () => {
    const raw = packet(['HTTP/1.1 200 OK', 'Content-Encoding: gzip'], Buffer.from('not-gzip'))
    expect(decodeBarePacket(raw)).toBeNull()
  })
})
