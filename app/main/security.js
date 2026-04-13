const fs = require('fs')
const path = require('path')

const TRUSTED_DEV_HOSTS = new Set(['127.0.0.1', 'localhost'])
const TRUSTED_DEV_PORTS = new Set(['3000', '5173'])
const BLOCKED_OPEN_PATH_EXTENSIONS = new Set([
  '.app',
  '.appimage',
  '.bat',
  '.cmd',
  '.com',
  '.cpl',
  '.deb',
  '.desktop',
  '.dll',
  '.dmg',
  '.exe',
  '.gadget',
  '.hta',
  '.jar',
  '.js',
  '.jse',
  '.lnk',
  '.mjs',
  '.msi',
  '.msp',
  '.pkg',
  '.ps1',
  '.ps1xml',
  '.psc1',
  '.psd1',
  '.psm1',
  '.reg',
  '.rpm',
  '.scf',
  '.scr',
  '.sh',
  '.vb',
  '.vbe',
  '.vbs',
  '.ws',
  '.wsc',
  '.wsf',
  '.wsh',
])

const getSenderUrl = (event) => {
  return event?.senderFrame?.url || event?.sender?.getURL?.() || ''
}

const isTrustedAppSender = (event) => {
  const senderUrl = getSenderUrl(event)
  if (!senderUrl) return false
  if (senderUrl.startsWith('file://')) return true

  try {
    const parsed = new URL(senderUrl)
    return TRUSTED_DEV_HOSTS.has(parsed.hostname) && TRUSTED_DEV_PORTS.has(parsed.port)
  } catch (error) {
    return false
  }
}

const assertTrustedAppSender = (event, action) => {
  if (!isTrustedAppSender(event)) {
    throw new Error(`untrusted IPC sender for ${action}`)
  }
}

const isAllowedHostname = (hostname, allowedHosts = []) => {
  const normalized = (hostname || '').toLowerCase()
  return allowedHosts.some((allowedHost) => {
    const allowed = allowedHost.toLowerCase()
    return normalized === allowed || normalized.endsWith(`.${allowed}`)
  })
}

const normalizeHttpUrl = (value, options = {}) => {
  const { allowedHosts = [], requireHttps = false } = options
  if (typeof value !== 'string') {
    throw new Error('url must be a string')
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error('url is required')
  }

  let parsed
  try {
    parsed = new URL(trimmed)
  } catch (error) {
    throw new Error('invalid url')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('only http/https urls are allowed')
  }

  if (requireHttps && parsed.protocol !== 'https:') {
    throw new Error('https url is required')
  }

  if (allowedHosts.length > 0 && !isAllowedHostname(parsed.hostname, allowedHosts)) {
    throw new Error('url host is not allowed')
  }

  parsed.hash = ''
  return parsed.toString()
}

const normalizeHttpBaseUrl = (value, options = {}) => {
  const normalized = normalizeHttpUrl(value, options)
  const parsed = new URL(normalized)
  parsed.hash = ''
  while (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1)
  }
  const serialized = parsed.toString()
  return serialized.endsWith('/') ? serialized.slice(0, -1) : serialized
}

const normalizeRelativeApiPath = (value) => {
  if (typeof value !== 'string') {
    throw new Error('url path must be a string')
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error('url path is required')
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) || trimmed.startsWith('//')) {
    throw new Error('absolute urls are not allowed')
  }

  return trimmed.replace(/^\/+/, '')
}

const validateOpenPath = (targetPath) => {
  if (typeof targetPath !== 'string') {
    throw new Error('path must be a string')
  }

  const trimmed = targetPath.trim()
  if (!trimmed || !path.isAbsolute(trimmed)) {
    throw new Error('absolute path is required')
  }

  const resolvedPath = path.resolve(trimmed)
  const stats = fs.statSync(resolvedPath)
  if (stats.isFile()) {
    const ext = path.extname(resolvedPath).toLowerCase()
    if (BLOCKED_OPEN_PATH_EXTENSIONS.has(ext)) {
      throw new Error(`opening ${ext} files is blocked`)
    }
  }

  if (!stats.isFile() && !stats.isDirectory()) {
    throw new Error('only files and directories can be opened')
  }

  return resolvedPath
}

const normalizePid = (value) => {
  const raw = `${value ?? ''}`.trim()
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new Error('pid must be a positive integer')
  }

  const pid = Number.parseInt(raw, 10)
  if (!Number.isSafeInteger(pid)) {
    throw new Error('pid is out of range')
  }

  return pid
}

module.exports = {
  assertTrustedAppSender,
  isTrustedAppSender,
  normalizeHttpBaseUrl,
  normalizeHttpUrl,
  normalizeRelativeApiPath,
  normalizePid,
  validateOpenPath,
}
