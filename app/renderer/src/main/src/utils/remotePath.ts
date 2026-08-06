/**
 * Normalize a path that belongs to a remote target.
 *
 * Node's `path` module follows the operating system running Yakit, which can
 * differ from the web-shell target. Keeping this implementation in the
 * renderer also avoids bundling Node runtime modules into the browser chunk.
 */
export function normalizeRemotePath(input: string): string {
  if (!input) return '.'

  const windowsStyle =
    /^[A-Za-z]:[\\/]/.test(input) || /^[\\/]{2}[^\\/]/.test(input) || (input.includes('\\') && !input.includes('/'))
  const separator = windowsStyle ? '\\' : '/'
  const isUNC = windowsStyle && /^[\\/]{2}[^\\/]/.test(input)
  const drive = windowsStyle ? input.match(/^([A-Za-z]:)/)?.[1] : undefined

  let remainder = input
  let prefix = ''
  let rooted = false

  if (isUNC) {
    const uncParts = input.replace(/^[\\/]+/, '').split(/[\\/]+/)
    const server = uncParts.shift() || ''
    const share = uncParts.shift() || ''
    prefix = `${separator}${separator}${server}${share ? `${separator}${share}` : ''}`
    remainder = uncParts.join(separator)
    rooted = true
  } else if (drive) {
    prefix = drive
    remainder = input.slice(drive.length)
    rooted = /^[\\/]/.test(remainder)
    remainder = remainder.replace(/^[\\/]+/, '')
  } else {
    rooted = /^[\\/]/.test(input)
    remainder = input.replace(/^[\\/]+/, '')
  }

  const segments: string[] = []
  for (const segment of remainder.split(/[\\/]+/)) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (segments.length && segments[segments.length - 1] !== '..') {
        segments.pop()
      } else if (!rooted) {
        segments.push(segment)
      }
      continue
    }
    segments.push(segment)
  }

  const body = segments.join(separator)
  if (isUNC) return body ? `${prefix}${separator}${body}` : prefix
  if (drive) {
    if (rooted) return body ? `${prefix}${separator}${body}` : `${prefix}${separator}`
    return body ? `${prefix}${body}` : prefix
  }
  if (rooted) return body ? `${separator}${body}` : separator
  return body || '.'
}
