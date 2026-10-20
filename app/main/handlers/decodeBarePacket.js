const zlib = require('zlib')

const headerValue = (lines, name) => {
  const line = lines.find((item) => item.toLowerCase().startsWith(`${name}:`))
  return line ? line.slice(line.indexOf(':') + 1).trim() : ''
}

// 去掉 chunked 分块，剩下连续的正文
const dechunk = (body) => {
  const chunks = []
  let rest = body
  for (;;) {
    const nl = rest.indexOf('\r\n')
    if (nl < 0) return null
    const size = parseInt(rest.subarray(0, nl).toString('latin1').split(';')[0], 16)
    if (!(size >= 0) || rest.length < nl + 2 + size + 2) return null
    if (size === 0) return Buffer.concat(chunks)
    chunks.push(rest.subarray(nl + 2, nl + 2 + size))
    rest = rest.subarray(nl + 2 + size + 2)
  }
}

const inflate = (body, encoding) => {
  if (encoding === 'gzip' || encoding === 'x-gzip') return zlib.gunzipSync(body)
  if (encoding === 'deflate') {
    try {
      return zlib.inflateSync(body)
    } catch (e) {
      return zlib.inflateRawSync(body)
    }
  }
  if (encoding === 'br') return zlib.brotliDecompressSync(body)
  return null
}

/**
 * 对比弹窗用：把 chunked/压缩的原始报文解成明文。
 * 解不开或本来就没压缩时返回 null，调用方继续用原始字节。
 */
const decodeBarePacket = (input) => {
  try {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
    const sep = buf.indexOf('\r\n\r\n')
    if (sep < 0) return null

    const lines = buf.subarray(0, sep).toString('latin1').split('\r\n')
    const chunked = /chunked/i.test(headerValue(lines, 'transfer-encoding'))
    const encoding = headerValue(lines, 'content-encoding').toLowerCase()
    if (!chunked && !encoding) return null

    let body = buf.subarray(sep + 4)
    if (chunked) {
      body = dechunk(body)
      if (!body) return null
    }
    if (encoding && encoding !== 'identity') {
      body = inflate(body, encoding)
      if (!body) return null
    }

    const headers = lines
      .filter((line) => !/^(transfer-encoding|content-encoding|content-length)\s*:/i.test(line))
      .concat(`Content-Length: ${body.length}`)
    return Buffer.concat([Buffer.from(`${headers.join('\r\n')}\r\n\r\n`, 'latin1'), body])
  } catch (e) {
    return null
  }
}

module.exports = { decodeBarePacket }
