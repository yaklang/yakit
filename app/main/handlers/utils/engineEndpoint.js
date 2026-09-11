const fs = require('fs')
const os = require('os')
const path = require('path')
const { randomBytes } = require('crypto')

const ENGINE_TIMEOUTS = Object.freeze({
  check: 180000,
  start: 180000,
  total: 360000,
  connect: 10000,
  probe: 2000,
  retry: 500,
  hint: 20000,
  stop: 4000,
})
const validPort = (port) => /^(?:[1-9]\d*)$/.test(String(port)) && Number(port) <= 65535

function normalizeLocalEndpoint(endpoint, platform = process.platform) {
  if (!endpoint || typeof endpoint !== 'object') throw new Error('Invalid local endpoint')
  if (endpoint.transport === 'tcp') {
    if (endpoint.host !== '127.0.0.1' || !validPort(endpoint.port)) throw new Error('Invalid local TCP endpoint')
    return { transport: 'tcp', host: '127.0.0.1', port: Number(endpoint.port) }
  }
  const value = endpoint.path
  if (typeof value !== 'string' || /[\0\r\n]/.test(value) || Buffer.from(value, 'utf8').toString('utf8') !== value)
    throw new Error('Invalid IPC path')
  if (endpoint.transport === 'npipe' && platform === 'win32') {
    // Only the local pipe namespace. No remote UNC, nested names or URL encoding.
    if (!/^\\\\\.\\pipe\\[^\\/]+$/i.test(value) || value.length > 256) throw new Error('Invalid local named pipe')
    return { transport: 'npipe', path: value }
  }
  if (endpoint.transport === 'unix' && platform !== 'win32') {
    if (!path.posix.isAbsolute(value) || Buffer.byteLength(value, 'utf8') > 103)
      throw new Error('Invalid Unix socket path')
    return { transport: 'unix', path: path.posix.normalize(value) }
  }
  throw new Error('Unsupported local transport')
}

function grpcTarget(endpoint, platform = process.platform) {
  const normalized = normalizeLocalEndpoint(endpoint, platform)
  return normalized.transport === 'tcp' ? `${normalized.host}:${normalized.port}` : `unix:${normalized.path}`
}

function endpointAddress(endpoint) {
  return endpoint.transport === 'tcp' ? `${endpoint.host}:${endpoint.port}` : endpoint.path
}

function matchesEngineEndpoint(event, endpoint, platform = process.platform) {
  if (event.transport !== endpoint.transport) return false
  try {
    const address = endpointAddress(normalizeLocalEndpoint(endpoint, platform))
    return endpoint.transport === 'npipe'
      ? typeof event.address === 'string' && event.address.toLowerCase() === address.toLowerCase()
      : event.address === address
  } catch {
    return false
  }
}

function endpointArgs(endpoint) {
  return endpoint.transport === 'tcp'
    ? ['--port', String(endpoint.port)]
    : ['--transport', endpoint.transport, '--socket-path', endpoint.path]
}

function createLocalEndpoint(policy, port, edition = 'yakit', platform = process.platform) {
  if (!['auto', 'ipc', 'tcp'].includes(policy)) throw new Error('Invalid local transport policy')
  if (!validPort(port)) throw new Error('Invalid fallback TCP port')
  if (policy === 'tcp')
    return {
      endpoint: normalizeLocalEndpoint({ transport: 'tcp', host: '127.0.0.1', port }, platform),
      cleanup: () => {},
    }
  const prefix =
    String(edition)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 16) || 'yakit'
  if (platform === 'win32')
    return {
      endpoint: normalizeLocalEndpoint(
        { transport: 'npipe', path: `\\\\.\\pipe\\${prefix}-${randomBytes(20).toString('hex')}` },
        platform,
      ),
      cleanup: () => {},
    }
  // Prefer a short OS temp alias (not its potentially much longer realpath).
  const base = [os.tmpdir(), '/tmp'].find(
    (dir) => path.posix.isAbsolute(dir) && Buffer.byteLength(path.join(dir, `${prefix}-XXXXXX/grpc.sock`)) <= 103,
  )
  if (!base) throw new Error('No short private IPC directory available')
  const directory = fs.mkdtempSync(path.join(base, `${prefix}-`))
  fs.chmodSync(directory, 0o700)
  const identity = fs.lstatSync(directory)
  return {
    endpoint: normalizeLocalEndpoint({ transport: 'unix', path: path.join(directory, 'grpc.sock') }, platform),
    cleanup() {
      // Never unlink an engine socket/lock. Only remove our unchanged, empty directory.
      try {
        const current = fs.lstatSync(directory)
        if (!current.isSymbolicLink() && current.dev === identity.dev && current.ino === identity.ino)
          fs.rmdirSync(directory)
      } catch {}
    },
  }
}

module.exports = {
  ENGINE_TIMEOUTS,
  validPort,
  normalizeLocalEndpoint,
  grpcTarget,
  endpointAddress,
  matchesEngineEndpoint,
  endpointArgs,
  createLocalEndpoint,
}
