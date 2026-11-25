// @vitest-environment node
import { createRequire } from 'node:module'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const securityPath = require.resolve('../security.js')
const originalLinkPort = process.env.YAKIT_LINK_DEV_PORT
const originalDefaultApp = process.defaultApp

const loadSecurity = (linkPort = '', { dev = false } = {}) => {
  delete require.cache[securityPath]
  if (linkPort) process.env.YAKIT_LINK_DEV_PORT = linkPort
  else delete process.env.YAKIT_LINK_DEV_PORT
  if (dev) process.defaultApp = true
  else delete process.defaultApp
  return require('../security.js')
}

const senderAt = (url) => ({ senderFrame: { url } })

afterEach(() => {
  delete require.cache[securityPath]
  if (originalLinkPort === undefined) delete process.env.YAKIT_LINK_DEV_PORT
  else process.env.YAKIT_LINK_DEV_PORT = originalLinkPort
  if (originalDefaultApp === undefined) delete process.defaultApp
  else process.defaultApp = originalDefaultApp
})

describe('dev IPC sender ports', () => {
  it('trusts main and default Link dev ports', () => {
    const { isTrustedAppSender } = loadSecurity()

    expect(isTrustedAppSender(senderAt('http://127.0.0.1:3000/'))).toBe(true)
    expect(isTrustedAppSender(senderAt('http://localhost:3001/engine-link.html'))).toBe(true)
  })

  it('trusts a custom Link dev port only when Electron runs unpackaged', () => {
    const { isTrustedAppSender } = loadSecurity('3101', { dev: true })

    expect(isTrustedAppSender(senderAt('http://127.0.0.1:3101/engine-link.html'))).toBe(true)
  })

  it('does not trust a custom port from the environment after packaging', () => {
    const { isTrustedAppSender } = loadSecurity('3101')

    expect(isTrustedAppSender(senderAt('http://127.0.0.1:3101/engine-link.html'))).toBe(false)
  })

  it('rejects other local ports', () => {
    const { isTrustedAppSender } = loadSecurity()

    expect(isTrustedAppSender(senderAt('http://127.0.0.1:3102/engine-link.html'))).toBe(false)
  })
})
