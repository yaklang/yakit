// @vitest-environment node
import { createRequire } from 'node:module'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const securityPath = require.resolve('../security.js')

const loadSecurity = () => {
  delete require.cache[securityPath]
  return require('../security.js')
}

const senderAt = (url) => ({ senderFrame: { url } })

afterEach(() => {
  delete require.cache[securityPath]
})

describe('dev IPC sender ports', () => {
  it('trusts main and default Link dev ports', () => {
    const { isTrustedAppSender } = loadSecurity()

    expect(isTrustedAppSender(senderAt('http://127.0.0.1:3000/'))).toBe(true)
    expect(isTrustedAppSender(senderAt('http://localhost:5173/engine-link.html'))).toBe(true)
  })

  it('rejects other local ports', () => {
    const { isTrustedAppSender } = loadSecurity()

    expect(isTrustedAppSender(senderAt('http://127.0.0.1:3101/engine-link.html'))).toBe(false)
    expect(isTrustedAppSender(senderAt('http://127.0.0.1:3102/engine-link.html'))).toBe(false)
  })
})
