import zlib from 'node:zlib'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const { decodeBarePacket, withDecodedBare } = createRequire(import.meta.url)('../handlers/decodeBarePacket.js')

const packet = (headers, body) => Buffer.concat([Buffer.from(`${headers.join('\r\n')}\r\n\r\n`, 'latin1'), body])

const chunk = (body) =>
  Buffer.concat([Buffer.from(`${body.length.toString(16)}\r\n`), body, Buffer.from('\r\n0\r\n\r\n')])

describe('decodeBarePacket', () => {
  it('gzip 正文解成明文', async () => {
    const body = Buffer.from('hello 原文')
    const raw = packet(['HTTP/1.1 200 OK', 'Content-Encoding: gzip'], zlib.gzipSync(body))
    expect((await decodeBarePacket(raw)).toString('utf8')).toContain('hello 原文')
  })

  it('未压缩报文原样返回 null', async () => {
    const raw = packet(['HTTP/1.1 200 OK'], Buffer.from('ok'))
    expect(await decodeBarePacket(raw)).toBeNull()
  })

  it('chunked + gzip 先去分块再解压', async () => {
    const gzipped = zlib.gzipSync(Buffer.from('chunk-body'))
    const raw = packet(['HTTP/1.1 200 OK', 'Transfer-Encoding: chunked', 'Content-Encoding: gzip'], chunk(gzipped))
    expect((await decodeBarePacket(raw)).toString('utf8')).toContain('chunk-body')
  })

  it('Transfer-Encoding: gzip, chunked 逆序解完，不再把压缩正文当成成功', async () => {
    const gzipped = zlib.gzipSync(Buffer.from('te-gzip'))
    const raw = packet(['HTTP/1.1 200 OK', 'Transfer-Encoding: gzip, chunked'], chunk(gzipped))
    const decoded = await decodeBarePacket(raw)
    const text = decoded.toString('utf8')
    expect(text).toContain('te-gzip')
    expect(text).not.toMatch(/transfer-encoding/i)
    expect(text).not.toContain(gzipped.toString('latin1'))
  })

  it('chunked 不在传输编码末尾时不返回半截结果', async () => {
    const raw = packet(['HTTP/1.1 200 OK', 'Transfer-Encoding: chunked, gzip'], Buffer.from('1\r\nx\r\n0\r\n\r\n'))
    expect(await decodeBarePacket(raw)).toBeNull()
  })

  it('不支持的编码返回 null', async () => {
    const raw = packet(['HTTP/1.1 200 OK', 'Transfer-Encoding: zstd, chunked'], chunk(Buffer.from('still-compressed')))
    expect(await decodeBarePacket(raw)).toBeNull()
  })

  it('解压输出超过上限返回 null', async () => {
    const raw = packet(['HTTP/1.1 200 OK', 'Content-Encoding: gzip'], zlib.gzipSync(Buffer.from('hello 原文')))
    expect(await decodeBarePacket(raw, { maxOutput: 4 })).toBeNull()
  })

  it('deflate 正文解成明文', async () => {
    const raw = packet(['HTTP/1.1 200 OK', 'Content-Encoding: deflate'], zlib.deflateSync(Buffer.from('deflate-body')))
    expect((await decodeBarePacket(raw)).toString('utf8')).toContain('deflate-body')
  })

  it('deflate 裸流（无 zlib 头）走 inflateRaw 兜底', async () => {
    const raw = packet(
      ['HTTP/1.1 200 OK', 'Content-Encoding: deflate'],
      zlib.deflateRawSync(Buffer.from('raw-deflate-body')),
    )
    expect((await decodeBarePacket(raw)).toString('utf8')).toContain('raw-deflate-body')
  })

  it('br 正文解成明文', async () => {
    const raw = packet(['HTTP/1.1 200 OK', 'Content-Encoding: br'], zlib.brotliCompressSync(Buffer.from('br-body')))
    expect((await decodeBarePacket(raw)).toString('utf8')).toContain('br-body')
  })

  it('解压失败返回 null', async () => {
    const raw = packet(['HTTP/1.1 200 OK', 'Content-Encoding: gzip'], Buffer.from('not-gzip'))
    expect(await decodeBarePacket(raw)).toBeNull()
  })

  it('Data 保持原样，Decoded 另附明文', async () => {
    const raw = packet(['HTTP/1.1 200 OK', 'Content-Encoding: gzip'], zlib.gzipSync(Buffer.from('kept-raw')))
    const data = { Id: 1, Data: raw }
    const result = await withDecodedBare(data)

    expect(result).not.toBe(data)
    expect(result.Data).toBe(raw)
    expect(result.Data.toString('latin1')).toContain('Content-Encoding: gzip')
    expect(result.Decoded.toString('utf8')).toContain('kept-raw')
    expect(result.Decoded.toString('utf8')).not.toMatch(/content-encoding/i)
  })
})
