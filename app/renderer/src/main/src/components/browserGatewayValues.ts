// Read evidence from saved packets, never infer a page function's intermediate return value.
export function gatewayPacketValue(packet: string, path: string): string | undefined {
  const separator = /\r?\n\r?\n/.exec(packet)
  if (!separator) return undefined
  const header = packet.slice(0, separator.index)
  const body = packet.slice(separator.index + separator[0].length)
  const headers = header
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const colon = line.indexOf(':')
      return [line.slice(0, colon).toLowerCase(), line.slice(colon + 1).trim()]
    })
  let value: unknown
  if (path.startsWith('header.')) {
    value = headers.find(([name]) => name === path.slice(7).toLowerCase())?.[1]
  } else if (path.startsWith('query.')) {
    const target = header.split(/\r?\n/)[0].split(' ')[1]
    try {
      const values = new URL(target, 'http://packet.invalid').searchParams.getAll(path.slice(6))
      value = values.length > 1 ? values : values[0]
    } catch {
      return undefined
    }
  } else if (path === 'body' || path.startsWith('body.')) {
    // Encoded wire bodies cannot be interpreted as decoded field values.
    if (
      headers.some(
        ([name, content]) =>
          (name === 'transfer-encoding' && /chunked/i.test(content)) ||
          (name === 'content-encoding' && content !== 'identity'),
      )
    )
      return undefined
    if (body.length > 256 * 1024) return undefined
    const contentType = headers.find(([name]) => name === 'content-type')?.[1] || ''
    if (path === 'body') value = body
    else if (/application\/x-www-form-urlencoded/i.test(contentType)) {
      const values = new URLSearchParams(body).getAll(path.slice(5))
      value = values.length > 1 ? values : values[0]
    } else if (/json/i.test(contentType)) {
      try {
        value = JSON.parse(body)
        for (const part of path.slice(5).split('.')) {
          if (!value || typeof value !== 'object' || !Object.prototype.hasOwnProperty.call(value, part))
            return undefined
          value = (value as Record<string, unknown>)[part]
        }
      } catch {
        return undefined
      }
    }
  }
  if (value === undefined) return undefined
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      /* Keep ciphertext and ordinary text intact. */
    }
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return text.length > 8192 ? `${text.slice(0, 8192)}\n…` : text
}
