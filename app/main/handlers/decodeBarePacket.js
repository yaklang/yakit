const zlib = require('zlib')
const { promisify } = require('util')

const gunzip = promisify(zlib.gunzip)
const inflateZlib = promisify(zlib.inflate)
const inflateRaw = promisify(zlib.inflateRaw)
const brotliDecompress = promisify(zlib.brotliDecompress)

/** 对比只需要看明文，超过这个大小就放弃解码，避免主进程被撑满 */
const MAX_PACKET_BYTES = 32 * 1024 * 1024

const headerValue = (lines, name) => {
  const line = lines.find((item) => item.toLowerCase().startsWith(`${name}:`))
  return line ? line.slice(line.indexOf(':') + 1).trim() : ''
}

const codingList = (value) =>
  value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

// 去掉 chunked 分块。输出过大或格式不对就返回 null
const dechunk = (body, maxOutput) => {
  const chunks = []
  let total = 0
  let rest = body
  for (;;) {
    const nl = rest.indexOf('\r\n')
    if (nl < 0) return null
    const size = parseInt(rest.subarray(0, nl).toString('latin1').split(';')[0], 16)
    if (!(size >= 0) || rest.length < nl + 2 + size + 2) return null
    if (size === 0) return Buffer.concat(chunks)
    total += size
    if (total > maxOutput) return null
    chunks.push(rest.subarray(nl + 2, nl + 2 + size))
    rest = rest.subarray(nl + 2 + size + 2)
  }
}

const inflate = async (body, encoding, maxOutput) => {
  if (body.length > maxOutput) return null
  const options = { maxOutputLength: maxOutput }
  try {
    if (encoding === 'gzip' || encoding === 'x-gzip') return await gunzip(body, options)
    if (encoding === 'deflate') {
      try {
        return await inflateZlib(body, options)
      } catch (e) {
        return await inflateRaw(body, options)
      }
    }
    if (encoding === 'br') return await brotliDecompress(body, options)
    return null
  } catch (e) {
    return null
  }
}

const applyCoding = (body, coding, maxOutput) => {
  if (coding === 'identity') return body
  if (coding === 'chunked') return dechunk(body, maxOutput)
  return inflate(body, coding, maxOutput)
}

/**
 * 对比弹窗用：按编码列表逆序还原明文。
 * 传输编码在后，所以先解开 Transfer-Encoding，再解开 Content-Encoding。
 * 任一编码不支持、解压失败或超过大小限制时返回 null，调用方继续用原始字节。
 */
const decodeBarePacket = async (input, limits = {}) => {
  const maxInput = limits.maxInput || MAX_PACKET_BYTES
  const maxOutput = limits.maxOutput || MAX_PACKET_BYTES
  try {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
    if (buf.length > maxInput) return null
    const sep = buf.indexOf('\r\n\r\n')
    if (sep < 0) return null

    const lines = buf.subarray(0, sep).toString('latin1').split('\r\n')
    const transferCodings = codingList(headerValue(lines, 'transfer-encoding'))
    const contentCodings = codingList(headerValue(lines, 'content-encoding'))
    const steps = transferCodings.filter((item) => item !== 'identity').reverse()
    steps.push(...contentCodings.filter((item) => item !== 'identity').reverse())
    if (steps.length === 0) return null
    // chunked 必须是最后一个传输编码，否则这组编码无法按规范还原
    const chunkedAt = transferCodings.lastIndexOf('chunked')
    if (chunkedAt !== -1 && chunkedAt !== transferCodings.length - 1) return null

    let body = buf.subarray(sep + 4)
    for (const coding of steps) {
      body = await applyCoding(body, coding, maxOutput)
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

/** 附上解码结果，不替换原始 Data */
const withDecodedBare = async (data) => {
  if (!data || !data.Data) return data
  const decoded = await decodeBarePacket(data.Data)
  if (!decoded) return data
  return Object.assign({}, data, { Decoded: decoded })
}

module.exports = { decodeBarePacket, withDecodedBare, MAX_PACKET_BYTES }
